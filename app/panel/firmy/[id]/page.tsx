import PortalAccessButton from "@/components/PortalAccessButton";
import CompanyTermsEditor from "@/components/CompanyTermsEditor";
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
    { data: settlements }
  ] = await Promise.all([
    s.from("companies").select("*").eq("id", id).single(),
    s.from("company_employees").select("*").eq("company_id", id).order("last_name"),
    s.from("bookings").select("*").eq("company_id", id).order("created_at", { ascending: false }).limit(200),
    s.from("company_users").select("id,user_id,role,active").eq("company_id", id),
    s.from("company_settlements").select("*").eq("company_id", id).order("period_month", { ascending: false })
  ]);

  if (!company) notFound();

  const total = (bookings ?? []).reduce(
    (sum: number, b: any) => sum + Number(b.total_price || 0),
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
        <div className="stat"><strong>{total.toFixed(0)} zł</strong><span>Łączna wartość</span></div>
        <div className="stat"><strong>{users?.length ?? 0}</strong><span>Konta portalowe</span></div>
      </div>

      <div className="reservation-detail-grid"><CompanyTermsEditor company={company} />
        <div className="card">
          <h2>Dane firmy</h2>
          <div className="detail-list">
            <div><span>NIP</span><strong>{company.nip || "—"}</strong></div>
            <div><span>E-mail</span><strong>{company.email || "—"}</strong></div>
            <div><span>Telefon</span><strong>{company.phone || "—"}</strong></div>
            <div><span>Kontakt</span><strong>{company.contact_person || "—"}</strong></div>
            <div><span>Termin płatności</span><strong>{company.payment_days} dni</strong></div>
            <div><span>Rabat</span><strong>{company.discount_percent}%</strong></div><div><span>Dostęp B2B</span><strong>{(users?.length??0)>0?"Konto aktywne":"Brak konta"}</strong></div>
          </div><PortalAccessButton type="company" id={company.id} active={(users?.length??0)>0}/>
        </div>

        <SettlementUpload companyId={company.id} />
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
                <td>{String(x.period_month).slice(0,7)}</td>
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
            <tr><th>Typ</th><th>Numer</th><th>Pasażer</th><th>Termin</th><th>Kwota</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(bookings ?? []).slice(0,50).map((b: any) => (
              <tr key={b.id}>
                <td><span className="origin-badge b2b">🏢 B2B</span></td>
                <td><a href={`/panel/rezerwacje/${b.id}`}>{b.booking_number}</a></td>
                <td>{b.customer_name}</td>
                <td>{b.travel_date} {b.travel_time}</td>
                <td>{Number(b.total_price).toFixed(2)} zł</td>
                <td>{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
