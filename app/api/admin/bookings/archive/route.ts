import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOverdueBooking } from "@/lib/bookingOps";

const CLOSED_STATUSES = ["completed", "cancelled"];
const ALLOWED_REASONS = ["overdue", "quote_rejected", "quote_expired", "manual"];

export async function POST(req: NextRequest) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "dispatcher"].includes(String(profile.role))) {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  }

  const body = await req.json();
  const bookingId = String(body.bookingId || "");
  const archived = Boolean(body.archived);
  const action = String(body.action || "archive");
  const requestedReason = String(body.reason || "manual");

  if (!bookingId) return NextResponse.json({ error: "Brak identyfikatora rezerwacji." }, { status: 400 });

  const { data: booking, error: readError } = await admin.from("bookings").select("*").eq("id", bookingId).single();
  if (readError || !booking) return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });

  if (action === "delete") {
    const overdue = isOverdueBooking(booking);
    const quoteRejected = String(booking.quote_status || "") === "rejected";
    const quoteExpired =
      String(booking.quote_status || "") === "priced" &&
      Boolean(booking.quote_expires_at) &&
      new Date(booking.quote_expires_at).getTime() < Date.now();

    if (CLOSED_STATUSES.includes(String(booking.status || ""))) {
      return NextResponse.json({ error: "Rezerwacja zakończona lub anulowana jest już zamknięta i nie może zostać usunięta." }, { status: 409 });
    }

    if (!booking.archived_at && !overdue && !quoteRejected && !quoteExpired) {
      return NextResponse.json({
        error: "Ręcznie można usunąć tylko rezerwację po terminie albo wycenę odrzuconą/wygasłą."
      }, { status: 409 });
    }

    const { error } = await admin
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: true });
  }

  if (!archived) {
    const { data: updated, error } = await admin
      .from("bookings")
      .update({ archived_at: null, archived_reason: null, updated_at: new Date().toISOString() })
      .eq("id", bookingId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await admin.from("booking_history").insert({
      booking_id: bookingId,
      event: "Przywrócono rezerwację z archiwum do aktywnych",
      created_by: user.id
    });

    return NextResponse.json({ ok: true, booking: updated });
  }

  if (CLOSED_STATUSES.includes(String(booking.status || ""))) {
    return NextResponse.json({ error: "Rezerwacja zakończona lub anulowana jest już zamknięta." }, { status: 409 });
  }

  const overdue = isOverdueBooking(booking);
  const quoteRejected = String(booking.quote_status || "") === "rejected";
  const quoteExpired =
    String(booking.quote_status || "") === "priced" &&
    Boolean(booking.quote_expires_at) &&
    new Date(booking.quote_expires_at).getTime() < Date.now();

  let reason: string | null = null;
  if (quoteRejected) reason = "quote_rejected";
  else if (quoteExpired) reason = "quote_expired";
  else if (overdue) reason = "overdue";
  else if (requestedReason === "manual" && ALLOWED_REASONS.includes(requestedReason)) reason = "manual";

  if (!reason) {
    return NextResponse.json({
      error: "Można archiwizować tylko przejazd po terminie albo wycenę odrzuconą/wygasłą."
    }, { status: 409 });
  }

  const { data: updated, error } = await admin
    .from("bookings")
    .update({
      archived_at: new Date().toISOString(),
      archived_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq("id", bookingId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reasonLabel =
    reason === "overdue" ? "po terminie" :
    reason === "quote_rejected" ? "klient zrezygnował z wyceny" :
    reason === "quote_expired" ? "wycena wygasła" : "ręcznie";

  await admin.from("booking_history").insert({
    booking_id: bookingId,
    event: `Przeniesiono do ARCHIWUM · ${reasonLabel}`,
    created_by: user.id
  });

  return NextResponse.json({ ok: true, booking: updated });
}
