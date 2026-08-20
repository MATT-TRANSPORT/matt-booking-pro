import CompanyNav from "@/components/CompanyNav";
import { companyClient } from "@/lib/company";
import { PRICES } from "@/lib/pricing";

export default async function Page() {
  const { s, company, membership } = await companyClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: terms } = await s
    .from("company_commercial_terms")
    .select("*")
    .eq("company_id", company.id)
    .eq("active", true)
    .lte("effective_from", today)
    .order("effective_from", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: prices } = terms
    ? await s
        .from("company_commercial_prices")
        .select("airport_key,car_price_net,bus_price_net")
        .eq("terms_id", terms.id)
    : { data: [] as any[] };

  const priceMap = Object.fromEntries(
    (prices ?? []).map((row: any) => [row.airport_key, row])
  );

  return (
    <main className="container">
      <h1>Dane firmy</h1>
      <CompanyNav />
      <div className="card" style={{ maxWidth: 900 }}>
        <span className="badge">B2B PRO</span>
        <h2>Twoje warunki</h2>
        <div className="b2b-vat-note">
          Wszystkie ceny B2B są cenami <strong>NETTO</strong>. Do ceny doliczany jest <strong>VAT 8%</strong>.
        </div>
        <div className="detail-list">
          <div><span>Nazwa</span><strong>{company.name}</strong></div>
          <div><span>NIP</span><strong>{company.nip || "—"}</strong></div>
          <div><span>E-mail</span><strong>{company.email || "—"}</strong></div>
          <div><span>Telefon</span><strong>{company.phone || "—"}</strong></div>
          <div><span>Kontakt</span><strong>{company.contact_person || "—"}</strong></div>
          <div><span>Siedziba do kalkulacji km</span><strong>{terms?.headquarters_address || "—"}</strong></div>
          <div><span>Limit bez dopłaty</span><strong>{terms ? `${Number(terms.free_km).toFixed(1)} km` : "—"}</strong></div>
          <div><span>Dopłata ponad limit</span><strong>{terms ? `${Number(terms.extra_km_rate_net).toFixed(2)} zł netto/km` : "—"}</strong></div>
          <div><span>Termin płatności</span><strong>{terms?.payment_days ?? company.payment_days ?? 14} dni</strong></div>
          <div><span>Rabat</span><strong>{Number(terms?.discount_percent ?? company.discount_percent ?? 0).toFixed(1)}%</strong></div>
          <div><span>Cennik</span><strong>{terms?.use_custom_pricing ? "Indywidualny / mieszany" : "Standardowy MATT"}</strong></div>
          <div><span>Warunki ważne od</span><strong>{terms?.effective_from || "—"}</strong></div>
          <div><span>Twoja rola</span><strong>{membership.role}</strong></div>
        </div>

        <h2 style={{ marginTop: 24 }}>Cennik obowiązujący</h2>
        <div className="company-bookings-table">
          <table className="table">
            <thead>
              <tr><th>Lotnisko</th><th>Samochód netto</th><th>Bus netto</th></tr>
            </thead>
            <tbody>
              {Object.entries(PRICES).map(([key, standard]) => {
                const row = priceMap[key];
                const car = terms?.use_custom_pricing && row?.car_price_net !== null && row?.car_price_net !== undefined
                  ? Number(row.car_price_net)
                  : standard.car;
                const bus = terms?.use_custom_pricing && row?.bus_price_net !== null && row?.bus_price_net !== undefined
                  ? Number(row.bus_price_net)
                  : standard.bus;
                return (
                  <tr key={key}>
                    <td>{standard.label}</td>
                    <td>{car.toFixed(2)} zł</td>
                    <td>{bus.toFixed(2)} zł</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted">Ceny dotyczą przejazdu w jedną stronę i są cenami netto. W obie strony system nalicza 2× cenę oraz 2× ewentualną dopłatę za km.</p>
      </div>
    </main>
  );
}
