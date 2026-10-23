import { customerJson, requestCustomerLocale } from "@/lib/customerErrors";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  let responseLocale=requestCustomerLocale(req);
  const json=(payload:any,init?:ResponseInit)=>customerJson(responseLocale,payload,init);
  const { token } = await params;
  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("id,customer_locale").eq("customer_access_token", token).maybeSingle();
 responseLocale=requestCustomerLocale(req,booking?.customer_locale);
  if (!booking) return json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });
  const { endpoint } = await req.json();
  if (!endpoint) return json({ error: "Brak endpointu." }, { status: 400 });

  const { error } = await admin.from("customer_push_subscriptions").update({
    active: false,
    updated_at: new Date().toISOString()
  }).eq("booking_id", booking.id).eq("endpoint", String(endpoint));

  if (error) return json({ error: error.message }, { status: 500 });
  return json({ ok: true });
}
