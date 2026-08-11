import PanelNav from "@/components/PanelNav";
import EmailTestButton from "@/components/EmailTestButton";
import { panelClient } from "@/lib/panel";

export default async function PanelPage() {
  const { s } = await panelClient();

  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: pending },
    { count: todayCount },
    { count: b2bPending },
    { data: bookings }
  ] = await Promise.all([
    s.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
    s.from("bookings").select("*", { count: "exact", head: true }).eq("travel_date", today),
    s.from("bookings")
      .select("*", { count: "exact", head: true })
      .not("company_id", "is", null)
      .in("status", ["pending", "confirmed", "assigned"]),
    s.from("bookings")
      .select("*,companies(name)")
      .gte("travel_date", today)
      .neq("status", "cancelled")
      .order("travel_date")
      .order("travel_time")
      .limit(20)
  ]);

  return (
    <main className="container">
      <span className="badge">panel.matt-transport.pl</span>
      <h1>MATT Booking PRO Operations</h1>
      <PanelNav />
      <div style={{marginBottom:14}}><EmailTestButton /></div>

      <div className="stats">
        <div className="card stat">
          <strong>{pending ?? 0}</strong>
          <p className="muted">Oczekujące</p>
        </div>
        <div className="card stat">
          <strong>{todayCount ?? 0}</strong>
          <p className="muted">Kursy dzisiaj</p>
        </div>
        <div className="card stat">
          <strong>{b2bPending ?? 0}</strong>
          <p className="muted">Aktywne B2B</p>
        </div>
        <div className="card stat">
          <strong>
            {(bookings ?? []).filter((b: any) => !b.driver_id || !b.vehicle_id).length}
          </strong>
          <p className="muted">Bez pełnej obsady</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="company-section-head">
          <div>
            <h2>Najbliższe rezerwacje</h2>
            <p className="muted">B2B są wyróżnione bezpośrednio na liście.</p>
          </div>
          <a className="btn secondary" href="/panel/dyspozytor">
            OTWÓRZ PLAN KURSÓW
          </a>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Typ</th>
              <th>Numer</th>
              <th>Termin</th>
              <th>Klient</th>
              <th>Trasa</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(bookings ?? []).map((b: any) => {
              const company = Array.isArray(b.companies)
                ? b.companies[0]
                : b.companies;

              return (
                <tr key={b.id} className={b.company_id ? "b2b-row" : ""}>
                  <td>
                    {b.company_id ? (
                      <span className="origin-badge b2b">
                        🏢 B2B
                        <small>{company?.name ?? "Firma"}</small>
                      </span>
                    ) : (
                      <span className="origin-badge private">
                        👤 INDYWIDUALNY
                      </span>
                    )}
                  </td>
                  <td>
                    <a href={`/panel/rezerwacje/${b.id}`}>
                      <strong>{b.booking_number}</strong>
                    </a>
                  </td>
                  <td>{b.travel_date} {b.travel_time}</td>
                  <td>
                    {b.customer_name}
                    <br />
                    <span className="muted">{b.phone}</span>
                  </td>
                  <td>
                    {b.service_type === "from_airport"
                      ? `${b.airport_label} → ${b.pickup_address}`
                      : `${b.pickup_address} → ${b.airport_label}`}
                  </td>
                  <td>
                    <span className={`status ${b.status}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
