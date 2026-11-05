import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { apiAdmin } from "@/lib/apiAdmin";
import { repriceBooking } from "@/lib/bookingReprice";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await apiAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.profile.role !== "admin") return NextResponse.json({ error: "Wymagane uprawnienia administratora." }, { status: 403 });
  const { id } = await context.params;
  const body = await req.json();
  const { admin } = auth;
  const { data: booking, error } = await admin.from("bookings").select("*").eq("id", id).single();
  if (error || !booking) return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });
  try {
    const fields = await repriceBooking(admin, booking);
    // Fresh route measurements must match the administrator's reviewed preview.
    const reviewToken = createHash("sha256").update(JSON.stringify({ booking, fields: { ...fields, pricing_snapshot: { ...fields.pricing_snapshot, calculated_at: undefined } } })).digest("hex");
    if (body.action !== "approve") return NextResponse.json({ oldPrice: Number(booking.total_price), newPrice: fields.total_price, snapshot: fields.pricing_snapshot, reviewToken });
    if (body.reviewToken !== reviewToken) return NextResponse.json({ error: "Rezerwacja lub wycena uległa zmianie. Przelicz ponownie." }, { status: 409 });
    let update = admin.from("bookings").update(fields).eq("id", id).eq("status", "pending").is("payment_paid_at", null)
      .is("payment_checkout_session_id", null).is("payment_intent_id", null);
    update = booking.payment_status == null ? update.is("payment_status", null) : update.eq("payment_status", booking.payment_status);
    update = booking.updated_at == null ? update.is("updated_at", null) : update.eq("updated_at", booking.updated_at);
    const { data: saved, error: saveError } = await update.select("id").maybeSingle();
    if (saveError) throw new Error(saveError.message);
    if (!saved) return NextResponse.json({ error: "Rezerwacja została zmieniona lub opłacona. Odśwież widok." }, { status: 409 });
    await admin.from("booking_history").insert({ booking_id: id, created_by: auth.user.id,
      event: `Administrator zatwierdził przeliczenie ceny: ${booking.total_price} → ${fields.total_price} PLN (30 km dojazdu / 10 km objazdu).` });
    return NextResponse.json({ ok: true, totalPrice: fields.total_price });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się przeliczyć ceny." }, { status: 400 });
  }
}
