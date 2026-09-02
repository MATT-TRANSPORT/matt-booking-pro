import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICES, calculateQuote } from "@/lib/pricing";
import { sendMattEmail } from "@/lib/email";
import { sendBookingNotification } from "@/lib/customerNotifications";
import {
  receivedEmail,
  adminNewBookingEmail
} from "@/lib/emailTemplates";


function safeTrackingValue(value: unknown, max = 240) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

function growthFields(body: any) {
  const t = body?.tracking && typeof body.tracking === "object" ? body.tracking : {};
  const allowedSources = new Set([
    "google_ads", "google_organic", "meta_ads", "social_organic",
    "partner", "matt_website", "referral", "direct"
  ]);
  const rawSource = safeTrackingValue(t.acquisitionSource, 80)?.toLowerCase() || "direct";
  return {
    acquisition_source: allowedSources.has(rawSource) ? rawSource : rawSource.slice(0, 80),
    utm_source: safeTrackingValue(t.utmSource, 120),
    utm_medium: safeTrackingValue(t.utmMedium, 120),
    utm_campaign: safeTrackingValue(t.utmCampaign, 180),
    utm_content: safeTrackingValue(t.utmContent, 180),
    utm_term: safeTrackingValue(t.utmTerm, 180),
    gclid: safeTrackingValue(t.gclid, 240),
    fbclid: safeTrackingValue(t.fbclid, 240),
    referral_code: safeTrackingValue(t.referralCode, 120),
    landing_page: safeTrackingValue(t.landingPage, 500)
  };
}

