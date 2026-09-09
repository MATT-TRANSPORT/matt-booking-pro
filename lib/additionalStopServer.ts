import { AIRPORT_ROUTE_ADDRESSES } from "@/lib/additionalStopConfig";

function km(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

async function drivingDistanceKm(
  originAddress: string,
  destinationAddress: string,
  intermediates: string[] = []
) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("Brak GOOGLE_MAPS_API_KEY.");
  if (!originAddress || !destinationAddress) throw new Error("Brak adresu trasy.");

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration"
      },
      body: JSON.stringify({
        origin: { address: originAddress },
        destination: { address: destinationAddress },
        ...(intermediates.length
          ? { intermediates: intermediates.map((address) => ({ address })) }
          : {}),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        computeAlternativeRoutes: intermediates.length === 0,
        languageCode: "pl-PL",
        units: "METRIC"
      }),
      cache: "no-store"
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Nie udało się obliczyć trasy Google Routes.");
  }

  const routes = (data.routes ?? [])
    .filter((route: any) => Number(route.distanceMeters) > 0)
    .sort((a: any, b: any) => Number(a.distanceMeters) - Number(b.distanceMeters));

  if (!routes.length) throw new Error("Nie znaleziono trasy dla dodatkowego przystanku.");
  return km(Number(routes[0].distanceMeters) / 1000);
}

export type AdditionalStopDetour = {
  stopAddress: string | null;
  primary: boolean;
  returnLeg: boolean;
  primaryDirectKm: number;
  primaryViaKm: number;
  primaryExtraKm: number;
  returnDirectKm: number;
  returnViaKm: number;
  returnExtraKm: number;
  totalExtraKm: number;
};

export async function calculateAdditionalStopDetour(input: {
  serviceType: string;
  pickupAddress: string;
  airportKey: string;
  stopAddress?: string | null;
  primary?: boolean;
  returnLeg?: boolean;
  routeBaseAddress?: string | null;
}): Promise<AdditionalStopDetour> {
  const serviceType = ["to_airport", "from_airport", "roundtrip"].includes(input.serviceType)
    ? input.serviceType
    : "to_airport";
  const stopAddress = String(input.stopAddress || "").trim();
  const pickupAddress = String(input.pickupAddress || "").trim();
  const routeBaseAddress = String(input.routeBaseAddress || pickupAddress).trim();
  const airportAddress = AIRPORT_ROUTE_ADDRESSES[String(input.airportKey || "")];
  // Dla przejazdu w jedną stronę każdy podany dodatkowy adres dotyczy
  // tego jedynego kierunku. W roundtrip kierunki są wybierane osobno.
  const primary = Boolean(
    stopAddress && (serviceType === "roundtrip" ? input.primary : true)
  );
  const returnLeg = Boolean(
    stopAddress && serviceType === "roundtrip" && input.returnLeg
  );

  const active = primary || returnLeg;
  const empty: AdditionalStopDetour = {
    stopAddress: active ? stopAddress : null,
    primary,
    returnLeg,
    primaryDirectKm: 0,
    primaryViaKm: 0,
    primaryExtraKm: 0,
    returnDirectKm: 0,
    returnViaKm: 0,
    returnExtraKm: 0,
    totalExtraKm: 0
  };

  if (!stopAddress || (!primary && !returnLeg)) return empty;
  if (!pickupAddress) throw new Error("Podaj podstawowy adres przejazdu.");
  if (!routeBaseAddress) throw new Error("Brak adresu bazowego do porównania trasy.");
  if (!airportAddress) throw new Error("Nie można ustalić adresu wybranego lotniska.");

  let primaryDirectKm = 0;
  let primaryViaKm = 0;
  let primaryExtraKm = 0;
  let returnDirectKm = 0;
  let returnViaKm = 0;
  let returnExtraKm = 0;

  if (primary) {
    const origin = serviceType === "from_airport" ? airportAddress : routeBaseAddress;
    const destination = serviceType === "from_airport" ? routeBaseAddress : airportAddress;
    [primaryDirectKm, primaryViaKm] = await Promise.all([
      drivingDistanceKm(origin, destination),
      drivingDistanceKm(origin, destination, [stopAddress])
    ]);
    primaryExtraKm = km(Math.max(0, primaryViaKm - primaryDirectKm));
  }

  if (returnLeg) {
    [returnDirectKm, returnViaKm] = await Promise.all([
      drivingDistanceKm(airportAddress, routeBaseAddress),
      drivingDistanceKm(airportAddress, routeBaseAddress, [stopAddress])
    ]);
    returnExtraKm = km(Math.max(0, returnViaKm - returnDirectKm));
  }

  return {
    stopAddress,
    primary,
    returnLeg,
    primaryDirectKm,
    primaryViaKm,
    primaryExtraKm,
    returnDirectKm,
    returnViaKm,
    returnExtraKm,
    totalExtraKm: km(primaryExtraKm + returnExtraKm)
  };
}
