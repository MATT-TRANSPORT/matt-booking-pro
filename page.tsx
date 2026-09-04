import PortalAccessButton from "@/components/PortalAccessButton";
import CompanyTermsEditor from "@/components/CompanyTermsEditor";
import CompanyAdminActions from "@/components/CompanyAdminActions";
import { notFound } from "next/navigation";
import PanelNav from "@/components/PanelNav";
import SettlementUpload from "@/components/SettlementUpload";
import { panelClient } from "@/lib/panel";

export default async function Page({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { s } = await panelClient();

  const [
    { data: company },
    { data: employees },
    { data: bookings },
    { data: users },
    { data: settlements },
    { data: termsHistory }
  ] = await Promise.all([
    s.from("companies").select("*").eq("id", id).single(),
    s.from("company_employees").select("*").eq("company_id", id).order("last_name"),
    s.from("bookings").select("*").eq("company_id", id).order("created_at", { ascending: false }).limit(200),
    s.from("company_users").select("id,user_id,role,active").eq("company_id", id),
    s.from("company_settlements").select("*").eq("company_id", id).order("period_month", { ascending: false }),
    s.from("company_pricing_terms")
      .select("*")
      .eq("company_id", id)
      .order("effective_from", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  if (!company) notFound();

  const latestTerms = termsHistory?.[0] ?? null;
  const { data: latestPrices } = latestTerms
    ? await s
        .from("company_pricing_airport_prices")
        .select("*")
        .eq("terms_id", latestTerms.id)
        .order("airport_key")
    : { data: [] as any[] };

  const totalNet = (bookings ?? []).reduce(
    (sum: number, b: any) =>
      sum + Number(b.price_net ?? (b.company_id ? b.total_price : 0) ?? 0),
    0
  );
  const totalGross = (bookings ?? []).reduce(
    (sum: number, b: any) => sum + Number(b.price_gross ?? b.total_price ?? 0),
    0
  );

  return (
    <main className="container">
      <a className="back-link" href="/panel/firmy">← Firmy B2B</a>
      <h1>{company.name}</h1>
      <PanelNav />

      <div className="stats">
        <div className="stat"><strong>{employees?.length ?? 0}</strong><span>Pracownicy</span></div>
        <div className="stat"><strong>{bookings?.length ?? 0}</strong><span>Rezerwacje</span></div>
        <div className="stat"><strong>{totalNet.toFixed(0)} zł</strong><span>Wartość netto</span></div>
        <div className="stat"><strong>{totalGross.toFixed(0)} zł</strong><span>Wartość brutto</span></div>
      </div>

      <div className="reservation-detail-grid">
        <CompanyTermsEditor
          company={company}
          terms={latestTerms}
          prices={latestPrices ?? []}
        />

        <div>
          <div className="card">
            <h2>Dane firmy</h2>
            <div className="detail-list">
              <div><span>NIP</span><strong>{company.nip || "—"}</strong></div>
              <div><span>E-mail</span><strong>{company.email || "—"}</strong></div>
              <div><span>Telefon</span><strong>{company.phone || "—"}</strong></div>
              <div><span>Kontakt</span><strong>{company.contact_person || "—"}</strong></div>
              <div><span>Termin płatności</span><strong>{latestTerms?.payment_days ?? company.payment_days ?? 14} dni</strong></div>
              <div><span>VAT B2B</span><strong>8%</strong></div>
              <div><span>Dostęp B2B</span><strong>{(users?.length ?? 0) > 0 ? "Konto aktywne" : "Brak konta"}</strong></div>
            </div>
            <PortalAccessButton type="company" id={company.id} active={(users?.length ?? 0) > 0} />
            <CompanyAdminActions company={company} />
          </div>

          <SettlementUpload companyId={company.id} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Historia warunków handlowych</h2>
        {!termsHistory?.length ? (
          <p className="muted">Brak wersji warunków.</p>
        ) : (
          <div className="company-bookings-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Ważne od</th>
                  <th>Siedziba</th>
                  <th>Bez dopłaty</th>
                  <th>Stawka km</th>
                  <th>Cennik</th>
                  <th>VAT</th>
                </tr>
              </thead>
              <tbody>
                {termsHistory.map((t: any) => (
                  <tr key={t.id}>
                    <td>{t.effective_from}</td>
                    <td>{t.pricing_origin_address}</td>
                    <td>{Number(t.free_km).toFixed(1)} km</td>
                    <td>{Number(t.extra_km_rate_net).toFixed(2)} zł netto/km</td>
                    <td>{t.use_custom_pricing ? "Indywidualny" : "Standardowy MATT"}</td>
                    <td>{Number(t.vat_rate).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Rozliczenia</h2>
        <table className="table">
          <thead>
            <tr><th>Miesiąc</th><th>Kwota</th><th>Faktura</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(settlements ?? []).map((x: any) => (
              <tr key={x.id}>
                <td>{String(x.period_month).slice(0, 7)}</td>
                <td>{Number(x.amount).toFixed(2)} zł</td>
                <td>{x.invoice_number || "—"}</td>
                <td>{x.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Ostatnie rezerwacje</h2>
        <table className="table">
          <thead>
            <tr><th>Typ</th><th>Numer</th><th>Pasażer</th><th>Termin</th><th>Netto</th><th>Brutto</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(bookings ?? []).slice(0, 50).map((b: any) => (
              <tr key={b.id}>
                <td><span className="origin-badge b2b">🏢 B2B</span></td>
                <td><a href={`/panel/rezerwacje/${b.id}`}>{b.booking_number}</a></td>
                <td>{b.customer_name}</td>
                <td>{b.travel_date} {b.travel_time}</td>
                <td>{Number(b.price_net ?? b.total_price).toFixed(2)} zł</td>
                <td>{Number(b.price_gross ?? b.total_price).toFixed(2)} zł</td>
                <td>{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: 12 }}>
          Wszystkie ceny handlowe B2B są cenami netto. VAT 8% jest prezentowany oddzielnie.
        </p>
      </div>
    </main>
  );
}
