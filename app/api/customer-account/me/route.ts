import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CUSTOMER_SESSION_COOKIE,
  customerSessionByRawToken
} from "@/lib/customerAccount";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rawSession = req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value || "";
  const admin = createAdminClient();
  const session = await customerSessionByRawToken(admin, rawSession);

  if (!session) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const [bookingsResult, weddingsResult] = await Promise.all([
    admin
      .from("bookings")
      .select([
        "id","booking_number","service_type","pickup_address","destination_address",
        "airport_key","airport_label","travel_date","travel_time","return_date","return_time",
        "passengers","vehicle_type","customer_name","phone","email","invoice_required","company_nip",
        "notes","status","booking_source","customer_access_token","payment_method","payment_status",
        "online_payment_requested","total_price","flight_number","return_flight_number","transport_category",
        "additional_stop_address","additional_stop_primary","additional_stop_return","created_at"
      ].join(","))
      .eq("customer_email_normalized", session.email)
      .is("company_id", null)
      .order("travel_date", { ascending: true })
      .order("travel_time", { ascending: true }),
    admin
      .from("wedding_bookings")
      .select("id,booking_number,customer_name,start_date,start_time,restaurant_name,restaurant_address,vehicles_count,phone,email,notes,status,created_at")
      .eq("customer_email_normalized", session.email)
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true })
  ]);

  if (bookingsResult.error || weddingsResult.error) {
    console.error("Customer trips query:", bookingsResult.error || weddingsResult.error);
    return NextResponse.json(
      { error: "Nie udało się pobrać przejazdów." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Nie przedłużamy sesji bez końca; zapisujemy jedynie aktywność diagnostycznie.
  await admin
    .from("customer_portal_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", session.id);

  return NextResponse.json(
    {
      authenticated: true,
      email: session.email,
      bookings: bookingsResult.data || [],
      weddings: weddingsResult.data || []
    },
    { headers: { "Cache-Control": "no-store, private" } }
  );
}
