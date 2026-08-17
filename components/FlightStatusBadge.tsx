import {
  displayFlightTime,
  flightEta,
  flightStatusLabel,
  flightTone
} from "@/lib/flightDisplay";

export default function FlightStatusBadge({
  flight,
  flightNumber,
  compact = false
}: {
  flight?: any;
  flightNumber?: string | null;
  compact?: boolean;
}) {
  if (!flight && !flightNumber) return null;

  if (!flight) {
    return (
      <span className="flight-chip unknown">
        ✈ {flightNumber} · NIE SPRAWDZONO
      </span>
    );
  }

  const eta = flightEta(flight);

  return (
    <span className={`flight-chip ${flightTone(flight)}`}>
      <strong>✈ {flight.flight_number || flightNumber}</strong>
      <span>{flightStatusLabel(flight)}</span>
      {!compact && eta && (
        <small>ETA {displayFlightTime(eta)}</small>
      )}
    </span>
  );
}
