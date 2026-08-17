export function normalizeFlightNumber(value?: string | null) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function flightStatusLabel(flight: any) {
  if (!flight) return "BRAK DANYCH";
  if (flight.match_ok === false) return "BRAK DANYCH DLA TERMINU";

  const status = String(flight.flight_status || "").toLowerCase();
  const delay = Number(flight.arr_delayed ?? flight.dep_delayed ?? 0);

  if (status === "cancelled") return "ODWOŁANY";
  if (status === "diverted") return "PRZEKIEROWANY";
  if (status === "landed") return "WYLĄDOWAŁ";
  if (status === "en-route" || status === "en_route") {
    return delay > 0 ? `W POWIETRZU · +${delay} MIN` : "W POWIETRZU";
  }
  if (status === "scheduled") {
    return delay > 0 ? `OPÓŹNIONY · +${delay} MIN` : "PLANOWO";
  }

  if (delay > 0) return `OPÓŹNIONY · +${delay} MIN`;
  return status ? status.toUpperCase() : "OCZEKIWANIE NA DANE";
}

export function flightTone(flight: any) {
  if (!flight) return "unknown";
  if (flight.match_ok === false) return "unknown";

  const status = String(flight.flight_status || "").toLowerCase();
  const delay = Number(flight.arr_delayed ?? flight.dep_delayed ?? 0);

  if (status === "cancelled" || status === "diverted") return "danger";
  if (status === "landed") return "landed";
  if (delay >= 45) return "danger";
  if (delay > 0) return "delay";
  if (status === "en-route" || status === "en_route") return "airborne";
  if (status === "scheduled") return "scheduled";
  return "unknown";
}

export function flightEta(flight: any) {
  return flight?.arr_estimated || flight?.arr_time || null;
}

export function displayFlightTime(value?: string | null) {
  if (!value) return "—";
  const text = String(value);
  const match = text.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (match) return `${match[1]} · ${match[2]}`;
  return text;
}

export function suggestedPickupTime(flight: any, minutes = 25) {
  const raw = flightEta(flight);
  if (!raw) return null;

  const match = String(raw).match(
    /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
  );

  if (!match) return null;

  const d = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5])
  ));

  d.setUTCMinutes(d.getUTCMinutes() + minutes);

  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");

  return `${y}-${m}-${day} · ${h}:${min}`;
}

export function isFlightAlert(flight: any) {
  if (!flight || flight.match_ok === false) return false;

  const status = String(flight.flight_status || "").toLowerCase();
  const delay = Number(flight.arr_delayed ?? flight.dep_delayed ?? 0);

  return (
    status === "cancelled" ||
    status === "diverted" ||
    delay >= 20
  );
}
