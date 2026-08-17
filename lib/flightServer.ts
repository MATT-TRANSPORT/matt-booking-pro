import { normalizeFlightNumber } from "@/lib/flightDisplay";

function parseDateFromAirLabs(value?: string | null) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function dateDiffDays(a?: string | null, b?: string | null) {
  if (!a || !b) return null;
  const ta = new Date(`${a}T12:00:00Z`).getTime();
  const tb = new Date(`${b}T12:00:00Z`).getTime();
  return Math.round(Math.abs(ta - tb) / 86400000);
}

function isoFromUnix(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

function legConfig(booking: any, leg: "primary" | "return") {
  if (leg === "return") {
    return {
      flightNumber: normalizeFlightNumber(booking.return_flight_number),
      travelDate: booking.return_date,
      relevantTimeField: "arr"
    };
  }

  return {
    flightNumber: normalizeFlightNumber(booking.flight_number),
    travelDate: booking.travel_date,
    relevantTimeField:
      booking.service_type === "from_airport" ? "arr" : "dep"
  };
}

export async function refreshBookingFlight(
  admin: any,
  booking: any,
  leg: "primary" | "return" = "primary"
) {
  const apiKey = process.env.AIRLABS_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Brak AIRLABS_API_KEY w zmiennych środowiskowych Vercel."
    );
  }

  const config = legConfig(booking, leg);

  if (!config.flightNumber) {
    throw new Error(
      leg === "return"
        ? "Ta rezerwacja nie ma numeru lotu powrotnego."
        : "Ta rezerwacja nie ma numeru lotu."
    );
  }

  if (!/^[A-Z0-9]{2,3}\d{1,5}[A-Z]?$/.test(config.flightNumber)) {
    throw new Error(
      `Nie rozpoznano numeru lotu "${config.flightNumber}". Wpisz np. FR1234, LO3885 lub W61234.`
    );
  }

  const url = new URL("https://airlabs.co/api/v9/flight");
  url.searchParams.set("flight_iata", config.flightNumber);
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(12000)
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      body?.error?.message ||
      body?.message ||
      `AirLabs zwrócił HTTP ${response.status}.`
    );
  }

  if (body?.error) {
    throw new Error(
      body.error?.message ||
      body.error?.code ||
      "AirLabs zwrócił błąd."
    );
  }

  // AirLabs by endpoint/format can return the object directly
  // or inside "response". Support both forms.
  const flight = body?.response ?? body;

  if (!flight || typeof flight !== "object" || Array.isArray(flight)) {
    throw new Error(
      `Brak aktualnych danych dla lotu ${config.flightNumber}.`
    );
  }

  const returnedNumber = normalizeFlightNumber(
    flight.flight_iata || flight.cs_flight_iata
  );

  if (
    returnedNumber &&
    returnedNumber !== config.flightNumber &&
    normalizeFlightNumber(flight.cs_flight_iata) !== config.flightNumber
  ) {
    throw new Error(
      `AirLabs zwrócił inny lot (${returnedNumber}) zamiast ${config.flightNumber}.`
    );
  }

  const relevantRaw =
    config.relevantTimeField === "arr"
      ? flight.arr_estimated || flight.arr_time
      : flight.dep_estimated || flight.dep_time;

  const observedDate = parseDateFromAirLabs(relevantRaw);
  const diff = dateDiffDays(observedDate, config.travelDate);

  const matchOk =
    diff === null ||
    diff <= 1;

  const matchMessage = matchOk
    ? null
    : `AirLabs zwrócił najbliższy lot ${config.flightNumber} z datą ${observedDate}, a rezerwacja ma termin ${config.travelDate}. Status nie jest traktowany jako status tej rezerwacji.`;

  const payload = {
    booking_id: booking.id,
    leg,
    flight_number: config.flightNumber,
    travel_date: config.travelDate || null,
    provider: "airlabs",

    flight_status: String(flight.status || "").toLowerCase() || null,
    dep_iata: flight.dep_iata || null,
    arr_iata: flight.arr_iata || null,
    dep_terminal: flight.dep_terminal || null,
    dep_gate: flight.dep_gate || null,
    arr_terminal: flight.arr_terminal || null,
    arr_gate: flight.arr_gate || null,
    arr_baggage: flight.arr_baggage || null,

    dep_time: flight.dep_time || null,
    dep_estimated: flight.dep_estimated || null,
    arr_time: flight.arr_time || null,
    arr_estimated: flight.arr_estimated || null,

    dep_delayed:
      flight.dep_delayed === null || flight.dep_delayed === undefined
        ? null
        : Number(flight.dep_delayed),
    arr_delayed:
      flight.arr_delayed === null || flight.arr_delayed === undefined
        ? null
        : Number(flight.arr_delayed),

    aircraft_model: flight.model || null,
    aircraft_registration: flight.reg_number || null,

    match_ok: matchOk,
    match_message: matchMessage,
    provider_updated_at: isoFromUnix(flight.updated),
    last_checked_at: new Date().toISOString(),
    raw: flight,
    updated_at: new Date().toISOString()
  };

  const { data: previous } = await admin
    .from("booking_flights")
    .select("*")
    .eq("booking_id", booking.id)
    .eq("leg", leg)
    .maybeSingle();

  const { data: saved, error } = await admin
    .from("booking_flights")
    .upsert(payload, {
      onConflict: "booking_id,leg"
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const meaningfulChange =
    !previous ||
    previous.flight_status !== saved.flight_status ||
    Number(previous.arr_delayed ?? 0) !== Number(saved.arr_delayed ?? 0) ||
    String(previous.arr_estimated || "") !== String(saved.arr_estimated || "") ||
    previous.match_ok !== saved.match_ok;

  if (meaningfulChange) {
    let event = `Lot ${config.flightNumber}: ${saved.flight_status || "status nieznany"}`;

    if (saved.arr_delayed) {
      event += ` · opóźnienie przylotu ${saved.arr_delayed} min`;
    }

    if (saved.arr_estimated) {
      event += ` · ETA ${saved.arr_estimated}`;
    }

    if (!saved.match_ok && saved.match_message) {
      event = `Lot ${config.flightNumber}: brak dopasowania do terminu rezerwacji`;
    }

    await admin.from("booking_flight_history").insert({
      booking_id: booking.id,
      booking_flight_id: saved.id,
      leg,
      flight_number: config.flightNumber,
      event,
      flight_status: saved.flight_status,
      arr_estimated: saved.arr_estimated,
      arr_delayed: saved.arr_delayed,
      payload: saved.raw
    });
  }

  return saved;
}

export function flightNeedsRefresh(flight: any, minutes = 20) {
  if (!flight?.last_checked_at) return true;
  const age =
    Date.now() - new Date(flight.last_checked_at).getTime();
  return age > minutes * 60 * 1000;
}
