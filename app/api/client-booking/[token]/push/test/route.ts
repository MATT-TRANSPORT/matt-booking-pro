import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingNotification } from "@/lib/customerNotifications";

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("*").eq("customer_access_token", token).maybeSingle();
  if (!booking || booking.company_id) return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });

  try {
    const result = await sendBookingNotification(admin, booking, {
      kind: "confirmed",
      eventKey: `test:${booking.id}:${Date.now()}`,
      force: true
    });
    return NextResponse.json(result, { status: result.sent || result.skipped ? 200 : 500 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się wysłać testu." }, { status: 500 });
  }
}
