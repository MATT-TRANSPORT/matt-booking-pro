import { NextResponse } from "next/server";
import { apiAdmin } from "@/lib/apiAdmin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await apiAdmin();

  if ("error" in session) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  const { id } = await params;

  const { error } = await session.admin
    .from("booking_flight_alerts")
    .update({
      acknowledged_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
