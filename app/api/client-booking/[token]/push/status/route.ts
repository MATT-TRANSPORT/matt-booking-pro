import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const endpoint = req.nextUrl.searchParams.get("endpoint") || "";
  if (!endpoint) return NextResponse.json({ active: false });
  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("id").eq("customer_access_token", token).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });
  const { data } = await admin.from("customer_push_subscriptions").select("id").eq("booking_id", booking.id).eq("endpoint", endpoint).eq("active", true).maybeSingle();
  return NextResponse.json({ active: Boolean(data) });
}
