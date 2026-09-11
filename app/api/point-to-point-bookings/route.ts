import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";
import { sendNewBookingAdminPush } from "@/lib/adminNotifications";
import { bookingRouteText } from "@/lib/bookingRoute";

export const runtime = "nodejs";

function clean(value: unknown, max = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function warsawNowSerialMinutes() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return Math.floor(Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) / 60000);
}

function localSerialMinutes(date: string, time: string) {
  const m = `${date}T${time}`.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return Number.NaN;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])) / 60000);
}

async function shortestDrivingDistanceKm(origin: string, destination: string) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("Brak GOOGLE_MAPS_API_KEY.");

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration"
    },
    body: JSON.stringify({
      origin: { address: origin },
      destination: { address: destination },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      computeAlternativeRoutes: true,
      languageCode: "pl-PL",
      units: "METRIC"
    }),
    cache: "no-store"
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Nie udało się obliczyć trasy.");
  const routes = (data.routes ?? []).filter((x: any) => Number(x.distanceMeters) > 0).sort((a: any, b: any) => Number(a.distanceMeters) - Number(b.distanceMeters));
  if (!routes.length) throw new Error("Nie znaleziono trasy między punktem A i B.");
  return Math.round((Number(routes[0].distanceMeters) / 1000) * 10) / 10;
}

