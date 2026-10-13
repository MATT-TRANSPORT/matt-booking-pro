/** Multi-stop airport transfers: shared validation and surcharge calculation. */
export const MAX_AIRPORT_STOPS = 10;
export const AIRPORT_STOP_FEE_PLN = 20;
export const AIRPORT_DETOUR_RATE_PLN_PER_KM = 2.4;

export type AirportStop = { address: string; primary: boolean; returnLeg: boolean };

export function normalizeAirportStops(value: unknown, serviceType: string): AirportStop[] {
  if (!Array.isArray(value)) throw new Error("Lista przystanków musi być tablicą.");
  if (value.length > MAX_AIRPORT_STOPS) throw new Error("Maksymalnie 10 dodatkowych przystanków.");
  const roundtrip = serviceType === "roundtrip";
  const stops = value.map((entry: unknown) => {
    if (!entry || typeof entry !== "object") throw new Error("Nieprawidłowy przystanek.");
    const item = entry as Record<string, unknown>;
    const address = typeof item.address === "string" ? item.address.trim() : "";
    if (!address || address.length > 500) throw new Error("Podaj prawidłowy adres przystanku.");
    const primary = roundtrip ? item.primary === true : true;
    const returnLeg = roundtrip && item.returnLeg === true;
    if (!primary && !returnLeg) throw new Error("Wybierz kierunek dla przystanku.");
    return { address, primary, returnLeg };
  });
  return stops;
}

export function stopsForLeg(stops: AirportStop[], leg: "primary" | "return"): string[] {
  return stops.filter(s => leg === "primary" ? s.primary : s.returnLeg).map(s => s.address);
}

export function calculateAirportStopSurcharge(input: {
  stops: AirportStop[];
  primaryDirectKm: number;
  primaryViaKm: number;
  returnDirectKm?: number;
  returnViaKm?: number;
  kmRate?: number;
  stopFee?: number;
}) {
  const nonnegative = (n: number) => Number.isFinite(n) && n >= 0;
  const values = [input.primaryDirectKm, input.primaryViaKm, input.returnDirectKm ?? 0, input.returnViaKm ?? 0];
  if (!values.every(nonnegative)) throw new Error("Nieprawidłowy dystans trasy.");
  if (input.stops.length > MAX_AIRPORT_STOPS) throw new Error("Zbyt wiele przystanków.");
  const rate = input.kmRate ?? AIRPORT_DETOUR_RATE_PLN_PER_KM;
  const fee = input.stopFee ?? AIRPORT_STOP_FEE_PLN;
  if (![rate, fee].every(nonnegative)) throw new Error("Nieprawidłowa stawka.");
  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const primaryExtraKm = Math.max(0, input.primaryViaKm - input.primaryDirectKm);
  const returnExtraKm = Math.max(0, (input.returnViaKm ?? 0) - (input.returnDirectKm ?? 0));
  const stopCount = input.stops.reduce((sum, stop) => sum + Number(stop.primary) + Number(stop.returnLeg), 0);
  const totalExtraKm = round(primaryExtraKm + returnExtraKm);
  return {
    stopCount,
    primaryExtraKm: round(primaryExtraKm),
    returnExtraKm: round(returnExtraKm),
    totalExtraKm,
    stopFee: round(stopCount * fee),
    extraKmPrice: round(totalExtraKm * rate),
    totalSurcharge: round(stopCount * fee + totalExtraKm * rate)
  };
}
