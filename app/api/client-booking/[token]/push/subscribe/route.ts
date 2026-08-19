import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("id,company_id").eq("customer_access_token", token).maybeSingle();
  if (!booking || booking.company_id) return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });

  const subscription = await req.json();
  const endpoint = String(subscription?.endpoint || "");
  const p256dh = String(subscription?.keys?.p256dh || "");
  const auth = String(subscription?.keys?.auth || "");
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: "Niepełne dane subskrypcji push." }, { status: 400 });

  const { error } = await admin.from("customer_push_subscriptions").upsert({
    booking_id: booking.id,
    endpoint,
    p256dh,
    auth,
    user_agent: req.headers.get("user-agent") || null,
    active: true,
    updated_at: new Date().toISOString()
  }, { onConflict: "booking_id,endpoint" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
