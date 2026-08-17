import { NextRequest, NextResponse } from "next/server";
import { apiAdmin } from "@/lib/apiAdmin";
import { refreshBookingFlight } from "@/lib/flightServer";

export async function POST(
  req: NextRequest,
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
  const body = await req.json().catch(() => ({}));
  const leg =
    body.leg === "return" ? "return" : "primary";

  const { data: booking, error } = await session.admin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !booking) {
    return NextResponse.json(
      { error: "Nie znaleziono rezerwacji." },
      { status: 404 }
    );
  }

  try {
    const flight = await refreshBookingFlight(
      session.admin,
      booking,
      leg
    );

    return NextResponse.json({
      ok: true,
      flight
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nie udało się sprawdzić lotu."
      },
      { status: 502 }
    );
  }
}
