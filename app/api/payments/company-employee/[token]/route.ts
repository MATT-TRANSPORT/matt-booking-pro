import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appBaseUrl, paymentCanStart } from "@/lib/payment";
import { expireCheckoutSession, getStripe } from "@/lib/stripeServer";

export const runtime = "nodejs";

async function getBooking(token: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("*")
    .eq("customer_access_token", token)
    .maybeSingle();

  return { admin, booking: data };
}

function safeSummary(booking: any) {
  return {
    booking_number: booking.booking_number,
    customer_name: booking.customer_name,
    travel_date: booking.travel_date,
    travel_time: String(booking.travel_time || "").slice(0, 5),
    pickup_address: booking.pickup_address,
    airport_label: booking.airport_label,
    service_type: booking.service_type,
    return_date: booking.return_date,
    return_time: booking.return_time ? String(booking.return_time).slice(0, 5) : null,
    amount: Number(booking.price_gross ?? booking.total_price ?? 0),
    payment_status: booking.payment_status || "pending",
    booking_status: booking.status
  };
}

function validateB2BEmployeePayment(booking: any) {
  if (!booking) return "Nie znaleziono rezerwacji. / Booking not found.";
  if (!booking.company_id) return "Ten link nie dotyczy rezerwacji firmowej. / This link is not for a company booking.";
  if (booking.payment_method !== "employee_payment") {
    return "Ta rezerwacja jest rozliczana przelewem firmowym. / This booking is settled by company bank transfer.";
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { booking } = await getBooking(token);
  const error = validateB2BEmployeePayment(booking);

  if (error) {
    return NextResponse.json({ error }, { status: booking ? 400 : 404 });
  }

  return NextResponse.json({ booking: safeSummary(booking) });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { admin, booking } = await getBooking(token);
  const validationError = validateB2BEmployeePayment(booking);

  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: booking ? 400 : 404 }
    );
  }

  if (booking.payment_status === "paid") {
    return NextResponse.json(
      { error: "Ta rezerwacja jest już opłacona. / This booking has already been paid." },
      { status: 409 }
    );
  }

  if (booking.payment_status === "refunded") {
    return NextResponse.json(
      { error: "Dla tej rezerwacji wykonano zwrot. Skontaktuj się z MATT TRANSPORT. / This booking has been refunded. Please contact MATT TRANSPORT." },
      { status: 409 }
    );
  }

  if (booking.payment_status === "review") {
    return NextResponse.json(
      { error: "Płatność wymaga weryfikacji przez MATT TRANSPORT. / The payment requires verification by MATT TRANSPORT." },
      { status: 409 }
    );
  }

  if (!paymentCanStart(booking)) {
    return NextResponse.json(
      { error: "Płatność będzie dostępna po potwierdzeniu rezerwacji. / Payment will be available after the booking is confirmed." },
      { status: 409 }
    );
  }

  const payableAmount = Number(booking.price_gross ?? booking.total_price ?? 0);
  const amount = Math.round(payableAmount * 100);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Nieprawidłowa kwota płatności. / Invalid payment amount." },
      { status: 400 }
    );
  }

  try {
    await expireCheckoutSession(booking.payment_checkout_session_id);

    const stripe = getStripe();
    const base = appBaseUrl();
    const metadata = {
      booking_id: String(booking.id),
      booking_number: String(booking.booking_number),
      payment_kind: "employee_booking"
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
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
                `${booking.travel_date} ${String(booking.travel_time || "").slice(0, 5)} · ` +
                `${booking.pickup_address} → ${booking.airport_label}`
              ).slice(0, 450)
            }
          }
        }
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${base}/platnosc/${token}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/platnosc/${token}?payment=cancelled`
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
      event: `Pracownik uruchomił Stripe Checkout z linku B2B: ${payableAmount.toFixed(2)} zł brutto`,
      created_by: null
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się uruchomić płatności.";

    await admin
      .from("bookings")
      .update({ payment_last_error: message, updated_at: new Date().toISOString() })
      .eq("id", booking.id);

    return NextResponse.json(
      { error: `${message} / Unable to start payment.` },
      { status: 500 }
    );
  }
}
