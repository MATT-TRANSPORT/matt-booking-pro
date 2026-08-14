import PanelNav from "@/components/PanelNav";
import {panelClient} from "@/lib/panel";
import {statusPl} from "@/lib/status";

export default async function Page({searchParams}:{searchParams:Promise<{q?:string}>}){
  const {q=""}=await searchParams; const {s}=await panelClient();
  let query=s.from("bookings").select("*,drivers(full_name,color)").order("created_at",{ascending:false}).limit(300);
  if(q.trim()) query=query.or(`booking_number.ilike.%${q}%,customer_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  const {data}=await query;
  return <main className="container"><h1>Archiwum rezerwacji</h1><PanelNav/>
    <form className="archive-search"><input name="q" defaultValue={q} placeholder="Numer, nazwisko, telefon lub e-mail"/><button className="btn">SZUKAJ</button></form>
    <div className="desktop-table card"><table className="table"><thead><tr><th>Numer</th><th>Termin</th><th>Klient</th><th>Cena</th><th>Status</th></tr></thead><tbody>
      {(data??[]).map((b:any)=><tr key={b.id}><td><a className="booking-number-link" href={`/panel/rezerwacje/${b.id}`}>{b.booking_number}</a></td><td>{b.travel_date}<br/>{b.travel_time}</td><td>{b.customer_name}<br/>{b.phone}</td><td>{Number(b.total_price).toFixed(2)} zł</td><td>{b.driver_id&&<span className="driver-color-badge" style={{borderColor:(Array.isArray(b.drivers)?b.drivers[0]:b.drivers)?.color||"#D6AD55"}}><i style={{background:(Array.isArray(b.drivers)?b.drivers[0]:b.drivers)?.color||"#D6AD55"}}/>{(Array.isArray(b.drivers)?b.drivers[0]:b.drivers)?.full_name}</span>}<br/>{statusPl(b.status)}</td></tr>)}
    </tbody></table></div>
    <div className="mobile-card-list">{(data??[]).map((b:any)=><a className="mobile-data-card" href={`/panel/rezerwacje/${b.id}`} key={b.id}><strong>{b.booking_number}</strong><span>{b.customer_name}</span><span>{b.travel_date} {b.travel_time}</span><span>{statusPl(b.status)} · {Number(b.total_price).toFixed(2)} zł</span></a>)}</div>
  </main>
}
