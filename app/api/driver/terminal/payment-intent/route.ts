import { NextRequest, NextResponse } from "next/server";
import { driverFromBearerRequest } from "@/lib/driverMobileAuth";
import { getStripe } from "@/lib/stripeServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function amountFromBooking(booking: any) {
  const gross = Number(
    booking.company_id
      ? (booking.price_gross ?? booking.total_price ?? 0)
      : (booking.total_price ?? 0)
  );

  if (!Number.isFinite(gross) || gross < 0) {
    return 0;
  }

  return Math.round(gross * 100);
}

export async function POST(req: NextRequest) {
  const auth = await driverFromBearerRequest(req);

  if (!auth) {
    return NextResponse.json({ error: "Brak autoryzacji kierowcy." }, { status: 401 });
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane płatności." }, { status: 400 });
  }

  const bookingId = String(body?.bookingId || "");
  const leg = body?.leg === "return" ? "return" : "primary";
  const surchargeAmountCents = Math.round(Number(body?.surchargeAmountCents || 0));
  const surchargeReason = String(body?.surchargeReason || "").trim().slice(0, 500);

  if (!bookingId) {
    return NextResponse.json({ error: "Brak rezerwacji." }, { status: 400 });
  }

  if (!Number.isInteger(surchargeAmountCents) || surchargeAmountCents < 0) {
    return NextResponse.json({ error: "Nieprawidłowa kwota dopłaty." }, { status: 400 });
  }

  if (surchargeAmountCents > 10000000) {
    return NextResponse.json({ error: "Dopłata przekracza dozwolony limit." }, { status: 400 });
  }

  if (surchargeAmountCents > 0 && !surchargeReason) {
    return NextResponse.json(
      { error: "Przy dopłacie wymagany jest powód dopłaty." },
      { status: 400 }
    );
  }

  const { admin, driver } = auth;

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });
  }

  const assigned =
    leg === "return"
      ? String(booking.return_driver_id || "") === String(driver.id)
      : String(booking.driver_id || "") === String(driver.id);

  if (!assigned) {
    return NextResponse.json(
      { error: "Ta rezerwacja nie jest przypisana do tego kierowcy." },
      { status: 403 }
    );
  }

  if (["cancelled", "completed"].includes(String(booking.status || ""))) {
    return NextResponse.json(
      { error: "Nie można pobrać płatności za zamkniętą rezerwację." },
      { status: 409 }
    );
  }

  const baseAmountCents =
    booking.payment_status === "paid" ? 0 : amountFromBooking(booking);

  const totalAmountCents = baseAmountCents + surchargeAmountCents;

  if (totalAmountCents <= 0) {
    return NextResponse.json(
      { error: "Brak kwoty do pobrania. Wpisz dopłatę, jeśli klient ma coś jeszcze do zapłaty." },
      { status: 400 }
    );
  }

  const { data: payment, error: insertError } = await admin
    .from("driver_card_payments")
    .insert({
      booking_id: booking.id,
      driver_id: driver.id,
      leg,
      base_amount_cents: baseAmountCents,
      surcharge_amount_cents: surchargeAmountCents,
      surcharge_reason: surchargeReason || null,
      total_amount_cents: totalAmountCents,
      currency: "pln",
      status: "pending"
    })
    .select("id")
    .single();

  if (insertError || !payment) {
    console.error("driver_card_payments insert:", insertError);
    return NextResponse.json(
      { error: "Nie udało się przygotować płatności." },
      { status: 500 }
    );
  }

  try {
    const stripe = getStripe();

    const intent = await stripe.paymentIntents.create(
      {
        amount: totalAmountCents,
        currency: "pln",
        payment_method_types: ["card_present"],
        description: `MATT TRANSPORT · ${booking.booking_number}`,
        metadata: {
          source: "matt_driver_terminal",
          driver_card_payment_id: payment.id,
          booking_id: booking.id,
          booking_number: booking.booking_number,
          driver_id: driver.id,
          leg,
          base_amount_cents: String(baseAmountCents),
          surcharge_amount_cents: String(surchargeAmountCents),
          surcharge_reason: surchargeReason || ""
        }
      },
      {
        idempotencyKey: `matt-driver-terminal-${payment.id}`
      }
    );

    await admin
      .from("driver_card_payments")
      .update({
        payment_intent_id: intent.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", payment.id);

    return NextResponse.json({
      paymentId: payment.id,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      baseAmountCents,
      surchargeAmountCents,
      totalAmountCents,
      currency: "pln"
    });
  } catch (error) {
    await admin
      .from("driver_card_payments")
      .update({
        status: "failed",
        failure_reason: error instanceof Error ? error.message : "Stripe error",
        updated_at: new Date().toISOString()
      })
      .eq("id", payment.id);

    console.error("Stripe Terminal PaymentIntent:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się utworzyć płatności Stripe." },
      { status: 500 }
    );
  }
}
