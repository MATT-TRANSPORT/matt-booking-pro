import { localizedQuoteEmail } from "@/lib/quoteEmails";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";

function customerBaseUrl() {
  const configured = String(process.env.NEXT_PUBLIC_BOOKING_URL || "").trim();
  if (configured && !configured.includes("vercel.app")) {
    return configured.replace(/\/$/, "");
  }
  return "https://booking.matt-transport.pl";
}

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

function validHours(value: unknown) {
  const hours = Number(value);
  return [12, 24, 48, 72].includes(hours) ? hours : 24;
}

function formatExpiry(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    timeZone: "Europe/Warsaw",
    dateStyle: "short",
    timeStyle: "short"
  });
}

export async function POST(req: NextRequest) {
  const auth = await createClient();
  const {
    data: { user }
  } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Brak autoryzacji." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    !["admin", "dispatcher"].includes(String(profile.role))
  ) {
    return NextResponse.json(
      { error: "Brak uprawnień." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const bookingId = String(body.bookingId || "").trim();
  const amount = Number(body.amount);
  const paymentMethod = ["cash", "bank_transfer", "online"].includes(
    String(body.paymentMethod)
  )
    ? String(body.paymentMethod)
    : "cash";
  const quoteNote = String(body.quoteNote || "")
    .trim()
    .slice(0, 1200);
  const hours = validHours(body.validHours);

  if (!bookingId) {
    return NextResponse.json(
      { error: "Brak rezerwacji." },
      { status: 400 }
    );
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 100000
  ) {
    return NextResponse.json(
      { error: "Podaj poprawną cenę końcową." },
      { status: 400 }
    );
  }

  const { data: booking } = await admin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json(
      { error: "Nie znaleziono rezerwacji." },
      { status: 404 }
    );
  }

  if (
    !booking.quote_required ||
    !(
      booking.destination_address ||
      booking.booking_source === "public_general"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Ta rezerwacja nie jest transportem A→B do indywidualnej wyceny."
      },
      { status: 409 }
    );
  }

  if (booking.quote_status === "accepted") {
    return NextResponse.json(
      {
        error:
          "Klient już zaakceptował tę wycenę. Zmianę warunków ustal z klientem indywidualnie."
      },
      { status: 409 }
    );
  }

  if (
    booking.quote_status === "rejected" ||
    ["completed", "cancelled"].includes(
      String(booking.status || "")
    )
  ) {
    return NextResponse.json(
      { error: "Nie można wycenić zamkniętego zlecenia." },
      { status: 409 }
    );
  }

  const rounded = Math.round(amount * 100) / 100;
  const now = new Date();
  const expires = new Date(
    now.getTime() + hours * 60 * 60 * 1000
  );

  const updatePayload = {
    base_price: rounded,
    extra_price: 0,
    vat_price: 0,
    total_price: rounded,
    quote_status: "priced",
    quote_expires_at: expires.toISOString(),
    quote_accepted_at: null,
    quote_rejected_at: null,
    quote_note: quoteNote || null,
    payment_method: paymentMethod,
    online_payment_requested: paymentMethod === "online",
    payment_status: "pending",
    updated_at: now.toISOString()
  };

  const { data: updated, error } = await admin
    .from("bookings")
    .update(updatePayload)
    .eq("id", bookingId)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Nie udało się zapisać wyceny."
      },
      { status: 500 }
    );
  }

  await admin.from("booking_history").insert({
    booking_id: bookingId,
    event:
      `Wycena indywidualna A→B: ${rounded.toFixed(2)} zł · ważna ${hours} h · płatność: ${paymentMethod}${quoteNote ? ` · ${quoteNote}` : ""}`,
    created_by: user.id
  });

  let emailSent = false;

  if (updated.email) {
    try {
      const portal = updated.customer_access_token
        ? `${customerBaseUrl()}/rezerwacja/${updated.customer_access_token}`
        : customerBaseUrl();

      const expiryLabel = formatExpiry(
        updated.quote_expires_at
      );

      const result = await sendMattEmail({to: updated.email, ...localizedQuoteEmail("offered", updated)});

      emailSent = Boolean(result.sent);
    } catch (mailError) {
      console.error("General quote email:", mailError);
    }
  }

  if (emailSent) {
    const sentAt = new Date().toISOString();

    await admin
      .from("bookings")
      .update({ quote_sent_at: sentAt })
      .eq("id", bookingId);

    await admin.from("booking_history").insert({
      booking_id: bookingId,
      event:
        `Wycena A→B wysłana klientowi e-mailem · ważna do ${formatExpiry(updated.quote_expires_at)}.`,
      created_by: user.id
    });

    updated.quote_sent_at = sentAt;
  }

  return NextResponse.json({
    ok: true,
    booking: updated,
    email_sent: emailSent
  });
}
