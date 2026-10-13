import { normalizeAirportStops, stopsForLeg, calculateAirportStopSurcharge } from "@/lib/multipleAirportStops";
import type { AirportStop } from "@/lib/multipleAirportStops";

async function routeDistanceMeters(origin: string, destination: string, intermediates: string[]): Promise<number> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("Brak GOOGLE_MAPS_API_KEY.");
  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.distanceMeters"
    },
    body: JSON.stringify({
      origin: { address: origin },
      destination: { address: destination },
      intermediates: intermediates.map(address => ({ address })),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      computeAlternativeRoutes: intermediates.length === 0,
      languageCode: "pl-PL",
      units: "METRIC"
    }),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Błąd wyznaczania trasy Google.");
  const distances = (data.routes ?? []).map((route: { distanceMeters?: number }) => Number(route.distanceMeters))
    .filter((distance: number) => Number.isFinite(distance) && distance > 0);
  if (!distances.length) throw new Error("Nie znaleziono trasy przez podane przystanki.");
  return Math.min(...distances);
}

/** Calculate the entire itinerary in the user-specified order. */
export async function quoteMultipleAirportStops(input: {
  serviceType: string;
  pickupAddress: string;
  airportAddress: string;
  stops: unknown;
  kmRate?: number;
  stopFee?: number;
}) {
  const stops: AirportStop[] = normalizeAirportStops(input.stops, input.serviceType);
  const pickup = input.pickupAddress.trim();
  const airport = input.airportAddress.trim();
  if (!pickup || !airport) throw new Error("Podaj adres odbioru i lotniska.");
  const fromAirport = input.serviceType === "from_airport";
  const primaryOrigin = fromAirport ? airport : pickup;
  const primaryDestination = fromAirport ? pickup : airport;
  const primaryStops = stopsForLeg(stops, "primary");
  const returnStops = stopsForLeg(stops, "return");
  const isRoundtrip = input.serviceType === "roundtrip";
  const [primaryDirect, primaryVia, returnDirect, returnVia] = await Promise.all([
    routeDistanceMeters(primaryOrigin, primaryDestination, []),
    primaryStops.length ? routeDistanceMeters(primaryOrigin, primaryDestination, primaryStops) : routeDistanceMeters(primaryOrigin, primaryDestination, []),
    isRoundtrip ? routeDistanceMeters(airport, pickup, []) : Promise.resolve(0),
    isRoundtrip && returnStops.length ? routeDistanceMeters(airport, pickup, returnStops) : isRoundtrip ? routeDistanceMeters(airport, pickup, []) : Promise.resolve(0)
  ]);
  const result = calculateAirportStopSurcharge({
    stops,
    primaryDirectKm: primaryDirect / 1000,
    primaryViaKm: primaryVia / 1000,
    returnDirectKm: returnDirect / 1000,
    returnViaKm: returnVia / 1000,
    kmRate: input.kmRate,
    stopFee: input.stopFee
  });
  return {
    stops,
    primaryRoute: [primaryOrigin, ...primaryStops, primaryDestination],
    returnRoute: isRoundtrip ? [airport, ...returnStops, pickup] : [],
    primaryDistanceKm: Math.round(primaryVia / 100) / 10,
    returnDistanceKm: Math.round(returnVia / 100) / 10,
    ...result
  };
}
