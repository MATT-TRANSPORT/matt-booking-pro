import { isTestEnvironment } from "@/lib/testEnvironment";

/** A signature authenticates the sender; the event must also match our mode. */
export function assertStripeEventMode(livemode: boolean) {
  const key = process.env.STRIPE_SECRET_KEY || "";
  const testOnly = process.env.VERCEL_ENV === "preview" || isTestEnvironment();
  if ((testOnly && livemode) ||
      (/^(sk|rk)_test_/.test(key) && livemode) ||
      (/^(sk|rk)_live_/.test(key) && !livemode)) {
    throw new Error("Tryb zdarzenia Stripe nie odpowiada środowisku płatności.");
  }
}

/** The primary key and conditional retry update arbitrate concurrent workers. */
export async function claimStripeEvent(admin: any, event: { id: string; type: string }) {
  const started = new Date().toISOString();
  const { error } = await admin.from("payment_webhook_events").insert({
    provider_event_id: event.id,
    provider: "stripe",
    event_type: event.type,
    processing_status: "processing",
    processing_started_at: started
  });
  if (!error) return "claimed" as const;
  if (error.code !== "23505") throw new Error("Nie można zapisać zdarzenia płatności.");

  const { data: previous } = await admin.from("payment_webhook_events")
    .select("provider_event_id,processing_status,processed_at,processing_started_at")
    .eq("provider_event_id", event.id).maybeSingle().throwOnError();
  if (!previous) throw new Error("Nie można odczytać zdarzenia płatności.");
  if (previous.processed_at) return "processed" as const;

  // Vercel maxDuration is 300 s. A 10-minute lease also recovers crashed workers.
  const expired = Date.parse(previous.processing_started_at || "") < Date.now() - 600_000;
  if (previous.processing_status !== "error" && !expired) return "busy" as const;
  const { data: claimed } = await admin.from("payment_webhook_events")
    .update({ processing_status: "processing", processing_started_at: started, error: null })
    .eq("provider_event_id", event.id)
    .eq("processing_status", previous.processing_status)
    .eq("processing_started_at", previous.processing_started_at)
    .is("processed_at", null)
    .select("provider_event_id").maybeSingle().throwOnError();
  return claimed ? "claimed" as const : "busy" as const;
}
