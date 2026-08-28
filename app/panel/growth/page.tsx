import PanelNav from "@/components/PanelNav";
import { panelClient } from "@/lib/panel";
import { growthSourceLabel } from "@/lib/growthTracking";

function revenueOf(b: any) {
  if (b.status === "cancelled") return 0;
  return Number(b.company_id ? (b.price_gross ?? b.total_price ?? 0) : (b.total_price ?? 0));
}

function sourceOf(b: any) {
  if (b.acquisition_source) return String(b.acquisition_source);
  if (String(b.booking_source || "").startsWith("b2b")) return "b2b_portal";
  return "legacy";
}

export default async function GrowthPage({
  searchParams
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days = "30" } = await searchParams;
  const range = ["7", "30", "90", "365"].includes(days) ? Number(days) : 30;
  const { s } = await panelClient();
  const since = new Date(Date.now() - range * 86400000).toISOString();

  const { data, error } = await s
    .from("bookings")
    .select("id,booking_number,created_at,status,company_id,booking_source,total_price,price_gross,payment_status,acquisition_source,utm_source,utm_medium,utm_campaign,utm_content,utm_term,gclid,fbclid,referral_code,landing_page")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  const rows = data ?? [];
  const nonCancelled = rows.filter((b: any) => b.status !== "cancelled");
  const totalRevenue = nonCancelled.reduce((sum: number, b: any) => sum + revenueOf(b), 0);
  const paidCount = rows.filter((b: any) => b.payment_status === "paid").length;
  const trackedCount = rows.filter((b: any) => b.acquisition_source).length;

  const sourceMap = new Map<string, { count: number; live: number; revenue: number; paid: number }>();
  for (const b of rows) {
    const key = sourceOf(b);
    const current = sourceMap.get(key) ?? { count: 0, live: 0, revenue: 0, paid: 0 };
    current.count += 1;
    if (b.status !== "cancelled") current.live += 1;
    current.revenue += revenueOf(b);
    if (b.payment_status === "paid") current.paid += 1;
    sourceMap.set(key, current);
  }
  const sources = [...sourceMap.entries()].sort((a, b) => b[1].revenue - a[1].revenue || b[1].count - a[1].count);

  const campaignMap = new Map<string, { count: number; revenue: number }>();
  for (const b of rows) {
    if (!b.utm_campaign) continue;
    const key = String(b.utm_campaign);
    const current = campaignMap.get(key) ?? { count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += revenueOf(b);
    campaignMap.set(key, current);
  }
  const campaigns = [...campaignMap.entries()].sort((a, b) => b[1].revenue - a[1].revenue || b[1].count - a[1].count).slice(0, 20);

  const partnerMap = new Map<string, { count: number; revenue: number }>();
  for (const b of rows) {
    if (!b.referral_code) continue;
    const key = String(b.referral_code);
    const current = partnerMap.get(key) ?? { count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += revenueOf(b);
    partnerMap.set(key, current);
  }
  const partners = [...partnerMap.entries()].sort((a, b) => b[1].revenue - a[1].revenue || b[1].count - a[1].count).slice(0, 20);

  return (
    <main className="container">
      <span className="badge">MATT GROWTH</span>
      <h1>Skąd przychodzą rezerwacje?</h1>
      <PanelNav />

      {error && (
        <div className="card" style={{ borderColor: "#dc2626", marginBottom: 16 }}>
          <strong>Nie udało się pobrać danych Growth.</strong>
          <p className="muted">Sprawdź migrację v4.2.0 i logi Supabase.</p>
        </div>
      )}

      <div className="booking-view-tabs growth-range-tabs">
        {[7,30,90,365].map((d) => (
          <a key={d} className={range === d ? "active" : ""} href={`/panel/growth?days=${d}`}>{d === 365 ? "12 MIES." : `${d} DNI`}</a>
        ))}
      </div>

      <div className="stats growth-stats">
        <div className="card stat"><strong>{rows.length}</strong><p className="muted">Utworzone rezerwacje</p></div>
        <div className="card stat"><strong>{nonCancelled.length}</strong><p className="muted">Nieanulowane</p></div>
        <div className="card stat"><strong>{totalRevenue.toFixed(0)} zł</strong><p className="muted">Wartość nieanulowanych</p></div>
        <div className="card stat"><strong>{paidCount}</strong><p className="muted">Opłacone online / oznaczone paid</p></div>
        <div className="card stat"><strong>{trackedCount}/{rows.length}</strong><p className="muted">Zapisane źródło Growth</p></div>
      </div>

      <div className="card growth-test-card">
        <div>
          <h2>Test v4.2</h2>
          <p className="muted">Ten link ustawia testowe UTM. Zrób nim jedną próbną rezerwację i sprawdź jej kartę w Panelu.</p>
        </div>
        <a className="btn" href="https://booking.matt-transport.pl/booking?utm_source=test&utm_medium=qa&utm_campaign=matt_growth_test&utm_content=panel&ref=TEST-GROWTH" target="_blank" rel="noreferrer">OTWÓRZ LINK TESTOWY</a>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Źródła</h2>
        <div className="desktop-table">
          <table className="table">
            <thead><tr><th>Źródło</th><th>Rezerwacje</th><th>Nieanulowane</th><th>Opłacone</th><th>Wartość</th></tr></thead>
            <tbody>
              {sources.map(([source, x]) => (
                <tr key={source}><td><strong>{growthSourceLabel(source)}</strong></td><td>{x.count}</td><td>{x.live}</td><td>{x.paid}</td><td>{x.revenue.toFixed(2)} zł</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {!sources.length && <p className="muted">Brak rezerwacji w wybranym okresie.</p>}
      </div>

      <div className="growth-two-col">
        <div className="card">
          <h2>Kampanie UTM</h2>
          {!campaigns.length ? <p className="muted">Pierwsze dane pojawią się po rezerwacji z linku UTM.</p> : campaigns.map(([name, x]) => (
            <div className="row" key={name}><span className="growth-wrap">{name}</span><strong>{x.count} · {x.revenue.toFixed(0)} zł</strong></div>
          ))}
        </div>
        <div className="card">
          <h2>Partnerzy / kody</h2>
          {!partners.length ? <p className="muted">Brak rezerwacji partnerskich w tym okresie.</p> : partners.map(([name, x]) => (
            <div className="row" key={name}><span className="growth-wrap">{name}</span><strong>{x.count} · {x.revenue.toFixed(0)} zł</strong></div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Ostatnie rezerwacje i atrybucja</h2>
        <div className="history-list growth-recent-list">
          {rows.slice(0, 30).map((b: any) => (
            <div key={b.id}>
              <a href={`/panel/rezerwacje/${b.id}`}><strong>{b.booking_number}</strong></a>
              <span>{new Date(b.created_at).toLocaleString("pl-PL")} · {growthSourceLabel(sourceOf(b))}{b.utm_campaign ? ` · ${b.utm_campaign}` : ""}{b.referral_code ? ` · ref: ${b.referral_code}` : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
