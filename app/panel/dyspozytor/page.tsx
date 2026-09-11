import PanelNav from "@/components/PanelNav";
import DispatcherClient from "@/components/DispatcherClient";
import { panelClient } from "@/lib/panel";
import FlightRefreshAllButton from "@/components/FlightRefreshAllButton";
import FlightAutomationStatus from "@/components/FlightAutomationStatus";
import FlightStatusBadge from "@/components/FlightStatusBadge";
import FlightAlertBadge from "@/components/FlightAlertBadge";
import { statusPl } from "@/lib/status";
import { bookingRouteText } from "@/lib/bookingRoute";
import { splitUnifiedBookings } from "@/lib/unifiedBookingSort";

export default async function Page() {
  const { s } = await panelClient();

  const [
    { data: bookings, error: bookingsError },
    { data: drivers },
    { data: vehicles }
  ] = await Promise.all([
    s.from("bookings")
      .select("*,companies(name),drivers:drivers!bookings_driver_id_fkey(full_name,color)")
      .limit(800),
    s.from("drivers").select("*").eq("active", true).order("full_name"),
    s.from("vehicles").select("*").eq("active", true).order("name")
  ]);

  const bookingRows = bookings ?? [];
  const bookingIds = bookingRows.map((b: any) => b.id);
  let flightRows: any[] = [];
  let alertRows: any[] = [];

  if (bookingIds.length) {
    const [flightResult, alertResult] = await Promise.all([
      s.from("booking_flights").select("*").in("booking_id", bookingIds),
      s.from("booking_flight_alerts")
        .select("*")
        .in("booking_id", bookingIds)
        .eq("active", true)
        .order("updated_at", { ascending: false })
    ]);
    flightRows = flightResult.data ?? [];
    alertRows = alertResult.data ?? [];
  }

  const flightByBookingLeg = new Map(
    flightRows.map((f: any) => [`${f.booking_id}:${f.leg || "primary"}`, f])
  );

  const alertByBookingLeg = new Map<string, any>();
  for (const alert of alertRows) {
    const key = `${alert.booking_id}:${alert.leg || "primary"}`;
    const current = alertByBookingLeg.get(key);
    const rank = alert.severity === "critical" ? 3 : alert.severity === "warning" ? 2 : 1;
    const currentRank = current?.severity === "critical" ? 3 : current?.severity === "warning" ? 2 : current ? 1 : 0;
    if (!current || rank > currentRank) alertByBookingLeg.set(key, alert);
  }

  const { data: lastRun } = await s
    .from("flight_monitor_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const enriched = bookingRows.map((b: any) => ({
    ...b,
    flight: flightByBookingLeg.get(`${b.id}:primary`) ?? null,
    returnFlight: flightByBookingLeg.get(`${b.id}:return`) ?? null,
    flightAlert: alertByBookingLeg.get(`${b.id}:primary`) ?? null,
    returnFlightAlert: alertByBookingLeg.get(`${b.id}:return`) ?? null
  }));

  const { active, history } = splitUnifiedBookings(enriched);

  return (
    <main className="container">
      <span className="badge">MATT DISPATCHER PRO</span>
      <h1>Plan kursów</h1>
      <p className="muted">
        Jedno miejsce do obsługi wszystkich bieżących przejazdów. Aktywne kursy są zawsze ułożone chronologicznie od najbliższego.
      </p>
      <PanelNav />

      {bookingsError && (
        <div className="card" style={{ borderColor: "#dc2626", marginBottom: 16 }}>
          <strong>Nie udało się pobrać rezerwacji.</strong>
        </div>
      )}

      <FlightAutomationStatus lastRun={lastRun} />
      <div className="dispatcher-flight-toolbar">
        <FlightRefreshAllButton />
        <span className="muted">AirLabs · cache 20 min · maks. 8 zapytań na jedno zbiorcze odświeżenie</span>
      </div>

      <DispatcherClient
        bookings={active}
        drivers={drivers ?? []}
        vehicles={vehicles ?? []}
      />

      <ReadOnlyDispatcherList
        bookings={history}
        title="Historia · zakończone i anulowane"
        emptyText="Brak zakończonych lub anulowanych przejazdów."
      />
    </main>
  );
}

function ReadOnlyDispatcherList({ bookings, title, emptyText }: {
  bookings: any[];
  title: string;
  emptyText: string;
}) {
  return (
    <section className="card" style={{ marginTop: 24 }}>
      <div className="company-section-head">
        <div>
          <span className="badge">HISTORIA</span>
          <h2 style={{ marginTop: 8 }}>{title}</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            Najnowsze zakończone i anulowane przejazdy są na górze tej sekcji.
          </p>
        </div>
        <strong>{bookings.length}</strong>
      </div>

      {!bookings.length ? (
        <div className="empty-state"><strong>{emptyText}</strong></div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {bookings.map((b: any) => {
            const company = Array.isArray(b.companies) ? b.companies[0] : b.companies;
            const route = bookingRouteText(b);
            const pointToPoint = b.booking_category === "point_to_point";

            return (
              <article className={`dashboard-feed-card booking-stage-card ${b.status || ""}`} key={b.id}>
                <div className="feed-icon">{b.company_id ? "🏢" : pointToPoint ? "🚐" : "✈️"}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="booking-origin">
                    {b.company_id ? (
                      <span className="origin-badge b2b">B2B · {company?.name ?? "Firma"}</span>
                    ) : pointToPoint ? (
                      <span className="origin-badge private">TRANSPORT A → B</span>
                    ) : (
                      <span className="origin-badge private">INDYWIDUALNY</span>
                    )}
                  </div>
                  <a href={`/panel/rezerwacje/${b.id}`}>
                    <strong>{b.booking_number} · {b.customer_name}</strong>
                  </a>
                  <span style={{ display: "block", marginTop: 4 }}>
                    {b.travel_date} {String(b.travel_time || "").slice(0, 5)} · {route}
                  </span>
                  {b.service_type === "roundtrip" && b.return_date && (
                    <small style={{ display: "block", marginTop: 4 }}>
                      POWRÓT: {b.return_date} {String(b.return_time || "").slice(0, 5)}
                    </small>
                  )}
                  {!pointToPoint && (
                    <div className="dispatcher-flight-stack" style={{ marginTop: 8 }}>
                      {b.flight_number && <FlightStatusBadge flight={b.flight} flightNumber={b.flight_number} compact={false} />}
                      {b.flightAlert && <FlightAlertBadge alert={b.flightAlert} compact />}
                      {b.return_flight_number && (
                        <div className="dispatcher-return-flight">
                          <small>POWRÓT</small>
                          <FlightStatusBadge flight={b.returnFlight} flightNumber={b.return_flight_number} compact={false} />
                          {b.returnFlightAlert && <FlightAlertBadge alert={b.returnFlightAlert} compact />}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="dashboard-feed-meta">
                  <span className={`status ${b.status}`}>{statusPl(b.status)}</span>
                  <a className="btn secondary" href={`/panel/rezerwacje/${b.id}`}>OTWÓRZ</a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
