import {
  bookingLegOperationalWindow,
  localDateTimeKey,
  localKeyToSerialMinutes
} from "@/lib/bookingOperationalWindow";

// v4.1.0: konflikt zasobów jest liczony po realnych oknach zajętości,
// zgodnych z Google Calendar, a nie po stałym dystansie 180 min.
export const RESOURCE_CONFLICT_WINDOW_MINUTES = 180; // legacy/export compatibility
export const UNASSIGNED_WARNING_MINUTES = 12 * 60;
export const UNASSIGNED_CRITICAL_MINUTES = 3 * 60;

export type DispatcherLeg = {
  kind: "primary" | "return";
  label: "WYJAZD" | "POWRÓT";
  date: string;
  time: string;
  key: string;
  operationalStartDate: string;
  operationalStartTime: string;
  operationalStartKey: string;
  operationalEndDate: string;
  operationalEndTime: string;
  operationalEndKey: string;
  driverId: string | null;
  vehicleId: string | null;
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
  overlapMinutes: number;
};

function normalizedTime(value?: string | null) {
  return String(value || "00:00").slice(0, 5).padStart(5, "0");
}

export function dateTimeKey(date?: string | null, time?: string | null) {
  return localDateTimeKey(date, time);
}

export function bookingLegs(booking: any): DispatcherLeg[] {
  const result: DispatcherLeg[] = [];

  const addLeg = (kind: "primary" | "return") => {
    const operational = bookingLegOperationalWindow(booking, kind);
    if (!operational.scheduledKey) return;
    result.push({
      kind,
      label: kind === "return" ? "POWRÓT" : "WYJAZD",
      date: operational.scheduledDate,
      time: operational.scheduledTime,
      key: operational.scheduledKey,
      operationalStartDate: operational.startDate,
      operationalStartTime: operational.startTime,
      operationalStartKey: operational.startKey,
      operationalEndDate: operational.endDate,
      operationalEndTime: operational.endTime,
      operationalEndKey: operational.endKey,
      driverId:
        kind === "return"
          ? (booking?.return_driver_id ? String(booking.return_driver_id) : null)
          : (booking?.driver_id ? String(booking.driver_id) : null),
      vehicleId:
        kind === "return"
          ? (booking?.return_vehicle_id ? String(booking.return_vehicle_id) : null)
          : (booking?.vehicle_id ? String(booking.vehicle_id) : null)
    });
  };

  addLeg("primary");
  if (booking?.service_type === "roundtrip") addLeg("return");

  return result.sort((a, b) => a.operationalStartKey.localeCompare(b.operationalStartKey));
}

function keyToMinutes(key: string) {
  return localKeyToSerialMinutes(key);
}

export function dispatcherLegWindow(_booking: any, leg: DispatcherLeg) {
  return {
    startMinutes: keyToMinutes(leg.operationalStartKey),
    endMinutes: keyToMinutes(leg.operationalEndKey)
  };
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
  const activeOrFuture = legs.find((leg) => leg.operationalEndKey >= nowKey);
  return activeOrFuture || legs[legs.length - 1] || null;
}

export function bookingMatchesDate(booking: any, date: string) {
  return bookingLegs(booking).some(
    (leg) => leg.date === date || leg.operationalStartDate === date || leg.operationalEndDate === date
  );
}

export function bookingMatchesRange(booking: any, start: string, end: string) {
  return bookingLegs(booking).some(
    (leg) =>
      (leg.date >= start && leg.date <= end) ||
      (leg.operationalStartDate >= start && leg.operationalStartDate <= end) ||
      (leg.operationalEndDate >= start && leg.operationalEndDate <= end)
  );
}

export function bookingInNextMinutes(booking: any, minutes: number, nowKey = warsawNowKey()) {
  const status = String(booking?.status || "");
  if (["completed", "cancelled"].includes(status)) return false;
  if (["in_progress", "arrived", "picked_up"].includes(status)) return true;

  return bookingLegs(booking).some((leg) => {
    if (leg.operationalStartKey <= nowKey && leg.operationalEndKey >= nowKey) return true;
    const delta = minutesFromNow(leg.operationalStartKey, nowKey);
    return delta >= 0 && delta <= minutes;
  });
}

