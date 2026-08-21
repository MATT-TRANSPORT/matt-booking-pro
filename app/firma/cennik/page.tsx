import CompanyNav from "@/components/CompanyNav";
import CompanyTermsSummaryCard from "@/components/CompanyTermsSummaryCard";
import { companyClient } from "@/lib/company";
import { PRICES } from "@/lib/pricing";

function money(value: unknown) {
  return Number(value ?? 0).toFixed(2);
}

export default async function Page() {
  const { s, company } = await companyClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: allTerms } = await s
    .from("company_pricing_terms")
    .select("*")
    .eq("company_id", company.id)
    .eq("active", true)
    .order("effective_from", { ascending: false })
    .order("created_at", { ascending: false });

  const termsRows = allTerms ?? [];
  const current = termsRows.find((x: any) => x.effective_from <= today) ?? null;
  const futureRows = termsRows
    .filter((x: any) => x.effective_from > today)
    .sort((a: any, b: any) => String(a.effective_from).localeCompare(String(b.effective_from)));
  const nextTerms = futureRows[0] ?? null;

  let airportRows: any[] = [];
  if (current?.id) {
    const { data } = await s
      .from("company_pricing_airport_prices")
      .select("*")
      .eq("terms_id", current.id);
    airportRows = data ?? [];
  }

  const customByAirport = new Map(
    airportRows.map((row: any) => [row.airport_key, row])
  );

  const priceRows = Object.entries(PRICES).map(([key, standard]) => {
    const custom = customByAirport.get(key) as any;
    const customEnabled = Boolean(current?.use_custom_pricing);
    const hasCar = customEnabled && custom?.car_price_net !== null && custom?.car_price_net !== undefined;
    const hasBus = customEnabled && custom?.bus_price_net !== null && custom?.bus_price_net !== undefined;
    const car = hasCar ? Number(custom.car_price_net) : Number(standard.car);
    const bus = hasBus ? Number(custom.bus_price_net) : Number(standard.bus);

    return {
      key,
      label: standard.label,
      car,
      bus,
      carCustom: hasCar,
      busCustom: hasBus
    };
  });

  return (
    <main className="container">
      <span className="badge">MATT BOOKING PRO · B2B PRO</span>
      <h1>Cennik i warunki handlowe</h1>
      <CompanyNav />

      <CompanyTermsSummaryCard
        companyName={company.name}
        terms={current}
        nextTerms={nextTerms}
      />

      <div className="card" style={{ marginTop: 18 }}>
        <div className="company-section-head">
          <div>
            <span className="badge">CENY NETTO</span>
            <h2>Transfery lotniskowe</h2>
            <p className="muted">
              Cena bazowa za przejazd w jedną stronę. W obie strony system liczy 2× cenę bazową oraz 2× ewentualną dopłatę za kilometry.
            </p>
          </div>
          <a className="btn" href="/firma/nowa-rezerwacja">+ ZAMÓW TRANSPORT</a>
        </div>

        <div className="company-bookings-table">
          <table className="table b2b-price-table">
            <thead>
              <tr>
                <th>Lotnisko</th>
                <th>Samochód NETTO</th>
                <th>Samochód BRUTTO</th>
                <th>Bus NETTO</th>
                <th>Bus BRUTTO</th>
              </tr>
            </thead>
            <tbody>
              {priceRows.map((row) => (
                <tr key={row.key}>
                  <td><strong>{row.label}</strong></td>
                  <td>
                    <strong>{money(row.car)} zł</strong>
                    <small className={`pricing-source-tag ${row.carCustom ? "custom" : "standard"}`}>
                      {row.carCustom ? "INDYWIDUALNA" : "STANDARD MATT"}
                    </small>
                  </td>
                  <td>{money(row.car * 1.08)} zł</td>
                  <td>
                    <strong>{money(row.bus)} zł</strong>
                    <small className={`pricing-source-tag ${row.busCustom ? "custom" : "standard"}`}>
                      {row.busCustom ? "INDYWIDUALNA" : "STANDARD MATT"}
                    </small>
                  </td>
                  <td>{money(row.bus * 1.08)} zł</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="b2b-price-cards">
          {priceRows.map((row) => (
            <article className="b2b-price-card" key={row.key}>
              <h3>{row.label}</h3>
              <div className="b2b-price-card-grid">
                <div>
                  <span>Samochód</span>
                  <strong>{money(row.car)} zł netto</strong>
                  <small>{money(row.car * 1.08)} zł brutto</small>
                  <em className={`pricing-source-tag ${row.carCustom ? "custom" : "standard"}`}>
                    {row.carCustom ? "INDYWIDUALNA" : "STANDARD MATT"}
                  </em>
                </div>
                <div>
                  <span>Bus</span>
                  <strong>{money(row.bus)} zł netto</strong>
                  <small>{money(row.bus * 1.08)} zł brutto</small>
                  <em className={`pricing-source-tag ${row.busCustom ? "custom" : "standard"}`}>
                    {row.busCustom ? "INDYWIDUALNA" : "STANDARD MATT"}
                  </em>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="b2b-pricing-explainer">
          <h3>Jak liczona jest cena?</h3>
          <p>
            System mierzy najkrótszą trasę samochodową od siedziby kontrahenta do adresu pasażera. Kilometry mieszczące się w limicie są bez dopłaty. Nadwyżka jest mnożona przez stawkę netto za kilometr i dodawana do ceny bazowej transferu.
          </p>
          <strong>
            Cena końcowa = cena bazowa NETTO + dopłata za km NETTO + VAT 8%.
          </strong>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Historia warunków</h2>
        <p className="muted">
          Każda rezerwacja zachowuje snapshot warunków obowiązujących w chwili wyceny. Późniejsza zmiana cennika nie zmienia ceny starego kursu.
        </p>
        <div className="b2b-terms-history">
          {termsRows.map((row: any) => (
            <div key={row.id}>
              <span>{row.effective_from > today ? "Zaplanowane" : row.id === current?.id ? "Aktualne" : "Historyczne"}</span>
              <strong>od {row.effective_from}</strong>
              <small>
                {Number(row.free_km ?? 0).toFixed(1)} km bez dopłaty · {Number(row.extra_km_rate_net ?? 0).toFixed(2)} zł netto/km · {row.use_custom_pricing ? "cennik indywidualny" : "cennik standardowy"}
              </small>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
