import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";
import { sendAdminPush, sendDriverPush } from "@/lib/pushServer";
import { syncBookingCalendar } from "@/lib/googleCalendar";
import { expireCheckoutSession } from "@/lib/stripeServer";

export const runtime = "nodejs";

function esc(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[ch] || ch)
  );
}

function adminBaseUrl() {
  return String(
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://panel.matt-transport.pl"
  ).replace(/\/$/, "");
}

function paymentLabel(method: unknown) {
  if (method === "online") return "płatność online";
  if (method === "bank_transfer") return "przelew tradycyjny";
  return "gotówka u kierowcy";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const action = String(body.action || "");
  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("*")
    .eq("customer_access_token", token)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json(
      { error: "Rezerwacja nie istnieje lub link wygasł." },
      { status: 404 }
    );
  }

  const general =
    Boolean(booking.destination_address) ||
    booking.booking_source === "public_general";

  if (!general || !booking.quote_required) {
    return NextResponse.json(
      { error: "Ta rezerwacja nie wymaga indywidualnej wyceny." },
      { status: 409 }
    );
  }

  if (String(booking.quote_status) !== "priced") {
    if (booking.quote_status === "accepted") {
      return NextResponse.json(
        { error: "Ta wycena została już zaakceptowana." },
        { status: 409 }
      );
    }
    if (booking.quote_status === "rejected") {
      return NextResponse.json(
        { error: "Z tej wyceny już zrezygnowano." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Wycena nie jest jeszcze gotowa do decyzji." },
      { status: 409 }
    );
  }

  if (!booking.quote_expires_at) {
    return NextResponse.json(
      {
        error:
          "Ta wycena pochodzi ze starszej wersji systemu. Poproś MATT TRANSPORT o ponowne wysłanie aktualnej wyceny."
      },
      { status: 409 }
    );
  }

  const expiresAt = new Date(booking.quote_expires_at).getTime();
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return NextResponse.json(
      {
        error:
          "Termin ważności wyceny minął. Skontaktuj się z MATT TRANSPORT, aby otrzymać aktualną cenę."
      },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  if (action === "accept") {
    const nextStatus =
      booking.driver_id && booking.vehicle_id
        ? "assigned"
        : "confirmed";

    const { data: updated, error } = await admin
      .from("bookings")
      .update({
        quote_status: "accepted",
        quote_accepted_at: now,
        quote_rejected_at: null,
        status: nextStatus,
        updated_at: now
      })
      .eq("id", booking.id)
      .eq("quote_status", "priced")
      .select("*")
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { error: error?.message || "Nie udało się zaakceptować wyceny." },
        { status: 500 }
      );
    }

    await admin.from("booking_history").insert({
      booking_id: booking.id,
      event:
        `Klient ZAAKCEPTOWAŁ wycenę indywidualną ${Number(updated.total_price || 0).toFixed(2)} zł · ${paymentLabel(updated.payment_method)}.`,
      created_by: null
    });

    await syncBookingCalendar(admin, updated).catch((error) =>
      console.error("Quote accept calendar:", error)
    );

    const amount = Number(updated.total_price || 0).toFixed(2);
    const panelUrl = `${adminBaseUrl()}/panel/rezerwacje/${updated.id}`;

    await Promise.allSettled([
      updated.email
        ? sendMattEmail({
            to: updated.email,
            subject: `Potwierdzenie zamówienia · ${updated.booking_number}`,
            html: `
              <div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px">
                <div style="max-width:650px;margin:auto;background:#151923;border:1px solid #d5ae5d;border-radius:16px;padding:28px">
                  <h2 style="color:#f1d28b">MATT TRANSPORT</h2>
                  <h1>Wycena zaakceptowana</h1>
                  <p>Dziękujemy. Twoje zamówienie zostało przyjęte do realizacji.</p>
                  <p>Trasa: <strong>${esc(updated.pickup_address)} → ${esc(updated.destination_address || updated.airport_label)}</strong></p>
                  <p>Termin: <strong>${esc(updated.travel_date)} · ${esc(String(updated.travel_time || "").slice(0, 5))}</strong></p>
                  <p style="font-size:22px">Cena: <strong style="color:#f1d28b">${amount} zł</strong></p>
                  <p>Sposób płatności: <strong>${paymentLabel(updated.payment_method)}</strong></p>
                  ${updated.payment_method === "online"
                    ? "<p>Płatność online jest dostępna w portalu rezerwacji.</p>"
                    : ""}
                  <p>Kontakt: +48 691 242 691</p>
                </div>
              </div>
            `
          })
        : Promise.resolve(),
      sendMattEmail({
        to: process.env.ADMIN_EMAIL || "kontakt@matt-transport.pl",
        subject: `✅ KLIENT ZAAKCEPTOWAŁ WYCENĘ · ${updated.booking_number}`,
        html: `
          <div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px">
            <div style="max-width:650px;margin:auto;background:#151923;border:1px solid #d5ae5d;border-radius:16px;padding:28px">
              <h2 style="color:#f1d28b">MATT Booking PRO</h2>
              <h1>Klient zaakceptował wycenę</h1>
              <p><strong>${esc(updated.customer_name)}</strong></p>
              <p>${esc(updated.pickup_address)} → ${esc(updated.destination_address || updated.airport_label)}</p>
              <p>${esc(updated.travel_date)} · ${esc(String(updated.travel_time || "").slice(0, 5))}</p>
              <p style="font-size:22px"><strong style="color:#f1d28b">${amount} zł</strong></p>
              <p><a href="${panelUrl}" style="display:inline-block;background:#d5ae5d;color:#111;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:bold">OTWÓRZ W PANELU</a></p>
            </div>
          </div>
        `
      }),
      sendAdminPush(admin, {
        title: "✅ WYCENA ZAAKCEPTOWANA",
        body: `${updated.booking_number} · ${updated.customer_name} · ${amount} zł`,
        url: `/panel/rezerwacje/${updated.id}`,
        tag: `quote-accepted-${updated.id}`
      })
    ]);

    return NextResponse.json({
      ok: true,
      action: "accepted",
      booking: updated
    });
  }

  if (action === "reject") {
    if (booking.payment_checkout_session_id) {
      await expireCheckoutSession(
        booking.payment_checkout_session_id
      ).catch(() => null);
    }

    const { data: updated, error } = await admin
      .from("bookings")
      .update({
        quote_status: "rejected",
        quote_rejected_at: now,
        quote_accepted_at: null,
        status: "cancelled",
        updated_at: now
      })
      .eq("id", booking.id)
      .eq("quote_status", "priced")
      .select("*")
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { error: error?.message || "Nie udało się zapisać rezygnacji." },
        { status: 500 }
      );
    }

    await admin.from("booking_history").insert({
      booking_id: booking.id,
      event:
        `Klient ZREZYGNOWAŁ z wyceny indywidualnej ${Number(updated.total_price || 0).toFixed(2)} zł.`,
      created_by: null
    });

    await syncBookingCalendar(admin, updated).catch((error) =>
      console.error("Quote reject calendar:", error)
    );

    if (booking.driver_id) {
      await sendDriverPush(admin, booking.driver_id, {
        title: "⛔ KLIENT ZREZYGNOWAŁ Z WYCENY",
        body: `${updated.travel_date} ${String(updated.travel_time || "").slice(0, 5)} · ${updated.customer_name}`,
        url: `/kierowca?booking=${updated.id}`,
        tag: `quote-rejected-${updated.id}`,
        bookingId: updated.id,
        eventKey: `quote-rejected:${updated.id}:${now}`
      }).catch(() => null);
    }

    const amount = Number(updated.total_price || 0).toFixed(2);
    const panelUrl = `${adminBaseUrl()}/panel/rezerwacje/${updated.id}`;

    await Promise.allSettled([
      updated.email
        ? sendMattEmail({
            to: updated.email,
            subject: `Rezygnacja z wyceny · ${updated.booking_number}`,
            html: `
              <div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px">
                <div style="max-width:650px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:16px;padding:28px">
                  <h2 style="color:#f1d28b">MATT TRANSPORT</h2>
                  <h1>Potwierdzamy rezygnację z wyceny</h1>
                  <p>Wycena ${amount} zł nie została zaakceptowana i zlecenie nie będzie realizowane.</p>
                  <p>Jeśli zmienisz zdanie, skontaktuj się z nami: +48 691 242 691.</p>
                </div>
              </div>
            `
          })
        : Promise.resolve(),
      sendMattEmail({
        to: process.env.ADMIN_EMAIL || "kontakt@matt-transport.pl",
        subject: `✕ KLIENT ZREZYGNOWAŁ Z WYCENY · ${updated.booking_number}`,
        html: `
          <div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px">
            <div style="max-width:650px;margin:auto;background:#151923;border:1px solid #8b343b;border-radius:16px;padding:28px">
              <h2 style="color:#f1d28b">MATT Booking PRO</h2>
              <h1>Klient zrezygnował z wyceny</h1>
              <p><strong>${esc(updated.customer_name)}</strong> · ${amount} zł</p>
              <p><a href="${panelUrl}" style="display:inline-block;background:#d5ae5d;color:#111;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:bold">OTWÓRZ W PANELU</a></p>
            </div>
          </div>
        `
      }),
      sendAdminPush(admin, {
        title: "✕ WYCENA ODRZUCONA",
        body: `${updated.booking_number} · ${updated.customer_name} · ${amount} zł`,
        url: `/panel/rezerwacje/${updated.id}`,
        tag: `quote-rejected-${updated.id}`
      })
    ]);

    return NextResponse.json({
      ok: true,
      action: "rejected",
      booking: updated
    });
  }

  return NextResponse.json(
    { error: "Nieznana decyzja dotycząca wyceny." },
    { status: 400 }
  );
}
