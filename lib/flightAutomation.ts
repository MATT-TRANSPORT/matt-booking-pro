import {
  displayFlightTime,
  flightEta,
  suggestedPickupTime
} from "@/lib/flightDisplay";

function minutesBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

function parseLocalDateTime(value?: string | null) {
  const match = String(value || "").match(
    /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
  );

  if (!match) return null;

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
    0
  );
}

function bookingReferenceTime(
  booking: any,
  flight: any,
  leg: "primary" | "return"
) {
  const relevant =
    leg === "return"
      ? flight?.arr_estimated || flight?.arr_time
      : booking.service_type === "from_airport"
      ? flight?.arr_estimated || flight?.arr_time
      : flight?.dep_estimated || flight?.dep_time;

  const parsed = parseLocalDateTime(relevant);
  if (parsed) return parsed;

  const date =
    leg === "return"
      ? booking.return_date
      : booking.travel_date;

  const time =
    leg === "return"
      ? booking.return_time || "12:00"
      : booking.travel_time || "12:00";

  return parseLocalDateTime(`${date} ${String(time).slice(0,5)}`);
}

export function automationIntervalMinutes(
  booking: any,
  flight: any,
  leg: "primary" | "return",
  now = new Date()
) {
  const status = String(flight?.flight_status || "").toLowerCase();

  if (
    ["landed", "cancelled", "diverted"].includes(status)
  ) {
    return null;
  }

  if (status === "en-route" || status === "en_route") {
    return 10;
  }

  const reference = bookingReferenceTime(booking, flight, leg);
  if (!reference) return 60;

  const until = minutesBetween(now, reference);

  if (until > 24 * 60) return null;
  if (until > 6 * 60) return 180;
  if (until > 2 * 60) return 60;
  if (until > -120) return 20;

  return 60;
}

export function shouldAutoRefresh(
  booking: any,
  flight: any,
  leg: "primary" | "return",
  now = new Date()
) {
  if (flight?.automation_enabled === false) return false;

  const interval = automationIntervalMinutes(
    booking,
    flight,
    leg,
    now
  );

  if (interval === null) return false;
  if (!flight?.last_checked_at) return true;

  const age =
    now.getTime() -
    new Date(flight.last_checked_at).getTime();

  return age >= interval * 60000;
}

async function upsertAlert(
  admin: any,
  {
    bookingId,
    flightId,
    leg,
    type,
    severity,
    title,
    message,
    payload
  }: {
    bookingId: string;
    flightId?: string | null;
    leg: string;
    type: string;
    severity: "info" | "warning" | "critical";
    title: string;
    message: string;
    payload?: any;
  }
) {
  const dedupeKey = `${bookingId}:${leg}:${type}`;

  const { error } = await admin
    .from("booking_flight_alerts")
    .upsert(
      {
        booking_id: bookingId,
        booking_flight_id: flightId || null,
        leg,
        alert_type: type,
        severity,
        dedupe_key: dedupeKey,
        title,
        message,
        active: true,
        acknowledged_at: null,
        resolved_at: null,
        payload: payload ?? null,
        updated_at: new Date().toISOString()
      },
      { onConflict: "dedupe_key" }
    );

  if (error) throw new Error(error.message);
}

