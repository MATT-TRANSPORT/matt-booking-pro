import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings")
    .select("id,booking_number,status,service_type,travel_date,travel_time,return_date,return_time,flight_number,return_flight_number,driver_id,return_driver_id,vehicle_id,return_vehicle_id,drivers:drivers!bookings_driver_id_fkey(full_name,phone),return_driver:drivers!bookings_return_driver_id_fkey(full_name,phone),vehicles:vehicles!bookings_vehicle_id_fkey(name,registration),return_vehicle:vehicles!bookings_return_vehicle_id_fkey(name,registration)")
    .eq("customer_access_token", token).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });

  const [{ data: flights }, { data: alerts }, { data: history }] = await Promise.all([
    admin.from("booking_flights").select("leg,flight_number,status,scheduled_departure,scheduled_arrival,estimated_departure,estimated_arrival,actual_departure,actual_arrival,dep_delayed,arr_delayed,updated_at").eq("booking_id", booking.id),
    admin.from("booking_flight_alerts").select("leg,severity,title,message,updated_at").eq("booking_id", booking.id).eq("active", true).order("updated_at", { ascending: false }),
    admin.from("booking_history").select("event,created_at").eq("booking_id", booking.id).order("created_at", { ascending: true }).limit(100)
  ]);

  return NextResponse.json({ booking, flights: flights ?? [], alerts: alerts ?? [], history: history ?? [] });
}
