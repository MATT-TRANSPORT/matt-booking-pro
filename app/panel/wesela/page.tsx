import PanelNav from "@/components/PanelNav";
import { panelClient } from "@/lib/panel";
import { statusPl } from "@/lib/status";

function key(row:any){return `${String(row.start_date||"0000-00-00").slice(0,10)}T${String(row.start_time||"00:00").slice(0,5)}`;}
function closed(row:any){return ["completed","cancelled"].includes(String(row.status||""));}

export default async function WeddingsPage(){
  const {s}=await panelClient();
  const {data,error}=await s.from("wedding_bookings").select("*").limit(500);
  const rows=data??[];
  const active=rows.filter((x:any)=>!closed(x)).sort((a:any,b:any)=>key(a).localeCompare(key(b)));
  const history=rows.filter(closed).sort((a:any,b:any)=>key(b).localeCompare(key(a)));

  return <main className="container">
    <span className="badge wedding-badge">💍 TRANSPORT WESELNY</span>
    <h1>Wesela</h1>
    <p className="muted">Aktywne zlecenia chronologicznie od najbliższego. Zakończone i anulowane są dostępne w historii.</p>
    <PanelNav/>
    {error&&<div className="card" style={{borderColor:"#dc2626"}}><strong>Nie udało się pobrać zleceń weselnych.</strong></div>}
    <WeddingSection title="Aktywne i nadchodzące" rows={active}/>
    <WeddingSection title="Historia · zakończone i anulowane" rows={history} history/>
  </main>;
}

function WeddingSection({title,rows,history=false}:{title:string;rows:any[];history?:boolean}){
  return <section style={{marginTop:22}}>
    <div className="company-section-head"><div><span className="badge">{history?"HISTORIA":"PLAN"}</span><h2 style={{marginTop:8}}>{title}</h2></div><strong>{rows.length}</strong></div>
    {!rows.length?<div className="card empty-state"><strong>Brak zleceń w tej sekcji.</strong></div>:<div style={{display:"grid",gap:10}}>
      {rows.map((b:any)=><a key={b.id} className="dashboard-feed-card wedding-order" href={`/panel/wesela/${b.id}`}>
        <div className="feed-icon">💍</div>
        <div style={{minWidth:0}}><strong>{b.booking_number||"WESELE"} · {b.customer_name}</strong><span style={{display:"block",marginTop:4}}>{b.start_date} {String(b.start_time||"").slice(0,5)} · {b.restaurant_name}</span><small className="muted">{b.restaurant_address}</small></div>
        <span className={`status ${b.status}`}>{statusPl(b.status)}</span>
      </a>)}
    </div>}
  </section>;
}
