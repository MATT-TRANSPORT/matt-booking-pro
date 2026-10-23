import { customerJson, requestCustomerLocale } from "@/lib/customerErrors";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  let responseLocale=requestCustomerLocale(req);
  const json=(payload:any,init?:ResponseInit)=>customerJson(responseLocale,payload,init);
  const { token } = await params;
  const endpoint = req.nextUrl.searchParams.get("endpoint") || "";
  if (!endpoint) return json({ active: false });
  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("id,customer_locale").eq("customer_access_token", token).maybeSingle();
 responseLocale=requestCustomerLocale(req,booking?.customer_locale);
  if (!booking) return json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });
  const { data } = await admin.from("customer_push_subscriptions").select("id").eq("booking_id", booking.id).eq("endpoint", endpoint).eq("active", true).maybeSingle();
  return json({ active: Boolean(data) });
}