function validFunnelSessionId(value: unknown) {
  const text = String(value ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const required = [
    "serviceType",
    "address",
    "airport",
    "travelDate",
    "travelTime",
    "customerName",
    "phone",
    "email"
  ];

  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json(
        { error: "Uzupełnij wymagane pola." },
        { status: 400 }
      );
    }
  }

  if (!PRICES[body.airport as keyof typeof PRICES]) {
    return NextResponse.json(
      { error: "Nieprawidłowe lotnisko." },
      { status: 400 }
    );
  }

  if (
    Number(body.passengers) > 3 &&
    body.vehicleType !== "bus"
  ) {
    return NextResponse.json(
      { error: "Dla więcej niż 3 pasażerów wybierz bus." },
      { status: 400 }
    );
  }

  const when = new Date(
    `${body.travelDate}T${body.travelTime}`
  );

  if (when.getTime() - Date.now() < 48 * 3600 * 1000) {
    return NextResponse.json(
      {
        error:
          "Rezerwacja online wymaga minimum 48 godzin wyprzedzenia. Zadzwoń: +48 691 242 691"
      },
      { status: 400 }
    );
  }

  const quote = calculateQuote({
    serviceType: body.serviceType,
    airport: body.airport,
    vehicleType: body.vehicleType,
    distanceKm: Number(body.distanceKm),
    invoiceRequired: Boolean(body.invoiceRequired)
  });

  const airport =
    PRICES[body.airport as keyof typeof PRICES];

  const vehicleType =
    body.vehicleType === "bus" ? "bus" : "car";

  const notificationChannel = "email";

  const requestedPaymentMethod = String(body.paymentMethod || "");
  const paymentMethod = ["cash", "bank_transfer", "online"].includes(requestedPaymentMethod)
    ? requestedPaymentMethod
    : body.onlinePaymentRequested
    ? "online"
    : "cash";

  const supabase = createAdminClient();
  const growth = growthFields(body);

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      service_type: body.serviceType,
      pickup_address: body.address,
      airport_key: body.airport,
      airport_label: airport.label,
      travel_date: body.travelDate,
      travel_time: body.travelTime,
      return_date: body.returnDate || null,
      return_time: body.returnTime || null,
      passengers: Number(body.passengers),
      vehicle_type: vehicleType,
      distance_km: Number(body.distanceKm),
      customer_name: body.customerName,
      phone: body.phone,
      email: body.email,
      invoice_required: Boolean(body.invoiceRequired),
      company_name: body.companyName || null,
      company_nip: body.companyNip || null,
      company_address: body.companyAddress || null,
      flight_number: body.flightNumber || null,
      return_flight_number: body.returnFlightNumber || null,
      base_price: quote.basePrice,
      extra_price: quote.extraPrice,
      vat_price: quote.vatPrice,
      total_price: quote.totalPrice,
      status: "pending",
      booking_source: "public",
      ...growth,
      payment_method: paymentMethod,
      online_payment_requested: paymentMethod === "online",
      payment_status: "pending",
      customer_notification_channel: notificationChannel,
      customer_notification_opt_in_at: notificationChannel === "email" ? null : new Date().toISOString(),
      customer_notification_opt_out_at: null,
      notes: body.notes || null
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const funnelSessionId = validFunnelSessionId(body?.funnelSessionId);
  if (funnelSessionId) {
    const { error: funnelError } = await supabase
      .from("growth_funnel_events")
      .upsert({
        session_id: funnelSessionId,
        event_name: "booking_created",
        stage_order: 8,
        occurred_at: new Date().toISOString(),
        ...growth,
        service_type: body.serviceType,
        airport_key: body.airport,
        vehicle_type: vehicleType,
        quote_total: quote.totalPrice,
        booking_id: data.id
      }, { onConflict: "session_id,event_name" });
    if (funnelError) console.error("Growth funnel booking_created:", funnelError);
  }

  let customerEmailSent = false;
  let adminEmailSent = false;
  let emailWarning: string | null = null;

  try {
    const customerMail = receivedEmail(data);

    const customerResult = await sendMattEmail({
      to: body.email,
      subject: customerMail.subject,
      html: customerMail.html
    });

    customerEmailSent = customerResult.sent;

    const adminMail = adminNewBookingEmail(
      data,
      body.email,
      body.phone
    );

    const adminResult = await sendMattEmail({
      to: "kontakt@matt-transport.pl",
      subject: adminMail.subject,
      html: adminMail.html
    });

    adminEmailSent = adminResult.sent;

    if (!customerResult.sent && !customerResult.skipped) {
      emailWarning =
        customerResult.error ?? "Błąd e-mail do klienta.";
    }

    if (!adminResult.sent && !adminResult.skipped) {
      emailWarning =
        adminResult.error ?? "Błąd e-mail do administratora.";
    }
  } catch (mailError) {
    console.error("E-mail po rezerwacji:", mailError);
    emailWarning =
      mailError instanceof Error
        ? mailError.message
        : "Nieznany błąd wysyłki e-mail.";
  }


  const { error: emailHistoryError } =
    await supabase.from("booking_history").insert({
      booking_id: data.id,
      event:
        customerEmailSent && adminEmailSent
          ? "E-mail: klient i MATT otrzymali powiadomienie o nowej rezerwacji."
          : `E-mail nowej rezerwacji: klient=${customerEmailSent ? "OK" : "BŁĄD"}, MATT=${adminEmailSent ? "OK" : "BŁĄD"}${emailWarning ? ` · ${emailWarning}` : ""}`,
      created_by: null
    });

  if (emailHistoryError) {
    console.error(
      "Historia e-mail nowej rezerwacji:",
      emailHistoryError
    );
  }

  let notificationResult: any = null;

  try {
    notificationResult = await sendBookingNotification(
      supabase,
      data,
      {
        kind: "received",
        eventKey: `received:${data.id}`
      }
    );
  } catch (notificationError) {
    console.error("Powiadomienie po rezerwacji:", notificationError);
  }

  return NextResponse.json({
    ...data,
    email_sent: customerEmailSent,
    admin_email_sent: adminEmailSent,
    email_warning: emailWarning,
    customer_notification_sent: Boolean(notificationResult?.sent),
    customer_notification_channel: notificationChannel
  });
}
