export const CLOSED_STATUSES = ["completed", "cancelled"];
export const LIVE_STATUSES = ["in_progress", "arrived", "picked_up"];
export const RETURN_SERVICE_TYPES = ["roundtrip", "point_to_point_roundtrip"];

export function warsawToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function warsawTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());
}

export function warsawNowKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "00";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function bookingHasReturnLeg(booking: any) {
  const type = String(booking?.service_type || "");
  return RETURN_SERVICE_TYPES.includes(type) || Boolean(booking?.return_date);
}

export function bookingDateTimeKey(dateValue?: string | null, timeValue?: string | null) {
  const date = String(dateValue || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const match = String(timeValue || "00:00").match(/^(\d{1,2}):(\d{2})/);
  const hour = match ? match[1].padStart(2, "0") : "00";
  const minute = match ? match[2] : "00";
  return `${date}T${hour}:${minute}`;
}

export function bookingScheduledKeys(booking: any) {
  const keys = [bookingDateTimeKey(booking?.travel_date, booking?.travel_time)];
  if (bookingHasReturnLeg(booking)) {
    keys.push(bookingDateTimeKey(booking?.return_date, booking?.return_time));
  }
  return keys.filter(Boolean).sort();
}

export function bookingScheduleInfo(booking: any, nowKey = warsawNowKey()) {
  const status = String(booking?.status || "").toLowerCase();
  const legs = bookingScheduledKeys(booking);
  const lastLeg = legs.length ? legs[legs.length - 1] : "";

  if (CLOSED_STATUSES.includes(status)) {
    return {
      archived: true,
      reason: status === "cancelled" ? "cancelled" : "completed",
      group: 3,
      sortKey: lastLeg || bookingDateTimeKey(String(booking?.created_at || "").slice(0, 10), String(booking?.created_at || "").slice(11, 16))
    };
  }

  if (LIVE_STATUSES.includes(status)) {
    return {
      archived: false,
      reason: "active",
      group: 0,
      sortKey: legs.find((key) => key >= nowKey) || lastLeg || nowKey
    };
  }

  const upcoming = legs.find((key) => key >= nowKey);
  if (upcoming) {
    return { archived: false, reason: "upcoming", group: 1, sortKey: upcoming };
  }

  if (!legs.length) {
    return { archived: false, reason: "upcoming", group: 1, sortKey: "9999-12-31T23:59" };
  }

  return { archived: false, reason: "expired", group: 2, sortKey: lastLeg };
}

export function sortBookingsChronologically<T = any>(bookings: T[], nowKey = warsawNowKey()) {
  return [...bookings].sort((a: any, b: any) => {
    const left = bookingScheduleInfo(a, nowKey);
    const right = bookingScheduleInfo(b, nowKey);
    if (left.group !== right.group) return left.group - right.group;
    if (left.sortKey !== right.sortKey) {
      return left.group >= 2
        ? right.sortKey.localeCompare(left.sortKey)
        : left.sortKey.localeCompare(right.sortKey);
    }
    return String(b?.created_at || "").localeCompare(String(a?.created_at || ""));
  });
}

export function isArchivedBooking(booking: any) {
  return CLOSED_STATUSES.includes(String(booking.status || ""));
}

export function isOverdueBooking(booking: any) {
  if (CLOSED_STATUSES.includes(String(booking.status || ""))) return false;
  return bookingScheduleInfo(booking).reason === "expired";
}

export function statusStageClass(status?: string | null) {
  const value = String(status || "pending");
  if (value === "confirmed") return "stage-confirmed";
  if (value === "assigned") return "stage-assigned";
  if (LIVE_STATUSES.includes(value)) return "stage-progress";
  if (value === "completed") return "stage-completed";
  if (value === "cancelled") return "stage-cancelled";
  return "stage-pending";
}
