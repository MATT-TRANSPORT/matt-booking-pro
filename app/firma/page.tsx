import CompanyPaymentCell from "@/components/CompanyPaymentCell";
import CompanyNav from "@/components/CompanyNav";
import CompanyTermsSummaryCard from "@/components/CompanyTermsSummaryCard";
import { companyClient } from "@/lib/company";
import { companyBookingMoney, companyRouteLabel } from "@/lib/companyPortal";
import { statusPl } from "@/lib/status";

export default async function Page() {
  const { s, company } = await companyClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: all },
    { data: monthRows },
    { data: allTerms }
  ] = await Promise.all([
    s.from("bookings").select("*").eq("company_id", company.id).order("created_at", { ascending: false }).limit(100),
    s.from("bookings").select("total_price,price_net,vat_price,price_gross,vat_rate,status").eq("company_id", company.id).gte("travel_date", monthStart.toISOString().slice(0, 10)).neq("status", "cancelled"),
    s.from("company_pricing_terms").select("*").eq("company_id", company.id).eq("active", true).order("effective_from", { ascending: false }).order("created_at", { ascending: false })
  ]);

  const rows = all ?? [];
  const financials = (monthRows ?? []).reduce(
    (acc: any, row: any) => {
      const money = companyBookingMoney(row);
      acc.net += money.net;
      acc.vat += money.vat;
      acc.gross += money.gross;
      return acc;
    },
    { net: 0, vat: 0, gross: 0 }
  );
  const active = rows.filter((x: any) => ["pending", "confirmed", "assigned", "in_progress", "arrived", "picked_up"].includes(String(x.status).toLowerCase())).length;
  const termsRows = allTerms ?? [];
  const currentTerms = termsRows.find((x: any) => x.effective_from <= today) ?? null;
  const nextTerms = termsRows
    .filter((x: any) => x.effective_from > today)
    .sort((a: any, b: any) => String(a.effective_from).localeCompare(String(b.effective_from)))[0] ?? null;

  return <main className="container">
    <span className="badge">MATT BOOKING PRO · B2B PRO</span>
    <h1>{company.name}</h1>
    <CompanyNav />

    <div className="stats company-stats-pro">
      <div className="stat"><strong>{active}</strong><span>Aktywne</span></div>
      <div className="stat"><strong>{rows.length}</strong><span>Rezerwacje</span></div>
      <div className="stat"><strong>{financials.net.toFixed(0)} zł</strong><span>Miesiąc netto</span></div>
      <div className="stat"><strong>{financials.vat.toFixed(0)} zł</strong><span>VAT 8%</span></div>
      <div className="stat"><strong>{financials.gross.toFixed(0)} zł</strong><span>Miesiąc brutto</span></div>
      <div className="stat"><strong>{currentTerms?.payment_days ?? company.payment_days ?? 14} dni</strong><span>Termin płatności</span></div>
    </div>

    <div style={{ marginTop: 18 }}>
      <CompanyTermsSummaryCard
        companyName={company.name}
        terms={currentTerms}
        nextTerms={nextTerms}
        compact
      />
    </div>

    <div className="card" style={{ marginTop: 18 }}>
      <div className="company-section-head">
        <div>
          <h2>Rezerwacje firmy</h2>
          <p className="muted">Najnowsze zgłoszenia na górze.</p>
        </div>
        <a className="btn" href="/firma/nowa-rezerwacja">+ ZAMÓW TRANSPORT</a>
      </div>

      <div className="company-bookings-table">
        <table className="table company-table">
          <thead>
            <tr>
              <th>Numer</th>
              <th>Termin</th>
              <th>Pasażer</th>
              <th>Trasa</th>
              <th>Netto</th>
              <th>Płatność</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b: any) => {
              const money = companyBookingMoney(b);
              return <tr key={b.id}>
                <td><a href={`/firma/rezerwacje/${b.id}`}><strong>{b.booking_number}</strong></a></td>
                <td>{b.travel_date}<br />{b.travel_time}</td>
                <td>{b.customer_name}</td>
                <td className="company-route-cell">{companyRouteLabel(b)}</td>
                <td>{money.net.toFixed(2)} zł</td>
                <td><CompanyPaymentCell booking={b} /></td>
                <td><span className={`status ${String(b.status).toLowerCase()}`}>{statusPl(b.status)}</span></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      <div className="company-bookings-cards">
        {rows.map((b: any) => {
          const money = companyBookingMoney(b);
          return <article className="company-booking-card" key={b.id}>
            <div className="company-card-head">
              <a href={`/firma/rezerwacje/${b.id}`}><strong>{b.booking_number}</strong></a>
              <span className={`status ${String(b.status).toLowerCase()}`}>{statusPl(b.status)}</span>
            </div>
            <div className="company-card-data">
              <div><span>Pasażer</span><strong>{b.customer_name}</strong></div>
              <div><span>Termin</span><strong>{b.travel_date} {b.travel_time}</strong></div>
              <div className="wide"><span>Trasa</span><strong>{companyRouteLabel(b)}</strong></div>
              <div><span>Netto</span><strong>{money.net.toFixed(2)} zł</strong></div>
              <div><span>Brutto</span><strong>{money.gross.toFixed(2)} zł</strong></div>
              <div className="wide"><span>Płatność</span><CompanyPaymentCell booking={b} /></div>
            </div>
            <a className="company-card-open" href={`/firma/rezerwacje/${b.id}`}>OTWÓRZ REZERWACJĘ →</a>
          </article>;
        })}
      </div>
    </div>
  </main>;
}
