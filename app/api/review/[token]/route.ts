import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { googleReviewUrl } from "@/lib/reviews";
import { sendAdminPush } from "@/lib/pushServer";
import { sendMattEmail } from "@/lib/email";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function adminBookingUrl(bookingId: string) {
  const base = String(process.env.NEXT_PUBLIC_APP_URL || "https://panel.matt-transport.pl").replace(/\/$/, "");
  return `${base}/panel/rezerwacje/${bookingId}`;
}

async function sendReviewAdminEmail(booking: any, rating: number, feedback: string | null) {
  const recipient = process.env.ADMIN_EMAIL || "kontakt@matt-transport.pl";
  const safeNumber = escapeHtml(booking.booking_number);
  const safeCustomer = escapeHtml(booking.customer_name);
  const safeFeedback = feedback ? escapeHtml(feedback) : "Brak komentarza";
  const panelUrl = adminBookingUrl(booking.id);
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

  const result = await sendMattEmail({
    to: recipient,
    subject: `Nowa ocena klienta ${rating}/5 — ${booking.booking_number}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#090b10;color:#fff;padding:28px">
        <div style="max-width:640px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:18px;padding:28px">
          <div style="font-size:13px;letter-spacing:.14em;color:#d4af37;font-weight:700">MATT TRANSPORT</div>
          <h1 style="margin:12px 0 8px">Nowa ocena klienta</h1>
          <div style="font-size:28px;color:#d4af37;letter-spacing:3px;margin:18px 0">${stars}</div>
          <p style="font-size:18px"><strong>${rating}/5</strong></p>
          <p>Rezerwacja: <strong>${safeNumber}</strong></p>
          <p>Klient: <strong>${safeCustomer}</strong></p>
          <div style="margin:22px 0;padding:16px;background:#0e1118;border-radius:12px;border:1px solid #2d3440">
            <div style="font-size:12px;color:#9ca3af;margin-bottom:7px">KOMENTARZ KLIENTA</div>
            <div style="line-height:1.55">${safeFeedback}</div>
          </div>
          ${rating === 5 ? `<p style="color:#8ee0a2">Ocena 5/5 — klient otrzymał możliwość przejścia do wystawienia opinii Google.</p>` : ""}
          <p style="margin:26px 0 0"><a href="${panelUrl}" style="display:inline-block;background:#d4af37;color:#090b10;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:800">OTWÓRZ REZERWACJĘ</a></p>
        </div>
      </div>`
  });

  if (!result.sent) {
    console.error("Admin review email:", result.error || "unknown error");
  }
}

async function sendGoogleClickAdminEmail(booking: any) {
  const recipient = process.env.ADMIN_EMAIL || "kontakt@matt-transport.pl";
  const safeNumber = escapeHtml(booking.booking_number);
  const safeCustomer = escapeHtml(booking.customer_name);
  const panelUrl = adminBookingUrl(booking.id);

  const result = await sendMattEmail({
    to: recipient,
    subject: `Klient przeszedł do opinii Google — ${booking.booking_number}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#090b10;color:#fff;padding:28px">
        <div style="max-width:640px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:18px;padding:28px">
          <div style="font-size:13px;letter-spacing:.14em;color:#d4af37;font-weight:700">MATT TRANSPORT</div>
          <h1 style="margin:12px 0 8px">⭐ Klient przeszedł do opinii Google</h1>
          <p>Klient po ocenie <strong>5/5</strong> kliknął przycisk prowadzący do Google.</p>
          <p>Rezerwacja: <strong>${safeNumber}</strong></p>
          <p>Klient: <strong>${safeCustomer}</strong></p>
          <p style="color:#9ca3af;line-height:1.5">Kliknięcie nie oznacza jeszcze, że opinia została opublikowana w Google — potwierdza jedynie przejście klienta do formularza opinii.</p>
          <p style="margin:26px 0 0"><a href="${panelUrl}" style="display:inline-block;background:#d4af37;color:#090b10;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:800">OTWÓRZ REZERWACJĘ</a></p>
        </div>
      </div>`
  });

  if (!result.sent) {
    console.error("Admin Google review click email:", result.error || "unknown error");
  }
}

