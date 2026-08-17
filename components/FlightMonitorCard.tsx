"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  displayFlightTime,
  flightEta,
  flightStatusLabel,
  flightTone,
  suggestedPickupTime
} from "@/lib/flightDisplay";

export default function FlightMonitorCard({
  bookingId,
  leg,
  flightNumber,
  flight,
  pickupFromAirport = false
}: {
  bookingId: string;
  leg: "primary" | "return";
  flightNumber?: string | null;
  flight?: any;
  pickupFromAirport?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/flights/${bookingId}/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leg })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Nie udało się sprawdzić lotu.");
        setBusy(false);
        return;
      }

      setMessage("✓ Status lotu został odświeżony.");
      setBusy(false);
      router.refresh();
    } catch {
      setMessage("Nie udało się połączyć z monitorem lotów.");
      setBusy(false);
    }
  }

  if (!flightNumber) return null;

  const eta = flightEta(flight);
  const pickup = pickupFromAirport
    ? suggestedPickupTime(flight, 25)
    : null;

  return (
    <div className={`card flight-monitor-card ${flightTone(flight)}`}>
      <div className="flight-monitor-head">
        <div>
          <span className="badge">FLIGHT MONITOR</span>
          <h2>
            ✈ {flight?.flight_number || flightNumber}
            {leg === "return" ? " · POWRÓT" : ""}
          </h2>
        </div>

        <span className={`flight-big-status ${flightTone(flight)}`}>
          {flightStatusLabel(flight)}
        </span>
      </div>

      {!flight ? (
        <p className="muted">
          Lot nie był jeszcze sprawdzany. Kliknij „Odśwież lot”.
        </p>
      ) : flight.match_ok === false ? (
        <div className="flight-match-warning">
          ⚠ {flight.match_message ||
            "Znaleziony lot nie odpowiada terminowi tej rezerwacji."}
        </div>
      ) : (
        <div className="flight-data-grid">
          <div>
            <span>Trasa lotu</span>
            <strong>
              {flight.dep_iata || "—"} → {flight.arr_iata || "—"}
            </strong>
          </div>

          <div>
            <span>Planowany przylot</span>
            <strong>{displayFlightTime(flight.arr_time)}</strong>
          </div>

          <div>
            <span>Aktualne ETA</span>
            <strong>{displayFlightTime(eta)}</strong>
          </div>

          <div>
            <span>Opóźnienie</span>
            <strong>
              {Number(flight.arr_delayed ?? flight.dep_delayed ?? 0) > 0
                ? `+${Number(flight.arr_delayed ?? flight.dep_delayed)} min`
                : "brak"}
            </strong>
          </div>

          <div>
            <span>Terminal / gate</span>
            <strong>
              {flight.arr_terminal || flight.dep_terminal || "—"}
              {(flight.arr_gate || flight.dep_gate)
                ? ` · ${flight.arr_gate || flight.dep_gate}`
                : ""}
            </strong>
          </div>

          <div>
            <span>Bagaż</span>
            <strong>{flight.arr_baggage || "—"}</strong>
          </div>

          {pickup && (
            <div className="flight-pickup-suggestion">
              <span>Sugerowana gotowość kierowcy</span>
              <strong>{pickup}</strong>
              <small>ETA + orientacyjne 25 min na wyjście z terminala</small>
            </div>
          )}
        </div>
      )}

      <div className="flight-monitor-footer">
        <button className="btn secondary" disabled={busy} onClick={refresh}>
          {busy ? "SPRAWDZANIE..." : "↻ ODŚWIEŻ LOT"}
        </button>

        <span>
          Ostatnie sprawdzenie:{" "}
          {flight?.last_checked_at
            ? new Date(flight.last_checked_at).toLocaleString("pl-PL")
            : "—"}
        </span>
      </div>

      {message && (
        <div className={
          message.startsWith("✓")
            ? "admin-save-message"
            : "booking-error"
        }>
          {message}
        </div>
      )}
    </div>
  );
}
