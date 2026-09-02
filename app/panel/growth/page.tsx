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

const FUNNEL_STAGES = [
  { order: 1, event: "landing", label: "Wejście do formularza" },
  { order: 2, event: "form_started", label: "Rozpoczęto formularz" },
  { order: 3, event: "route_ready", label: "Uzupełniono trasę" },
  { order: 4, event: "trip_ready", label: "Uzupełniono termin" },
  { order: 5, event: "quote_viewed", label: "Zobaczono wycenę / podsumowanie" },
  { order: 6, event: "customer_started", label: "Rozpoczęto dane klienta" },
  { order: 7, event: "ready_to_submit", label: "Gotowe do wysłania" },
  { order: 8, event: "booking_created", label: "Rezerwacja utworzona" }
] as const;

const FUNNEL_SOURCE_TABS = [
  ["all", "WSZYSTKIE"],
  ["google_ads", "GOOGLE ADS"],
  ["matt_website", "WWW MATT"],
  ["social_organic", "SOCIAL"],
  ["direct", "DIRECT"]
] as const;

type FunnelSession = {
  sessionId: string;
  maxStage: number;
  source: string;
  firstAt: string;
  lastAt: string;
  quoteTotal: number | null;
  bookingId: string | null;
  serviceType: string | null;
  airportKey: string | null;
};

function preferSource(current: string, next: string) {
  if (!current || current === "direct") return next || current || "direct";
  return current;
}

