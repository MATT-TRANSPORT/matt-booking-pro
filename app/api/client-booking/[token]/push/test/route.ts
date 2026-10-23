import { customerJson, requestCustomerLocale } from "@/lib/customerErrors";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingNotification } from "@/lib/customerNotifications";

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  let responseLocale=requestCustomerLocale(_req);
  const json=(payload:any,init?:ResponseInit)=>customerJson(responseLocale,payload,init);
  const { token } = await params;
  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("*").eq("customer_access_token", token).maybeSingle();
 responseLocale=requestCustomerLocale(_req,booking?.customer_locale);
  if (!booking || booking.company_id) return json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });

  try {
    const result = await sendBookingNotification(admin, booking, {
      kind: "confirmed",
      eventKey: `test:${booking.id}:${Date.now()}`,
      force: true
    });
    return json(result, { status: result.sent || result.skipped ? 200 : 500 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Nie udało się wysłać testu." }, { status: 500 });
  }
}
