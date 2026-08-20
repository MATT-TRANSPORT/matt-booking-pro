export type RouteDistance = {
  distanceKm: number;
  durationSeconds?: number | null;
};

export async function shortestDrivingRouteKm(
  origin: string,
  destination: string
): Promise<RouteDistance> {
  const from = String(origin || "").trim();
  const to = String(destination || "").trim();

  if (!from || !to) {
    throw new Error("Brak adresu początkowego lub docelowego.");
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error("Brak GOOGLE_MAPS_API_KEY.");
  }

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "routes.distanceMeters,routes.duration"
      },
      body: JSON.stringify({
        origin: { address: from },
        destination: { address: to },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        computeAlternativeRoutes: true,
        languageCode: "pl-PL",
        units: "METRIC"
      }),
      cache: "no-store"
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        "Google Routes API nie zwróciło poprawnej trasy."
    );
  }

  const routes = (data.routes || [])
    .filter((route: any) => route.distanceMeters !== undefined && Number(route.distanceMeters) >= 0)
    .sort(
      (a: any, b: any) =>
        Number(a.distanceMeters) - Number(b.distanceMeters)
    );

  if (!routes.length) {
    throw new Error("Nie znaleziono trasy pomiędzy podanymi adresami.");
  }

  const best = routes[0];
  const distanceKm =
    Math.round((Number(best.distanceMeters) / 1000) * 10) / 10;

  let durationSeconds: number | null = null;
  if (typeof best.duration === "string") {
    const match = best.duration.match(/^([0-9.]+)s$/);
    if (match) durationSeconds = Math.round(Number(match[1]));
  }

  return { distanceKm, durationSeconds };
}
