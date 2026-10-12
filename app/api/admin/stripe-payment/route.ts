import { NextRequest, NextResponse } from "next/server";
import { apiAdmin } from "@/lib/apiAdmin";
import { getStripe } from "@/lib/stripeServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const METHODS = new Set(["auto", "card", "blik", "p24"]);

function panelBaseUrl() {
  const configured = String(process.env.NEXT_PUBLIC_PANEL_URL || "")
    .trim()
    .replace(/\/$/, "");

  if (configured && !configured.includes("vercel.app")) {
    return configured;
  }

  return "https://panel.matt-transport.pl";
}

export async function POST(req: NextRequest) {
  const session = await apiAdmin();

  if ("error" in session) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  const body = await req.json().catch(() => ({}));
  const amountPln = Number(String(body.amount || "").replace(",", "."));
  const amountCents = Math.round(amountPln * 100);
  const paymentMethod = METHODS.has(String(body.paymentMethod || "auto"))
    ? String(body.paymentMethod || "auto")
    : "auto";
  const bookingId = String(body.bookingId || "").trim() || null;
  const weddingBookingId = String(body.weddingBookingId || "").trim() || null;
  let customerEmail = String(body.customerEmail || "").trim() || null;
  let description = String(body.description || "").trim().slice(0, 450);

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json(
      { error: "Podaj prawidłową kwotę płatności." },
      { status: 400 }
    );
  }

  if (amountCents > 20_000_000) {
    return NextResponse.json(
      { error: "Kwota przekracza limit 200 000 zł." },
      { status: 400 }
    );
  }

  if (bookingId && weddingBookingId) {
    return NextResponse.json(
      { error: "Płatność może być przypisana tylko do jednego zlecenia." },
      { status: 400 }
    );
  }

  let reference = "Płatność MATT TRANSPORT";

  if (bookingId) {
    const { data: booking } = await session.admin
      .from("bookings")
      .select("id,booking_number,customer_name,email")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: "Nie znaleziono rezerwacji." },
        { status: 404 }
      );
    }

    reference = `${booking.booking_number} · ${booking.customer_name || "Klient"}`;
    customerEmail = customerEmail || booking.email || null;
  }

  if (weddingBookingId) {
    const { data: wedding } = await session.admin
      .from("wedding_bookings")
      .select("id,booking_number,customer_name,email")
      .eq("id", weddingBookingId)
      .single();

    if (!wedding) {
      return NextResponse.json(
        { error: "Nie znaleziono transportu weselnego." },
        { status: 404 }
      );
    }

    reference = `${wedding.booking_number} · ${wedding.customer_name || "Klient"}`;
    customerEmail = customerEmail || wedding.email || null;
  }

  description = description || reference;

  const { data: payment, error: insertError } = await session.admin
    .from("admin_stripe_payments")
    .insert({
      booking_id: bookingId,
      wedding_booking_id: weddingBookingId,
      created_by: session.user.id,
      amount_cents: amountCents,
      currency: "pln",
      payment_method: paymentMethod,
      status: "pending",
      description,
      customer_email: customerEmail
    })
    .select("*")
    .single();

  if (insertError || !payment) {
    return NextResponse.json(
      { error: insertError?.message || "Nie udało się utworzyć płatności." },
      { status: 500 }
    );
  }

  try {
    const stripe = getStripe();
    const metadata: Record<string, string> = {
      source: "matt_admin_payment",
      admin_stripe_payment_id: String(payment.id),
      payment_method: paymentMethod
    };

    if (bookingId) metadata.booking_id = bookingId;
    if (weddingBookingId) metadata.wedding_booking_id = weddingBookingId;

    const checkoutPayload: any = {
      mode: "payment",
      customer_email: customerEmail || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "pln",
            unit_amount: amountCents,
            product_data: {
              name: `MATT TRANSPORT · ${reference}`.slice(0, 120),
              description
            }
          }
        }
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url:
        `${panelBaseUrl()}/panel/platnosc?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        `${panelBaseUrl()}/panel/platnosc?payment=cancelled`
    };

    if (paymentMethod !== "auto") {
      checkoutPayload.payment_method_types = [paymentMethod];
    }

    const checkout = await stripe.checkout.sessions.create(checkoutPayload);

    await session.admin
      .from("admin_stripe_payments")
      .update({
        checkout_session_id: checkout.id,
        checkout_url: checkout.url || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", payment.id);

    return NextResponse.json({
      ok: true,
      paymentId: payment.id,
      sessionId: checkout.id,
      url: checkout.url
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe zwrócił błąd.";

    await session.admin
      .from("admin_stripe_payments")
      .update({
        status: "failed",
        failure_reason: message,
        updated_at: new Date().toISOString()
      })
      .eq("id", payment.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
