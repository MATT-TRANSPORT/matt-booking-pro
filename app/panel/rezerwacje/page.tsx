import PanelNav from "@/components/PanelNav";
import { panelClient } from "@/lib/panel";
import { statusPl } from "@/lib/status";
import { isArchivedBooking, isOverdueBooking, statusStageClass } from "@/lib/bookingOps";

export default async function Page({
  searchParams
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const { q = "", view = "active" } = await searchParams;
  const { s } = await panelClient();

  let query = s
    .from("bookings")
    .select("*,drivers:drivers!bookings_driver_id_fkey(full_name,color)")
    .order("travel_date", { ascending: false })
    .order("travel_time", { ascending: false })
    .limit(500);

  if (q.trim()) {
    query = query.or(
      `booking_number.ilike.%${q}%,customer_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  const all = data ?? [];

  const rows = all.filter((b: any) => {
    if (view === "archive") return isArchivedBooking(b);
    if (view === "all") return true;
    return !isArchivedBooking(b);
  });

  const activeCount = all.filter((b: any) => !isArchivedBooking(b)).length;
  const archiveCount = all.filter((b: any) => isArchivedBooking(b)).length;
  const allCount = all.length;

  return (
    <main className="container">
      <h1>Rezerwacje</h1>
      <PanelNav />

      <div className="booking-view-tabs">
        <a className={view === "active" ? "active" : ""} href={`/panel/rezerwacje?view=active&q=${encodeURIComponent(q)}`}>
          AKTYWNE ({activeCount})
        </a>
        <a className={view === "archive" ? "active" : ""} href={`/panel/rezerwacje?view=archive&q=${encodeURIComponent(q)}`}>
          ARCHIWUM ({archiveCount})
        </a>
        <a className={view === "all" ? "active" : ""} href={`/panel/rezerwacje?view=all&q=${encodeURIComponent(q)}`}>
          WSZYSTKIE ({allCount})
        </a>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "#dc2626", marginBottom: 16 }}>
          <strong>Nie udało się pobrać rezerwacji.</strong>
          <p className="muted" style={{ marginBottom: 0 }}>Odśwież stronę. Jeśli problem pozostaje, sprawdź logi Supabase / Vercel.</p>
        </div>
      )}

      <form className="archive-search">
        <input type="hidden" name="view" value={view} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Numer, nazwisko, telefon lub e-mail"
        />
        <button className="btn">SZUKAJ</button>
      </form>

      <div className="desktop-table card">
        <table className="table booking-archive-table">
          <thead>
            <tr>
              <th>Numer</th>
              <th>Termin</th>
              <th>Klient</th>
              <th>Kierowca</th>
              <th>Cena</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b: any) => {
              const driver = Array.isArray(b.drivers) ? b.drivers[0] : b.drivers;
              const overdue = isOverdueBooking(b);
              return (
                <tr key={b.id} className={`${statusStageClass(b.status)} ${overdue ? "booking-overdue" : ""}`}>
                  <td>
                    <a className="booking-number-link" href={`/panel/rezerwacje/${b.id}`}>
                      {b.booking_number}
                    </a>
                    {overdue && <div className="overdue-badge">⚠ TERMIN MINĄŁ</div>}
                  </td>
                  <td>{b.travel_date}<br />{String(b.travel_time).slice(0,5)}</td>
                  <td>{b.customer_name}<br />{b.phone || "—"}</td>
                  <td>
                    {driver ? (
                      <span className="driver-color-badge" style={{ borderColor: driver.color || "#D6AD55" }}>
                        <i style={{ background: driver.color || "#D6AD55" }} />
                        {driver.full_name}
                      </span>
                    ) : "—"}
                  </td>
                  <td>{b.company_id ? <><strong>{Number(b.price_net ?? b.total_price).toFixed(2)} zł netto</strong><br/><span className="muted">{Number(b.price_gross ?? b.total_price).toFixed(2)} zł brutto</span></> : `${Number(b.total_price).toFixed(2)} zł`}</td>
                  <td><span className={`status ${b.status}`}>{statusPl(b.status)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mobile-card-list booking-mobile-list">
        {rows.map((b: any) => {
          const overdue = isOverdueBooking(b);
          const driver = Array.isArray(b.drivers) ? b.drivers[0] : b.drivers;
          return (
            <a
              className={`mobile-data-card booking-stage-card ${statusStageClass(b.status)} ${overdue ? "booking-overdue" : ""}`}
              href={`/panel/rezerwacje/${b.id}`}
              key={b.id}
            >
              <div className="mobile-booking-head">
                <strong>{b.booking_number}</strong>
                <span className={`status ${b.status}`}>{statusPl(b.status)}</span>
              </div>
              {overdue && <span className="overdue-badge">⚠ TERMIN MINĄŁ — wymaga zamknięcia</span>}
              <span>{b.customer_name}</span>
              <span>{b.travel_date} {String(b.travel_time).slice(0,5)}</span>
              {driver && (
                <span className="driver-color-badge" style={{ borderColor: driver.color || "#D6AD55" }}>
                  <i style={{ background: driver.color || "#D6AD55" }} />
                  {driver.full_name}
                </span>
              )}
              <span>{b.company_id ? `${Number(b.price_net ?? b.total_price).toFixed(2)} zł netto · ${Number(b.price_gross ?? b.total_price).toFixed(2)} zł brutto` : `${Number(b.total_price).toFixed(2)} zł`}</span>
            </a>
          );
        })}
      </div>

      {!rows.length && (
        <div className="card empty-state">
          <strong>Brak rezerwacji w tym widoku.</strong>
        </div>
      )}
    </main>
  );
}