export function dispatcherSortKey(booking: any, nowKey = warsawNowKey()) {
  const status = String(booking?.status || "");
  const liveRank = ["in_progress", "arrived", "picked_up"].includes(status) ? 0 : 1;
  const leg = nextOperationalLeg(booking, nowKey);
  return `${liveRank}|${leg?.operationalStartKey || "9999-12-31T23:59"}|${booking?.booking_number || ""}`;
}

export function findResourceConflicts(bookings: any[]) {
  const active = bookings.filter(
    (booking) => !["completed", "cancelled"].includes(String(booking?.status || ""))
  );
  const conflicts: ResourceConflict[] = [];
  const seen = new Set<string>();

  // Konflikt może wystąpić także między WYJAZDEM i POWROTEM tej samej
  // rezerwacji, jeśli przypiszemy ten sam zasób do nakładających się okien.
  for (const booking of active) {
    const legs = bookingLegs(booking);
    for (let i = 0; i < legs.length; i += 1) {
      for (let j = i + 1; j < legs.length; j += 1) {
        const aLeg = legs[i];
        const bLeg = legs[j];
        const aWindow = dispatcherLegWindow(booking, aLeg);
        const bWindow = dispatcherLegWindow(booking, bLeg);
        const overlapMinutes =
          Math.min(aWindow.endMinutes, bWindow.endMinutes) -
          Math.max(aWindow.startMinutes, bWindow.startMinutes);
        if (overlapMinutes <= 0) continue;

        const distance = Math.abs(keyToMinutes(aLeg.key) - keyToMinutes(bLeg.key));
        const resources: Array<{ resource: "driver" | "vehicle"; id: string }> = [];
        if (aLeg.driverId && aLeg.driverId === bLeg.driverId) resources.push({ resource: "driver", id: aLeg.driverId });
        if (aLeg.vehicleId && aLeg.vehicleId === bLeg.vehicleId) resources.push({ resource: "vehicle", id: aLeg.vehicleId });

        for (const resource of resources) {
          conflicts.push({
            bookingId: String(booking.id),
            bookingNumber: String(booking.booking_number || "—"),
            otherBookingId: String(booking.id),
            otherBookingNumber: String(booking.booking_number || "—"),
            resource: resource.resource,
            resourceId: resource.id,
            leg: aLeg.kind,
            otherLeg: bLeg.kind,
            minutesApart: distance,
            overlapMinutes
          });
        }
      }
    }
  }

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];

      for (const aLeg of bookingLegs(a)) {
        for (const bLeg of bookingLegs(b)) {
          const aMinutes = keyToMinutes(aLeg.key);
          const bMinutes = keyToMinutes(bLeg.key);
          if (!Number.isFinite(aMinutes) || !Number.isFinite(bMinutes)) continue;

          const aWindow = dispatcherLegWindow(a, aLeg);
          const bWindow = dispatcherLegWindow(b, bLeg);
          const overlapMinutes =
            Math.min(aWindow.endMinutes, bWindow.endMinutes) -
            Math.max(aWindow.startMinutes, bWindow.startMinutes);

          // Stykające się dokładnie końcem/początkiem okna nie są konfliktem.
          if (overlapMinutes <= 0) continue;

          const distance = Math.abs(aMinutes - bMinutes);

          const resources: Array<{ resource: "driver" | "vehicle"; id: string }> = [];
          if (aLeg.driverId && aLeg.driverId === bLeg.driverId) {
            resources.push({ resource: "driver", id: aLeg.driverId });
          }
          if (aLeg.vehicleId && aLeg.vehicleId === bLeg.vehicleId) {
            resources.push({ resource: "vehicle", id: aLeg.vehicleId });
          }

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
              minutesApart: distance,
              overlapMinutes
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

export function legHasFullAssignment(booking: any, kind: "primary" | "return") {
  if (kind === "return") return Boolean(booking?.return_driver_id && booking?.return_vehicle_id);
  return Boolean(booking?.driver_id && booking?.vehicle_id);
}

export function bookingHasMissingAssignment(booking: any) {
  return bookingLegs(booking).some((leg) => !leg.driverId || !leg.vehicleId);
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
  return legs.every((leg) => leg.operationalEndKey < nowKey);
}
