import PanelNav from "@/components/PanelNav";
import DispatcherClient from "@/components/DispatcherClient";
import { panelClient } from "@/lib/panel";
import FlightRefreshAllButton from "@/components/FlightRefreshAllButton";
import FlightAutomationStatus from "@/components/FlightAutomationStatus";
import FlightStatusBadge from "@/components/FlightStatusBadge";
import FlightAlertBadge from "@/components/FlightAlertBadge";
import { statusPl } from "@/lib/status";
import { bookingHasReturnLeg, sortBookingsChronologically } from "@/lib/bookingOps";
import { bookingRouteText } from "@/lib/bookingRoute";

type DispatcherView = "active" | "all" | "completed" | "cancelled";

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "active" } = await searchParams;
  const selectedView: DispatcherView = ["all", "completed", "cancelled"].includes(view)
    ? (view as DispatcherView)
    : "active";

  const { s } = await panelClient();
  let bookingsQuery = s
    .from("bookings")
    .select("*,companies(name),drivers:drivers!bookings_driver_id_fkey(full_name,color)");

  if (selectedView === "active") bookingsQuery = bookingsQuery.not("status", "in", "(completed,cancelled)");
  if (selectedView === "completed") bookingsQuery = bookingsQuery.eq("status", "completed");
  if (selectedView === "cancelled") bookingsQuery = bookingsQuery.eq("status", "cancelled");

  const [{ data: bookings, error: bookingsError }, { data: drivers }, { data: vehicles }] = await Promise.all([
    bookingsQuery.limit(selectedView === "active" ? 500 : 700),
    s.from("drivers").select("*").eq("active", true).order("full_name"),
    s.from("vehicles").select("*").eq("active", true).order("name")
  ]);

  const bookingRows = bookings ?? [];
  const bookingIds = bookingRows.map((b: any) => b.id);
  let flightRows: any[] = [];
  let alertRows: any[] = [];

  if (bookingIds.length) {
    const [flights, alerts] = await Promise.all([
      s.from("booking_flights").select("*").in("booking_id", bookingIds),
      s.from("booking_flight_alerts").select("*").in("booking_id", bookingIds).eq("active", true).order("updated_at", { ascending: false })
    ]);
    flightRows = flights.data ?? [];
    alertRows = alerts.data ?? [];
  }

  const flightByBookingLeg = new Map(flightRows.map((f: any) => [`${f.booking_id}:${f.leg || "primary"}`, f]));
  const alertByBookingLeg = new Map<string, any>();
  for (const alert of alertRows) {
    const key = `${alert.booking_id}:${alert.leg || "primary"}`;
    const current = alertByBookingLeg.get(key);
    const rank = alert.severity === "critical" ? 3 : alert.severity === "warning" ? 2 : 1;
    const currentRank = current?.severity === "critical" ? 3 : current?.severity === "warning" ? 2 : current ? 1 : 0;
    if (!current || rank > currentRank) alertByBookingLeg.set(key, alert);
  }

  const { data: lastRun } = await s.from("flight_monitor_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle();

  const bookingsWithFlights = sortBookingsChronologically(bookingRows.map((b: any) => ({
    ...b,
    flight: flightByBookingLeg.get(`${b.id}:primary`) ?? null,
    returnFlight: flightByBookingLeg.get(`${b.id}:return`) ?? null,
    flightAlert: alertByBookingLeg.get(`${b.id}:primary`) ?? null,
    returnFlightAlert: alertByBookingLeg.get(`${b.id}:return`) ?? null
  })));

  const readOnlyTitle = selectedView === "completed"
    ? "Zakończone przejazdy"
    : selectedView === "cancelled"
    ? "Anulowane przejazdy"
    : "Wszystkie przejazdy";

  return <main className="container">
    <span className="badge">MATT DISPATCHER PRO</span>
    <h1>Plan kursów</h1>
    <p className="muted">Jedno główne miejsce do obsługi wszystkich przejazdów. Chronologia jest zgodna z Dashboardem i Kalendarzem.</p>
    <PanelNav />

    <div className="dispatcher-archive-tabs">
      <a className={selectedView === "active" ? "active" : ""} href="/panel/dyspozytor">PLAN BIEŻĄCY</a>
      <a className={selectedView === "all" ? "active" : ""} href="/panel/dyspozytor?view=all">WSZYSTKIE</a>
      <a className={selectedView === "completed" ? "active" : ""} href="/panel/dyspozytor?view=completed">✓ ZAKOŃCZONE</a>
      <a className={selectedView === "cancelled" ? "active" : ""} href="/panel/dyspozytor?view=cancelled">✕ ANULOWANE</a>
    </div>

    {bookingsError && <div className="card" style={{ borderColor: "#dc2626", marginBottom: 16 }}><strong>Nie udało się pobrać rezerwacji.</strong></div>}

    <FlightAutomationStatus lastRun={lastRun} />
    <div className="dispatcher-flight-toolbar">
      <FlightRefreshAllButton />
      <span className="muted">AirLabs · cache 20 min · maks. 8 zapytań na jedno zbiorcze odświeżenie</span>
    </div>

    {selectedView === "active" ? <DispatcherClient bookings={bookingsWithFlights} drivers={drivers ?? []} vehicles={vehicles ?? []} /> :
      <ReadOnlyDispatcherList bookings={bookingsWithFlights} title={readOnlyTitle} />}
  </main>;
}

