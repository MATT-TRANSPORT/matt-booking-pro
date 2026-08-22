import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";
import { expireCheckoutSession } from "@/lib/stripeServer";
import { syncBookingCalendar } from "@/lib/googleCalendar";
import { bookingPricingFields, calculateCompanyQuote } from "@/lib/companyPricing";
import { sendDriverPush } from "@/lib/pushServer";

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
    return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });
  }

  if (body.action === "cancel") {
    if (!EDITABLE_STATUSES.includes(current.status)) {
      return NextResponse.json(
        { error: current.status === "cancelled" ? "Ta rezerwacja jest już anulowana." : "Rezerwacji w realizacji lub zakończonej nie można anulować w portalu firmy." },
        { status: 409 }
      );
    }

    const wasPaid =
      current.payment_status === "paid" ||
      current.payment_status === "review";

    if (!wasPaid && current.payment_checkout_session_id) {
      try {
        await expireCheckoutSession(current.payment_checkout_session_id);
      } catch (error) {
        console.error("B2B cancel Stripe session:", error);
      }
    }

    const update: any = {
      status: "cancelled",
      updated_at: new Date().toISOString()
    };

    if (wasPaid) {
      update.payment_status = "review";
      update.payment_review_reason =
        "Firma anulowała rezerwację w portalu B2B. Sprawdź warunki anulacji i ewentualny zwrot.";
      update.payment_last_error = null;
    } else if (current.payment_method === "employee_payment") {
      update.payment_link = null;
      update.payment_checkout_session_id = null;
      update.payment_last_error = null;
    }

    const { data: cancelled, error: cancelError } = await admin
      .from("bookings")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (cancelError || !cancelled) {
      return NextResponse.json(
        { error: cancelError?.message || "Nie udało się anulować rezerwacji." },
        { status: 500 }
      );
    }

    await admin.from("booking_history").insert({
      booking_id: id,
      event: wasPaid
        ? "Firma ANULOWAŁA rezerwację w portalu B2B. Płatność oznaczono DO WERYFIKACJI."
        : "Firma ANULOWAŁA rezerwację w portalu B2B.",
      created_by: user.id
    });

    await syncBookingCalendar(admin, cancelled);

    if (current.driver_id) {
      await sendDriverPush(admin, current.driver_id, {
        title: "⛔ KURS B2B ANULOWANY",
        body: `${current.travel_date} ${String(current.travel_time || "").slice(0, 5)} · ${current.customer_name}`,
        url: `/kierowca?booking=${current.id}`,
        tag: `booking-${current.id}`,
        bookingId: current.id,
        eventKey: `company-cancel:${current.id}:${cancelled.updated_at}`
      }).catch((pushError) => {
        console.error("Driver push po anulowaniu B2B:", pushError);
      });
    }

    const { data: companyForMail } = await admin
      .from("companies")
      .select("name,email")
      .eq("id", membership.company_id)
      .single();

    const cancellationText = wasPaid
      ? "Rezerwacja została anulowana. Płatność była już zaksięgowana — MATT TRANSPORT zweryfikuje ewentualny zwrot zgodnie z warunkami anulacji."
      : "Rezerwacja została anulowana i nie będzie realizowana.";

    if (companyForMail?.email) {
      await sendMattEmail({
        to: companyForMail.email,
        subject: `Anulowano rezerwację ${cancelled.booking_number}`,
        html: htmlUpdate(cancelled.booking_number, cancellationText)
      });
    }

    await sendMattEmail({
      to: "kontakt@matt-transport.pl",
      subject: `B2B · ANULOWANA PRZEZ FIRMĘ · ${cancelled.booking_number}`,
      html: htmlUpdate(
        cancelled.booking_number,
        `${companyForMail?.name || "Kontrahent"} anulował rezerwację w portalu B2B. ${wasPaid ? "UWAGA: płatność wymaga weryfikacji ewentualnego zwrotu." : ""}`
      )
    });

    return NextResponse.json({
      ...cancelled,
      payment_requires_review: wasPaid
    });
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
      // Powtórzona rezerwacja korzysta z AKTUALNYCH warunków handlowych.
      quote = await calculateCompanyQuote(admin, {
        companyId: membership.company_id,
        pickupAddress: current.pickup_address,
        airportKey: current.airport_key,
        vehicleType: current.vehicle_type,
        serviceType: current.service_type
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Nie udało się wycenić nowej rezerwacji." },
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
      google_calendar_event_id: null,
      google_calendar_return_event_id: null,
      google_calendar_synced_at: null,
      google_calendar_sync_error: null,
      completed_at: null,
      review_request_started_at: null,
      review_request_sent_at: null,
      review_request_email_sent_at: null,
      review_request_push_sent_at: null,
      ...bookingPricingFields(quote)
    };

    const { data, error } = await admin
      .from("bookings")
      .insert(copy)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Błąd zapisu." }, { status: 500 });
    }

    await admin.from("booking_history").insert({
      booking_id: data.id,
      event:
        `Powtórzono rezerwację ${current.booking_number} wg aktualnych warunków B2B · ` +
        `${quote.net.toFixed(2)} zł netto + VAT = ${quote.gross.toFixed(2)} zł brutto`,
      created_by: user.id
    });

    return NextResponse.json(data);
  }

  if (body.action !== "update") {
    return NextResponse.json({ error: "Nieznana operacja." }, { status: 400 });
  }

  if (["paid", "review"].includes(current.payment_status)) {
    return NextResponse.json(
      { error: "Rezerwacji z zaksięgowaną lub weryfikowaną płatnością nie można edytować w portalu firmy. Skontaktuj się z MATT TRANSPORT." },
      { status: 409 }
    );
  }

  if (!EDITABLE_STATUSES.includes(current.status)) {
    return NextResponse.json(
      { error: "Tej rezerwacji nie można już edytować w portalu firmy." },
      { status: 409 }
    );
  }

  const vehicle = body.vehicleType === "bus" ? "bus" : "car";
  const serviceType = body.serviceType || current.service_type;
  const address = String(body.address || current.pickup_address || "");
  const airport = String(body.airport || current.airport_key || "");

  let quote;
  try {
    // Edycja zachowuje wersję warunków, według której rezerwacja została zawarta.
    quote = await calculateCompanyQuote(admin, {
      companyId: membership.company_id,
      pickupAddress: address,
      airportKey: airport,
      vehicleType: vehicle,
      serviceType,
      termsId: current.company_pricing_terms_id || null
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się przeliczyć rezerwacji." },
      { status: 400 }
    );
  }

  const changes: string[] = [];
  const compare = (label: string, oldV: any, newV: any) => {
    if (String(oldV ?? "") !== String(newV ?? "")) {
      changes.push(`${label}: ${oldV ?? "—"} → ${newV ?? "—"}`);
    }
  };

  compare("adres", current.pickup_address, address);
  compare("data", current.travel_date, body.travelDate);
  compare("godzina", current.travel_time, body.travelTime);
  compare("lot", current.flight_number, body.flightNumber);
  compare("liczba pasażerów", current.passengers, body.passengers);
  compare("pojazd", current.vehicle_type, vehicle);

  const oldGross = Number(current.price_gross ?? current.total_price ?? 0);
  if (Math.round(oldGross * 100) !== Math.round(quote.gross * 100)) {
    changes.push(`brutto: ${oldGross.toFixed(2)} → ${quote.gross.toFixed(2)} zł`);
  }

  const materialChange =
    String(current.pickup_address ?? "") !== address ||
    String(current.travel_date ?? "") !== String(body.travelDate ?? "") ||
    String(current.travel_time ?? "") !== String(body.travelTime ?? "") ||
    String(current.airport_key ?? "") !== airport ||
    String(current.service_type ?? "") !== String(serviceType ?? "") ||
    String(current.vehicle_type ?? "") !== String(vehicle ?? "") ||
    Number(current.passengers || 0) !== Number(body.passengers || 0) ||
    Math.round(oldGross * 100) !== Math.round(quote.gross * 100);

  if (materialChange) {
    await expireCheckoutSession(current.payment_checkout_session_id);
  }

  const { data, error } = await admin
    .from("bookings")
    .update({
      service_type: serviceType,
      pickup_address: address,
      airport_key: quote.airportKey,
      airport_label: quote.airportLabel,
      travel_date: body.travelDate,
      travel_time: body.travelTime,
      passengers: Number(body.passengers),
      vehicle_type: vehicle,
      flight_number: body.flightNumber || null,
      notes: body.notes || null,
      ...bookingPricingFields(quote),
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
    return NextResponse.json({ error: error?.message || "Błąd zapisu." }, { status: 500 });
  }

  await admin.from("booking_history").insert({
    booking_id: id,
    event: `Edycja przez firmę: ${changes.join("; ") || "zapisano dane"}`,
    created_by: user.id
  });

  await syncBookingCalendar(admin, data);

  if (current.driver_id && changes.length) {
    const routeText =
      data.service_type === "from_airport"
        ? `${data.airport_label} → ${data.pickup_address}`
        : `${data.pickup_address} → ${data.airport_label}`;

    await sendDriverPush(admin, current.driver_id, {
      title: "⚠ ZMIANA W KURSIE B2B",
      body:
        `${data.travel_date} ${String(data.travel_time || "").slice(0, 5)} · ` +
        `${data.customer_name} · ${routeText}`,
      url: `/kierowca?booking=${data.id}`,
      tag: `booking-${data.id}`,
      bookingId: data.id,
      eventKey: `company-edit:${data.id}:${data.updated_at}`
    }).catch((pushError) => {
      console.error("Driver push po edycji B2B:", pushError);
    });
  }

  const { data: companyForMail } = await admin
    .from("companies")
    .select("email")
    .eq("id", membership.company_id)
    .single();

  if (companyForMail?.email && changes.length) {
    try {
      await sendMattEmail({
        to: companyForMail.email,
        subject: `Zmieniono rezerwację ${data.booking_number}`,
        html: htmlUpdate(data.booking_number, `Zaktualizowano: ${changes.join(", ")}`)
      });
    } catch (error) {
      console.error("E-mail po edycji B2B:", error);
    }
  }

  return NextResponse.json(data);
}
