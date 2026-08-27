export type BookingLegKind = "primary" | "return";

function normalizeDate(value: unknown) {
  return String(value || "").slice(0, 10);
}

function normalizeTime(value: unknown) {
  const raw = String(value || "00:00").slice(0, 5);
  return /^\d{2}:\d{2}$/.test(raw) ? raw : "00:00";
}

export function localDateTimeKey(date: unknown, time: unknown) {
  const d = normalizeDate(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  return `${d}T${normalizeTime(time)}`;
}

export function localKeyToSerialMinutes(key: string) {
  const match = String(key || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return Number.NaN;
  return Math.floor(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5])
    ) / 60000
  );
}

export function shiftLocalDateTime(date: unknown, time: unknown, minutes: number) {
  const key = localDateTimeKey(date, time);
  if (!key) return { date: "", time: "", key: "" };

  const serial = localKeyToSerialMinutes(key);
  const value = new Date((serial + minutes) * 60_000);
  const pad = (x: number) => String(x).padStart(2, "0");
  const shiftedDate = `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  const shiftedTime = `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`;
  return { date: shiftedDate, time: shiftedTime, key: `${shiftedDate}T${shiftedTime}` };
}

export function bookingLegScheduledDate(booking: any, leg: BookingLegKind) {
  return normalizeDate(leg === "return" ? booking?.return_date : booking?.travel_date);
}

export function bookingLegScheduledTime(booking: any, leg: BookingLegKind) {
  return normalizeTime(leg === "return" ? booking?.return_time : booking?.travel_time);
}

export function isAirportPickupLeg(booking: any, leg: BookingLegKind) {
  return (
    booking?.service_type === "from_airport" ||
    (booking?.service_type === "roundtrip" && leg === "return")
  );
}

export function bookingLegWindowOffsets(booking: any, leg: BookingLegKind) {
  // MATT v4.1.2:
  // NA LOTNISKO: klient podaje godzinę WYJAZDU na lotnisko.
  // Zajętość kierowcy zaczyna się 30 min wcześniej i trwa 4 h.
  // Z LOTNISKA: klient podaje godzinę PRZYLOTU.
  // Zajętość zaczyna się 30 min wcześniej i trwa 3 h 30 min.
  return isAirportPickupLeg(booking, leg)
    ? { startOffsetMinutes: -30, durationMinutes: 210, endOffsetMinutes: 180 }
    : { startOffsetMinutes: -30, durationMinutes: 240, endOffsetMinutes: 210 };
}

export function bookingLegOperationalWindow(booking: any, leg: BookingLegKind) {
  const scheduledDate = bookingLegScheduledDate(booking, leg);
  const scheduledTime = bookingLegScheduledTime(booking, leg);
  const scheduledKey = localDateTimeKey(scheduledDate, scheduledTime);
  const offsets = bookingLegWindowOffsets(booking, leg);
  const start = shiftLocalDateTime(scheduledDate, scheduledTime, offsets.startOffsetMinutes);
  const end = shiftLocalDateTime(scheduledDate, scheduledTime, offsets.endOffsetMinutes);

  return {
    leg,
    scheduledDate,
    scheduledTime,
    scheduledKey,
    startDate: start.date,
    startTime: start.time,
    startKey: start.key,
    endDate: end.date,
    endTime: end.time,
    endKey: end.key,
    ...offsets
  };
}
