"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FlightStatusBadge from "@/components/FlightStatusBadge";
import { displayFlightTime, suggestedPickupTime } from "@/lib/flightDisplay";
import FlightAlertBadge from "@/components/FlightAlertBadge";
import {
  DRIVER_FLOW,
  DriverLeg,
  currentDriverLeg,
  driverDestinationTarget,
  driverLegDate,
  driverLegFlightNumber,
  driverLegKey,
  driverLegLabel,
  driverLegOperationalEndTime,
  driverLegOperationalStartDate,
  driverLegOperationalStartTime,
  driverLegTime,
  driverPickupTarget,
  driverRouteText,
  nextDriverStatus,
  normalizedDriverStatus
} from "@/lib/driverOps";

const STATUS_LABELS: Record<string, string> = {
  pending: "Oczekuje",
  confirmed: "Potwierdzona",
  assigned: "Gotowy do startu",
  in_progress: "W drodze",
  arrived: "Na miejscu",
  picked_up: "Pasażer odebrany",
  completed: "Zakończony",
  cancelled: "Anulowany"
};

const ACTION_LABELS: Record<string, string> = {
  in_progress: "🚐 ROZPOCZNIJ KURS",
  arrived: "📍 JESTEM NA MIEJSCU",
  picked_up: "👤 PASAŻER ODEBRANY",
  completed: "✅ ZAKOŃCZ KURS"
};

type Filter = "today" | "tomorrow" | "upcoming" | "all";

function warsawDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function datePlusDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return warsawDateKey(date);
}

function displayDriverLeg(booking: any): DriverLeg {
  if (booking?._driverLeg === "return") return "return";
  if (booking?._driverLeg === "primary") return "primary";
  return currentDriverLeg(booking, booking.driverProgress || {});
}

function operationDate(booking: any) {
  return driverLegOperationalStartDate(booking, displayDriverLeg(booking));
}

function operationKey(booking: any) {
  return driverLegKey(booking, displayDriverLeg(booking));
}