export default async function GrowthPage({
  searchParams
}: {
  searchParams: Promise<{ days?: string; funnelSource?: string }>;
}) {
  const { days = "30", funnelSource = "all" } = await searchParams;
  const range = ["7", "30", "90", "365"].includes(days) ? Number(days) : 30;
  const selectedFunnelSource = FUNNEL_SOURCE_TABS.some(([key]) => key === funnelSource) ? funnelSource : "all";
  const { s } = await panelClient();
  const since = new Date(Date.now() - range * 86400000).toISOString();

  const [bookingResult, funnelResult] = await Promise.all([
    s
      .from("bookings")
      .select("id,booking_number,created_at,status,company_id,booking_source,total_price,price_gross,payment_status,acquisition_source,utm_source,utm_medium,utm_campaign,utm_content,utm_term,gclid,fbclid,referral_code,landing_page")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    s
      .from("growth_funnel_events")
      .select("session_id,event_name,stage_order,occurred_at,acquisition_source,service_type,airport_key,vehicle_type,quote_total,booking_id")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: true })
      .limit(20000)
  ]);

  const data = bookingResult.data;
  const error = bookingResult.error;
  const funnelError = funnelResult.error;
  const funnelRows = funnelResult.data ?? [];

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

  const sessionMap = new Map<string, FunnelSession>();
  for (const event of funnelRows as any[]) {
    const sessionId = String(event.session_id || "");
    if (!sessionId) continue;
    const occurredAt = String(event.occurred_at || "");
    const source = String(event.acquisition_source || "direct");
    const stage = Number(event.stage_order || 0);
    const quote = Number(event.quote_total);
    const current = sessionMap.get(sessionId);
    if (!current) {
      sessionMap.set(sessionId, {
        sessionId,
        maxStage: stage,
        source,
        firstAt: occurredAt,
        lastAt: occurredAt,
        quoteTotal: Number.isFinite(quote) && quote > 0 ? quote : null,
        bookingId: event.booking_id ? String(event.booking_id) : null,
        serviceType: event.service_type ? String(event.service_type) : null,
        airportKey: event.airport_key ? String(event.airport_key) : null
      });
      continue;
    }
    current.maxStage = Math.max(current.maxStage, stage);
    current.source = preferSource(current.source, source);
    if (occurredAt && (!current.firstAt || occurredAt < current.firstAt)) current.firstAt = occurredAt;
    if (occurredAt && (!current.lastAt || occurredAt > current.lastAt)) current.lastAt = occurredAt;
    if (Number.isFinite(quote) && quote > 0) current.quoteTotal = quote;
    if (event.booking_id) current.bookingId = String(event.booking_id);
    if (event.service_type) current.serviceType = String(event.service_type);
    if (event.airport_key) current.airportKey = String(event.airport_key);
  }

  const allFunnelSessions = [...sessionMap.values()];
  const funnelSessions = selectedFunnelSource === "all"
    ? allFunnelSessions
    : allFunnelSessions.filter((session) => session.source === selectedFunnelSource);
  const funnelEntryCount = funnelSessions.filter((session) => session.maxStage >= 1).length;
  const funnelBookingCount = funnelSessions.filter((session) => session.maxStage >= 8).length;
  const funnelConversion = funnelEntryCount ? (funnelBookingCount / funnelEntryCount) * 100 : 0;
  const funnelStageRows = FUNNEL_STAGES.map((stage, index) => {
    const count = funnelSessions.filter((session) => session.maxStage >= stage.order).length;
    const previous = index === 0 ? count : funnelSessions.filter((session) => session.maxStage >= FUNNEL_STAGES[index - 1].order).length;
    const progress = index === 0 ? 100 : previous ? (count / previous) * 100 : 0;
    const loss = index === 0 ? 0 : Math.max(0, previous - count);
    return { ...stage, count, progress, loss };
  });
  const recentFunnel = [...funnelSessions]
    .sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt))
    .slice(0, 25);

  const googleAdsSessions = allFunnelSessions.filter((session) => session.source === "google_ads");
  const googleAdsBookings = googleAdsSessions.filter((session) => session.maxStage >= 8).length;

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
          <a key={d} className={range === d ? "active" : ""} href={`/panel/growth?days=${d}&funnelSource=${selectedFunnelSource}`}>{d === 365 ? "12 MIES." : `${d} DNI`}</a>
        ))}
      </div>

      <div className="stats growth-stats">
        <div className="card stat"><strong>{rows.length}</strong><p className="muted">Utworzone rezerwacje</p></div>
        <div className="card stat"><strong>{nonCancelled.length}</strong><p className="muted">Nieanulowane</p></div>
        <div className="card stat"><strong>{totalRevenue.toFixed(0)} zł</strong><p className="muted">Wartość nieanulowanych</p></div>
        <div className="card stat"><strong>{paidCount}</strong><p className="muted">Opłacone online / oznaczone paid</p></div>
        <div className="card stat"><strong>{trackedCount}/{rows.length}</strong><p className="muted">Zapisane źródło Growth</p></div>
      </div>

      <div className="card growth-funnel-card" style={{ marginTop: 18 }}>
        <div className="growth-funnel-heading">
          <div>
            <span className="badge">GROWTH FUNNEL</span>
            <h2>Gdzie klienci odpadają z formularza?</h2>
            <p className="muted">Jedna sesja przeglądarki jest liczona tylko raz na każdym etapie. Funnel nie zapisuje nazwiska, telefonu, e-maila ani adresu klienta.</p>
          </div>
          <div className="growth-funnel-summary">
            <strong>{funnelEntryCount}</strong><span>wejść</span>
            <strong>{funnelBookingCount}</strong><span>rezerwacji</span>
            <strong>{funnelConversion.toFixed(1)}%</strong><span>konwersji</span>
          </div>
        </div>

        {funnelError ? (
          <div className="booking-error">Nie udało się pobrać lejka. Sprawdź migrację v4.3.1.</div>
        ) : (
          <>
            <div className="booking-view-tabs growth-funnel-source-tabs">
              {FUNNEL_SOURCE_TABS.map(([key, label]) => (
                <a key={key} className={selectedFunnelSource === key ? "active" : ""} href={`/panel/growth?days=${range}&funnelSource=${key}`}>{label}</a>
              ))}
            </div>

            <div className="growth-funnel-google-note">
              <strong>Google Ads:</strong> {googleAdsSessions.length} sesji → {googleAdsBookings} rezerwacji
              {googleAdsSessions.length ? ` (${((googleAdsBookings / googleAdsSessions.length) * 100).toFixed(1)}%)` : ""}
            </div>

            <div className="desktop-table">
              <table className="table growth-funnel-table">
                <thead><tr><th>Etap</th><th>Sesje</th><th>Przejście</th><th>Ubytek</th><th>Lejek</th></tr></thead>
                <tbody>
                  {funnelStageRows.map((stage) => (
                    <tr key={stage.event}>
                      <td><strong>{stage.order}. {stage.label}</strong></td>
                      <td>{stage.count}</td>
                      <td>{stage.progress.toFixed(1)}%</td>
                      <td>{stage.loss ? `−${stage.loss}` : "—"}</td>
                      <td><div className="growth-funnel-bar"><span style={{ width: `${funnelEntryCount ? Math.max(2, (stage.count / funnelEntryCount) * 100) : 0}%` }} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!funnelEntryCount && <p className="muted">Dane zaczną się pojawiać po pierwszym wejściu do formularza po wdrożeniu v4.3.1.</p>}
          </>
        )}
      </div>

      {!funnelError && recentFunnel.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <h2>Ostatnie sesje formularza</h2>
          <p className="muted">Pomaga zobaczyć, na jakim etapie kończy się konkretna anonimowa sesja. Świeża sesja może jeszcze wrócić i przejść dalej.</p>
          <div className="desktop-table">
            <table className="table">
              <thead><tr><th>Ostatnia aktywność</th><th>Źródło</th><th>Najdalszy etap</th><th>Wycena</th><th>Wynik</th></tr></thead>
              <tbody>
                {recentFunnel.map((session) => {
                  const stage = FUNNEL_STAGES.find((item) => item.order === session.maxStage) ?? FUNNEL_STAGES[0];
                  return (
                    <tr key={session.sessionId}>
                      <td>{new Date(session.lastAt).toLocaleString("pl-PL")}</td>
                      <td>{growthSourceLabel(session.source)}</td>
                      <td>{stage.label}</td>
                      <td>{session.quoteTotal ? `${session.quoteTotal.toFixed(2)} zł` : "—"}</td>
                      <td>{session.bookingId ? <a href={`/panel/rezerwacje/${session.bookingId}`}><strong>REZERWACJA ✓</strong></a> : <span className="muted">bez rezerwacji</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card growth-test-card">
        <div>
          <h2>Test Growth</h2>
          <p className="muted">Ten link ustawia testowe UTM. Zrób nim jedną próbną rezerwację i sprawdź atrybucję oraz Funnel.</p>
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
