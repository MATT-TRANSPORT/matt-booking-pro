export const RESOURCE_CONFLICT_WINDOW_MINUTES = 180;
export const UNASSIGNED_WARNING_MINUTES = 12 * 60;
export const UNASSIGNED_CRITICAL_MINUTES = 3 * 60;

export type DispatcherLeg = {
  kind: "primary" | "return";
  label: "WYJAZD" | "POWRÓT";
  date: string;
  time: string;
  key: string;
};

export type ResourceConflict = {
  bookingId: string;
  bookingNumber: string;
  otherBookingId: string;
  otherBookingNumber: string;
  resource: "driver" | "vehicle";
  resourceId: string;
  leg: "primary" | "return";
  otherLeg: "primary" | "return";
  minutesApart: number;
};

function normalizedTime(value?: string | null) {
  return String(value || "00:00").slice(0, 5).padStart(5, "0");
}

export function dateTimeKey(date?: string | null, time?: string | null) {
  const d = String(date || "").slice(0, 10);
  if (!d) return "";
  return `${d}T${normalizedTime(time)}`;
}

export function bookingLegs(booking: any): DispatcherLeg[] {
  const result: DispatcherLeg[] = [];
  const primaryKey = dateTimeKey(booking?.travel_date, booking?.travel_time);

  if (primaryKey) {
    result.push({
      kind: "primary",
      label: "WYJAZD",
      date: String(booking.travel_date).slice(0, 10),
      time: normalizedTime(booking.travel_time),
      key: primaryKey
    });
  }

  if (booking?.service_type === "roundtrip") {
    const returnKey = dateTimeKey(booking?.return_date, booking?.return_time);
    if (returnKey) {
      result.push({
        kind: "return",
        label: "POWRÓT",
        date: String(booking.return_date).slice(0, 10),
        time: normalizedTime(booking.return_time),
        key: returnKey
      });
    }
  }

  return result.sort((a, b) => a.key.localeCompare(b.key));
}

function keyToMinutes(key: string) {
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return Number.NaN;

  const [, year, month, day, hour, minute] = match;
  return Math.floor(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute)
    ) / 60000
  );
}

export function warsawNowKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "00";

  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

export function minutesFromNow(key: string, nowKey = warsawNowKey()) {
  const target = keyToMinutes(key);
  const now = keyToMinutes(nowKey);
  if (!Number.isFinite(target) || !Number.isFinite(now)) return Number.POSITIVE_INFINITY;
  return target - now;
}

export function nextOperationalLeg(booking: any, nowKey = warsawNowKey()) {
  const legs = bookingLegs(booking);
  const future = legs.find((leg) => leg.key >= nowKey);
  return future || legs[legs.length - 1] || null;
}

export function bookingMatchesDate(booking: any, date: string) {
  return bookingLegs(booking).some((leg) => leg.date === date);
}

export function bookingMatchesRange(booking: any, start: string, end: string) {
  return bookingLegs(booking).some((leg) => leg.date >= start && leg.date <= end);
}

export function bookingInNextMinutes(booking: any, minutes: number, nowKey = warsawNowKey()) {
  const status = String(booking?.status || "");
  if (["completed", "cancelled"].includes(status)) return false;
  if (["in_progress", "arrived", "picked_up"].includes(status)) return true;

  return bookingLegs(booking).some((leg) => {
    const delta = minutesFromNow(leg.key, nowKey);
    return delta >= 0 && delta <= minutes;
  });
}

export function dispatcherSortKey(booking: any, nowKey = warsawNowKey()) {
  const status = String(booking?.status || "");
  const liveRank = ["in_progress", "arrived", "picked_up"].includes(status) ? 0 : 1;
  const leg = nextOperationalLeg(booking, nowKey);
  return `${liveRank}|${leg?.key || "9999-12-31T23:59"}|${booking?.booking_number || ""}`;
}

export function findResourceConflicts(bookings: any[]) {
  const active = bookings.filter(
    (booking) => !["completed", "cancelled"].includes(String(booking?.status || ""))
  );
  const conflicts: ResourceConflict[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];
      const resources: Array<{ resource: "driver" | "vehicle"; id: string }> = [];

      if (a.driver_id && a.driver_id === b.driver_id) {
        resources.push({ resource: "driver", id: String(a.driver_id) });
      }
      if (a.vehicle_id && a.vehicle_id === b.vehicle_id) {
        resources.push({ resource: "vehicle", id: String(a.vehicle_id) });
      }
      if (!resources.length) continue;

      for (const aLeg of bookingLegs(a)) {
        for (const bLeg of bookingLegs(b)) {
          const aMinutes = keyToMinutes(aLeg.key);
          const bMinutes = keyToMinutes(bLeg.key);
          if (!Number.isFinite(aMinutes) || !Number.isFinite(bMinutes)) continue;

          const distance = Math.abs(aMinutes - bMinutes);
          if (distance >= RESOURCE_CONFLICT_WINDOW_MINUTES) continue;

          for (const resource of resources) {
            const key = [a.id, b.id, resource.resource, aLeg.kind, bLeg.kind].join(":");
            if (seen.has(key)) continue;
            seen.add(key);

            conflicts.push({
              bookingId: String(a.id),
              bookingNumber: String(a.booking_number || "—"),
              otherBookingId: String(b.id),
              otherBookingNumber: String(b.booking_number || "—"),
              resource: resource.resource,
              resourceId: resource.id,
              leg: aLeg.kind,
              otherLeg: bLeg.kind,
              minutesApart: distance
            });
          }
        }
      }
    }
  }

  return conflicts;
}

export function conflictsForBooking(bookingId: string, conflicts: ResourceConflict[]) {
  const result: ResourceConflict[] = [];

  for (const conflict of conflicts) {
    if (conflict.bookingId === bookingId) {
      result.push(conflict);
    } else if (conflict.otherBookingId === bookingId) {
      result.push({
        ...conflict,
        bookingId: conflict.otherBookingId,
        bookingNumber: conflict.otherBookingNumber,
        otherBookingId: conflict.bookingId,
        otherBookingNumber: conflict.bookingNumber,
        leg: conflict.otherLeg,
        otherLeg: conflict.leg
      });
    }
  }

  return result;
}

export function nextDispatcherAction(status?: string | null) {
  const current = String(status || "pending");

  if (current === "pending") return { status: "confirmed", label: "✓ POTWIERDŹ" };
  if (current === "confirmed" || current === "assigned") {
    return { status: "in_progress", label: "🚐 KIEROWCA WYRUSZYŁ" };
  }
  if (current === "in_progress") return { status: "arrived", label: "📍 NA MIEJSCU" };
  if (current === "arrived") return { status: "picked_up", label: "👤 PASAŻER ODEBRANY" };
  if (current === "picked_up") return { status: "completed", label: "✅ ZAKOŃCZ" };
  return null;
}

export function isDispatcherOverdue(booking: any, nowKey = warsawNowKey()) {
  const status = String(booking?.status || "");
  if (["completed", "cancelled", "in_progress", "arrived", "picked_up"].includes(status)) return false;

  const legs = bookingLegs(booking);
  if (!legs.length) return false;
  return legs.every((leg) => leg.key < nowKey);
}
