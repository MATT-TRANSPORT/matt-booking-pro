import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("id").eq("customer_access_token", token).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });
  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Brak endpointu." }, { status: 400 });

  const { error } = await admin.from("customer_push_subscriptions").update({
    active: false,
    updated_at: new Date().toISOString()
  }).eq("booking_id", booking.id).eq("endpoint", String(endpoint));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
