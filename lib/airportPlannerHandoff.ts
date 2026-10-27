// Same-tab handoff from the public departure planner to the airport booking form.
// Keep the customer's pickup address out of URLs, analytics events and referrers.
export type AirportPlannerHandoff = {
  airport: string;
  address: string;
  travelDate: string;
  travelTime: string;
  savedAt: number;
};
const HANDOFF_KEY = "matt-airport-planner-handoff-v1";
const HANDOFF_TTL_MS = 30 * 60 * 1000;

export function saveAirportPlannerHandoff(input: Omit<AirportPlannerHandoff, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ ...input, savedAt: Date.now() }));
  } catch { /* Customer can always complete the form manually. */ }
}

export function takeAirportPlannerHandoff(expectedAirport: string): AirportPlannerHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY);
    window.sessionStorage.removeItem(HANDOFF_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<AirportPlannerHandoff>;
    if (data.airport !== expectedAirport ||
        typeof data.address !== "string" ||
        data.address.trim().length < 8 || data.address.length > 220 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.travelDate || "") ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.travelTime || "") ||
        typeof data.savedAt !== "number" ||
        Date.now() - data.savedAt < 0 ||
        Date.now() - data.savedAt > HANDOFF_TTL_MS) return null;
    const outbound = new Date(`${data.travelDate}T${data.travelTime}`);
    if (!Number.isFinite(outbound.getTime()) ||
        outbound.getFullYear() !== Number(data.travelDate?.slice(0, 4)) ||
        outbound.getMonth() + 1 !== Number(data.travelDate?.slice(5, 7)) ||
        outbound.getDate() !== Number(data.travelDate?.slice(8, 10))) return null;
    return data as AirportPlannerHandoff;
  } catch {
    return null;
  }
}
