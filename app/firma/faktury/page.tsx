import CompanyNav from "@/components/CompanyNav";
import { companyClient } from "@/lib/company";

function settlementStatusPl(value?:string|null){
  const map:Record<string,string>={
    draft:"Robocze",
    pending:"Oczekuje",
    open:"Otwarte",
    issued:"Wystawiona",
    paid:"Opłacona",
    settled:"Rozliczone",
    overdue:"Po terminie",
    cancelled:"Anulowane"
  };
  if(!value)return "—";
  return map[String(value).toLowerCase()]??value;
}

export default async function Page() {
  const { s, company } = await companyClient();

  const { data: settlements } = await s
    .from("company_settlements")
    .select("*")
    .eq("company_id", company.id)
    .order("period_month", { ascending: false });

  return (
    <main className="container">
      <h1>Rozliczenia</h1>
      <CompanyNav />

      <div className="card">
        <h2>Miesięczne rozliczenia</h2>
        <p className="muted">
          Faktury są wystawiane poza MATT Booking PRO. Tutaj znajdują się dokumenty przypisane do miesięcznych rozliczeń.
        </p>

        <table className="table">
          <thead>
            <tr>
              <th>Miesiąc</th>
              <th>Kwota</th>
              <th>Numer faktury</th>
              <th>Status</th>
              <th>Dokument</th>
            </tr>
          </thead>
          <tbody>
            {(settlements ?? []).map((x: any) => (
              <tr key={x.id}>
                <td>{String(x.period_month).slice(0,7)}</td>
                <td>{Number(x.amount).toFixed(2)} zł</td>
                <td>{x.invoice_number || "—"}</td>
                <td>{settlementStatusPl(x.status)}</td>
                <td>
                  {x.invoice_file_path ? (
                    <a className="btn secondary company-small-btn" href={`/api/company/settlements/${x.id}/download`}>
                      POBIERZ
                    </a>
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
