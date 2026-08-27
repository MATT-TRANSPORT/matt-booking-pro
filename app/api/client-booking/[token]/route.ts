import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";
import { PRICES } from "@/lib/pricing";
import { expireCheckoutSession } from "@/lib/stripeServer";
import { syncBookingCalendar } from "@/lib/googleCalendar";
import { sendBookingNotification } from "@/lib/customerNotifications";
import { cancelledEmail } from "@/lib/emailTemplates";
import { bookingPricingFields, calculateCompanyQuote } from "@/lib/companyPricing";
import { sendDriverPush } from "@/lib/pushServer";

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
    editable: EDITABLE_STATUSES.includes(booking.status),
    cancellable: EDITABLE_STATUSES.includes(booking.status)
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

  if (!EDITABLE_STATUSES.includes(booking.status)) {
    return NextResponse.json(
      { error: "Ta rezerwacja jest już w realizacji i nie może być samodzielnie edytowana." },
      { status: 409 }
    );
  }

  const body = await req.json();
  const wasPaid = booking.payment_status === "paid";
  const isB2B = Boolean(booking.company_id);
  const passengers = Math.max(1, Math.min(8, Number(body.passengers ?? booking.passengers)));
  const vehicleType = passengers > 3 ? "bus" : String(body.vehicleType ?? booking.vehicle_type);
  const pickupAddress = String(body.pickupAddress ?? booking.pickup_address).trim();

  let invoiceRequired = isB2B ? true : Boolean(body.invoiceRequired);
  const nip = !isB2B && invoiceRequired ? cleanNip(body.companyNip) : booking.company_nip ?? null;

  if (!isB2B && invoiceRequired && nip?.length !== 10) {
    return NextResponse.json({ error: "Podaj poprawny 10-cyfrowy NIP." }, { status: 400 });
  }

  const airport = String(booking.airport_key);
  if (!(airport in PRICES)) {
    return NextResponse.json({ error: "Nie udało się odczytać cennika tej rezerwacji. Skontaktuj się z MATT TRANSPORT." }, { status: 400 });
  }

  const routeChanged = pickupAddress !== String(booking.pickup_address ?? "").trim();
  const dateChanged =
    String(body.travelDate ?? booking.travel_date) !== String(booking.travel_date) ||
    String(body.travelTime ?? booking.travel_time) !== String(booking.travel_time);

  let total = Number(booking.total_price || 0);
  let priceChanged = false;
  let pricingUpdate: Record<string, unknown> = {};

  if (isB2B) {
    try {
      // B2B zawsze przeliczamy po siedzibie kontrahenta i po wersji warunków
      // zapisanej na tej rezerwacji. Klient nie może podać własnego dystansu/ceny.
      const quote = await calculateCompanyQuote(admin, {
        companyId: booking.company_id,
        pickupAddress,
        airportKey: airport,
        vehicleType,
        serviceType: booking.service_type,
        termsId: booking.company_pricing_terms_id || null
      });
      pricingUpdate = bookingPricingFields(quote);
      total = quote.gross;
      const oldGross = Number(booking.price_gross ?? booking.total_price ?? 0);
      priceChanged = Math.round(oldGross * 100) !== Math.round(total * 100);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Nie udało się przeliczyć wyceny B2B." },
        { status: 400 }
      );
    }
  } else {
    // B2C: zachowujemy dotychczasowy model. Zmiana adresu wymaga ponownego
    // potwierdzenia, a dystans pozostaje kontrolowany przez MATT.
    const price = PRICES[airport as keyof typeof PRICES];
    const multiplier = booking.service_type === "roundtrip" ? 2 : 1;
    const base = Number(price[vehicleType as "car" | "bus"]) * multiplier;
    const extra = Math.max(0, Number(booking.distance_km ?? 0) - 40) * 2.4 * multiplier;
    const subtotal = base + extra;
    const vat = invoiceRequired ? subtotal * 0.08 : 0;
    total = subtotal + vat;
    pricingUpdate = {
      base_price: base,
      extra_price: extra,
      vat_price: vat,
      total_price: total
    };
    priceChanged =
      Math.round(Number(booking.total_price || 0) * 100) !== Math.round(total * 100);
  }

  const vehicleChanged = String(booking.vehicle_type ?? "") !== vehicleType;
  const requiresReconfirmation = routeChanged || dateChanged || vehicleChanged || priceChanged;

  if (requiresReconfirmation && !wasPaid) {
    await expireCheckoutSession(booking.payment_checkout_session_id);
  }

  const newStatus = requiresReconfirmation ? "pending" : booking.status;

  const update = {
    pickup_address: pickupAddress,
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
    ...pricingUpdate,
    status: newStatus,
    ...(requiresReconfirmation
      ? wasPaid
        ? priceChanged
          ? {
              payment_status: "review",
              payment_review_reason:
                `Klient zmienił opłaconą rezerwację. ` +
                `Kwota zapłacona: ${(Number(booking.payment_amount_cents ?? Math.round(Number(booking.total_price || 0) * 100)) / 100).toFixed(2)} zł. ` +
                `Nowa kwota: ${total.toFixed(2)} zł${isB2B ? " brutto" : ""}. Sprawdź dopłatę lub zwrot.`,
              payment_last_error: null
            }
          : {
              payment_status: "paid",
              payment_review_reason: null,
              payment_last_error: null
            }
        : {
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

  if (error || !updated) {
    return NextResponse.json({ error: error?.message || "Błąd zapisu." }, { status: 500 });
  }

  const oldDisplayed = Number(isB2B ? (booking.price_gross ?? booking.total_price) : booking.total_price || 0);
  await admin.from("booking_history").insert({
    booking_id: booking.id,
    event:
      requiresReconfirmation && wasPaid && priceChanged
        ? `Klient zmienił OPŁACONĄ rezerwację — płatność do weryfikacji: było ${oldDisplayed.toFixed(2)} zł, nowa kwota ${total.toFixed(2)} zł${isB2B ? " brutto" : ""}.`
        : requiresReconfirmation && wasPaid
        ? "Klient zmienił OPŁACONĄ rezerwację — wymaga ponownego potwierdzenia. Płatność pozostaje zaksięgowana."
        : requiresReconfirmation
        ? `Klient zmienił rezerwację — wymaga ponownego potwierdzenia${isB2B ? "; wycena B2B została ponownie przeliczona wg zapisanych warunków" : " i nowej płatności"}.`
        : "Klient zaktualizował dane rezerwacji.",
    created_by: null
  });

  await syncBookingCalendar(admin, updated);

  const driverRelevantChange =
    routeChanged ||
    dateChanged ||
    vehicleChanged ||
    String(booking.flight_number || "") !== String(updated.flight_number || "") ||
    String(booking.return_date || "") !== String(updated.return_date || "") ||
    String(booking.return_time || "") !== String(updated.return_time || "") ||
    String(booking.return_flight_number || "") !== String(updated.return_flight_number || "") ||
    String(booking.notes || "") !== String(updated.notes || "") ||
    Number(booking.passengers || 0) !== Number(updated.passengers || 0);

  if (booking.driver_id && driverRelevantChange) {
    const routeText =
      updated.service_type === "from_airport"
        ? `${updated.airport_label} → ${updated.pickup_address}`
        : `${updated.pickup_address} → ${updated.airport_label}`;

    await sendDriverPush(admin, booking.driver_id, {
      title: "⚠ KURS ZMIENIONY PRZEZ KLIENTA",
      body:
        `${updated.travel_date} ${String(updated.travel_time || "").slice(0, 5)} · ` +
        `${updated.customer_name} · ${routeText}`,
      url: `/kierowca?booking=${updated.id}`,
      tag: `booking-${updated.id}`,
      bookingId: updated.id,
      eventKey: `client-edit:${updated.id}:${updated.updated_at}`
    }).catch((pushError) => {
      console.error("Driver push po edycji klienta:", pushError);
    });
  }

  if (booking.return_driver_id && booking.return_driver_id !== booking.driver_id && driverRelevantChange) {
    await sendDriverPush(admin, booking.return_driver_id, {
      title: "⚠ KURS POWROTNY ZMIENIONY PRZEZ KLIENTA",
      body: `${updated.return_date || updated.travel_date} ${String(updated.return_time || updated.travel_time || "").slice(0, 5)} · ${updated.customer_name}`,
      url: `/kierowca?booking=${updated.id}`,
      tag: `booking-${updated.id}-return`,
      bookingId: updated.id,
      eventKey: `client-edit-return:${updated.id}:${updated.updated_at}`
    }).catch((pushError) => console.error("Return driver push po edycji klienta:", pushError));
  }

  const panelBase = process.env.NEXT_PUBLIC_APP_URL || "https://panel.matt-transport.pl";
  const adminUrl = `${panelBase.replace(/\/$/, "")}/panel/rezerwacje/${booking.id}`;

  try {
    await sendMattEmail({
      to: process.env.ADMIN_EMAIL || "kontakt@matt-transport.pl",
      subject: `Klient zmienił rezerwację ${booking.booking_number}`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px">
          <div style="max-width:650px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:16px;padding:28px">
            <h2 style="color:#f1d28b">MATT TRANSPORT</h2>
            <h1>Klient zmienił rezerwację</h1>
            <p>Numer: <strong>${booking.booking_number}</strong></p>
            <p>${requiresReconfirmation ? "Zmiana wymaga ponownego potwierdzenia przez MATT TRANSPORT." : "Zaktualizowano dane rezerwacji."}</p>
            ${isB2B ? `<p>Aktualna wycena: <strong>${Number(updated.price_net ?? 0).toFixed(2)} zł netto + VAT 8% = ${Number(updated.price_gross ?? updated.total_price).toFixed(2)} zł brutto.</strong></p>` : ""}
            <p><a href="${adminUrl}" style="display:inline-block;background:#d5ae5d;color:#111;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:bold">OTWÓRZ REZERWACJĘ W PANELU</a></p>
          </div>
        </div>`
    });
  } catch (mailError) {
    console.error("E-mail po edycji klienta:", mailError);
  }

  return NextResponse.json({
    booking: updated,
    requiresReconfirmation
  });
}

async function bookingRecipient(
  admin: any,
  booking: any
) {
  if (!booking.company_id) {
    return booking.email
      ? String(booking.email).trim()
      : null;
  }

  const { data: company } = await admin
    .from("companies")
    .select("email")
    .eq("id", booking.company_id)
    .maybeSingle();

  if (company?.email) {
    return String(company.email).trim();
  }

  if (booking.ordered_by_user_id) {
    const { data: account } =
      await admin.auth.admin.getUserById(
        booking.ordered_by_user_id
      );

    if (account?.user?.email) {
      return account.user.email;
    }
  }

  return null;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();
  const booking = await getBooking(token);

  if (!booking) {
    return NextResponse.json(
      { error: "Rezerwacja nie istnieje lub link wygasł." },
      { status: 404 }
    );
  }

  if (!EDITABLE_STATUSES.includes(booking.status)) {
    return NextResponse.json(
      {
        error:
          booking.status === "cancelled"
            ? "Ta rezerwacja jest już anulowana."
            : "Rezerwacja jest już w realizacji lub zakończona. W sprawie anulowania skontaktuj się z MATT TRANSPORT: +48 691 242 691."
      },
      { status: 409 }
    );
  }

  const wasPaid =
    booking.payment_status === "paid" ||
    booking.payment_status === "review";

  if (!wasPaid && booking.payment_checkout_session_id) {
    try {
      await expireCheckoutSession(
        booking.payment_checkout_session_id
      );
    } catch (error) {
      console.error(
        "Anulowanie sesji Stripe przy rezygnacji klienta:",
        error
      );
    }
  }

  const now = new Date().toISOString();
  const update: any = {
    status: "cancelled",
    updated_at: now,
    customer_last_edited_at: now
  };

  if (wasPaid) {
    update.payment_status = "review";
    update.payment_review_reason =
      "Klient samodzielnie anulował opłaconą rezerwację. Sprawdź warunki anulacji i ewentualny zwrot.";
    update.payment_last_error = null;
  }

  const { data: updated, error } = await admin
    .from("bookings")
    .update(update)
    .eq("id", booking.id)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Nie udało się anulować rezerwacji." },
      { status: 500 }
    );
  }

  await admin.from("booking_history").insert({
    booking_id: booking.id,
    event: wasPaid
      ? "Klient ANULOWAŁ rezerwację przez link. Rezerwacja była opłacona — płatność oznaczono DO WERYFIKACJI (ewentualny zwrot)."
      : "Klient ANULOWAŁ rezerwację przez link.",
    created_by: null
  });

  const calendarResult =
    await syncBookingCalendar(admin, updated);

  if (booking.driver_id) {
    await sendDriverPush(admin, booking.driver_id, {
      title: "⛔ KURS ANULOWANY",
      body: `${booking.travel_date} ${String(booking.travel_time || "").slice(0, 5)} · ${booking.customer_name}`,
      url: `/kierowca?booking=${booking.id}`,
      tag: `booking-${booking.id}`,
      bookingId: booking.id,
      eventKey: `client-cancel:${booking.id}:${updated.updated_at}`
    }).catch((pushError) => {
      console.error("Driver push po anulowaniu klienta:", pushError);
    });
  }

  if (booking.return_driver_id && booking.return_driver_id !== booking.driver_id) {
    await sendDriverPush(admin, booking.return_driver_id, {
      title: "⛔ KURS POWROTNY ANULOWANY",
      body: `${booking.return_date || booking.travel_date} ${String(booking.return_time || booking.travel_time || "").slice(0, 5)} · ${booking.customer_name}`,
      url: `/kierowca?booking=${booking.id}`,
      tag: `booking-${booking.id}-return`,
      bookingId: booking.id,
      eventKey: `client-cancel-return:${booking.id}:${updated.updated_at}`
    }).catch((pushError) => console.error("Return driver push po anulowaniu klienta:", pushError));
  }

  if (calendarResult.configured && calendarResult.synced) {
    await admin.from("booking_history").insert({
      booking_id: booking.id,
      event: calendarResult.deleted
        ? "Google Calendar: usunięto wydarzenie po anulowaniu przez klienta."
        : "Google Calendar: zsynchronizowano anulowanie.",
      created_by: null
    });
  }

  try {
    const pushResult = await sendBookingNotification(
      admin,
      updated,
      {
        kind: "cancelled",
        eventKey: `cancelled:self:${updated.id}:${updated.updated_at}`
      }
    );

    if (pushResult.sent) {
      await admin.from("booking_history").insert({
        booking_id: booking.id,
        event: "Wysłano Push potwierdzający anulowanie rezerwacji.",
        created_by: null
      });
    }
  } catch (pushError) {
    console.error("Push po anulowaniu przez klienta:", pushError);
  }

  const recipient = await bookingRecipient(admin, updated);
  const customerTemplate = cancelledEmail(updated);
  const customerMail = await sendMattEmail({
    to: recipient as any,
    subject: customerTemplate.subject,
    html: customerTemplate.html
  });

  await admin.from("booking_history").insert({
    booking_id: booking.id,
    event: customerMail.sent
      ? `Wysłano e-mail: ${customerTemplate.subject}`
      : `BŁĄD e-mail anulowania do klienta/firmy: ${customerMail.error || "nieznany błąd"}`,
    created_by: null
  });

  const panelBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://panel.matt-transport.pl";
  const adminUrl =
    `${panelBase.replace(/\/$/, "")}/panel/rezerwacje/${booking.id}`;

  const adminMail = await sendMattEmail({
    to: process.env.ADMIN_EMAIL || "kontakt@matt-transport.pl",
    subject: `ANULOWANA PRZEZ KLIENTA · ${booking.booking_number}`,
    html: `
      <div style="margin:0;padding:32px 14px;background:#0b0e13;font-family:Arial,sans-serif;color:#f7f7f7">
        <div style="max-width:680px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:18px;padding:28px">
          <div style="font-size:20px;font-weight:800;color:#f1d28b">MATT TRANSPORT</div>
          <h1 style="margin:18px 0;color:#fff">Klient anulował rezerwację</h1>
          <p>Numer: <strong>${booking.booking_number}</strong></p>
          <p>Klient: <strong>${booking.customer_name || "—"}</strong></p>
          <p>Termin: <strong>${booking.travel_date} ${String(booking.travel_time || "").slice(0,5)}</strong></p>
          ${
            wasPaid
              ? `<p style="padding:14px;border-radius:10px;background:#493915;color:#ffe5a3"><strong>UWAGA:</strong> rezerwacja była opłacona. Płatność ma status DO WERYFIKACJI — sprawdź ewentualny zwrot.</p>`
              : ""
          }
          <p style="margin-top:20px">
            <a href="${adminUrl}" style="display:inline-block;background:#d5ae5d;color:#111;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:bold">OTWÓRZ REZERWACJĘ W PANELU</a>
          </p>
        </div>
      </div>`
  });

  await admin.from("booking_history").insert({
    booking_id: booking.id,
    event: adminMail.sent
      ? "Wysłano e-mail do MATT o anulowaniu przez klienta."
      : `BŁĄD e-mail do MATT o anulowaniu: ${adminMail.error || "nieznany błąd"}`,
    created_by: null
  });

  return NextResponse.json({
    ok: true,
    booking: updated,
    payment_requires_review: wasPaid,
    email_sent: customerMail.sent,
    admin_email_sent: adminMail.sent,
    calendar_deleted: Boolean(calendarResult.deleted)
  });
}
