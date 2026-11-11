import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripeServer";
import { appBaseUrl } from "@/lib/payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function statusPage(title: string, message: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · MATT TRANSPORT</title><body style="margin:0;background:#0b0e13;color:#f7f7f7;font:16px Arial,sans-serif;padding:32px 16px"><main style="max-width:560px;margin:8vh auto;background:#151923;border:1px solid #343b49;border-radius:18px;padding:28px"><div style="color:#f1d28b;font-weight:800;letter-spacing:1px">MATT TRANSPORT</div><h1 style="font-size:24px">${title}</h1><p style="color:#c5cbd5;line-height:1.7">${message}</p><p style="color:#9ca5b3;font-size:13px">W razie pytań: kontakt@matt-transport.pl · +48 691 242 691</p></main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: payment, error } = await admin
    .from("admin_stripe_payments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !payment) {
    return statusPage("Link nieaktywny", "Nie znaleziono płatności. Skontaktuj się z MATT TRANSPORT.", 404);
  }

  if (payment.status === "succeeded" || payment.status === "paid") {
    return statusPage("Płatność opłacona", "Dziękujemy. Płatność została już zaksięgowana. Nie musisz wykonywać kolejnej płatności.");
  }

  if (payment.status === "refunded") {
    return statusPage("Płatność zwrócona", "Ta płatność została zwrócona i nie można jej ponownie opłacić.", 410);
  }

  if (payment.status !== "pending") {
    return statusPage("Płatność niedostępna", "Ta płatność nie jest już aktywna. Skontaktuj się z MATT TRANSPORT.", 410);
  }

  const stripe = getStripe();
  let previousSession: any = null;

  if (payment.checkout_session_id) {
    try {
      previousSession = await stripe.checkout.sessions.retrieve(payment.checkout_session_id);
    } catch {
      return statusPage("Weryfikacja płatności", "Nie możemy teraz bezpiecznie zweryfikować poprzedniej sesji Stripe. Spróbuj ponownie za chwilę lub skontaktuj się z nami.", 503);
    }

    if (previousSession.payment_status === "paid") {
      return statusPage("Płatność w trakcie księgowania", "Stripe potwierdził płatność. Poczekaj chwilę na aktualizację statusu — nie rozpoczynaj kolejnej płatności.");
    }

    if (previousSession.status === "open" && previousSession.url) {
      return NextResponse.redirect(previousSession.url, 303);
    }

    if (previousSession.status === "complete") {
      return statusPage("Płatność w trakcie weryfikacji", "Poprzednia sesja Stripe została zakończona. Sprawdzamy jej status — nie wykonuj kolejnej płatności.", 409);
    }
  }

  const amount = Number(payment.amount_cents);
  if (!Number.isInteger(amount) || amount <= 0 || String(payment.currency || "").toLowerCase() !== "pln") {
    return statusPage("Błąd płatności", "Dane kwoty lub waluty są nieprawidłowe. Skontaktuj się z MATT TRANSPORT.", 400);
  }

  const base = appBaseUrl();
  const metadata: Record<string, string> = {
    source: "matt_admin_payment",
    admin_stripe_payment_id: String(payment.id),
    payment_method: String(payment.payment_method || "auto")
  };
  if (payment.booking_id) metadata.booking_id = String(payment.booking_id);
  if (payment.wedding_booking_id) metadata.wedding_booking_id = String(payment.wedding_booking_id);

  const checkoutPayload: any = {
    mode: "payment",
    customer_email: payment.customer_email || undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "pln",
        unit_amount: amount,
        product_data: {
          name: `MATT TRANSPORT · ${String(payment.description || "Płatność").slice(0, 100)}`,
          description: String(payment.description || "Płatność MATT TRANSPORT").slice(0, 450)
        }
      }
    }],
    metadata,
    payment_intent_data: { metadata },
    success_url: `${base}/panel/platnosc?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/pay/${payment.id}?payment=cancelled`
  };

  const method = String(payment.payment_method || "auto");
  if (["card", "blik", "p24"].includes(method)) checkoutPayload.payment_method_types = [method];

  const idempotencyKey = `matt-admin-payment-${payment.id}-after-${payment.checkout_session_id || "initial"}`;
  let checkout;
  try {
    checkout = await stripe.checkout.sessions.create(checkoutPayload, { idempotencyKey });
  } catch {
    return statusPage("Nie udało się uruchomić płatności", "Stripe chwilowo nie utworzył sesji. Odśwież stronę za chwilę — nie zostanie pobrana żadna opłata.", 503);
  }

  const stableUrl = `${base}/pay/${payment.id}`;
  let updateQuery = admin
    .from("admin_stripe_payments")
    .update({
      checkout_session_id: checkout.id,
      checkout_url: stableUrl,
      updated_at: new Date().toISOString()
    })
    .eq("id", payment.id)
    .eq("status", "pending");

  updateQuery = payment.checkout_session_id
    ? updateQuery.eq("checkout_session_id", payment.checkout_session_id)
    : updateQuery.is("checkout_session_id", null);

  const { data: saved, error: saveError } = await updateQuery.select("id").maybeSingle();

  if (saveError || !saved) {
    try { await stripe.checkout.sessions.expire(checkout.id); } catch {}
    return statusPage("Odśwież link", "Płatność została równolegle zaktualizowana. Otwórz ten sam link ponownie, aby przejść do aktualnej sesji.", 409);
  }

  if (!checkout.url) {
    return statusPage("Błąd płatności", "Stripe nie zwrócił adresu sesji. Skontaktuj się z MATT TRANSPORT.", 502);
  }

  return NextResponse.redirect(checkout.url, 303);
}
