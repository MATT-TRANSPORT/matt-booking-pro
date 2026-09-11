import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { shortestDrivingRouteKm } from "@/lib/routesServer";
import { sendMattEmail } from "@/lib/email";
import { sendAdminPush } from "@/lib/pushServer";

export const runtime = "nodejs";

function appBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "https://panel.matt-transport.pl").replace(/\/$/, "");
}

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] || ch));
}

function vehicleLabel(value: string) {
  if (value === "car") return "Samochód osobowy";
  if (value === "bus") return "Bus do 8 pasażerów";
  if (value === "coach") return "Autokar do 30 pasażerów";
  return "Dobierzcie najlepszy pojazd";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const origin = String(body.origin || "").trim();
  const destination = String(body.destination || "").trim();
  const travelDate = String(body.travelDate || "").trim();
  const travelTime = String(body.travelTime || "").trim();
  const roundtrip = Boolean(body.roundtrip);
  const returnDate = roundtrip ? String(body.returnDate || "").trim() : "";
  const returnTime = roundtrip ? String(body.returnTime || "").trim() : "";
  const customerName = String(body.customerName || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim();
  const passengers = Math.max(1, Math.min(30, Number(body.passengers || 1)));
  const requestedVehicle = ["auto", "car", "bus", "coach"].includes(String(body.vehicleType)) ? String(body.vehicleType) : "auto";
  const category = ["private", "event", "school_club", "employee", "other"].includes(String(body.category)) ? String(body.category) : "other";
  const notes = String(body.notes || "").trim().slice(0, 4000) || null;

  if (!origin || !destination || !travelDate || !travelTime || !customerName || !phone || !email) {
    return NextResponse.json({ error: "Uzupełnij punkt A, punkt B, termin i dane kontaktowe." }, { status: 400 });
  }
  if (roundtrip && (!returnDate || !returnTime)) {
    return NextResponse.json({ error: "Podaj datę i godzinę powrotu." }, { status: 400 });
  }

  const when = new Date(`${travelDate}T${travelTime}`);
  if (!Number.isFinite(when.getTime()) || when.getTime() - Date.now() < 24 * 3600 * 1000) {
    return NextResponse.json({ error: "Rezerwacja online wymaga minimum 24 godzin wyprzedzenia. W pilnej sprawie zadzwoń: +48 691 242 691" }, { status: 400 });
  }
  if (roundtrip) {
    const back = new Date(`${returnDate}T${returnTime}`);
    if (!Number.isFinite(back.getTime()) || back.getTime() <= when.getTime()) {
      return NextResponse.json({ error: "Termin powrotu musi być późniejszy niż wyjazd." }, { status: 400 });
    }
  }

  let route;
  try {
    route = await shortestDrivingRouteKm(origin, destination);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się obliczyć trasy." }, { status: 400 });
  }

  const admin = createAdminClient();
  const serviceType = roundtrip ? "point_to_point_roundtrip" : "point_to_point";
  const { data, error } = await admin.from("bookings").insert({
    service_type: serviceType,
    pickup_address: origin,
    destination_address: destination,
    airport_key: "point_to_point",
    airport_label: destination,
    travel_date: travelDate,
    travel_time: travelTime,
    return_date: roundtrip ? returnDate : null,
    return_time: roundtrip ? returnTime : null,
    passengers,
    vehicle_type: requestedVehicle,
    distance_km: Number(route.distanceKm || 0),
    customer_name: customerName,
    phone,
    email,
    invoice_required: Boolean(body.invoiceRequired),
    base_price: 0,
    extra_price: 0,
    vat_price: 0,
    total_price: 0,
    status: "pending",
    booking_source: "public_general",
    acquisition_source: "direct",
    landing_page: "/transport",
    payment_method: "quote",
    payment_status: "pending",
    customer_notification_channel: "email",
    transport_category: category,
    quote_required: true,
    quote_status: "pending",
    notes
  }).select("*").single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Nie udało się zapisać zgłoszenia." }, { status: 500 });
  }

  await admin.from("booking_history").insert({
    booking_id: data.id,
    event: `Transport A→B do wyceny · ${origin} → ${destination} · ${route.distanceKm} km · ${passengers} os. · ${vehicleLabel(requestedVehicle)}`,
    created_by: null
  });

  const portalUrl = data.customer_access_token ? `${appBaseUrl()}/rezerwacja/${data.customer_access_token}` : appBaseUrl();
  const details = `${esc(origin)} → ${esc(destination)}${roundtrip ? ` → ${esc(origin)}` : ""}`;
  let customerEmailSent = false;
  let adminEmailSent = false;

  try {
    const result = await sendMattEmail({
      to: email,
      subject: `Przyjęliśmy zapytanie o transport – ${data.booking_number}`,
      html: `<div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px"><div style="max-width:650px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:16px;padding:28px"><h2 style="color:#f1d28b">MATT TRANSPORT</h2><h1>Zapytanie przyjęte</h1><p>Dziękujemy. Przygotujemy indywidualną wycenę transportu.</p><p><strong>${esc(data.booking_number)}</strong><br>${details}<br>${esc(travelDate)} · ${esc(travelTime)} · ${passengers} os.</p><p><a href="${portalUrl}" style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 20px;border-radius:11px;text-decoration:none;font-weight:800">OTWÓRZ REZERWACJĘ</a></p></div></div>`
    });
    customerEmailSent = Boolean(result.sent);
  } catch (mailError) {
    console.error("General transport customer email:", mailError);
  }

  try {
    const result = await sendMattEmail({
      to: process.env.ADMIN_EMAIL || "kontakt@matt-transport.pl",
      subject: `🚐 NOWY TRANSPORT A→B · ${data.booking_number}`,
      html: `<div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px"><div style="max-width:650px;margin:auto;background:#151923;border:1px solid #d5ae5d;border-radius:16px;padding:28px"><h2 style="color:#f1d28b">MATT Booking PRO</h2><h1>Nowe zapytanie do wyceny</h1><p><strong>${esc(customerName)}</strong> · ${esc(phone)}</p><p>${details}<br>${esc(travelDate)} · ${esc(travelTime)} · ${route.distanceKm} km · ${passengers} os.</p><p><a href="${appBaseUrl()}/panel/rezerwacje/${data.id}" style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 20px;border-radius:11px;text-decoration:none;font-weight:800">OTWÓRZ W PANELU</a></p></div></div>`
    });
    adminEmailSent = Boolean(result.sent);
  } catch (mailError) {
    console.error("General transport admin email:", mailError);
  }

  let adminPushSent = 0;
  try {
    const push = await sendAdminPush(admin, {
      title: "🚐 NOWY TRANSPORT A→B",
      body: `${data.booking_number} · ${customerName} · ${origin} → ${destination} · ${travelDate} ${travelTime}`.slice(0, 190),
      url: `/panel/rezerwacje/${data.id}`,
      tag: `new-general-${data.id}`
    });
    adminPushSent = Number(push.sent || 0);
  } catch (pushError) {
    console.error("General transport admin push:", pushError);
  }

  return NextResponse.json({
    ...data,
    distance_km: route.distanceKm,
    customer_email_sent: customerEmailSent,
    admin_email_sent: adminEmailSent,
    admin_push_sent: adminPushSent
  });
}
