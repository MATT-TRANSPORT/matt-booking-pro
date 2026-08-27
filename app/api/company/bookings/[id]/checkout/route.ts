import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appBaseUrl, paymentCanStart } from "@/lib/payment";
import { getStripe } from "@/lib/stripeServer";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const { data: membership } = await auth
    .from("company_users")
    .select("company_id,role")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Brak aktywnego dostępu do firmy." }, { status: 403 });
  }

  // Płatność może uruchomić administrator/manager/księgowość firmy.
  if (!["admin", "manager", "accounting"].includes(String(membership.role || ""))) {
    return NextResponse.json({ error: "Brak uprawnień do płatności firmowej." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("company_id", membership.company_id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });
  }

  // Wartość employee_payment zachowujemy w bazie dla kompatybilności wstecznej,
  // ale od v4.1 w UI oznacza ona po prostu PŁATNOŚĆ ONLINE FIRMY.
  if (booking.payment_method !== "employee_payment") {
    return NextResponse.json(
      { error: "Ta rezerwacja jest rozliczana przelewem firmowym." },
      { status: 400 }
    );
  }

  if (!paymentCanStart(booking)) {
    const payment = String(booking.payment_status || "pending");
    return NextResponse.json(
      {
        error:
          payment === "paid"
            ? "Ta rezerwacja jest już opłacona."
            : payment === "review"
            ? "Płatność wymaga weryfikacji przez MATT TRANSPORT."
            : "Płatność online będzie dostępna po potwierdzeniu rezerwacji przez MATT TRANSPORT."
      },
      { status: 409 }
    );
  }

  const payableAmount = Number(booking.price_gross ?? booking.total_price ?? 0);
  const amount = Math.round(payableAmount * 100);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Nieprawidłowa kwota płatności." }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const base = appBaseUrl();
    const metadata = {
      booking_id: String(booking.id),
      booking_number: String(booking.booking_number),
      payment_kind: "company_booking"
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: String(booking.id),
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
      success_url: `${base}/firma/rezerwacje/${booking.id}?payment=success`,
      cancel_url: `${base}/firma/rezerwacje/${booking.id}?payment=cancelled`
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
      event: `Firma uruchomiła Stripe Checkout: ${payableAmount.toFixed(2)} zł brutto`,
      created_by: user.id
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się uruchomić płatności.";
    await admin
      .from("bookings")
      .update({ payment_last_error: message, updated_at: new Date().toISOString() })
      .eq("id", booking.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
