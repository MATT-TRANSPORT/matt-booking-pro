import CompanyPaymentCell from "@/components/CompanyPaymentCell";
import CompanyNav from "@/components/CompanyNav";
import {companyClient} from "@/lib/company";
import {statusPl} from "@/lib/status";

export default async function Page(){
  const {s,company}=await companyClient();
  const monthStart=new Date();monthStart.setDate(1);

  const today=new Date().toISOString().slice(0,10);
  const [{data:all},{data:monthRows},{data:terms}]=await Promise.all([
    s.from("bookings").select("*").eq("company_id",company.id).order("created_at",{ascending:false}).limit(100),
    s.from("bookings").select("total_price,b2b_net,b2b_gross,status").eq("company_id",company.id).gte("travel_date",monthStart.toISOString().slice(0,10)).neq("status","cancelled"),
    s.from("company_commercial_terms").select("payment_days").eq("company_id",company.id).eq("active",true).lte("effective_from",today).order("effective_from",{ascending:false}).order("created_at",{ascending:false}).limit(1).maybeSingle()
  ]);

  const rows=all??[];
  const valueNet=(monthRows??[]).reduce((a:number,x:any)=>a+Number(x.b2b_net ?? x.total_price ?? 0),0);
  const valueGross=(monthRows??[]).reduce((a:number,x:any)=>a+Number(x.b2b_gross ?? x.total_price ?? 0),0);
  const active=rows.filter((x:any)=>["pending","confirmed","assigned","in_progress","arrived","picked_up"].includes(String(x.status).toLowerCase())).length;

  return <main className="container">
    <span className="badge">MATT BOOKING PRO ENTERPRISE</span>
    <h1>{company.name}</h1>
    <CompanyNav/>

    <div className="stats">
      <div className="stat"><strong>{active}</strong><span>Aktywne</span></div>
      <div className="stat"><strong>{rows.length}</strong><span>Rezerwacje</span></div>
      <div className="stat"><strong>{valueNet.toFixed(0)} zł</strong><span>Miesiąc netto</span></div>
      <div className="stat"><strong>{valueGross.toFixed(0)} zł</strong><span>Miesiąc brutto</span></div>
      <div className="stat"><strong>{terms?.payment_days ?? company.payment_days ?? 14} dni</strong><span>Termin płatności</span></div>
    </div>

    <div className="card">
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
              <th>Płatność</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b:any)=><tr key={b.id}>
              <td><a href={`/firma/rezerwacje/${b.id}`}><strong>{b.booking_number}</strong></a></td>
              <td>{b.travel_date}<br/>{b.travel_time}</td>
              <td>{b.customer_name}</td>
              <td className="company-route-cell">{b.pickup_address} → {b.airport_label}</td>
              <td><CompanyPaymentCell booking={b}/></td>
              <td><span className={`status ${String(b.status).toLowerCase()}`}>{statusPl(b.status)}</span></td>
            </tr>)}
          </tbody>
        </table>
      </div>

      <div className="company-bookings-cards">
        {rows.map((b:any)=><article className="company-booking-card" key={b.id}>
          <div className="company-card-head">
            <a href={`/firma/rezerwacje/${b.id}`}><strong>{b.booking_number}</strong></a>
            <span className={`status ${String(b.status).toLowerCase()}`}>{statusPl(b.status)}</span>
          </div>
          <div className="company-card-data">
            <div><span>Pasażer</span><strong>{b.customer_name}</strong></div>
            <div><span>Termin</span><strong>{b.travel_date} {b.travel_time}</strong></div>
            <div className="wide"><span>Trasa</span><strong>{b.pickup_address} → {b.airport_label}</strong></div>
            <div className="wide"><span>Płatność</span><CompanyPaymentCell booking={b}/></div>
          </div>
          <a className="company-card-open" href={`/firma/rezerwacje/${b.id}`}>OTWÓRZ REZERWACJĘ →</a>
        </article>)}
      </div>
    </div>
  </main>
}
