export const CLOSED_STATUSES = ["completed", "cancelled"];

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

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isArchivedBooking(booking: any) {
  return (
    String(booking.travel_date || "") < warsawToday() &&
    CLOSED_STATUSES.includes(String(booking.status || ""))
  );
}

export function isOverdueBooking(booking: any) {
  const date = String(booking.travel_date || "");
  const time = String(booking.travel_time || "00:00").slice(0, 5);
  const today = warsawToday();

  if (CLOSED_STATUSES.includes(String(booking.status || ""))) return false;
  if (date < today) return true;
  if (date > today) return false;

  return time < warsawTime();
}

export function statusStageClass(status?: string | null) {
  const value = String(status || "pending");
  if (value === "confirmed") return "stage-confirmed";
  if (value === "assigned") return "stage-assigned";
  if (["in_progress", "arrived", "picked_up"].includes(value)) return "stage-progress";
  if (value === "completed") return "stage-completed";
  if (value === "cancelled") return "stage-cancelled";
  return "stage-pending";
}
