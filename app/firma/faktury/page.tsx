import CompanyNav from "@/components/CompanyNav";
import { companyClient } from "@/lib/company";
import { companyBookingMoney, companyCurrentMonthRange } from "@/lib/companyPortal";

function settlementStatusPl(value?: string | null) {
  const map: Record<string, string> = {
    draft: "Robocze",
    pending: "Oczekuje",
    open: "Otwarte",
    issued: "Wystawiona",
    invoiced: "Zafakturowane",
    paid: "Opłacona",
    settled: "Rozliczone",
    overdue: "Po terminie",
    cancelled: "Anulowane"
  };
  if (!value) return "—";
  return map[String(value).toLowerCase()] ?? value;
}

const DOC_LABELS: Record<string, string> = {
  invoice: "Faktura",
  correction: "Korekta",
  payment_confirmation: "Potwierdzenie płatności",
  other: "Inny dokument"
};

export default async function Page() {
  const { s, company } = await companyClient();
  const month = companyCurrentMonthRange();

  const [{ data: settlements }, { data: documents }, { data: monthRows }] = await Promise.all([
    s
      .from("company_settlements")
      .select("*")
      .eq("company_id", company.id)
      .order("period_month", { ascending: false }),
    s
      .from("company_booking_documents")
      .select("*,bookings(booking_number,travel_date,customer_name)")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(100),
    s
      .from("bookings")
      .select("total_price,price_net,vat_price,price_gross,vat_rate,pricing_source,pricing_snapshot,base_price,extra_price,status,travel_date")
      .eq("company_id", company.id)
      .gte("travel_date", month.start)
      .lt("travel_date", month.end)
      .neq("status", "cancelled")
  ]);

  const monthSummary = (monthRows ?? []).reduce(
    (acc: { count: number; net: number; vat: number; gross: number }, booking: any) => {
      const money = companyBookingMoney(booking);
      acc.count += 1;
      acc.net += money.net;
      acc.vat += money.vat;
      acc.gross += money.gross;
      return acc;
    },
    { count: 0, net: 0, vat: 0, gross: 0 }
  );

  return (
    <main className="container">
      <h1>Rozliczenia</h1>
      <CompanyNav />

      <div className="card company-settlement-summary">
        <div className="company-section-head">
          <div>
            <span className="badge">BIEŻĄCY MIESIĄC</span>
            <h2>Podsumowanie transportów i kosztów</h2>
            <p className="muted">Podsumowanie obejmuje wyłącznie nieanulowane transporty z bieżącego miesiąca.</p>
          </div>
        </div>
        <div className="stats company-stats-pro company-settlement-stats">
          <div className="stat"><strong>{monthSummary.count}</strong><span>Transporty</span></div>
          <div className="stat"><strong>{monthSummary.net.toFixed(2)} zł</strong><span>Netto</span></div>
          <div className="stat"><strong>{monthSummary.vat.toFixed(2)} zł</strong><span>VAT</span></div>
          <div className="stat"><strong>{monthSummary.gross.toFixed(2)} zł</strong><span>Brutto</span></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <span className="badge">B2B PRO</span>
        <h2>Dokumenty przy rezerwacjach</h2>
        <p className="muted">
          Tutaj widzisz faktury, korekty i inne dokumenty przypisane bezpośrednio do pojedynczych przejazdów.
        </p>
        {!documents?.length ? (
          <p className="muted">Brak dokumentów przypisanych do rezerwacji.</p>
        ) : (
          <div className="company-bookings-table">
            <table className="table">
              <thead>
                <tr><th>Rezerwacja</th><th>Data kursu</th><th>Pasażer</th><th>Typ</th><th>Numer</th><th>Plik</th></tr>
              </thead>
              <tbody>
                {documents.map((doc: any) => {
                  const b = Array.isArray(doc.bookings) ? doc.bookings[0] : doc.bookings;
                  return (
                    <tr key={doc.id}>
                      <td>{b?.booking_number || "—"}</td>
                      <td>{b?.travel_date || "—"}</td>
                      <td>{b?.customer_name || "—"}</td>
                      <td>{DOC_LABELS[doc.document_type] || "Dokument"}</td>
                      <td>{doc.document_number || "—"}</td>
                      <td>
                        <a className="btn secondary company-small-btn" href={`/api/booking-documents/${doc.id}/download`} target="_blank" rel="noreferrer">
                          OTWÓRZ
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Miesięczne rozliczenia</h2>
        <p className="muted">
          Faktury są wystawiane poza MATT Booking PRO. Tutaj pozostają dokumenty przypisane do zbiorczych rozliczeń miesięcznych.
        </p>

        <table className="table">
          <thead>
            <tr><th>Miesiąc</th><th>Kwota</th><th>Numer faktury</th><th>Status</th><th>Dokument</th></tr>
          </thead>
          <tbody>
            {(settlements ?? []).map((x: any) => (
              <tr key={x.id}>
                <td>{String(x.period_month).slice(0, 7)}</td>
                <td>{Number(x.amount).toFixed(2)} zł</td>
                <td>{x.invoice_number || "—"}</td>
                <td>{settlementStatusPl(x.status)}</td>
                <td>
                  {x.invoice_file_path ? (
                    <a className="btn secondary company-small-btn" href={`/api/company/settlements/${x.id}/download`}>POBIERZ</a>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
