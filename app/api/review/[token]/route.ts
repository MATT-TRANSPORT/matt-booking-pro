import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { googleReviewUrl } from "@/lib/reviews";
import { sendAdminPush } from "@/lib/pushServer";

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
    const { data: review } = await admin.from("booking_reviews").select("rating").eq("booking_id", booking.id).maybeSingle();
    if (!review || Number(review.rating) !== 5) return NextResponse.json({ error: "Brak oceny 5/5." }, { status: 409 });
    await admin.from("booking_reviews").update({ google_clicked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("booking_id", booking.id);
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
