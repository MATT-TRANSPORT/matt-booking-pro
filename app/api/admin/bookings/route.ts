import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = [
  "pending",
  "confirmed",
  "assigned",
  "in_progress",
  "picked_up",
  "completed",
  "cancelled"
];

export async function POST(req: NextRequest) {
  const s = await createClient();

  const {
    data: { user }
  } = await s.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Brak autoryzacji" },
      { status: 401 }
    );
  }

  const {
    id,
    driverId,
    vehicleId,
    status
  } = await req.json();

  if (!id) {
    return NextResponse.json(
      { error: "Brak identyfikatora rezerwacji." },
      { status: 400 }
    );
  }

  if (status && !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Nieprawidłowy status rezerwacji." },
      { status: 400 }
    );
  }

  const updateData: Record<string, any> = {
    driver_id: driverId || null,
    vehicle_id: vehicleId || null,
    updated_at: new Date().toISOString()
  };

  if (status) {
    updateData.status = status;
  }

  const { data, error } = await s
    .from("bookings")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const driverText = driverId ? "kierowca przypisany" : "bez kierowcy";
  const vehicleText = vehicleId ? "pojazd przypisany" : "bez pojazdu";

  await s.from("booking_history").insert({
    booking_id: id,
    event: `Aktualizacja rezerwacji: status ${status ?? data.status}, ${driverText}, ${vehicleText}`,
    created_by: user.id
  });

  return NextResponse.json(data);
}
