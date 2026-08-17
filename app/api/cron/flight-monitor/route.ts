import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshBookingFlight } from "@/lib/flightServer";
import {
  shouldAutoRefresh,
  syncFlightAutomationAlerts
} from "@/lib/flightAutomation";

function warsawDate(offsetDays = 0) {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

export async function POST(req: NextRequest) {
  const expected =
    process.env.FLIGHT_MONITOR_CRON_SECRET;

  const received =
    req.headers.get("x-flight-monitor-secret");

  if (!expected) {
    return NextResponse.json(
      { error: "Brak FLIGHT_MONITOR_CRON_SECRET." },
      { status: 500 }
    );
  }

  if (!received || received !== expected) {
    return NextResponse.json(
      { error: "Brak dostępu." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  const { data: run } = await admin
    .from("flight_monitor_runs")
    .insert({
      source: "cron"
    })
    .select("id")
    .single();

  const from = warsawDate(-1);
  const to = warsawDate(2);

  const { data: primary } = await admin
    .from("bookings")
    .select("*")
    .gte("travel_date", from)
    .lte("travel_date", to)
    .not("flight_number", "is", null)
    .not("status", "in", "(completed,cancelled)")
    .order("travel_date")
    .order("travel_time")
    .limit(60);

  const { data: returning } = await admin
    .from("bookings")
    .select("*")
    .gte("return_date", from)
    .lte("return_date", to)
    .not("return_flight_number", "is", null)
    .not("status", "in", "(completed,cancelled)")
    .order("return_date")
    .limit(30);

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

  const ids = Array.from(
    new Set(candidates.map((x) => x.booking.id))
  );

  let cache: any[] = [];

  if (ids.length) {
    const { data } = await admin
      .from("booking_flights")
      .select("*")
      .in("booking_id", ids);

    cache = data ?? [];
  }

  let checked = 0;
  let refreshed = 0;
  let skipped = 0;
  let errors = 0;

  const details: any[] = [];

  // Free-plan conscious cap: at most 6 AirLabs calls per cron run.
  for (const item of candidates) {
    checked += 1;

    const cached =
      cache.find(
        (f: any) =>
          f.booking_id === item.booking.id &&
          f.leg === item.leg
      ) ?? null;

    if (
      !shouldAutoRefresh(
        item.booking,
        cached,
        item.leg
      )
    ) {
      skipped += 1;
      continue;
    }

    if (refreshed >= 6) {
      skipped += 1;
      continue;
    }

    try {
      const previous = cached
        ? { ...cached }
        : null;

      const flight = await refreshBookingFlight(
        admin,
        item.booking,
        item.leg
      );

      await syncFlightAutomationAlerts(
        admin,
        item.booking,
        flight,
        previous,
        item.leg
      );

      await admin
        .from("booking_flights")
        .update({
          consecutive_errors: 0,
          last_error: null
        })
        .eq("id", flight.id);

      refreshed += 1;

      details.push({
        booking_number: item.booking.booking_number,
        leg: item.leg,
        flight_number: flight.flight_number,
        status: flight.flight_status,
        delay:
          flight.arr_delayed ??
          flight.dep_delayed ??
          0
      });
    } catch (error) {
      errors += 1;

      const message =
        error instanceof Error
          ? error.message
          : "Nieznany błąd";

      if (cached?.id) {
        await admin
          .from("booking_flights")
          .update({
            consecutive_errors:
              Number(cached.consecutive_errors || 0) + 1,
            last_error: message
          })
          .eq("id", cached.id);
      }

      details.push({
        booking_number: item.booking.booking_number,
        leg: item.leg,
        error: message
      });
    }
  }

  if (run?.id) {
    await admin
      .from("flight_monitor_runs")
      .update({
        finished_at: new Date().toISOString(),
        checked_count: checked,
        refreshed_count: refreshed,
        skipped_count: skipped,
        error_count: errors,
        details
      })
      .eq("id", run.id);
  }

  return NextResponse.json({
    ok: true,
    checked,
    refreshed,
    skipped,
    errors
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "MATT Flight Automation",
    method: "POST"
  });
}
