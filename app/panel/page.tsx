import PanelNav from "@/components/PanelNav";
import EmailTestButton from "@/components/EmailTestButton";
import DashboardQuickActions from "@/components/DashboardQuickActions";
import FlightStatusBadge from "@/components/FlightStatusBadge";
import FlightRefreshAllButton from "@/components/FlightRefreshAllButton";
import { isFlightAlert } from "@/lib/flightDisplay";
import FlightAlertBadge from "@/components/FlightAlertBadge";
import FlightAutomationStatus from "@/components/FlightAutomationStatus";
import { panelClient } from "@/lib/panel";
import { statusPl } from "@/lib/status";
import { isArchivedBooking, isOverdueBooking, statusStageClass, warsawToday } from "@/lib/bookingOps";

export default async function PanelPage() {
  const { s } = await panelClient();
  const today = warsawToday();

  const [
    { count: pending },
    { count: todayCount },
    { count: b2bPending },
    { data: bookings },
    { data: weddings },
    { data: vehicles }
  ] = await Promise.all([
    s.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
    s.from("bookings").select("*", { count: "exact", head: true }).eq("travel_date", today).not("status", "in", "(completed,cancelled)"),
    s.from("bookings").select("*", { count: "exact", head: true }).not("company_id", "is", null).in("status", ["pending","confirmed","assigned"]),
    s.from("bookings").select("*,companies(name),drivers(full_name,color)").order("created_at", { ascending: false }).limit(120),
    s.from("wedding_bookings").select("*").order("created_at", { ascending: false }).limit(30),
    s.from("vehicles").select("id,name,registration,inspection_date,insurance_date,active").eq("active", true).order("name")
  ]);

  const allBookings = bookings ?? [];

  const bookingIds = allBookings.map((b: any) => b.id);
  let flightRows: any[] = [];

  if (bookingIds.length) {
    const { data } = await s
      .from("booking_flights")
      .select("*")
      .in("booking_id", bookingIds)
      .eq("leg", "primary");

    flightRows = data ?? [];
  }

  const flightByBooking = new Map(
    flightRows.map((f: any) => [f.booking_id, f])
  );

  let flightAlerts: any[] = [];

  if (bookingIds.length) {
    const { data } = await s
      .from("booking_flight_alerts")
      .select("*")
      .in("booking_id", bookingIds)
      .eq("active", true)
      .order("updated_at", { ascending: false });

    flightAlerts = data ?? [];
  }

  const alertByBooking = new Map<string, any>();

  for (const alert of flightAlerts) {
    const current = alertByBooking.get(alert.booking_id);
    const rank = alert.severity === "critical" ? 3 : alert.severity === "warning" ? 2 : 1;
    const currentRank = current?.severity === "critical" ? 3 : current?.severity === "warning" ? 2 : current ? 1 : 0;

    if (!current || rank > currentRank) {
      alertByBooking.set(alert.booking_id, alert);
    }
  }

  const { data: lastRun } = await s
    .from("flight_monitor_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const enrichedBookings = allBookings.map((b: any) => ({
    ...b,
    flight: flightByBooking.get(b.id) ?? null,
    flightAlert: alertByBooking.get(b.id) ?? null
  }));

  const activeBookings = enrichedBookings.filter((b: any) => !isArchivedBooking(b));
  const operational = activeBookings.filter((b: any) => !["completed", "cancelled"].includes(b.status));

  const alertUnassigned = operational.filter((b: any) => !b.driver_id || !b.vehicle_id).length;
  const alertPayment = operational.filter((b: any) => b.payment_status === "review").length;
  const alertChanged = operational.filter((b: any) => b.status === "pending" && b.customer_last_edited_at).length;
  const alertOverdue = operational.filter(isOverdueBooking).length;
  const alertFlights = flightAlerts.filter(
    (a: any) =>
      a.active &&
      !a.acknowledged_at &&
      ["warning","critical"].includes(a.severity)
  ).length;

  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const daysUntil = (value?: string | null) => {
    if (!value) return null;
    const target = Date.parse(`${String(value).slice(0,10)}T00:00:00Z`);
    return Number.isFinite(target) ? Math.ceil((target - todayMs) / 86400000) : null;
  };
  const fleetAttention = (vehicles ?? []).filter((vehicle: any) => {
    const inspection = daysUntil(vehicle.inspection_date);
    const insurance = daysUntil(vehicle.insurance_date);
    return [inspection, insurance].some((days) => days !== null && days <= 30);
  });
  const fleetUrgent = fleetAttention.filter((vehicle: any) => {
    const inspection = daysUntil(vehicle.inspection_date);
    const insurance = daysUntil(vehicle.insurance_date);
    return [inspection, insurance].some((days) => days !== null && days <= 7);
  }).length;

  const feed = [
    ...activeBookings.slice(0, 35).map((b: any) => ({
      kind: "airport",
      created_at: b.created_at,
      data: b
    })),
    ...(weddings ?? []).filter((x: any) => x.status !== "completed" && x.status !== "cancelled").slice(0, 15).map((b: any) => ({
      kind: "wedding",
      created_at: b.created_at,
      data: b
    }))
  ]
    .sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 40);

  return (
    <main className="container">
      <span className="badge">panel.matt-transport.pl</span>
      <h1>MATT Booking PRO</h1>
      <PanelNav />

      <FlightAutomationStatus lastRun={lastRun} />

      <div className="admin-quick-row">
        <EmailTestButton />
        <FlightRefreshAllButton />
        <a className="btn secondary" href="/panel/rezerwacje?view=archive">ARCHIWUM</a>
        <a className="btn secondary" href="/panel/dyspozytor">PLAN KURSÓW</a>
      </div>

      <div className="ops-alert-center card">
        <div>
          <h2>Wymaga uwagi</h2>
          <span>Problemy, które mogą wymagać działania dyspozytora.</span>
        </div>

        <div className="ops-alert-grid ops-alert-grid-seven">
          <a className={alertOverdue ? "alert-danger" : ""} href="/panel/dyspozytor">
            <strong>{alertOverdue}</strong>
            <span>Termin minął</span>
          </a>
          <a className={alertFlights ? "alert-danger" : ""} href="/panel/dyspozytor">
            <strong>{alertFlights}</strong>
            <span>Loty z alertem</span>
          </a>
          <a href="/panel/dyspozytor">
            <strong>{alertUnassigned}</strong>
            <span>Bez pełnej obsady</span>
          </a>
          <a href="/panel/rezerwacje?view=active">
            <strong>{alertChanged}</strong>
            <span>Zmiany klientów</span>
          </a>
          <a className={alertPayment ? "alert-danger" : ""} href="/panel/rezerwacje?view=active">
            <strong>{alertPayment}</strong>
            <span>Płatności do weryfikacji</span>
          </a>
          <a className={fleetUrgent ? "alert-danger" : ""} href="/panel/pojazdy">
            <strong>{fleetAttention.length}</strong>
            <span>Flota ≤30 dni</span>
          </a>
          <a href="/panel/wesela">
            <strong>{(weddings ?? []).filter((x: any) => x.status === "pending").length}</strong>
            <span>Wesela do obsługi</span>
          </a>
        </div>
      </div>

      <div className="stats">
        <div className="card stat"><strong>{pending ?? 0}</strong><p className="muted">Oczekujące</p></div>
        <div className="card stat"><strong>{todayCount ?? 0}</strong><p className="muted">Aktywne dzisiaj</p></div>
        <div className="card stat"><strong>{b2bPending ?? 0}</strong><p className="muted">Aktywne B2B</p></div>
        <div className="card stat"><strong>{alertOverdue}</strong><p className="muted">Po terminie</p></div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="company-section-head">
          <div>
            <h2>Aktywne i najnowsze zgłoszenia</h2>
            <p className="muted">Zakończone z minionych terminów trafiają do Archiwum.</p>
          </div>
          <a className="btn secondary" href="/panel/rezerwacje?view=active">WSZYSTKIE AKTYWNE</a>
        </div>

        <div className="dashboard-feed">
          {feed.map((x: any) => {
            if (x.kind === "wedding") {
              const b = x.data;
              return (
                <div className="dashboard-feed-card wedding-order" key={`w-${b.id}`}>
                  <div className="feed-icon">💍</div>
                  <div>
                    <span className="origin-badge wedding">WESELE</span>
                    <a href={`/panel/wesela/${b.id}`}><strong>{b.booking_number} · {b.customer_name}</strong></a>
                    <span>{b.start_date} {b.start_time} · {b.restaurant_name}</span>
                  </div>
                  <div className="feed-status">Oczekuje</div>
                </div>
              );
            }

            const b = x.data;
            const company = Array.isArray(b.companies) ? b.companies[0] : b.companies;
            const driver = Array.isArray(b.drivers) ? b.drivers[0] : b.drivers;
            const overdue = isOverdueBooking(b);

            return (
              <div
                className={`dashboard-feed-card booking-stage-card ${statusStageClass(b.status)} ${b.company_id ? "b2b-order" : ""} ${overdue ? "booking-overdue" : ""}`}
                key={`a-${b.id}`}
              >
                <div className="feed-icon">{b.company_id ? "🏢" : "✈️"}</div>

                <div>
                  {b.company_id ? (
                    <span className="origin-badge b2b">B2B · {company?.name ?? "Firma"}</span>
                  ) : (
                    <span className="origin-badge private">INDYWIDUALNY</span>
                  )}
                  <a href={`/panel/rezerwacje/${b.id}`}>
                    <strong>{b.booking_number} · {b.customer_name}</strong>
                  </a>
                  <span>{b.travel_date} {String(b.travel_time).slice(0,5)} · {b.pickup_address} → {b.airport_label}</span>
                  {b.flight_number && (
                    <FlightStatusBadge
                      flight={b.flight}
                      flightNumber={b.flight_number}
                    />
                  )}
                  {b.flightAlert && (
                    <FlightAlertBadge alert={b.flightAlert} compact />
                  )}
                  {overdue && <span className="overdue-badge">⚠ TERMIN MINĄŁ — status niezamknięty</span>}
                  <DashboardQuickActions booking={b} />
                </div>

                <div className="dashboard-feed-meta">
                  {driver && (
                    <span className="driver-color-badge" style={{ borderColor: driver.color || "#D6AD55" }}>
                      <i style={{ background: driver.color || "#D6AD55" }} />
                      {driver.full_name}
                    </span>
                  )}

                  {((!b.company_id && (b.payment_method === "online" || b.online_payment_requested)) ||
                    (b.company_id && b.payment_method === "employee_payment")) && (
                    <span
                      className={`payment-dashboard-badge ${
                        b.payment_status === "paid"
                          ? "paid"
                          : b.payment_status === "review"
                          ? "review"
                          : b.payment_status === "refunded"
                          ? "refunded"
                          : b.payment_status === "failed"
                          ? "failed"
                          : "waiting"
                      }`}
                    >
                      {b.payment_status === "paid"
                        ? "PŁATNOŚĆ · ✓ OPŁACONO"
                        : b.payment_status === "review"
                        ? "PŁATNOŚĆ · ⚠ WERYFIKACJA"
                        : b.payment_status === "refunded"
                        ? "PŁATNOŚĆ · ↩ ZWROT"
                        : b.payment_status === "failed"
                        ? "PŁATNOŚĆ · NIEUDANA"
                        : "PŁATNOŚĆ · OCZEKUJE"}
                    </span>
                  )}

                  <div className={`feed-status ${b.status}`}>{statusPl(b.status)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