async function bookingByToken(token: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("id,booking_number,customer_name,status,customer_access_token")
    .eq("customer_access_token", token)
    .maybeSingle();
  return { admin, booking: data };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { admin, booking } = await bookingByToken(token);
  if (!booking) return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });
  if (booking.status !== "completed") {
    return NextResponse.json({ error: "Ocenę można dodać po zakończeniu przejazdu." }, { status: 409 });
  }
  const { data: review } = await admin
    .from("booking_reviews")
    .select("rating,feedback,google_clicked_at,created_at")
    .eq("booking_id", booking.id)
    .maybeSingle();
  return NextResponse.json({ booking, review, google_url: review?.rating === 5 ? googleReviewUrl() : null });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { admin, booking } = await bookingByToken(token);
  if (!booking) return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });
  if (booking.status !== "completed") {
    return NextResponse.json({ error: "Ocenę można dodać po zakończeniu przejazdu." }, { status: 409 });
  }

  const body = await req.json();
  if (body.action === "google_click") {
    const { data: review } = await admin
      .from("booking_reviews")
      .select("rating,google_clicked_at")
      .eq("booking_id", booking.id)
      .maybeSingle();

    if (!review || Number(review.rating) !== 5) {
      return NextResponse.json({ error: "Brak oceny 5/5." }, { status: 409 });
    }

    const clickedAt = new Date().toISOString();
    const { data: markedClick, error: clickError } = await admin
      .from("booking_reviews")
      .update({ google_clicked_at: clickedAt, updated_at: clickedAt })
      .eq("booking_id", booking.id)
      .is("google_clicked_at", null)
      .select("booking_id")
      .maybeSingle();

    if (clickError) {
      return NextResponse.json({ error: clickError.message }, { status: 500 });
    }

    // Powiadamiamy tylko przy pierwszym kliknięciu, żeby odświeżenie strony nie generowało kolejnych maili.
    if (markedClick) {
      await Promise.all([
        sendGoogleClickAdminEmail(booking),
        admin.from("booking_history").insert({
          booking_id: booking.id,
          event: "Klient po ocenie 5/5 kliknął przejście do opinii Google.",
          created_by: null
        })
      ]).catch((err) => console.error("Google review click notification:", err));
    }

    return NextResponse.json({ ok: true, google_url: googleReviewUrl() });
  }

  const rating = Number(body.rating);
  const feedback = String(body.feedback || "").trim().slice(0, 2000) || null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Wybierz ocenę od 1 do 5." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("booking_reviews")
    .upsert({
      booking_id: booking.id,
      rating,
      feedback,
      updated_at: new Date().toISOString()
    }, { onConflict: "booking_id" })
    .select("rating,feedback,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("booking_history").insert({
    booking_id: booking.id,
    event: `Ocena klienta: ${rating}/5${feedback ? ` · ${feedback}` : ""}`,
    created_by: null
  });

  await sendReviewAdminEmail(booking, rating, feedback);

  if (rating < 5) {
    await sendAdminPush(admin, {
      title: rating <= 3 ? `⚠ OCENA KLIENTA ${rating}/5` : `⭐ OCENA KLIENTA ${rating}/5`,
      body: `${booking.booking_number} · ${booking.customer_name}${feedback ? ` · ${feedback.slice(0, 120)}` : ""}`,
      url: `/panel/rezerwacje/${booking.id}`,
      tag: `review-${booking.id}`
    }).catch((err) => console.error("Admin push review:", err));
  }

  return NextResponse.json({
    review: data,
    google_url: rating === 5 ? googleReviewUrl() : null
  });
}
