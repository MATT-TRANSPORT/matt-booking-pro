import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";

function appBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "https://panel.matt-transport.pl").replace(/\/$/, "");
}

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] || ch));
}

export async function POST(req: NextRequest) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "dispatcher"].includes(String(profile.role))) {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  }

  const body = await req.json();
  const bookingId = String(body.bookingId || "").trim();
  const amount = Number(body.amount);
  const paymentMethod = ["cash", "bank_transfer", "online"].includes(String(body.paymentMethod))
    ? String(body.paymentMethod)
    : "cash";
  const quoteNote = String(body.quoteNote || "").trim().slice(0, 1200);

  if (!bookingId) return NextResponse.json({ error: "Brak rezerwacji." }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
    return NextResponse.json({ error: "Podaj poprawną cenę końcową." }, { status: 400 });
  }

  const { data: booking } = await admin.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });
  if (!booking.quote_required || !(booking.destination_address || booking.booking_source === "public_general")) {
    return NextResponse.json({ error: "Ta rezerwacja nie jest transportem A→B do indywidualnej wyceny." }, { status: 409 });
  }
  if (["completed", "cancelled"].includes(String(booking.status || ""))) {
    return NextResponse.json({ error: "Nie można wycenić zamkniętej rezerwacji." }, { status: 409 });
  }

  const rounded = Math.round(amount * 100) / 100;
  const { data: updated, error } = await admin.from("bookings").update({
    base_price: rounded,
    extra_price: 0,
    vat_price: 0,
    total_price: rounded,
    quote_status: "priced",
    payment_method: paymentMethod,
    online_payment_requested: paymentMethod === "online",
    payment_status: "pending",
    updated_at: new Date().toISOString()
  }).eq("id", bookingId).select("*").single();

  if (error || !updated) return NextResponse.json({ error: error?.message || "Nie udało się zapisać wyceny." }, { status: 500 });

  await admin.from("booking_history").insert({
    booking_id: bookingId,
    event: `Wycena indywidualna A→B: ${rounded.toFixed(2)} zł · płatność: ${paymentMethod}${quoteNote ? ` · ${quoteNote}` : ""}`,
    created_by: user.id
  });

  let emailSent = false;
  if (updated.email) {
    try {
      const portal = updated.customer_access_token ? `${appBaseUrl()}/rezerwacja/${updated.customer_access_token}` : appBaseUrl();
      const result = await sendMattEmail({
        to: updated.email,
        subject: `Wycena transportu ${updated.booking_number} · ${rounded.toFixed(2)} zł`,
        html: `<div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px"><div style="max-width:650px;margin:auto;background:#151923;border:1px solid #d5ae5d;border-radius:16px;padding:28px"><h2 style="color:#f1d28b">MATT TRANSPORT</h2><h1>Wycena transportu jest gotowa</h1><p>Trasa: <strong>${esc(updated.pickup_address)} → ${esc(updated.destination_address || updated.airport_label)}</strong></p><p>Termin: <strong>${esc(updated.travel_date)} · ${esc(String(updated.travel_time || "").slice(0,5))}</strong></p><p style="font-size:22px">Cena końcowa: <strong style="color:#f1d28b">${rounded.toFixed(2)} zł</strong></p>${quoteNote ? `<p>${esc(quoteNote)}</p>` : ""}<p>Rezerwacja pozostaje w systemie MATT TRANSPORT. W razie pytań: +48 691 242 691.</p><p><a href="${portal}" style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 20px;border-radius:11px;text-decoration:none;font-weight:800">OTWÓRZ REZERWACJĘ</a></p></div></div>`
      });
      emailSent = Boolean(result.sent);
    } catch (mailError) {
      console.error("General quote email:", mailError);
    }
  }

  if (emailSent) {
    await admin.from("booking_history").insert({ booking_id: bookingId, event: "Wycena A→B wysłana klientowi e-mailem.", created_by: user.id });
  }

  return NextResponse.json({ ok: true, booking: updated, email_sent: emailSent });
}