function ReadOnlyDispatcherList({ bookings, title }: { bookings: any[]; title: string }) {
  return <section className="card" style={{ marginTop: 16 }}>
    <div className="company-section-head"><div><h2>{title}</h2><p className="muted" style={{ marginBottom: 0 }}>Najbliższe i aktywne są zawsze wyżej, historia jest ułożona od najnowszej.</p></div><strong>{bookings.length}</strong></div>
    {!bookings.length ? <div className="empty-state"><strong>Brak przejazdów w tym widoku.</strong></div> :
      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {bookings.map((b: any) => {
          const company = Array.isArray(b.companies) ? b.companies[0] : b.companies;
          const general = String(b.service_type || "").startsWith("point_to_point");
          return <article className={`dashboard-feed-card booking-stage-card ${b.status || ""}`} key={b.id}>
            <div className="feed-icon">{b.company_id ? "🏢" : general ? "🚐" : "✈️"}</div>
            <div style={{ minWidth: 0 }}>
              <div className="booking-origin">
                {b.company_id ? <span className="origin-badge b2b">B2B · {company?.name ?? "Firma"}</span> : <span className="origin-badge private">{general ? "TRANSPORT A→B" : "INDYWIDUALNY"}</span>}
                {b.quote_required && <span className="quote-required-badge">WYCENA INDYWIDUALNA</span>}
              </div>
              <a href={`/panel/rezerwacje/${b.id}`}><strong>{b.booking_number} · {b.customer_name}</strong></a>
              <span style={{ display: "block", marginTop: 4 }}>{b.travel_date} {String(b.travel_time || "").slice(0, 5)} · {bookingRouteText(b, "primary")}</span>
              {bookingHasReturnLeg(b) && b.return_date && <small style={{ display: "block", marginTop: 4 }}>POWRÓT: {b.return_date} {String(b.return_time || "").slice(0, 5)} · {bookingRouteText(b, "return")}</small>}
              <div className="dispatcher-flight-stack" style={{ marginTop: 8 }}>
                {b.flight_number && <FlightStatusBadge flight={b.flight} flightNumber={b.flight_number} compact={false} />}
                {b.flightAlert && <FlightAlertBadge alert={b.flightAlert} compact />}
                {b.return_flight_number && <div className="dispatcher-return-flight"><small>POWRÓT</small><FlightStatusBadge flight={b.returnFlight} flightNumber={b.return_flight_number} compact={false} />{b.returnFlightAlert && <FlightAlertBadge alert={b.returnFlightAlert} compact />}</div>}
              </div>
            </div>
            <div className="dashboard-feed-meta"><span className={`status ${b.status}`}>{statusPl(b.status)}</span><a className="btn secondary" href={`/panel/rezerwacje/${b.id}`}>OTWÓRZ</a></div>
          </article>;
        })}
      </div>}
  </section>;
}
