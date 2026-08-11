import CompanyNav from "@/components/CompanyNav";
import { companyClient } from "@/lib/company";

export default async function Page() {
  const { s, company } = await companyClient();
  const today = new Date().toISOString().slice(0,10);
  const monthStart = new Date(); monthStart.setDate(1);
  const monthStartIso = monthStart.toISOString().slice(0,10);

  const [{count:active},{count:month},{data:rows},{data:upcoming}] = await Promise.all([
    s.from("bookings").select("*",{count:"exact",head:true}).eq("company_id",company.id).in("status",["pending","confirmed","assigned","in_progress","picked_up"]),
    s.from("bookings").select("*",{count:"exact",head:true}).eq("company_id",company.id).gte("travel_date",monthStartIso),
    s.from("bookings").select("total_price,status").eq("company_id",company.id).gte("travel_date",monthStartIso).neq("status","cancelled"),
    s.from("bookings").select("*").eq("company_id",company.id).gte("travel_date",today).order("travel_date").order("travel_time").limit(8)
  ]);
  const value=(rows??[]).reduce((a:number,x:any)=>a+Number(x.total_price||0),0);

  return <main className="container">
    <span className="badge">MATT BOOKING PRO ENTERPRISE</span><h1>{company.name}</h1><CompanyNav/>
    <div className="stats">
      <div className="stat"><strong>{active??0}</strong><span>Aktywne rezerwacje</span></div>
      <div className="stat"><strong>{month??0}</strong><span>Kursy w tym miesiącu</span></div>
      <div className="stat"><strong>{value.toFixed(0)} zł</strong><span>Wartość miesiąca</span></div>
      <div className="stat"><strong>{company.payment_days??14} dni</strong><span>Termin płatności</span></div>
    </div>
    <div className="card">
      <div className="company-section-head"><div><h2>Najbliższe przejazdy</h2><p className="muted">Rezerwacje Twojej firmy.</p></div><a className="btn" href="/firma/nowa-rezerwacja">+ ZAMÓW TRANSPORT</a></div>
      <table className="table"><thead><tr><th>Numer</th><th>Termin</th><th>Pasażer</th><th>Trasa</th><th>Status</th></tr></thead>
      <tbody>{(upcoming??[]).map((b:any)=><tr key={b.id}><td><a href={`/firma/rezerwacje/${b.id}`}><strong>{b.booking_number}</strong></a></td><td>{b.travel_date} {b.travel_time}</td><td>{b.customer_name}</td><td>{b.pickup_address} → {b.airport_label}</td><td><span className={`status ${b.status}`}>{b.status}</span></td></tr>)}</tbody></table>
    </div>
  </main>;
}
