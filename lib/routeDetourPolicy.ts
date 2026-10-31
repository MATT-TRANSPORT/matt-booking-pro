/**
 * Shared distance policy for B2C and B2B. Calculate the incremental distance
 * of the COMPLETE ordered route, never sum individual stop detours.
 * The caller decides the contracted free-km allowance and monetary tariff.
 */
export type RouteDetourSummary = {
  baselineKm: number;
  actualKm: number;
  extraKm: number;
  stops: string[];
};

export function routeDetourKm(baselineKm: number, actualKm: number): number {
  if (![baselineKm, actualKm].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error("Nieprawidłowa odległość trasy.");
  }
  return Math.round((Math.max(0, actualKm - baselineKm) + Number.EPSILON) * 10) / 10;
}

export function normalizeRouteStops(stops: unknown, maxStops = 10): string[] {
  if (!Array.isArray(stops)) throw new Error("Lista przystanków musi być tablicą.");
  if (stops.length > maxStops) throw new Error("Maksymalnie 10 dodatkowych adresów.");
  const cleaned = stops.map((value) => typeof value === "string" ? value.trim() : "");
  if (cleaned.some((value) => !value || value.length > 400)) {
    throw new Error("Każdy przystanek musi mieć poprawny adres.");
  }
  return cleaned;
}

/** Uses the exact same origin and destination for baseline and actual route. */
export async function calculateFullRouteDetour(input: {
  baseAddress: string;
  pickupAddress: string;
  destinationAddress: string;
  stops?: string[];
  drivingKm: (origin: string, destination: string, via: string[]) => Promise<number>;
}): Promise<RouteDetourSummary> {
  const stops = normalizeRouteStops(input.stops ?? []);
  const base = input.baseAddress.trim();
  const pickup = input.pickupAddress.trim();
  const destination = input.destinationAddress.trim();
  if (!base || !pickup || !destination) throw new Error("Brak adresu trasy.");
  const via = [pickup, ...stops].filter((address, index, all) =>
    address !== base && address !== destination && (index === 0 || address !== all[index - 1])
  );
  const [baselineKm, actualKm] = await Promise.all([
    input.drivingKm(base, destination, []),
    input.drivingKm(base, destination, via)
  ]);
  return { baselineKm, actualKm, extraKm: routeDetourKm(baselineKm, actualKm), stops };
}
