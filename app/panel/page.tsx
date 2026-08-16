import PanelNav from "@/components/PanelNav";
import EmailTestButton from "@/components/EmailTestButton";
import {panelClient} from "@/lib/panel";
import {statusPl} from "@/lib/status";

export default async function PanelPage(){
  const {s}=await panelClient();
  const today=new Date().toISOString().slice(0,10);

  const [{count:pending},{count:todayCount},{count:b2bPending},{data:bookings},{data:weddings}] = await Promise.all([
    s.from("bookings").select("*",{count:"exact",head:true}).eq("status","pending"),
    s.from("bookings").select("*",{count:"exact",head:true}).eq("travel_date",today),
    s.from("bookings").select("*",{count:"exact",head:true}).not("company_id","is",null).in("status",["pending","confirmed","assigned"]),
    s.from("bookings").select("*,companies(name),drivers(full_name,color)").order("created_at",{ascending:false}).limit(30),
    s.from("wedding_bookings").select("*").order("created_at",{ascending:false}).limit(15)
  ]);

  const upcoming=(bookings??[]).filter((b:any)=>!["completed","cancelled"].includes(b.status));
  const alertUnassigned=upcoming.filter((b:any)=>!b.driver_id||!b.vehicle_id).length;
  const alertPayment=upcoming.filter((b:any)=>b.payment_method==="employee_payment"&&!b.payment_link).length;
  const alertChanged=upcoming.filter((b:any)=>b.status==="pending"&&b.customer_last_edited_at).length;

  const feed=[
    ...(bookings??[]).map((b:any)=>({kind:"airport",created_at:b.created_at,data:b})),
    ...(weddings??[]).map((b:any)=>({kind:"wedding",created_at:b.created_at,data:b}))
  ].sort((a:any,b:any)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,30);

  return <main className="container">
    <span className="badge">panel.matt-transport.pl</span><h1>MATT Booking PRO</h1><PanelNav/>
    <div className="admin-quick-row"><EmailTestButton/><a className="btn secondary" href="/panel/rezerwacje">ARCHIWUM / WYSZUKIWARKA</a></div>
    <div className="ops-alert-center card"><div><h2>Wymaga uwagi</h2><span>Najważniejsze sprawy operacyjne.</span></div><div className="ops-alert-grid"><a href="/panel/dyspozytor"><strong>{alertUnassigned}</strong><span>Bez pełnej obsady</span></a><a href="/panel/rezerwacje"><strong>{alertPayment}</strong><span>B2B bez linku płatności</span></a><a href="/panel/rezerwacje"><strong>{alertChanged}</strong><span>Zmiany klientów</span></a><a href="/panel/wesela"><strong>{(weddings??[]).filter((z:any)=>z.status==="pending").length}</strong><span>Wesela do obsługi</span></a></div></div>
    <div className="stats">
      <div className="card stat"><strong>{pending??0}</strong><p className="muted">Oczekujące transfery</p></div>
      <div className="card stat"><strong>{todayCount??0}</strong><p className="muted">Kursy dzisiaj</p></div>
      <div className="card stat"><strong>{b2bPending??0}</strong><p className="muted">Aktywne B2B</p></div>
      <div className="card stat"><strong>{(weddings??[]).filter((x:any)=>x.status==="pending").length}</strong><p className="muted">Nowe wesela</p></div>
    </div>

    <div className="card" style={{marginTop:18}}>
      <div className="company-section-head"><div><h2>Najnowsze zgłoszenia</h2><p className="muted">Najnowsze są zawsze na górze.</p></div><a className="btn secondary" href="/panel/dyspozytor">PLAN KURSÓW</a></div>
      <div className="dashboard-feed">
        {feed.map((x:any)=>{
          if(x.kind==="wedding"){const b=x.data;return <a className="dashboard-feed-card wedding-order" key={`w-${b.id}`} href={`/panel/wesela/${b.id}`}>
            <div className="feed-icon">💍</div><div><span className="origin-badge wedding">WESELE</span><strong>{b.booking_number} · {b.customer_name}</strong><span>{b.start_date} {b.start_time} · {b.restaurant_name}</span></div><div className="feed-status">Oczekuje</div>
          </a>}
          const b=x.data;const company=Array.isArray(b.companies)?b.companies[0]:b.companies;
          return <a className={`dashboard-feed-card ${b.company_id?"b2b-order":""}`} key={`a-${b.id}`} href={`/panel/rezerwacje/${b.id}`}>
            <div className="feed-icon">{b.company_id?"🏢":"✈️"}</div><div>{b.company_id?<span className="origin-badge b2b">B2B · {company?.name??"Firma"}</span>:<span className="origin-badge private">INDYWIDUALNY</span>}<strong>{b.booking_number} · {b.customer_name}</strong><span>{b.travel_date} {b.travel_time} · {b.pickup_address} → {b.airport_label}</span></div><div className="dashboard-feed-meta">
              {b.driver_id&&<span className="driver-color-badge" style={{borderColor:(Array.isArray(b.drivers)?b.drivers[0]:b.drivers)?.color||"#D6AD55"}}><i style={{background:(Array.isArray(b.drivers)?b.drivers[0]:b.drivers)?.color||"#D6AD55"}}/>{(Array.isArray(b.drivers)?b.drivers[0]:b.drivers)?.full_name}</span>}
              {b.payment_method==="employee_payment"&&<span className={`payment-dashboard-badge ${b.payment_link?"ready":"waiting"}`}>{b.payment_link?"PŁATNOŚĆ PRACOWNIKA · LINK GOTOWY":"PŁATNOŚĆ PRACOWNIKA · BRAK LINKU"}</span>}
              {b.payment_method==="employee_payment"&&b.payment_link&&<span className="payment-dashboard-link">Otwórz link płatności ↗</span>}
              <div className={`feed-status ${b.status}`}>{statusPl(b.status)}</div>
            </div>
          </a>
        })}
      </div>
    </div>
  </main>
}
