import { NextRequest, NextResponse } from "next/server";
import { AIRPORT_ROUTE_ADDRESSES } from "@/lib/additionalStopConfig";

// Public calculator used by the MATT TRANSPORT WordPress airport-departure planner.
// The API key remains exclusively on the server. Never return Google API errors verbatim.
const ALLOWED_ORIGINS = new Set([
  "https://matt-transport.pl",
  "https://www.matt-transport.pl",
  "https://booking.matt-transport.pl",
]);
const AIRPORT_LABELS: Record<string, string> = {
  pyrzowice: "Katowice-Pyrzowice (KTW)",
  balice: "Kraków-Balice (KRK)",
  ostrawa: "Ostrawa (OSR)",
  wroclaw: "Wrocław (WRO)",
  warszawa: "Warszawa-Chopin (WAW)",
  prague: "Praga (PRG)",
  vienna: "Wiedeń (VIE)",
};

function corsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get("origin") ?? "";
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(request: NextRequest, data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders(request) });
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(request, { error: "Niedozwolone źródło żądania." }, 403);
  }
  if (Number(request.headers.get("content-length") || 0) > 4096) {
    return json(request, { error: "Zbyt duże żądanie." }, 413);
  }
  let address = "";
  let airport = "";
  try {
    const raw = await request.text();
    if (raw.length > 4096) return json(request, { error: "Zbyt duże żądanie." }, 413);
    const body = JSON.parse(raw);
    address = typeof body.address === "string" ? body.address.trim() : "";
    airport = typeof body.airport === "string" ? body.airport.trim() : "";
  } catch {
    return json(request, { error: "Nieprawidłowe dane formularza." }, 400);
  }

  if (address.length < 8 || address.length > 220 || /[<>]/.test(address)) {
    return json(request, { error: "Podaj pełny adres odbioru: miejscowość, ulica i numer." }, 400);
  }
  if (!Object.prototype.hasOwnProperty.call(AIRPORT_LABELS, airport)) {
    return json(request, { error: "Wybierz lotnisko z listy." }, 400);
  }
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return json(request, { error: "Automatyczne wyliczenie jest chwilowo niedostępne." }, 503);
  }

  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: { address },
        destination: { address: AIRPORT_ROUTE_ADDRESSES[airport] },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        computeAlternativeRoutes: false,
        languageCode: "pl-PL",
        units: "METRIC",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return json(request, { error: "Nie udało się wyznaczyć trasy. Sprawdź adres i spróbuj ponownie." }, 502);
    }
    const result = await response.json();
    const route = Array.isArray(result.routes) ? result.routes[0] : undefined;
    const durationSeconds = Number(String(route?.duration ?? "").replace(/s$/, ""));
    const distanceMeters = Number(route?.distanceMeters);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 ||
        !Number.isFinite(distanceMeters) || distanceMeters <= 0) {
      return json(request, { error: "Nie znaleziono trasy między adresem a lotniskiem." }, 404);
    }
    return json(request, {
      airport,
      airportLabel: AIRPORT_LABELS[airport],
      distanceKm: Math.round(distanceMeters / 100) / 10,
      durationMinutes: Math.ceil(durationSeconds / 60),
      source: "Google Routes",
      liveTraffic: false,
    });
  } catch {
    return json(request, { error: "Serwis tras jest chwilowo niedostępny. Spróbuj ponownie." }, 502);
  }
}
