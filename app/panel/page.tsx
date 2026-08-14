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
    s.from("bookings").select("*,companies(name)").order("created_at",{ascending:false}).limit(30),
    s.from("wedding_bookings").select("*").order("created_at",{ascending:false}).limit(15)
  ]);

  const feed=[
    ...(bookings??[]).map((b:any)=>({kind:"airport",created_at:b.created_at,data:b})),
    ...(weddings??[]).map((b:any)=>({kind:"wedding",created_at:b.created_at,data:b}))
  ].sort((a:any,b:any)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,30);

  return <main className="container">
    <span className="badge">panel.matt-transport.pl</span><h1>MATT Booking PRO</h1><PanelNav/>
    <div className="admin-quick-row"><EmailTestButton/><a className="btn secondary" href="/panel/rezerwacje">ARCHIWUM / WYSZUKIWARKA</a></div>
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
            <div className="feed-icon">{b.company_id?"🏢":"✈️"}</div><div>{b.company_id?<span className="origin-badge b2b">B2B · {company?.name??"Firma"}</span>:<span className="origin-badge private">INDYWIDUALNY</span>}<strong>{b.booking_number} · {b.customer_name}</strong><span>{b.travel_date} {b.travel_time} · {b.pickup_address} → {b.airport_label}</span></div><div className={`feed-status ${b.status}`}>{statusPl(b.status)}</div>
          </a>
        })}
      </div>
    </div>
  </main>
}
