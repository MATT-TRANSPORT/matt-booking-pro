import { customerJson, requestCustomerLocale } from "@/lib/customerErrors";
import { customerText } from "@/lib/customerCopy";
import { resolveCustomerLocale } from "@/lib/bookingLocale";
import {
  NextRequest,
  NextResponse
} from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  appBaseUrl,
  onlinePaymentEligible,
  paymentCanStart
} from "@/lib/payment";
import { getStripe } from "@/lib/stripeServer";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  let responseLocale=requestCustomerLocale(_req);
  const json=(payload:any,init?:ResponseInit)=>customerJson(responseLocale,payload,init);
  const { token } = await params;
  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("*")
    .eq("customer_access_token", token)
    .single();
 responseLocale=requestCustomerLocale(_req,booking?.customer_locale);

  const t = (key: string) => customerText(key, booking?.customer_locale);

  if (!booking) {
    return json(
      { error: t("Nie znaleziono rezerwacji.") },
      { status: 404 }
    );
  }

  if (booking.company_id) {
    return json(
      { error: t("Płatność B2B uruchamia administrator firmy bezpośrednio w portalu firmowym.") },
      { status: 400 }
    );
  }

  if (!onlinePaymentEligible(booking)) {
    return json(
      {
        error: booking.company_id
          ? "Ta rezerwacja jest rozliczana przelewem firmowym."
          : "Płatność online nie została wybrana przy składaniu tej rezerwacji."
      },
      { status: 400 }
    );
  }

  if (booking.payment_status === "paid") {
    return json(
      { error: t("Ta rezerwacja jest już opłacona.") },
      { status: 409 }
    );
  }

  if (booking.payment_status === "refunded") {
    return json(
      {
        error:
          t("Dla tej rezerwacji wykonano zwrot. Skontaktuj się z MATT TRANSPORT.")
      },
      { status: 409 }
    );
  }

  if (booking.payment_status === "review") {
    return json(
      {
        error:
          t("Płatność wymaga weryfikacji przez MATT TRANSPORT.")
      },
      { status: 409 }
    );
  }

  if (!paymentCanStart(booking)) {
    return json(
      {
        error:
          t("Płatność online będzie dostępna po potwierdzeniu rezerwacji przez MATT TRANSPORT.")
      },
      { status: 409 }
    );
  }

  const payableAmount = Number(
    booking.company_id
      ? booking.price_gross ?? booking.total_price ?? 0
      : booking.total_price ?? 0
  );

  const amount = Math.round(payableAmount * 100);

  if (!Number.isFinite(amount) || amount <= 0) {
    return json(
      { error: t("Nieprawidłowa kwota płatności.") },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    const base = appBaseUrl();

    const metadata = {
      booking_id: String(booking.id),
      booking_number: String(booking.booking_number),
      payment_kind:
        booking.company_id
          ? "employee_booking"
          : "private_booking"
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: resolveCustomerLocale(booking.customer_locale),
      client_reference_id: String(booking.id),
      customer_email: booking.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "pln",
            unit_amount: amount,
            product_data: {
              name: `MATT TRANSPORT · ${booking.booking_number}`,
              description: (
                `${booking.travel_date} ${String(booking.travel_time).slice(0, 5)} · ` +
                `${booking.pickup_address} → ${booking.airport_label}`
              ).slice(0, 450)
            }
          }
        }
      ],
      metadata,
      payment_intent_data: {
        metadata
      },
      success_url:
        `${base}/rezerwacja/${token}` +
        `?lang=${resolveCustomerLocale(booking.customer_locale)}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        `${base}/rezerwacja/${token}?lang=${resolveCustomerLocale(booking.customer_locale)}&payment=cancelled`
    });

    await admin
      .from("bookings")
      .update({
        payment_provider: "stripe",
        payment_checkout_session_id: session.id,
        payment_amount_cents: amount,
        payment_currency: "pln",
        payment_status: "pending",
        payment_last_error: null,
        payment_review_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", booking.id);

    await admin.from("booking_history").insert({
      booking_id: booking.id,
      event:
        `Utworzono płatność online Stripe: ${payableAmount.toFixed(2)} zł${booking.company_id ? " brutto" : ""}`,
      created_by: null
    });

    return json({
      ok: true,
      url: session.url,
      session_id: session.id
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nie udało się utworzyć płatności.";

    await admin
      .from("bookings")
      .update({
        payment_last_error: message,
        updated_at: new Date().toISOString()
      })
      .eq("id", booking.id);

    return json(
      { error: message },
      { status: 500 }
    );
  }
}