function vehicleLabel(value: string) {
  if (value === "coach") return "Autokar do 30 pasażerów";
  if (value === "bus") return "Bus do 8 pasażerów";
  return "Samochód osobowy";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const origin = clean(body.originAddress);
  const destination = clean(body.destinationAddress);
  const travelDate = clean(body.travelDate, 10);
  const travelTime = clean(body.travelTime, 5);
  const customerName = clean(body.customerName, 160);
  const phone = clean(body.phone, 60);
  const email = clean(body.email, 240);
  const notes = clean(body.notes, 2000) || null;
  const roundtrip = Boolean(body.roundtrip);
  const returnDate = roundtrip ? clean(body.returnDate, 10) : "";
  const returnTime = roundtrip ? clean(body.returnTime, 5) : "";
  const invoiceRequired = Boolean(body.invoiceRequired);
  const companyNip = invoiceRequired ? clean(body.companyNip, 20).replace(/\D/g, "").slice(0, 10) : null;
  const vehicleType = ["car", "bus", "coach"].includes(String(body.vehicleType)) ? String(body.vehicleType) : "car";
  const passengers = Math.max(1, Math.min(30, Math.round(Number(body.passengers || 1))));

  if (!origin || !destination || !travelDate || !travelTime || !customerName || !phone || !email) {
    return NextResponse.json({ error: "Uzupełnij wymagane pola." }, { status: 400 });
  }
  if (origin.toLowerCase() === destination.toLowerCase()) {
    return NextResponse.json({ error: "Punkt A i punkt B muszą być różne." }, { status: 400 });
  }
  if (invoiceRequired && companyNip?.length !== 10) {
    return NextResponse.json({ error: "Podaj poprawny 10-cyfrowy NIP." }, { status: 400 });
  }
  if (vehicleType === "car" && passengers > 3) {
    return NextResponse.json({ error: "Dla więcej niż 3 pasażerów wybierz bus lub autokar." }, { status: 400 });
  }
  if (vehicleType === "bus" && passengers > 8) {
    return NextResponse.json({ error: "Dla więcej niż 8 pasażerów wybierz autokar." }, { status: 400 });
  }

  const startSerial = localSerialMinutes(travelDate, travelTime);
  if (!Number.isFinite(startSerial) || startSerial - warsawNowSerialMinutes() < 24 * 60) {
    return NextResponse.json({ error: "Rezerwacja online wymaga minimum 24 godzin wyprzedzenia. W pilnej sprawie zadzwoń: +48 691 242 691" }, { status: 400 });
  }
  if (roundtrip) {
    if (!returnDate || !returnTime) return NextResponse.json({ error: "Podaj datę i godzinę powrotu." }, { status: 400 });
    const returnSerial = localSerialMinutes(returnDate, returnTime);
    if (!Number.isFinite(returnSerial) || returnSerial <= startSerial) {
      return NextResponse.json({ error: "Powrót musi być później niż przejazd z punktu A do B." }, { status: 400 });
    }
  }

  let distanceKm = 0;
  try {
    distanceKm = await shortestDrivingDistanceKm(origin, destination);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się obliczyć trasy." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("bookings").insert({
    booking_category: "point_to_point",
    destination_address: destination,
    price_quote_required: true,
    service_type: roundtrip ? "roundtrip" : "point_to_point",
    pickup_address: origin,
    airport_key: "point_to_point",
    airport_label: destination,
    travel_date: travelDate,
    travel_time: travelTime,
    return_date: roundtrip ? returnDate : null,
    return_time: roundtrip ? returnTime : null,
    passengers,
    vehicle_type: vehicleType,
    distance_km: distanceKm,
    customer_name: customerName,
    phone,
    email,
    invoice_required: invoiceRequired,
    company_nip: companyNip,
    base_price: 0,
    extra_price: 0,
    vat_price: 0,
    total_price: 0,
    status: "pending",
    booking_source: "public_point_to_point",
    acquisition_source: "matt_booking",
    landing_page: "/transport",
    payment_method: "quote_pending",
    payment_status: "pending",
    customer_notification_channel: "email",
    notes
  }).select("*").single();

  if (error || !data) return NextResponse.json({ error: error?.message || "Nie udało się zapisać zgłoszenia." }, { status: 500 });

  await admin.from("booking_history").insert({
    booking_id: data.id,
    event: `Transport A → B · wycena indywidualna · ${origin} → ${destination} · ${distanceKm.toFixed(1)} km · ${vehicleLabel(vehicleType)}${roundtrip ? ` · powrót ${returnDate} ${returnTime}` : ""}`,
    created_by: null
  });

  const route = bookingRouteText(data);
  const customerHtml = `<div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px"><div style="max-width:650px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:16px;padding:28px"><h2 style="color:#f1d28b">MATT TRANSPORT</h2><h1>Otrzymaliśmy zapytanie o transport</h1><p>Numer: <strong>${data.booking_number}</strong></p><p>${travelDate} · ${travelTime}</p><p>${route}</p><p>${vehicleLabel(vehicleType)} · ${passengers} os.</p><p style="color:#aab1bc;line-height:1.7">To przejazd z wyceną indywidualną. Sprawdzimy dostępność i skontaktujemy się z Tobą z ceną oraz potwierdzeniem.</p><p>Kontakt: +48 691 242 691</p></div></div>`;
  const adminUrl = `${String(process.env.NEXT_PUBLIC_APP_URL || "https://panel.matt-transport.pl").replace(/\/$/, "")}/panel/rezerwacje/${data.id}`;
  const adminHtml = `<div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px"><div style="max-width:650px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:16px;padding:28px"><h2 style="color:#f1d28b">MATT Booking PRO</h2><h1>Nowy transport A → B</h1><p><strong>${data.booking_number} · ${customerName}</strong></p><p>${travelDate} ${travelTime} · ${route}</p><p>${distanceKm.toFixed(1)} km · ${vehicleLabel(vehicleType)} · ${passengers} os.</p><p><strong>Wymaga indywidualnej wyceny.</strong></p><p><a href="${adminUrl}" style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 18px;border-radius:10px;text-decoration:none;font-weight:bold">OTWÓRZ REZERWACJĘ</a></p></div></div>`;

  let customerEmailSent = false;
  let adminEmailSent = false;
  try {
    const [customerMail, adminMail] = await Promise.all([
      sendMattEmail({ to: email, subject: `MATT TRANSPORT · zapytanie ${data.booking_number}`, html: customerHtml }),
      sendMattEmail({ to: process.env.ADMIN_EMAIL || "kontakt@matt-transport.pl", subject: `🚐 A → B · ${data.booking_number} · wycena`, html: adminHtml })
    ]);
    customerEmailSent = Boolean(customerMail.sent);
    adminEmailSent = Boolean(adminMail.sent);
  } catch (mailError) {
    console.error("Point-to-point email:", mailError);
  }

  let adminPushSent = 0;
  try {
    const push = await sendNewBookingAdminPush(admin, data, "OTHER");
    adminPushSent = Number(push?.sent || 0);
  } catch (pushError) {
    console.error("Point-to-point admin push:", pushError);
  }

  return NextResponse.json({
    id: data.id,
    booking_number: data.booking_number,
    route,
    distance_km: distanceKm,
    price_quote_required: true,
    customer_email_sent: customerEmailSent,
    admin_email_sent: adminEmailSent,
    admin_push_sent: adminPushSent
  });
}
