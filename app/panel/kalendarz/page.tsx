import PanelNav from "@/components/PanelNav";
import {panelClient} from "@/lib/panel";
import {statusPl} from "@/lib/status";

const palette=["#d5ae5d","#4f8bd6","#52a86b","#a975d1","#d27a5a","#4eb9b0","#cf6b91","#8794aa"];
function driverColor(id:string|null,ids:string[]){
  if(!id)return "#6b7280";
  const i=Math.max(0,ids.indexOf(id));return palette[i%palette.length];
}
export default async function CalendarPage(){
  const {s}=await panelClient();
  const {data}=await s.from("bookings").select("*,drivers:drivers!bookings_driver_id_fkey(id,full_name),vehicles:vehicles!bookings_vehicle_id_fkey(name,registration)").neq("status","cancelled").order("travel_date").order("travel_time").limit(250);
  const rows=data??[];
  const ids=[...new Set(rows.map((x:any)=>x.driver_id).filter(Boolean))] as string[];
  const grouped=rows.reduce((a:Record<string,any[]>,x:any)=>{(a[x.travel_date]??=[]).push(x);return a},{});
  return <main className="container"><h1>Kalendarz kursów</h1><PanelNav/>
    <div className="driver-legend">{ids.map(id=>{const b=rows.find((x:any)=>x.driver_id===id);const d=Array.isArray(b?.drivers)?b.drivers[0]:b?.drivers;return <span key={id}><i style={{background:driverColor(id,ids)}}/>{d?.full_name}</span>})}<span><i style={{background:"#6b7280"}}/>BEZ OBSADY</span></div>
    {Object.entries(grouped).map(([date,list])=><div className="card calendar-day" key={date}><h2>{date}</h2><div className="calendar-events">
      {(list as any[]).map((b:any)=>{const d=Array.isArray(b.drivers)?b.drivers[0]:b.drivers;const v=Array.isArray(b.vehicles)?b.vehicles[0]:b.vehicles;return <a href={`/panel/rezerwacje/${b.id}`} className="calendar-event" style={{borderLeftColor:driverColor(b.driver_id,ids)}} key={b.id}>
        <strong>{b.travel_time} · {b.customer_name}</strong><span>{b.pickup_address} → {b.airport_label}</span><small>{d?.full_name??"BEZ OBSADY"} · {v?`${v.name} · ${v.registration}`:"brak pojazdu"} · {statusPl(b.status)}</small>
      </a>})}
    </div></div>)}
  </main>
}