function minutesUntilOperation(booking: any, now: Date) {
  const leg = displayDriverLeg(booking);
  const date = driverLegOperationalStartDate(booking, leg);
  const time = driverLegOperationalStartTime(booking, leg) || "00:00";
  if (!date) return Number.POSITIVE_INFINITY;
  const target = new Date(`${date}T${time}:00`);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

function relativeTimeLabel(booking: any, now: Date) {
  const minutes = minutesUntilOperation(booking, now);
  if (!Number.isFinite(minutes)) return "Termin nieustalony";
  if (minutes < -30) return `Termin minął ${Math.abs(Math.round(minutes / 60)) || 1} h temu`;
  if (minutes < 15) return "TERAZ";
  if (minutes < 60) return `Za ${minutes} min`;
  if (minutes < 24 * 60) return `Za ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `Za ${Math.ceil(minutes / (24 * 60))} dni`;
}

function isOperational(status: string) {
  return ["in_progress", "arrived", "picked_up"].includes(status);
}

function isActiveBooking(booking: any) {
  return !["completed", "cancelled"].includes(String(booking.status || ""));
}

function attentionItems(booking: any, now: Date) {
  const items: string[] = [];
  const leg = displayDriverLeg(booking);
  const minutes = minutesUntilOperation(booking, now);

  if (booking?._driverLegLocked && leg === "return") {
    items.push("Kurs powrotny przypisany — oczekuje na zakończenie WYJAZDU");
  }

  const legVehicleId = leg === "return" ? booking.return_vehicle_id : booking.vehicle_id;
  if (!legVehicleId) items.push("Brak przypisanego pojazdu");
  if (booking.status === "pending") items.push("Rezerwacja czeka na potwierdzenie MATT");

  if (
    ["assigned", "confirmed"].includes(String(booking.status || "")) &&
    Number.isFinite(minutes) &&
    minutes <= 120 &&
    minutes > -180
  ) {
    items.push(minutes < 0 ? "Planowany start operacyjny już minął" : "Kurs zaczyna się w ciągu 2 godzin");
  }

  const alerts = (booking.flightAlerts || []).filter(
    (alert: any) => String(alert.leg || "primary") === leg
  );
  const critical = alerts.find((alert: any) => alert.severity === "critical");
  const warning = alerts.find((alert: any) => alert.severity === "warning");
  if (critical) items.push(`KRYTYCZNY ALERT LOTU: ${critical.title}`);
  else if (warning) items.push(`Alert lotu: ${warning.title}`);

  return items;
}

export default function DriverTrips({
  driver,
  bookings
}: {
  driver: any;
  bookings: any[];
}) {
  const router = useRouter();

  const [rows, setRows] = useState(bookings);
  const [focusBookingId, setFocusBookingId] = useState("");
  const [filter, setFilter] = useState<Filter>("today");
  const [savingId, setSavingId] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    setFocusBookingId(new URLSearchParams(window.location.search).get("booking") || "");
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!focusBookingId) return;
    window.setTimeout(() => {
      document
        .getElementById(`driver-booking-${focusBookingId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }, [focusBookingId]);

  const today = warsawDateKey(now);
  const tomorrow = datePlusDays(today, 1);

  const activeRows = useMemo(
    () =>
      rows
        .filter(isActiveBooking)
        .sort((a, b) => {
          const aOperational = isOperational(String(a.status || ""));
          const bOperational = isOperational(String(b.status || ""));
          if (aOperational !== bOperational) return aOperational ? -1 : 1;
          return operationKey(a).localeCompare(operationKey(b));
        }),
    [rows]
  );

  const nextBooking = activeRows[0] || null;

  const visible = useMemo(() => {
    return activeRows.filter((booking) => {
      const date = operationDate(booking);
      if (filter === "today") return date === today;
      if (filter === "tomorrow") return date === tomorrow;
      if (filter === "upcoming") return date > tomorrow;
      return true;
    });
  }, [activeRows, filter, today, tomorrow]);

  const listRows = visible.filter((booking) => booking.id !== nextBooking?.id);

  const tomorrowCount = activeRows.filter((x) => operationDate(x) === tomorrow).length;
  const attentionCount = activeRows.filter((x) => attentionItems(x, now).length > 0).length;

  async function changeStatus(id: string, status: string, leg: DriverLeg) {
    if (savingId) return;

    if (status === "completed") {
      const booking = rows.find((x) => x.id === id);
      const roundtripPrimary = booking?.service_type === "roundtrip" && leg === "primary";
      const confirmed = window.confirm(
        roundtripPrimary
          ? "Zakończyć WYJAZD? Rezerwacja pozostanie aktywna i przejdzie do oczekiwania na kurs POWROTNY."
          : "Zakończyć ten kurs?"
      );
      if (!confirmed) return;
    }

    setSavingId(id);

    try {
      const response = await fetch(`/api/driver/bookings/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, leg })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "Nie udało się zmienić statusu.");
        return;
      }

      setRows((current) =>
        current.map((booking) =>
          booking.id === id
            ? {
                ...booking,
                status: data.status,
                updated_at: data.updated_at || booking.updated_at,
                driverProgress: {
                  ...(booking.driverProgress || {}),
                  [leg]: {
                    status,
                    at: data.step_at || new Date().toISOString()
                  }
                }
              }
            : booking
        )
      );

      router.refresh();
    } finally {
      setSavingId("");
    }
  }

  async function logoutDriver() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/kierowca/login";
    } catch {
      setLoggingOut(false);
      alert("Nie udało się wylogować. Spróbuj ponownie.");
    }
  }

  return (
    <>
      <section className="driver-pro-header card">
        <div>
          <span className="badge">MATT DRIVER PRO</span>
          <h1>{driver.full_name}</h1>
          <p className="muted">{today} · panel operacyjny kierowcy</p>
        </div>

        <div className="driver-pro-header-side">
          <div className="driver-pro-mini-stats">
            <div><strong>{activeRows.filter((x) => operationDate(x) === today).length}</strong><span>Dzisiaj</span></div>
            <div><strong>{tomorrowCount}</strong><span>Jutro</span></div>
            <div className={attentionCount ? "warning" : ""}><strong>{attentionCount}</strong><span>Uwagi</span></div>
          </div>
          <button
            type="button"
            className="btn secondary driver-logout-btn"
            onClick={logoutDriver}
            disabled={loggingOut}
          >
            {loggingOut ? "WYLOGOWYWANIE..." : "WYLOGUJ SIĘ"}
          </button>
        </div>
      </section>

      {nextBooking ? (
        <section className="driver-next-section">
          <div className="driver-section-heading">
            <div>
              <span className="badge">NASTĘPNY KURS</span>
              <h2>Mój następny kurs</h2>
            </div>
            <strong className="driver-next-countdown">{relativeTimeLabel(nextBooking, now)}</strong>
          </div>
          <DriverTripCard
            booking={nextBooking}
            saving={savingId === nextBooking.id}
            onStatus={changeStatus}
            now={now}
            featured
            focused={focusBookingId === nextBooking.id}
          />
        </section>
      ) : (
        <div className="card empty-state driver-all-clear">
          <strong>✓ Brak aktywnych kursów</strong>
          <span>Na ten moment nie masz przypisanych przejazdów do obsługi.</span>
        </div>
      )}

      <div className="driver-filter-bar driver-pro-filter-bar">
        <button className={filter === "today" ? "active" : ""} onClick={() => setFilter("today")}>Dzisiaj</button>
        <button className={filter === "tomorrow" ? "active" : ""} onClick={() => setFilter("tomorrow")}>Jutro</button>
        <button className={filter === "upcoming" ? "active" : ""} onClick={() => setFilter("upcoming")}>Kolejne</button>
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Wszystkie</button>
      </div>

      {listRows.length ? (
        <section>
          <div className="driver-section-heading compact">
            <div>
              <span className="badge">PLAN</span>
              <h2>Pozostałe kursy</h2>
            </div>
            <span className="muted">{listRows.length}</span>
          </div>
          <div className="driver-trip-list">
            {listRows.map((booking: any) => (
              <DriverTripCard
                key={booking.id}
                booking={booking}
                saving={savingId === booking.id}
                onStatus={changeStatus}
                now={now}
                focused={focusBookingId === booking.id}
              />
            ))}
          </div>
        </section>
      ) : nextBooking && visible.some((x) => x.id === nextBooking.id) ? (
        <div className="driver-filter-empty muted">To jedyny kurs w tym widoku.</div>
      ) : (
        <div className="card empty-state">
          <strong>Brak kursów</strong>
          <span>Nie masz innych przejazdów w wybranym zakresie.</span>
        </div>
      )}
    </>
  );
}

function DriverTripCard({
  booking: b,
  saving,
  onStatus,
  now,
  featured = false,
  focused = false
}: {
  booking: any;
  saving: boolean;
  onStatus: (id: string, status: string, leg: DriverLeg) => void;
  now: Date;
  featured?: boolean;
  focused?: boolean;
}) {
  const company = Array.isArray(b.companies) ? b.companies[0] : b.companies;
  const progress = b.driverProgress || {};
  const leg = displayDriverLeg(b);
  const legLocked = Boolean(b._driverLegLocked && leg === "return");
  const primaryVehicle = Array.isArray(b.vehicles) ? b.vehicles[0] : b.vehicles;
  const returnVehicle = Array.isArray(b.return_vehicle) ? b.return_vehicle[0] : b.return_vehicle;
  const vehicle = leg === "return" ? returnVehicle : primaryVehicle;
  const normalizedStatus = normalizedDriverStatus(b.status);
  const nextStatus = nextDriverStatus(b.status);
  const pickup = driverPickupTarget(b, leg);
  const destination = driverDestinationTarget(b, leg);
  const currentRoute = driverRouteText(b, leg);
  const flightNumber = driverLegFlightNumber(b, leg);
  const flight = b.flights?.[leg] || null;
  const legAlerts = (b.flightAlerts || []).filter(
    (alert: any) => String(alert.leg || "primary") === leg
  );
  const attention = attentionItems(b, now);
  const navigateToDestination = b.status === "picked_up";
  const recommendedTarget = navigateToDestination ? destination : pickup;
  const recommendedLabel = navigateToDestination ? "DO CELU" : "DO ODBIORU";
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(recommendedTarget)}`;
  const secondaryMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  const lastStepAt = progress?.[leg]?.at || b.updated_at;

  return (
    <article
      id={`driver-booking-${b.id}`}
      className={`driver-trip-card driver-pro-trip card ${b.status} ${featured ? "featured" : ""} ${focused ? "focused" : ""}`}
    >
      <div className="driver-trip-top">
        <div>
          <div className="driver-badge-row">
            {b.company_id ? (
              <span className="origin-badge b2b">🏢 B2B · {company?.name ?? "Firma"}</span>
            ) : (
              <span className="origin-badge private">👤 INDYWIDUALNY</span>
            )}
            {b.service_type === "roundtrip" && (
              <span className={`driver-leg-badge ${leg}`}>{leg === "return" ? "↩ POWRÓT" : "→ WYJAZD"}</span>
            )}
          </div>

          <h2>{driverLegOperationalStartTime(b, leg)} · {b.customer_name}</h2>
          <p className="muted">Start operacyjny: {driverLegOperationalStartDate(b, leg)} · do {driverLegOperationalEndTime(b, leg)} · {b.booking_number}</p>
          <p className="muted driver-flight-scheduled-time">✈ {leg === "return" || b.service_type === "from_airport" ? "Godzina przylotu" : "Godzina wyjazdu na lotnisko"}: {driverLegDate(b, leg)} · {driverLegTime(b, leg)}</p>
        </div>

        <div className="driver-status-stack">
          <span className={`driver-status ${b.status}`}>{STATUS_LABELS[b.status] ?? b.status}</span>
          <small>{relativeTimeLabel(b, now)}</small>
        </div>
      </div>

      {attention.length > 0 && (
        <div className="driver-attention-box">
          <strong>⚠ WYMAGA UWAGI</strong>
          {attention.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
        </div>
      )}

      <div className="driver-route driver-pro-route">
        <span>{driverLegLabel(leg)} · trasa</span>
        <strong>{currentRoute}</strong>
      </div>

      <DriverTimeline status={normalizedStatus || "assigned"} lastStepAt={lastStepAt} />

      {b.service_type === "roundtrip" && (
        <RoundtripPlan booking={b} currentLeg={leg} progress={progress} />
      )}

      {legAlerts.length > 0 && (
        <div className="driver-flight-alerts">
          {legAlerts.map((alert: any) => <FlightAlertBadge key={alert.id} alert={alert} />)}
        </div>
      )}

      {flightNumber && (
        <div className="driver-flight-box driver-pro-flight-box">
          <div className="driver-flight-title">
            <strong>✈ {leg === "return" ? "LOT POWROTNY" : "LOT"}</strong>
            <span>{flightNumber}</span>
          </div>
          <FlightStatusBadge flight={flight} flightNumber={flightNumber} />

          {flight?.match_ok !== false && flight?.arr_estimated && (
            <div className="driver-flight-details">
              <span>Aktualne ETA: <strong>{displayFlightTime(flight.arr_estimated)}</strong></span>
              {(b.service_type === "from_airport" || leg === "return") && suggestedPickupTime(flight, 25) && (
                <span>Sugerowana gotowość: <strong>{suggestedPickupTime(flight, 25)}</strong></span>
              )}
              {flight.arr_terminal && <span>Terminal przylotu: <strong>{flight.arr_terminal}</strong></span>}
              {flight.arr_gate && <span>Gate: <strong>{flight.arr_gate}</strong></span>}
              {flight.arr_baggage && <span>Bagaże: <strong>{flight.arr_baggage}</strong></span>}
            </div>
          )}
        </div>
      )}

      <div className="driver-info-grid driver-pro-info-grid">
        <div><span>Telefon</span><strong>{b.phone || "—"}</strong></div>
        <div><span>Pasażerowie</span><strong>{b.passengers || "—"}</strong></div>
        <div><span>Pojazd</span><strong>{vehicle ? `${vehicle.name} · ${vehicle.registration}` : "BRAK"}</strong></div>
        <div><span>Aktualizacja etapu</span><strong>{formatStepTime(lastStepAt)}</strong></div>
      </div>

      {b.notes && (
        <div className="driver-notes"><strong>Uwagi do kursu</strong><span>{b.notes}</span></div>
      )}

      <div className="driver-navigation-panel">
        <a className="btn driver-main-navigation" href={mapsUrl} target="_blank" rel="noreferrer">
          🧭 NAWIGUJ {recommendedLabel}
          <small>{recommendedTarget}</small>
        </a>

        <div className="driver-secondary-actions">
          {recommendedTarget !== destination && (
            <a className="btn secondary" href={secondaryMapsUrl} target="_blank" rel="noreferrer">🎯 CEL</a>
          )}
          {b.phone && <a className="btn secondary" href={`tel:${b.phone}`}>📞 ZADZWOŃ</a>}
        </div>
      </div>

      {legLocked && (
        <div className="driver-return-waiting">
          <strong>↩ POWRÓT JEST JUŻ PRZYPISANY DO CIEBIE</strong>
          <span>Workflow uruchomi się po zakończeniu WYJAZDU. Termin i trasa powrotu są już widoczne w Twoim planie.</span>
        </div>
      )}

      {nextStatus && b.status !== "pending" && !legLocked && (
        <div className="driver-status-actions driver-pro-command">
          <button
            className="driver-action primary"
            disabled={saving || (nextStatus === "in_progress" && !(leg === "return" ? b.return_vehicle_id : b.vehicle_id))}
            onClick={() => onStatus(b.id, nextStatus, leg)}
          >
            {saving ? "ZAPISYWANIE..." : ACTION_LABELS[nextStatus] ?? nextStatus}
          </button>
          {nextStatus === "in_progress" && !(leg === "return" ? b.return_vehicle_id : b.vehicle_id) && (
            <small>Start zablokowany: dyspozytor musi przypisać pojazd.</small>
          )}
        </div>
      )}
    </article>
  );
}

function DriverTimeline({
  status,
  lastStepAt
}: {
  status: string;
  lastStepAt?: string | null;
}) {
  const normalized = normalizedDriverStatus(status) || "assigned";
  const currentIndex = DRIVER_FLOW.indexOf(normalized);
  const steps = DRIVER_FLOW.slice(1);

  return (
    <div className="driver-timeline" aria-label="Przebieg kursu">
      {steps.map((step) => {
        const index = DRIVER_FLOW.indexOf(step);
        const completed = index < currentIndex || normalized === "completed";
        const current = step === normalized;
        return (
          <div key={step} className={`${completed ? "done" : ""} ${current ? "current" : ""}`}>
            <i>{completed ? "✓" : current ? "●" : ""}</i>
            <span>{STATUS_LABELS[step]}</span>
          </div>
        );
      })}
      {lastStepAt && <small>Ostatnia zmiana: {formatStepTime(lastStepAt)}</small>}
    </div>
  );
}

function RoundtripPlan({
  booking,
  currentLeg,
  progress
}: {
  booking: any;
  currentLeg: DriverLeg;
  progress: any;
}) {
  const primaryDone = progress?.primary?.status === "completed";
  const returnDone = progress?.return?.status === "completed";
  const returnWaiting = Boolean(booking?._driverLegLocked && currentLeg === "return");

  return (
    <div className="driver-roundtrip-plan">
      <div className={primaryDone ? "done" : currentLeg === "primary" ? "current" : "waiting"}>
        <span>WYJAZD</span>
        <strong>Start {driverLegOperationalStartDate(booking, "primary")} · {driverLegOperationalStartTime(booking, "primary")}</strong>
        <small>Wylot {driverLegDate(booking, "primary")} · {driverLegTime(booking, "primary")} · {driverRouteText(booking, "primary")}</small>
        <em>{primaryDone ? "✓ zakończony" : currentLeg === "primary" ? "aktualny etap" : "oczekuje na realizację"}</em>
      </div>
      <div className={returnDone ? "done" : returnWaiting ? "waiting" : currentLeg === "return" ? "current" : ""}>
        <span>POWRÓT</span>
        <strong>Start {driverLegOperationalStartDate(booking, "return") || "—"} · {driverLegOperationalStartTime(booking, "return") || "—"}</strong>
        <small>Przylot {driverLegDate(booking, "return") || "—"} · {driverLegTime(booking, "return") || "—"} · {driverRouteText(booking, "return")}</small>
        <em>{returnDone ? "✓ zakończony" : returnWaiting ? "przypisany · czeka na zakończenie wyjazdu" : currentLeg === "return" ? "aktualny etap" : ""}</em>
      </div>
    </div>
  );
}

function formatStepTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace("T", " ");
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
