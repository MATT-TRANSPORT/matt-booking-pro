import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  b2bBookingPriceFields,
  calculateB2BQuote
} from "@/lib/b2bPricing";
import { sendMattEmail } from "@/lib/email";
import { expireCheckoutSession } from "@/lib/stripeServer";
import { syncBookingCalendar } from "@/lib/googleCalendar";

const EDITABLE_STATUSES = ["pending", "confirmed", "assigned"];

function htmlUpdate(number: string, message: string) {
  return `
  <div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px">
    <div style="max-width:650px;margin:auto;background:#151923;padding:28px;border-radius:16px">
      <h2 style="color:#f1d28b">MATT TRANSPORT</h2>
      <h1>Zmiana rezerwacji ${number}</h1>
      <p>${message}</p>
      <p>Wszystkie ceny B2B są cenami netto + 8% VAT.</p>
      <p>W razie pytań: +48 691 242 691</p>
    </div>
  </div>`;
}

export async function POST(
  req: NextRequest,
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
    return NextResponse.json({ error: "Brak firmy." }, { status: 403 });
  }

  const body = await req.json();
  const admin = createAdminClient();

  const { data: current } = await admin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("company_id", membership.company_id)
    .single();

  if (!current) {
    return NextResponse.json(
      { error: "Nie znaleziono rezerwacji." },
      { status: 404 }
    );
  }

  if (body.action === "repeat") {
    if (!body.travelDate || !body.travelTime) {
      return NextResponse.json(
        { error: "Podaj nową datę i godzinę." },
        { status: 400 }
      );
    }

    let quote;
    try {
      quote = await calculateB2BQuote(admin, {
        companyId: membership.company_id,
        travelDate: body.travelDate,
        serviceType: current.service_type,
        airport: current.airport_key,
        vehicleType: current.vehicle_type,
        pickupAddress: current.pickup_address
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Nie udało się ponownie wycenić kursu."
        },
        { status: 400 }
      );
    }

    const copy: any = {
      ...current,
      id: undefined,
      booking_number: undefined,
      customer_access_token: crypto.randomUUID(),
      created_at: undefined,
      updated_at: undefined,
      driver_id: null,
      vehicle_id: null,
      status: "pending",
      travel_date: body.travelDate,
      travel_time: body.travelTime,
      return_date: null,
      return_time: null,
      invoice_number: null,
      invoice_status: "not_invoiced",
      ordered_by_user_id: user.id,
      booking_source: "b2b_repeat",
      payment_status: "pending",
      payment_link: null,
      payment_provider: null,
      payment_checkout_session_id: null,
      payment_intent_id: null,
      payment_amount_cents: null,
      payment_paid_at: null,
      payment_refunded_at: null,
      payment_last_error: null,
      payment_review_reason: null,
      customer_last_edited_at: null,
      google_calendar_event_id: null,
      google_calendar_return_event_id: null,
      google_calendar_synced_at: null,
      google_calendar_sync_error: null,
      ...b2bBookingPriceFields(quote)
    };

    for (const key of Object.keys(copy)) {
      if (copy[key] === undefined) delete copy[key];
    }

    const { data, error } = await admin
      .from("bookings")
      .insert(copy)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Nie udało się powtórzyć rezerwacji." },
        { status: 500 }
      );
    }

    await admin.from("booking_history").insert({
      booking_id: data.id,
      event:
        `Powtórzono rezerwację ${current.booking_number} · ` +
        `nowa wycena ${quote.net.toFixed(2)} zł netto / ${quote.gross.toFixed(2)} zł brutto`,
      created_by: user.id
    });

    return NextResponse.json(data);
  }

  if (body.action !== "update") {
    return NextResponse.json({ error: "Nieznana operacja." }, { status: 400 });
  }

  if (current.payment_status === "paid") {
    return NextResponse.json(
      {
        error:
          "Opłaconej rezerwacji nie można edytować w portalu firmy. Skontaktuj się z MATT TRANSPORT."
      },
      { status: 409 }
    );
  }

  if (!EDITABLE_STATUSES.includes(current.status)) {
    return NextResponse.json(
      { error: "Tej rezerwacji nie można już edytować w portalu firmy." },
      { status: 409 }
    );
  }

  const passengers = Math.max(
    1,
    Math.min(8, Number(body.passengers ?? current.passengers))
  );
  const vehicle =
    passengers > 3
      ? "bus"
      : body.vehicleType === "bus"
      ? "bus"
      : "car";
  const serviceType = body.serviceType || current.service_type;
  const address = String(body.address ?? current.pickup_address).trim();
  const airport = body.airport || current.airport_key;
  const travelDate = body.travelDate || current.travel_date;

  let quote;
  try {
    quote = await calculateB2BQuote(admin, {
      companyId: membership.company_id,
      travelDate,
      serviceType,
      airport,
      vehicleType: vehicle,
      pickupAddress: address,
      termsId:
        String(travelDate) === String(current.travel_date)
          ? current.b2b_terms_id || null
          : null
    });
  } catch (pricingError) {
    return NextResponse.json(
      {
        error:
          pricingError instanceof Error
            ? pricingError.message
            : "Nie udało się obliczyć nowej wyceny."
      },
      { status: 400 }
    );
  }

  const changes: string[] = [];
  const compare = (label: string, oldValue: any, newValue: any) => {
    if (String(oldValue ?? "") !== String(newValue ?? "")) {
      changes.push(`${label}: ${oldValue ?? "—"} → ${newValue ?? "—"}`);
    }
  };

  compare("adres", current.pickup_address, address);
  compare("data", current.travel_date, travelDate);
  compare("godzina", current.travel_time, body.travelTime ?? current.travel_time);
  compare("lot", current.flight_number, body.flightNumber ?? current.flight_number);
  compare("liczba pasażerów", current.passengers, passengers);
  compare("pojazd", current.vehicle_type, vehicle);

  const oldGross = Number(current.b2b_gross ?? current.total_price ?? 0);
  if (Math.round(oldGross * 100) !== Math.round(quote.gross * 100)) {
    changes.push(
      `kwota brutto: ${oldGross.toFixed(2)} → ${quote.gross.toFixed(2)} zł`
    );
  }

  const materialChange =
    String(current.pickup_address ?? "") !== address ||
    String(current.travel_date ?? "") !== String(travelDate ?? "") ||
    String(current.travel_time ?? "") !== String(body.travelTime ?? current.travel_time ?? "") ||
    String(current.airport_key ?? "") !== String(airport ?? "") ||
    String(current.service_type ?? "") !== String(serviceType ?? "") ||
    String(current.vehicle_type ?? "") !== String(vehicle ?? "") ||
    Number(current.passengers || 0) !== passengers ||
    Math.round(oldGross * 100) !== Math.round(quote.gross * 100);

  if (materialChange) {
    await expireCheckoutSession(current.payment_checkout_session_id);
  }

  const { data, error } = await admin
    .from("bookings")
    .update({
      service_type: quote.serviceType,
      pickup_address: quote.pickupAddress,
      airport_key: quote.airportKey,
      airport_label: quote.airportLabel,
      travel_date: travelDate,
      travel_time: body.travelTime ?? current.travel_time,
      passengers,
      vehicle_type: quote.vehicleType,
      flight_number: body.flightNumber || null,
      notes: body.notes || null,
      ...b2bBookingPriceFields(quote),
      status: materialChange
        ? "pending"
        : current.status === "assigned"
        ? "confirmed"
        : current.status,
      ...(materialChange
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
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Nie udało się zapisać zmian." },
      { status: 500 }
    );
  }

  await admin.from("booking_history").insert({
    booking_id: id,
    event:
      `Edycja przez firmę: ${changes.join("; ") || "zapisano dane"} · ` +
      `wycena ${quote.net.toFixed(2)} zł netto + VAT ${quote.vat.toFixed(2)} zł = ${quote.gross.toFixed(2)} zł brutto`,
    created_by: user.id
  });

  await syncBookingCalendar(admin, data);

  const { data: companyForMail } = await admin
    .from("companies")
    .select("email")
    .eq("id", membership.company_id)
    .single();

  if (companyForMail?.email && changes.length) {
    await sendMattEmail({
      to: companyForMail.email,
      subject: `Zmieniono rezerwację ${data.booking_number}`,
      html: htmlUpdate(
        data.booking_number,
        `Zaktualizowano: ${changes.join(", ")}. Nowa cena: ${quote.net.toFixed(2)} zł netto + VAT ${quote.vat.toFixed(2)} zł = ${quote.gross.toFixed(2)} zł brutto.`
      )
    }).catch(() => null);
  }

  return NextResponse.json(data);
}
