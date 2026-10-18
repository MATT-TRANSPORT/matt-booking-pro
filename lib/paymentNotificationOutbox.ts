import { isTestEnvironment } from "@/lib/testEnvironment";
import { paymentReceivedEmail } from "@/lib/emailTemplates";
import { prepareMattEmail, sendPreparedMattEmail } from "@/lib/email";
import { sendPaymentReceivedAdminPush } from "@/lib/adminNotifications";

/** A DB lease serializes workers. Email payload and provider key stay immutable. */
export async function runPaymentNotificationOutbox(admin: any, bookingId: string | null = null) {
  const stats = { checked: 0, sent: 0, skipped: 0, retry: 0, needs_attention: 0, errors: 0 };
  if (isTestEnvironment()) return { ...stats, skipped: 1 };
  const { data: jobs } = await admin.rpc("claim_payment_notifications", {
    p_booking_id: bookingId, p_limit: 3
  }).throwOnError();

  for (const job of jobs ?? []) {
    stats.checked++;
    const patch = async (value: Record<string, unknown>) => {
      const { data } = await admin.from("payment_notification_outbox").update(value)
        .eq("id", job.id).eq("lease_token", job.lease_token).eq("status", "processing")
        .select("id").maybeSingle().throwOnError();
      if (!data) throw new Error("Utracono blokadę powiadomienia.");
    };
    let retryable = true;
    try {
      if (job.attempts > 10 || (job.kind === "customer_email" && job.first_attempt_at &&
          Date.now() - Date.parse(job.first_attempt_at) >= 23 * 3600_000)) {
        retryable = false;
        throw new Error("Wymagana kontrola dostarczenia przed kolejną próbą.");
      }
      if (job.kind === "customer_email") {
        let prepared = job.prepared_email;
        if (!prepared) {
          try {
            const template = paymentReceivedEmail(job.booking_snapshot);
            prepared = prepareMattEmail({ to: job.recipient || "", locale: job.booking_snapshot.customer_locale,
              subject: template.subject, html: template.html });
          } catch (error) { retryable = false; throw error; }
          // Commit the exact Resend body before the first external request.
          await patch({ prepared_email: prepared });
        }
        if (!job.first_attempt_at) await patch({ first_attempt_at: new Date().toISOString() });
        const result = await sendPreparedMattEmail(prepared, `payment-receipt/${job.id}`);
        if (!result.sent) {
          retryable = result.retryable !== false;
          throw new Error(result.error || "Nie wysłano potwierdzenia płatności.");
        }
        await patch({ status: "sent", sent_at: new Date().toISOString(), provider_id: result.id,
          last_error: null, lease_token: null });
      } else if (job.kind === "admin_push") {
        const result = await sendPaymentReceivedAdminPush(admin, job.booking_snapshot,
          Number(job.booking_snapshot.payment_amount_cents || 0), 0, null, job.id);
        if (!result || result.failed > 0) throw new Error("Nie dostarczono wszystkich powiadomień push.");
        await patch({ status: result.skipped ? "skipped" : "sent", sent_at: result.skipped ? null : new Date().toISOString(),
          last_error: result.skipped ? "Brak aktywnych subskrypcji push." : null, lease_token: null });
        if (result.skipped) { stats.skipped++; continue; }
      } else { retryable = false; throw new Error("Nieznany typ powiadomienia."); }
      stats.sent++;
    } catch (error) {
      const attention = !retryable || job.attempts >= 10;
      try {
        await patch({ status: attention ? "needs_attention" : "retry", lease_token: null,
          available_at: new Date(Date.now() + Math.min(3600_000, 60_000 * 2 ** Math.min(job.attempts - 1, 6))).toISOString(),
          last_error: (error instanceof Error ? error.message : "Błąd powiadomienia.").slice(0, 500) });
        if (attention) stats.needs_attention++; else stats.retry++;
      } catch { stats.errors++; console.error("Outbox płatności: nie można zapisać wyniku próby."); }
    }
  }
  return stats;
}
