import CompanyNav from "@/components/CompanyNav";
import CompanyPaymentCell from "@/components/CompanyPaymentCell";
import {companyClient} from "@/lib/company";
import {statusPl} from "@/lib/status";

export default async function Page(){
  const {s,company}=await companyClient();
  const {data}=await s.from("bookings")
    .select("*")
    .eq("company_id",company.id)
    .order("created_at",{ascending:false})
    .limit(200);

  const rows=data??[];

  return <main className="container">
    <h1>Rezerwacje firmy</h1>
    <CompanyNav/>

    <div className="card">
      <div className="company-bookings-table">
        <table className="table company-table">
          <thead>
            <tr><th>Numer</th><th>Pasażer</th><th>Termin</th><th>Trasa</th><th>Netto / brutto</th><th>Płatność</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((b:any)=><tr key={b.id}>
              <td><a href={`/firma/rezerwacje/${b.id}`}><strong>{b.booking_number}</strong></a></td>
              <td>{b.customer_name}</td>
              <td>{b.travel_date}<br/>{b.travel_time}</td>
              <td className="company-route-cell">{b.pickup_address} → {b.airport_label}</td>
              <td>{b.b2b_net != null ? <><strong>{Number(b.b2b_net).toFixed(2)} zł netto</strong><br/><span className="muted">{Number(b.b2b_gross ?? b.total_price).toFixed(2)} zł brutto</span></> : <><strong>{Number(b.total_price).toFixed(2)} zł</strong><br/><span className="muted">kwota historyczna</span></>}</td>
              <td><CompanyPaymentCell booking={b}/></td>
              <td><span className={`status ${String(b.status).toLowerCase()}`}>{statusPl(b.status)}</span></td>
            </tr>)}
          </tbody>
        </table>
      </div>

      <div className="company-bookings-cards">
        {rows.map((b:any)=><a className="company-booking-card company-booking-card-link" href={`/firma/rezerwacje/${b.id}`} key={b.id}>
          <div className="company-card-head">
            <strong>{b.booking_number}</strong>
            <span className={`status ${String(b.status).toLowerCase()}`}>{statusPl(b.status)}</span>
          </div>
          <div className="company-card-data">
            <div><span>Pasażer</span><strong>{b.customer_name}</strong></div>
            <div><span>Termin</span><strong>{b.travel_date} {b.travel_time}</strong></div>
            <div className="wide"><span>Trasa</span><strong>{b.pickup_address} → {b.airport_label}</strong></div>
            {b.b2b_net != null ? <>
              <div><span>Netto</span><strong>{Number(b.b2b_net).toFixed(2)} zł</strong></div>
              <div><span>Brutto</span><strong>{Number(b.b2b_gross ?? b.total_price).toFixed(2)} zł</strong></div>
            </> : <div><span>Kwota historyczna</span><strong>{Number(b.total_price).toFixed(2)} zł</strong></div>}
            <div className="wide"><span>Płatność</span><CompanyPaymentCell booking={b}/></div>
          </div>
        </a>)}
      </div>
    </div>
  </main>
}