async function resolveAlert(
  admin: any,
  bookingId: string,
  leg: string,
  type: string
) {
  const dedupeKey = `${bookingId}:${leg}:${type}`;

  await admin
    .from("booking_flight_alerts")
    .update({
      active: false,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("dedupe_key", dedupeKey)
    .eq("active", true);
}

async function detectDriverConflict(
  admin: any,
  booking: any,
  flight: any,
  leg: "primary" | "return"
) {
  if (!booking.driver_id) return null;

  const pickup =
    suggestedPickupTime(flight, 25);

  if (!pickup) return null;

  const match = pickup.match(
    /(\d{4}-\d{2}-\d{2}) · (\d{2}):(\d{2})/
  );

  if (!match) return null;

  const date = match[1];
  const readyMinutes =
    Number(match[2]) * 60 + Number(match[3]);

  const { data } = await admin
    .from("bookings")
    .select("id,booking_number,travel_date,travel_time,status")
    .eq("driver_id", booking.driver_id)
    .eq("travel_date", date)
    .neq("id", booking.id)
    .not("status", "in", "(completed,cancelled)");

  const conflict = (data ?? [])
    .map((row: any) => {
      const [h, m] = String(row.travel_time || "00:00")
        .slice(0,5)
        .split(":")
        .map(Number);

      const diff = h * 60 + m - readyMinutes;
      return { ...row, diff };
    })
    .filter((row: any) => row.diff > -30 && row.diff < 180)
    .sort((a: any, b: any) => a.diff - b.diff)[0];

  if (!conflict) return null;

  return {
    booking_number: conflict.booking_number,
    travel_date: conflict.travel_date,
    travel_time: String(conflict.travel_time).slice(0,5),
    diff_minutes: conflict.diff,
    suggested_ready: pickup
  };
}

export async function syncFlightAutomationAlerts(
  admin: any,
  booking: any,
  flight: any,
  previous: any,
  leg: "primary" | "return"
) {
  const status = String(flight?.flight_status || "").toLowerCase();
  const delay = Number(
    flight?.arr_delayed ??
    flight?.dep_delayed ??
    0
  );

  if (flight?.match_ok === false) {
    await upsertAlert(admin, {
      bookingId: booking.id,
      flightId: flight.id,
      leg,
      type: "date_mismatch",
      severity: "warning",
      title: `✈ ${flight.flight_number} · brak dopasowania`,
      message:
        flight.match_message ||
        "Dane lotu nie pasują do terminu rezerwacji."
    });
  } else {
    await resolveAlert(admin, booking.id, leg, "date_mismatch");
  }

  if (status === "cancelled") {
    await upsertAlert(admin, {
      bookingId: booking.id,
      flightId: flight.id,
      leg,
      type: "cancelled",
      severity: "critical",
      title: `🔴 LOT ${flight.flight_number} ODWOŁANY`,
      message:
        "Lot został oznaczony jako odwołany. Rezerwacja wymaga decyzji dyspozytora."
    });
  } else {
    await resolveAlert(admin, booking.id, leg, "cancelled");
  }

  if (status === "diverted") {
    await upsertAlert(admin, {
      bookingId: booking.id,
      flightId: flight.id,
      leg,
      type: "diverted",
      severity: "critical",
      title: `🔴 LOT ${flight.flight_number} PRZEKIEROWANY`,
      message:
        "Lot został przekierowany. Sprawdź lotnisko i plan kursu."
    });
  } else {
    await resolveAlert(admin, booking.id, leg, "diverted");
  }

  if (
    !["landed", "cancelled", "diverted"].includes(status) &&
    delay >= 20
  ) {
    await upsertAlert(admin, {
      bookingId: booking.id,
      flightId: flight.id,
      leg,
      type: "delay",
      severity: delay >= 45 ? "critical" : "warning",
      title:
        delay >= 45
          ? `🔴 ${flight.flight_number} · opóźnienie +${delay} min`
          : `🟠 ${flight.flight_number} · opóźnienie +${delay} min`,
      message:
        `Aktualne ETA: ${displayFlightTime(flightEta(flight))}. ` +
        "Sprawdź wpływ na obsadę i kolejny kurs.",
      payload: { delay }
    });
  } else {
    await resolveAlert(admin, booking.id, leg, "delay");
  }

  if (status === "landed") {
    await upsertAlert(admin, {
      bookingId: booking.id,
      flightId: flight.id,
      leg,
      type: "landed",
      severity: "info",
      title: `🛬 ${flight.flight_number} · WYLĄDOWAŁ`,
      message:
        `Samolot wylądował. ETA/ostatni czas: ${displayFlightTime(
          flightEta(flight)
        )}.`
    });
  } else {
    await resolveAlert(admin, booking.id, leg, "landed");
  }

  const previousEta = String(
    previous?.arr_estimated ||
    previous?.arr_time ||
    ""
  );

  const nextEta = String(
    flight?.arr_estimated ||
    flight?.arr_time ||
    ""
  );

  const prevDate = parseLocalDateTime(previousEta);
  const nextDate = parseLocalDateTime(nextEta);

  if (prevDate && nextDate) {
    const changed = Math.abs(
      minutesBetween(prevDate, nextDate)
    );

    if (
      changed >= 10 &&
      !["landed", "cancelled", "diverted"].includes(status)
    ) {
      await upsertAlert(admin, {
        bookingId: booking.id,
        flightId: flight.id,
        leg,
        type: "eta_change",
        severity: changed >= 30 ? "critical" : "warning",
        title: `⚠ ${flight.flight_number} · zmiana ETA`,
        message:
          `ETA zmieniło się o około ${changed} min. ` +
          `Aktualne ETA: ${displayFlightTime(nextEta)}.`,
        payload: {
          previous_eta: previousEta,
          current_eta: nextEta,
          change_minutes: changed
        }
      });
    }
  }

  if (
    booking.service_type === "from_airport" &&
    flight?.match_ok !== false &&
    !["cancelled", "diverted"].includes(status)
  ) {
    const conflict = await detectDriverConflict(
      admin,
      booking,
      flight,
      leg
    );

    if (conflict) {
      await upsertAlert(admin, {
        bookingId: booking.id,
        flightId: flight.id,
        leg,
        type: "eta_conflict",
        severity: "critical",
        title: "🔴 MOŻLIWY KONFLIKT PO ZMIANIE ETA",
        message:
          `Sugerowana gotowość po locie: ${conflict.suggested_ready}. ` +
          `Ten sam kierowca ma kurs ${conflict.booking_number} ` +
          `${conflict.travel_date} o ${conflict.travel_time}.`,
        payload: conflict
      });
    } else {
      await resolveAlert(
        admin,
        booking.id,
        leg,
        "eta_conflict"
      );
    }
  } else {
    await resolveAlert(
      admin,
      booking.id,
      leg,
      "eta_conflict"
    );
  }
}
