import CompanyPaymentCell from "@/components/CompanyPaymentCell";
import CompanyNav from "@/components/CompanyNav";
import { companyClient } from "@/lib/company";
import {
  companyBookingMoney,
  companyBookingScheduleInfo,
  companyRouteLabel,
  companyWarsawNowKey,
  sortCompanyBookings
} from "@/lib/companyPortal";
import { statusPl } from "@/lib/status";

export default async function Page() {
  const { s, company } = await companyClient();
  const { data } = await s
    .from("bookings")
    .select("*")
    .eq("company_id", company.id)
    .order("travel_date", { ascending: true })
    .limit(500);

  const nowKey = companyWarsawNowKey();
  const rows = sortCompanyBookings(data ?? [], nowKey);
  const activeRows = rows.filter((booking: any) => !companyBookingScheduleInfo(booking, nowKey).archived);
  const archiveRows = rows.filter((booking: any) => companyBookingScheduleInfo(booking, nowKey).archived);

  const bookingRow = (b: any, archived = false) => {
    const money = companyBookingMoney(b);
    return (
      <tr key={b.id} className={archived ? "company-booking-row-archive" : undefined}>
        <td><a href={`/firma/rezerwacje/${b.id}`}><strong>{b.booking_number}</strong></a></td>
        <td>{b.travel_date}<br />{String(b.travel_time || "").slice(0, 5)}</td>
        <td>{b.customer_name}</td>
        <td className="company-route-cell">{companyRouteLabel(b)}</td>
        <td>{money.net.toFixed(2)} zł</td>
        <td><CompanyPaymentCell booking={b} /></td>
        <td><span className={`status ${String(b.status).toLowerCase()}`}>{statusPl(b.status)}</span></td>
      </tr>
    );
  };

  const bookingCard = (b: any, archived = false) => {
    const money = companyBookingMoney(b);
    const schedule = companyBookingScheduleInfo(b, nowKey);
    return (
      <article className={`company-booking-card${archived ? " company-booking-card-archive" : ""}`} key={b.id}>
        <div className="company-card-head">
          <a href={`/firma/rezerwacje/${b.id}`}><strong>{b.booking_number}</strong></a>
          <span className={`status ${String(b.status).toLowerCase()}`}>{statusPl(b.status)}</span>
        </div>
        <div className="company-card-data">
          <div><span>Pasażer</span><strong>{b.customer_name}</strong></div>
          <div><span>Termin</span><strong>{b.travel_date} {String(b.travel_time || "").slice(0, 5)}</strong></div>
          <div className="wide"><span>Trasa</span><strong>{companyRouteLabel(b)}</strong></div>
          <div><span>Netto</span><strong>{money.net.toFixed(2)} zł</strong></div>
          <div><span>Brutto</span><strong>{money.gross.toFixed(2)} zł</strong></div>
          <div className="wide"><span>Płatność</span><CompanyPaymentCell booking={b} /></div>
        </div>
        {schedule.reason === "expired" && <div className="company-expired-note">Termin przejazdu minął</div>}
        <a className="company-card-open" href={`/firma/rezerwacje/${b.id}`}>OTWÓRZ REZERWACJĘ →</a>
      </article>
    );
  };

  return <main className="container">
    <span className="badge">MATT BOOKING PRO · B2B PRO</span>
    <h1>{company.name}</h1>
    <CompanyNav />

    <div className="card company-dashboard-transport-card">
      <div className="company-section-head">
        <div>
          <span className="badge">ZAMÓWIONE TRANSPORTY</span>
          <h2>Nadchodzące i aktywne</h2>
          <p className="muted">Najbliższy termin jest zawsze najwyżej. Zrealizowane i minione przejazdy automatycznie trafiają na dół.</p>
        </div>
        <a className="btn" href="/firma/nowa-rezerwacja">+ ZAMÓW TRANSPORT</a>
      </div>

      {!rows.length ? (
        <div className="company-dashboard-empty">
          <strong>Brak zamówionych transportów.</strong>
          <span>Nową rezerwację możesz utworzyć przyciskiem powyżej.</span>
        </div>
      ) : (
        <>
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
                {activeRows.map((b: any) => bookingRow(b))}
                {archiveRows.length > 0 && (
                  <tr className="company-booking-archive-divider">
                    <td colSpan={7}>Zrealizowane / termin minął</td>
                  </tr>
                )}
                {archiveRows.map((b: any) => bookingRow(b, true))}
              </tbody>
            </table>
          </div>

          <div className="company-bookings-cards">
            {activeRows.map((b: any) => bookingCard(b))}
            {archiveRows.length > 0 && <div className="company-booking-cards-divider">Zrealizowane / termin minął</div>}
            {archiveRows.map((b: any) => bookingCard(b, true))}
          </div>
        </>
      )}
    </div>
  </main>;
}
