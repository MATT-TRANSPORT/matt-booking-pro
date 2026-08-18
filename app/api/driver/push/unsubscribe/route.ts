import { NextRequest, NextResponse } from "next/server";
import { driverClient } from "@/lib/driver";

export async function POST(req: NextRequest) {
  const { admin, driver } =
    await driverClient();

  const { endpoint } = await req.json();

  if (!endpoint) {
    return NextResponse.json(
      { error: "Brak endpointu." },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("driver_push_subscriptions")
    .update({
      active: false,
      updated_at: new Date().toISOString()
    })
    .eq("driver_id", driver.id)
    .eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
