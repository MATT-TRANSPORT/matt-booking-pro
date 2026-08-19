import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";
import { PRICES } from "@/lib/pricing";
import { expireCheckoutSession } from "@/lib/stripeServer";
import { syncBookingCalendar } from "@/lib/googleCalendar";

const EDITABLE_STATUSES = ["pending", "confirmed", "assigned"];

function cleanNip(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 10);
}

async function getBooking(token: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("*,drivers(full_name,phone),vehicles(name,registration)")
    .eq("customer_access_token", token)
    .single();
  return data;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const booking = await getBooking(token);

  if (!booking) {
    return NextResponse.json({ error: "Rezerwacja nie istnieje lub link wygasł." }, { status: 404 });
  }

  return NextResponse.json({
    booking,
    editable: EDITABLE_STATUSES.includes(booking.status)
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();
  const booking = await getBooking(token);

  if (!booking) {
    return NextResponse.json({ error: "Rezerwacja nie istnieje lub link wygasł." }, { status: 404 });
  }

  if (booking.payment_status === "paid") {
    return NextResponse.json(
      {
        error:
          "Opłaconej rezerwacji nie można samodzielnie zmieniać. Skontaktuj się z MATT TRANSPORT: +48 691 242 691."
      },
      { status: 409 }
    );
  }

  if (!EDITABLE_STATUSES.includes(booking.status)) {
    return NextResponse.json(
      { error: "Ta rezerwacja jest już w realizacji i nie może być samodzielnie edytowana." },
      { status: 409 }
    );
  }

  const body = await req.json();

  const passengers = Math.max(1, Math.min(8, Number(body.passengers ?? booking.passengers)));
  const vehicleType = passengers > 3 ? "bus" : String(body.vehicleType ?? booking.vehicle_type);
  const invoiceRequired = Boolean(body.invoiceRequired);
  const nip = invoiceRequired ? cleanNip(body.companyNip) : null;

  if (invoiceRequired && nip?.length !== 10) {
    return NextResponse.json({ error: "Podaj poprawny 10-cyfrowy NIP." }, { status: 400 });
  }

  const airport = String(booking.airport_key);
  if (!(airport in PRICES)) {
    return NextResponse.json({ error: "Nie udało się odczytać cennika tej rezerwacji. Skontaktuj się z MATT TRANSPORT." }, { status: 400 });
  }

  // Zachowujemy obecny dystans. Zmiana adresu wymaga ponownego potwierdzenia przez MATT,
  // więc cena nie jest automatycznie obiecywana klientowi.
  const routeChanged = String(body.pickupAddress ?? booking.pickup_address).trim() !== String(booking.pickup_address ?? "").trim();
  const dateChanged =
    String(body.travelDate ?? booking.travel_date) !== String(booking.travel_date) ||
    String(body.travelTime ?? booking.travel_time) !== String(booking.travel_time);

  const price = PRICES[airport as keyof typeof PRICES];
  const multiplier = booking.service_type === "roundtrip" ? 2 : 1;
  const base = Number(price[vehicleType as "car" | "bus"]) * multiplier;
  const extra = Math.max(0, Number(booking.distance_km ?? 0) - 40) * 2.4 * multiplier;
  const subtotal = base + extra;
  const vat = invoiceRequired ? subtotal * 0.08 : 0;
  const total = subtotal + vat;
  const priceChanged =
    Math.round(Number(booking.total_price || 0) * 100) !==
    Math.round(total * 100);
  const requiresReconfirmation =
    routeChanged || dateChanged || priceChanged;

  if (requiresReconfirmation) {
    await expireCheckoutSession(
      booking.payment_checkout_session_id
    );
  }

  const newStatus = requiresReconfirmation
    ? "pending"
    : booking.status;

  const update = {
    pickup_address: String(body.pickupAddress ?? booking.pickup_address).trim(),
    travel_date: body.travelDate ?? booking.travel_date,
    travel_time: body.travelTime ?? booking.travel_time,
    return_date: body.returnDate || null,
    return_time: body.returnTime || null,
    flight_number: String(body.flightNumber ?? "").trim() || null,
    return_flight_number: String(body.returnFlightNumber ?? "").trim() || null,
    passengers,
    vehicle_type: vehicleType,
    invoice_required: invoiceRequired,
    company_nip: nip,
    notes: String(body.notes ?? "").trim() || null,
    total_price: total,
    status: newStatus,
    ...(requiresReconfirmation
      ? {
          payment_status: "pending",
          payment_provider: null,
          payment_checkout_session_id: null,
          payment_intent_id: null,
          payment_amount_cents: null,
          payment_paid_at: null,
          payment_last_error: null,
          payment_review_reason: null
        }
      : {}),
    customer_last_edited_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: updated, error } = await admin
    .from("bookings")
    .update(update)
    .eq("id", booking.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("booking_history").insert({
    booking_id: booking.id,
    event: requiresReconfirmation
      ? "Klient zmienił rezerwację — wymaga ponownego potwierdzenia i nowej płatności."
      : "Klient zaktualizował dane rezerwacji.",
    created_by: null
  });


  await syncBookingCalendar(
    admin,
    updated
  );

  const panelBase = process.env.NEXT_PUBLIC_APP_URL || "https://matt-booking-pro.vercel.app";
  const adminUrl = `${panelBase}/panel/rezerwacje/${booking.id}`;

  await sendMattEmail({
    to: process.env.ADMIN_EMAIL || "kontakt@matt-transport.pl",
    subject: `Klient zmienił rezerwację ${booking.booking_number}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px">
        <div style="max-width:650px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:16px;padding:28px">
          <h2 style="color:#f1d28b">MATT TRANSPORT</h2>
          <h1>Klient zmienił rezerwację</h1>
          <p>Numer: <strong>${booking.booking_number}</strong></p>
          <p>${requiresReconfirmation ? "Zmiana danych lub ceny wymaga ponownego potwierdzenia. Poprzednia sesja płatności została unieważniona." : "Zaktualizowano dane rezerwacji."}</p>
          <p><a href="${adminUrl}" style="display:inline-block;background:#d5ae5d;color:#111;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:bold">OTWÓRZ REZERWACJĘ W PANELU</a></p>
        </div>
      </div>
    `
  }).catch(() => null);

  return NextResponse.json({
    booking: updated,
    requiresReconfirmation
  });
}
