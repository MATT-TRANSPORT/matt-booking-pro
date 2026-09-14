import CompanyNav from "@/components/CompanyNav";
import CompanyPaymentCell from "@/components/CompanyPaymentCell";
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
  const { s, company, membership } = await companyClient();
  const canPayOnline = ["admin", "manager", "accounting"].includes(String(membership.role || ""));
  const [{ data }, { data: documents }] = await Promise.all([
    s
      .from("bookings")
      .select("*")
      .eq("company_id", company.id)
      .order("travel_date", { ascending: true })
      .limit(500),
    s
      .from("company_booking_documents")
      .select("booking_id,document_type")
      .eq("company_id", company.id)
  ]);

  const nowKey = companyWarsawNowKey();
  const rows = sortCompanyBookings(data ?? [], nowKey);
  const activeRows = rows.filter((booking: any) => !companyBookingScheduleInfo(booking, nowKey).archived);
  const archiveRows = rows.filter((booking: any) => companyBookingScheduleInfo(booking, nowKey).archived);

  const docMap = new Map<string, { count: number; invoice: boolean }>();
  for (const doc of documents ?? []) {
    const current = docMap.get(doc.booking_id) ?? { count: 0, invoice: false };
    current.count += 1;
    if (doc.document_type === "invoice") current.invoice = true;
    docMap.set(doc.booking_id, current);
  }

  const bookingRow = (b: any, archived = false) => {
    const money = companyBookingMoney(b);
    const docs = docMap.get(b.id);
    return (
      <tr key={b.id} className={archived ? "company-booking-row-archive" : undefined}>
        <td><a href={`/firma/rezerwacje/${b.id}`}><strong>{b.booking_number}</strong></a></td>
        <td>{b.customer_name}</td>
        <td>{b.travel_date}<br />{String(b.travel_time || "").slice(0, 5)}</td>
        <td className="company-route-cell">{companyRouteLabel(b)}</td>
        <td>{money.net.toFixed(2)} zł</td>
        <td>{money.gross.toFixed(2)} zł</td>
        <td>{docs ? <span className={`document-status ${docs.invoice ? "invoice" : "other"}`}>{docs.invoice ? "FAKTURA" : "DOKUMENT"} · {docs.count}</span> : <span className="muted">—</span>}</td>
        <td><CompanyPaymentCell booking={b} canPay={canPayOnline} /></td>
        <td><span className={`status ${String(b.status).toLowerCase()}`}>{statusPl(b.status)}</span></td>
      </tr>
    );
  };

  const bookingCard = (b: any, archived = false) => {
    const money = companyBookingMoney(b);
    const docs = docMap.get(b.id);
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
          <div><span>Dokument</span><strong>{docs ? `${docs.invoice ? "Faktura" : "Dokument"} · ${docs.count}` : "—"}</strong></div>
          <div className="wide"><span>Płatność</span><CompanyPaymentCell booking={b} canPay={canPayOnline} /></div>
        </div>
        {schedule.reason === "expired" && <div className="company-expired-note">Termin przejazdu minął</div>}
        <a className="company-card-open" href={`/firma/rezerwacje/${b.id}`}>OTWÓRZ REZERWACJĘ →</a>
      </article>
    );
  };

  return (
    <main className="container">
      <h1>Rezerwacje firmy</h1>
      <CompanyNav />

      <div className="card">
        <div className="company-section-head">
          <div>
            <span className="badge">NETTO + VAT 8%</span>
            <h2>Historia przejazdów</h2>
            <p className="muted">Najbliższy aktywny termin jest zawsze najwyżej. Historia znajduje się pod separatorem na dole.</p>
          </div>
          <a className="btn" href="/firma/nowa-rezerwacja">+ NOWA REZERWACJA</a>
        </div>

        <div className="company-bookings-table">
          <table className="table company-table b2b-bookings-pro-table">
            <thead>
              <tr><th>Numer</th><th>Pasażer</th><th>Termin</th><th>Trasa</th><th>Netto</th><th>Brutto</th><th>Dokument</th><th>Płatność</th><th>Status</th></tr>
            </thead>
            <tbody>
              {activeRows.map((b: any) => bookingRow(b))}
              {archiveRows.length > 0 && (
                <tr className="company-booking-archive-divider">
                  <td colSpan={9}>HISTORIA · ZAKOŃCZONE / ANULOWANE / TERMIN MINĄŁ</td>
                </tr>
              )}
              {archiveRows.map((b: any) => bookingRow(b, true))}
            </tbody>
          </table>
        </div>

        <div className="company-bookings-cards">
          {activeRows.map((b: any) => bookingCard(b))}
          {archiveRows.length > 0 && (
            <div className="company-booking-cards-divider">HISTORIA · ZAKOŃCZONE / ANULOWANE / TERMIN MINĄŁ</div>
          )}
          {archiveRows.map((b: any) => bookingCard(b, true))}
        </div>
        <p className="muted" style={{ marginTop: 12 }}>Wszystkie ceny B2B są cenami netto. Do kwoty doliczany jest VAT 8%.</p>
      </div>
    </main>
  );
}
