import { calculateFullRouteDetour, normalizeRouteStops } from "@/lib/routeDetourPolicy";

/** Order of stops is significant and must match the driver's route. */
export type MultiStopLeg = { stops: string[]; baselineKm: number; actualKm: number; detourKm: number };
export type MultiStopQuote = { outbound: MultiStopLeg; inbound: MultiStopLeg; totalDetourKm: number; chargedStopVisits: number };

async function googleDrivingKm(origin: string, destination: string, via: string[]): Promise<number> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("Brak GOOGLE_MAPS_API_KEY.");
  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "routes.distanceMeters" },
    body: JSON.stringify({
      origin: { address: origin }, destination: { address: destination },
      ...(via.length ? { intermediates: via.map(address => ({ address })) } : {}),
      travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE",
      computeAlternativeRoutes: via.length === 0, languageCode: "pl-PL", units: "METRIC"
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Nie udało się obliczyć trasy.");
  const distances = (data.routes || []).map((r: any) => Number(r.distanceMeters))
    .filter((n: number) => Number.isFinite(n) && n >= 0);
  if (!distances.length) throw new Error("Google Routes nie zwróciło długości trasy.");
  return Math.round((Math.min(...distances) / 1000) * 10) / 10;
}

export async function quoteMultiStopRoute(input: {
  baseAddress: string;
  pickupAddress: string;
  airportAddress: string;
  serviceType: "to_airport" | "from_airport" | "roundtrip";
  outboundStops?: string[];
  inboundStops?: string[];
  drivingKm?: (origin: string, destination: string, via: string[]) => Promise<number>;
}): Promise<MultiStopQuote> {
  if (!["to_airport","from_airport","roundtrip"].includes(input.serviceType)) throw new Error("Nieprawidłowy kierunek przejazdu.");
  const outboundStops = normalizeRouteStops(input.outboundStops ?? []);
  const inboundStops = normalizeRouteStops(input.inboundStops ?? []);
  if (outboundStops.length + inboundStops.length > 10) {
    throw new Error("Maksymalnie 10 dodatkowych przystanków w rezerwacji.");
  }
  if (input.serviceType !== "roundtrip" && inboundStops.length) {
    throw new Error("Przystanki powrotne wymagają rezerwacji w obie strony.");
  }
  const drivingKm = input.drivingKm ?? googleDrivingKm;
  const outboundActive = input.serviceType !== "from_airport";
  const quoteLeg = async (active: boolean, stops: string[], origin: string, destination: string, reverse = false) => {
    if (!active) return { stops: [], baselineKm: 0, actualKm: 0, detourKm: 0 };
    const result = await calculateFullRouteDetour({
      baseAddress: origin, pickupAddress: reverse ? (stops[0] ?? input.pickupAddress) : input.pickupAddress,
      destinationAddress: destination, stops: reverse ? (stops.length ? [...stops.slice(1),input.pickupAddress] : []) : stops, drivingKm
    });
    return { stops, baselineKm: result.baselineKm, actualKm: result.actualKm, detourKm: result.extraKm };
  };
  // Reverse legs use the same reference endpoints but preserve the driver's stop order.
  const outbound = await quoteLeg(outboundActive, outboundStops, input.baseAddress, input.airportAddress);
  const inbound = await quoteLeg(!outboundActive || input.serviceType === "roundtrip",
    input.serviceType === "from_airport" ? outboundStops : inboundStops,
    input.airportAddress, input.baseAddress, true);
  return {
    outbound, inbound,
    totalDetourKm: Math.round((outbound.detourKm + inbound.detourKm) * 10) / 10,
    chargedStopVisits: outboundStops.length + inboundStops.length
  };
}
