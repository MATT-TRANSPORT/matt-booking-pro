import { resolveCustomerLocale } from "@/lib/localizedBookingEmails";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { shortestDrivingRouteKm } from "@/lib/routesServer";
import { sendMattEmail } from "@/lib/email";
import { sendAdminPush } from "@/lib/pushServer";

export const runtime = "nodejs";

function appBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "https://panel.matt-transport.pl").replace(/\/$/, "");
}

function customerBaseUrl() {
  const configured = String(process.env.NEXT_PUBLIC_BOOKING_URL || "").trim();
  if (configured && !configured.includes("vercel.app")) {
    return configured.replace(/\/$/, "");
  }
  return "https://booking.matt-transport.pl";
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
  const locale = resolveCustomerLocale(body.locale);
  const copy = {
    pl:{subject:"Przyjęliśmy zapytanie o transport",title:"Zapytanie przyjęte",intro:"Dziękujemy. Przygotujemy indywidualną wycenę transportu.",open:"OTWÓRZ REZERWACJĘ",people:"os."},
    en:{subject:"Transport quote request received",title:"Request received",intro:"Thank you. We will prepare a personalised transport quote.",open:"VIEW BOOKING",people:"passengers"},
    de:{subject:"Transportanfrage eingegangen",title:"Anfrage eingegangen",intro:"Vielen Dank. Wir erstellen ein individuelles Transportangebot.",open:"BUCHUNG ANSEHEN",people:"Fahrgäste"},
    cs:{subject:"Poptávka dopravy přijata",title:"Poptávka přijata",intro:"Děkujeme. Připravíme individuální cenovou nabídku.",open:"ZOBRAZIT REZERVACI",people:"cestujících"}
  }[locale];
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
    return NextResponse.json({ error: ({pl:"Uzupełnij punkt A, punkt B, termin i dane kontaktowe.",en:"Please enter both locations, date, time and contact details.",de:"Bitte geben Sie beide Orte, Termin und Kontaktdaten an.",cs:"Zadejte obě místa, termín a kontaktní údaje."}[locale]) }, { status: 400 });
  }
  if (roundtrip && (!returnDate || !returnTime)) {
    return NextResponse.json({ error: ({pl:"Podaj datę i godzinę powrotu.",en:"Please enter your return date and time.",de:"Bitte geben Sie Datum und Uhrzeit der Rückfahrt ein.",cs:"Zadejte datum a čas návratu."}[locale]) }, { status: 400 });
  }

  const when = new Date(`${travelDate}T${travelTime}`);
  if (!Number.isFinite(when.getTime()) || when.getTime() - Date.now() < 24 * 3600 * 1000) {
    return NextResponse.json({ error: ({pl:"Rezerwacja online wymaga minimum 24 godzin wyprzedzenia. W pilnej sprawie zadzwoń: +48 691 242 691",en:"Online requests require at least 24 hours' notice. For urgent bookings call: +48 691 242 691",de:"Online-Anfragen erfordern mindestens 24 Stunden Vorlauf. Bei dringenden Buchungen: +48 691 242 691",cs:"Online poptávky vyžadují alespoň 24 hodin předem. Naléhavé objednávky: +48 691 242 691"}[locale]) }, { status: 400 });
  }
  if (roundtrip) {
    const back = new Date(`${returnDate}T${returnTime}`);
    if (!Number.isFinite(back.getTime()) || back.getTime() <= when.getTime()) {
      return NextResponse.json({ error: ({pl:"Termin powrotu musi być późniejszy niż wyjazd.",en:"Return must be after departure.",de:"Die Rückfahrt muss nach der Hinfahrt liegen.",cs:"Návrat musí být později než odjezd."}[locale]) }, { status: 400 });
    }
  }

  let route;
  try {
    route = await shortestDrivingRouteKm(origin, destination);
  } catch (error) {
    return NextResponse.json({ error: ({pl:"Nie udało się obliczyć trasy.",en:"Could not calculate the route.",de:"Die Route konnte nicht berechnet werden.",cs:"Trasu se nepodařilo vypočítat."}[locale]) }, { status: 400 });
  }

  const admin = createAdminClient();
  // Dla przejazdu powrotnego korzystamy z istniejącego, przetestowanego workflow roundtrip.
  // destination_address + booking_source rozróżniają transport A→B od transferu lotniskowego.
  const serviceType = roundtrip ? "roundtrip" : "point_to_point";
  const { data, error } = await admin.from("bookings").insert({
    service_type: serviceType,
    customer_locale: locale,
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
    return NextResponse.json({ error: ({pl:"Nie udało się zapisać zgłoszenia.",en:"Could not save your request.",de:"Die Anfrage konnte nicht gespeichert werden.",cs:"Poptávku se nepodařilo uložit."}[locale]) }, { status: 500 });
  }

  await admin.from("booking_history").insert({
    booking_id: data.id,
    event: `Transport A→B do wyceny · ${origin} → ${destination} · ${route.distanceKm} km · ${passengers} os. · ${vehicleLabel(requestedVehicle)}`,
    created_by: null
  });

  const portalUrl = data.customer_access_token ? `${customerBaseUrl()}/rezerwacja/${data.customer_access_token}?lang=${locale}` : `${customerBaseUrl()}?lang=${locale}`;
  const details = `${esc(origin)} → ${esc(destination)}${roundtrip ? ` → ${esc(origin)}` : ""}`;
  let customerEmailSent = false;
  let adminEmailSent = false;

  try {
    const result = await sendMattEmail({
      to: email,
      subject: `${copy.subject} – ${data.booking_number}`,
      html: `<div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px"><div style="max-width:650px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:16px;padding:28px"><h2 style="color:#f1d28b">MATT TRANSPORT</h2><h1>${esc(copy.title)}</h1><p>${esc(copy.intro)}</p><p><strong>${esc(data.booking_number)}</strong><br>${details}<br>${esc(travelDate)} · ${esc(travelTime)} · ${passengers} ${esc(copy.people)}</p><p><a href="${portalUrl}" style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 20px;border-radius:11px;text-decoration:none;font-weight:800">${esc(copy.open)}</a></p></div></div>`
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
