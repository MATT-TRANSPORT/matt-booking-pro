import { NextResponse } from "next/server";
import { apiAdmin } from "@/lib/apiAdmin";
import {
  flightNeedsRefresh,
  refreshBookingFlight
} from "@/lib/flightServer";

function plDate(offsetDays = 0) {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

export async function POST() {
  const session = await apiAdmin();

  if ("error" in session) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  const from = plDate(-1);
  const to = plDate(2);

  const { data: primary } = await session.admin
    .from("bookings")
    .select("*")
    .gte("travel_date", from)
    .lte("travel_date", to)
    .not("flight_number", "is", null)
    .not("status", "in", "(completed,cancelled)")
    .order("travel_date")
    .order("travel_time")
    .limit(40);

  const { data: returning } = await session.admin
    .from("bookings")
    .select("*")
    .gte("return_date", from)
    .lte("return_date", to)
    .not("return_flight_number", "is", null)
    .not("status", "in", "(completed,cancelled)")
    .order("return_date")
    .limit(20);

  const candidates = [
    ...(primary ?? []).map((booking: any) => ({
      booking,
      leg: "primary" as const
    })),
    ...(returning ?? []).map((booking: any) => ({
      booking,
      leg: "return" as const
    }))
  ];

  const bookingIds = Array.from(
    new Set(candidates.map((x) => x.booking.id))
  );

  let existing: any[] = [];

  if (bookingIds.length) {
    const { data } = await session.admin
      .from("booking_flights")
      .select("*")
      .in("booking_id", bookingIds);

    existing = data ?? [];
  }

  let refreshed = 0;
  let skipped = 0;
  const errors: any[] = [];

  // Deliberately cap external calls per click for the free plan.
  for (const item of candidates) {
    if (refreshed >= 8) break;

    const cached = existing.find(
      (f: any) =>
        f.booking_id === item.booking.id &&
        f.leg === item.leg
    );

    if (cached && !flightNeedsRefresh(cached, 20)) {
      skipped += 1;
      continue;
    }

    try {
      await refreshBookingFlight(
        session.admin,
        item.booking,
        item.leg
      );
      refreshed += 1;
    } catch (error) {
      errors.push({
        booking_number: item.booking.booking_number,
        leg: item.leg,
        error:
          error instanceof Error
            ? error.message
            : "Nieznany błąd"
      });
    }
  }

  return NextResponse.json({
    ok: true,
    refreshed,
    skipped,
    errors
  });
}
