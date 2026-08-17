"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FlightStatusBadge from "@/components/FlightStatusBadge";
import { displayFlightTime, suggestedPickupTime } from "@/lib/flightDisplay";
import FlightAlertBadge from "@/components/FlightAlertBadge";

const STATUS_LABELS: Record<string, string> = {
  pending: "Oczekuje",
  confirmed: "Potwierdzona",
  assigned: "Przypisany",
  in_progress: "W drodze",
  arrived: "Na miejscu",
  picked_up: "Pasażer odebrany",
  completed: "Zakończony",
  cancelled: "Anulowany"
};

export default function DriverTrips({
  driver,
  bookings
}: {
  driver: any;
  bookings: any[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(bookings);
  const [filter, setFilter] = useState<"today" | "next" | "all">("today");
  const [savingId, setSavingId] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const visible = useMemo(() => {
    if (filter === "today") {
      return rows.filter((x) => x.travel_date === today);
    }
    if (filter === "next") {
      return rows.filter((x) => x.travel_date >= today).slice(0, 10);
    }
    return rows;
  }, [rows, filter, today]);

  async function changeStatus(id: string, status: string) {
    setSavingId(id);

    const response = await fetch(`/api/driver/bookings/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error ?? "Nie udało się zmienić statusu.");
      setSavingId("");
      return;
    }

    setRows(
      rows.map((x) =>
        x.id === id ? { ...x, status: data.status } : x
      )
    );

    setSavingId("");
    router.refresh();
  }


  async function logoutDriver() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();

      // Hard redirect guarantees a clean session on mobile browsers.
      window.location.href = "/kierowca/login";
    } catch {
      setLoggingOut(false);
      alert("Nie udało się wylogować. Spróbuj ponownie.");
    }
  }

  return (
    <>
      <div className="driver-header-card card">
        <div>
          <span className="badge">MATT DRIVER</span>
          <h1>{driver.full_name}</h1>
          <p className="muted">
            {today}
          </p>
        </div>

        <div className="driver-header-side">
          <button
            type="button"
            className="btn secondary driver-logout-btn"
            onClick={logoutDriver}
            disabled={loggingOut}
          >
            {loggingOut ? "WYLOGOWYWANIE..." : "WYLOGUJ SIĘ"}
          </button>

          <div className="driver-header-stats">
            <div>
            <strong>
              {rows.filter((x) => x.travel_date === today).length}
            </strong>
            <span>Dzisiaj</span>
          </div>
          <div>
            <strong>
              {rows.filter((x) =>
                ["assigned","in_progress","arrived","picked_up"].includes(x.status)
              ).length}
            </strong>
            <span>Aktywne</span>
          </div>
          </div>
        </div>
      </div>

      <div className="driver-filter-bar">
        <button
          className={filter === "today" ? "active" : ""}
          onClick={() => setFilter("today")}
        >
          Dzisiaj
        </button>
        <button
          className={filter === "next" ? "active" : ""}
          onClick={() => setFilter("next")}
        >
          Najbliższe
        </button>
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          Wszystkie
        </button>
      </div>

      {!visible.length ? (
        <div className="card empty-state">
          <strong>Brak kursów</strong>
          <span>Nie masz rezerwacji w wybranym zakresie.</span>
        </div>
      ) : (
        <div className="driver-trip-list">
          {visible.map((b: any) => (
            <DriverTripCard
              key={b.id}
              booking={b}
              saving={savingId === b.id}
              onStatus={changeStatus}
            />
          ))}
        </div>
      )}
    </>
  );
}

function DriverTripCard({
  booking: b,
  saving,
  onStatus
}: {
  booking: any;
  saving: boolean;
  onStatus: (id: string, status: string) => void;
}) {
  const company = Array.isArray(b.companies)
    ? b.companies[0]
    : b.companies;
  const vehicle = Array.isArray(b.vehicles)
    ? b.vehicles[0]
    : b.vehicles;

  const route =
    b.service_type === "from_airport"
      ? `${b.airport_label} → ${b.pickup_address}`
      : b.service_type === "roundtrip"
      ? `${b.pickup_address} ↔ ${b.airport_label}`
      : `${b.pickup_address} → ${b.airport_label}`;

  const navTarget =
    b.service_type === "from_airport"
      ? b.airport_label
      : b.pickup_address;

  const mapsUrl =
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      navTarget
    )}`;

  const nextActions = getNextActions(b.status);

  return (
    <article className={`driver-trip-card card ${b.status}`}>
      <div className="driver-trip-top">
        <div>
          {b.company_id ? (
            <span className="origin-badge b2b">
              🏢 B2B · {company?.name ?? "Firma"}
            </span>
          ) : (
            <span className="origin-badge private">
              👤 INDYWIDUALNY
            </span>
          )}

          <h2>
            {b.travel_time} · {b.customer_name}
          </h2>
          <p className="muted">
            {b.travel_date} · {b.booking_number}
          </p>
        </div>

        <span className={`driver-status ${b.status}`}>
          {STATUS_LABELS[b.status] ?? b.status}
        </span>
      </div>

      <div className="driver-route">
        <span>Trasa</span>
        <strong>{route}</strong>
      </div>

      {b.flightAlerts?.length > 0 && (
        <div className="driver-flight-alerts">
          {b.flightAlerts.map((alert: any) => (
            <FlightAlertBadge
              key={alert.id}
              alert={alert}
            />
          ))}
        </div>
      )}

      {b.flight_number && (
        <div className="driver-flight-box">
          <FlightStatusBadge
            flight={b.flight}
            flightNumber={b.flight_number}
          />
          {b.flight?.match_ok !== false && b.flight?.arr_estimated && (
            <div className="driver-flight-details">
              <span>Aktualne ETA: <strong>{displayFlightTime(b.flight.arr_estimated)}</strong></span>
              {b.service_type === "from_airport" && suggestedPickupTime(b.flight, 25) && (
                <span>
                  Sugerowana gotowość: <strong>{suggestedPickupTime(b.flight, 25)}</strong>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="driver-info-grid">
        <div>
          <span>Telefon</span>
          <strong>{b.phone || "—"}</strong>
        </div>
        <div>
          <span>Lot</span>
          <strong>{b.flight_number || "—"}</strong>
        </div>
        <div>
          <span>Pasażerowie</span>
          <strong>{b.passengers}</strong>
        </div>
        <div>
          <span>Pojazd</span>
          <strong>
            {vehicle
              ? `${vehicle.name} · ${vehicle.registration}`
              : "—"}
          </strong>
        </div>
      </div>

      {b.notes && (
        <div className="driver-notes">
          <strong>Uwagi</strong>
          <span>{b.notes}</span>
        </div>
      )}

      <div className="driver-primary-actions">
        <a
          className="btn"
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
        >
          🧭 NAWIGACJA
        </a>

        {b.phone && (
          <a className="btn secondary" href={`tel:${b.phone}`}>
            📞 ZADZWOŃ
          </a>
        )}
      </div>

      <div className="driver-status-actions">
        {nextActions.map((action) => (
          <button
            key={action.status}
            className={`driver-action ${action.primary ? "primary" : ""}`}
            disabled={saving}
            onClick={() => onStatus(b.id, action.status)}
          >
            {saving ? "ZAPISYWANIE..." : action.label}
          </button>
        ))}
      </div>
    </article>
  );
}

function getNextActions(status: string) {
  if (status === "assigned" || status === "confirmed") {
    return [
      {
        status: "in_progress",
        label: "🚐 WYJECHAŁEM",
        primary: true
      }
    ];
  }

  if (status === "in_progress") {
    return [
      {
        status: "arrived",
        label: "📍 JESTEM NA MIEJSCU",
        primary: true
      }
    ];
  }

  if (status === "arrived") {
    return [
      {
        status: "picked_up",
        label: "👤 PASAŻER ODEBRANY",
        primary: true
      }
    ];
  }

  if (status === "picked_up") {
    return [
      {
        status: "completed",
        label: "✅ ZAKOŃCZ KURS",
        primary: true
      }
    ];
  }

  return [];
}
