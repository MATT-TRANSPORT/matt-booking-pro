import PanelNav from "@/components/PanelNav";
import { panelClient } from "@/lib/panel";
import { statusPl } from "@/lib/status";
import { bookingLegs, warsawNowKey } from "@/lib/dispatcherOps";
import { bookingRouteText } from "@/lib/bookingRoute";
import { isClosedBooking } from "@/lib/unifiedBookingSort";

const palette=["#d5ae5d","#4f8bd6","#52a86b","#a975d1","#d27a5a","#4eb9b0","#cf6b91","#8794aa"];
function driverColor(id:string|null,ids:string[]){
  if(!id)return "#6b7280";
  const i=Math.max(0,ids.indexOf(id));return palette[i%palette.length];
}
function one(value:any){return Array.isArray(value)?value[0]:value;}

export default async function CalendarPage(){
  const {s}=await panelClient();
  const {data,error}=await s.from("bookings")
    .select("*,drivers:drivers!bookings_driver_id_fkey(id,full_name),return_drivers:drivers!bookings_return_driver_id_fkey(id,full_name),vehicles:vehicles!bookings_vehicle_id_fkey(name,registration),return_vehicles:vehicles!bookings_return_vehicle_id_fkey(name,registration)")
    .limit(800);

  const rows=data??[];
  const nowKey=warsawNowKey();
  const ids=[...new Set(rows.flatMap((x:any)=>[x.driver_id,x.return_driver_id]).filter(Boolean))] as string[];
  const driverNames=new Map<string,string>();
  for(const b of rows){
    const d=one(b.drivers);const rd=one(b.return_drivers);
    if(d?.id)driverNames.set(d.id,d.full_name);
    if(rd?.id)driverNames.set(rd.id,rd.full_name);
  }

  const activeEvents:any[]=[];
  const historyEvents:any[]=[];
  for(const booking of rows){
    for(const leg of bookingLegs(booking)){
      const event={booking,leg};
      if(isClosedBooking(booking)) historyEvents.push(event);
      else if(leg.operationalEndKey>=nowKey) activeEvents.push(event);
    }
  }
  activeEvents.sort((a,b)=>a.leg.operationalStartKey.localeCompare(b.leg.operationalStartKey));
  historyEvents.sort((a,b)=>b.leg.key.localeCompare(a.leg.key));

  return <main className="container">
    <h1>Kalendarz kursów</h1>
    <p className="muted">Aktywne i nadchodzące kursy od najbliższego. Zakończone i anulowane są zawsze dostępne poniżej.</p>
    <PanelNav/>
    {error&&<div className="card" style={{borderColor:"#dc2626"}}><strong>Nie udało się pobrać kalendarza.</strong></div>}
    <div className="driver-legend">
      {ids.map(id=><span key={id}><i style={{background:driverColor(id,ids)}}/>{driverNames.get(id)||"Kierowca"}</span>)}
      <span><i style={{background:"#6b7280"}}/>BEZ OBSADY</span>
    </div>

    <CalendarSection title="Aktywne i nadchodzące" events={activeEvents} ids={ids} empty="Brak aktywnych lub nadchodzących kursów." />
    <CalendarSection title="Historia · zakończone i anulowane" events={historyEvents} ids={ids} empty="Brak zakończonych lub anulowanych kursów." history />
  </main>;
}

function CalendarSection({title,events,ids,empty,history=false}:{title:string;events:any[];ids:string[];empty:string;history?:boolean}){
  const grouped=events.reduce((acc:Record<string,any[]>,event:any)=>{
    const date=event.leg.date||"Brak daty";(acc[date]??=[]).push(event);return acc;
  },{});
  const dates=Object.keys(grouped).sort((a,b)=>history?b.localeCompare(a):a.localeCompare(b));

  return <section style={{marginTop:22}}>
    <div className="company-section-head"><div><span className="badge">{history?"HISTORIA":"PLAN"}</span><h2 style={{marginTop:8}}>{title}</h2></div><strong>{events.length}</strong></div>
    {!events.length?<div className="card empty-state"><strong>{empty}</strong></div>:dates.map(date=><div className="card calendar-day" key={`${history?"h":"a"}-${date}`}>
      <h2>{date}</h2>
      <div className="calendar-events">
        {grouped[date].map(({booking:b,leg}:any)=>{
          const isReturn=leg.kind==="return";
          const d=one(isReturn?b.return_drivers:b.drivers);
          const v=one(isReturn?b.return_vehicles:b.vehicles);
          const route=bookingRouteText(b,leg.kind);
          const pointToPoint=b.booking_category==="point_to_point";
          return <a href={`/panel/rezerwacje/${b.id}`} className="calendar-event" style={{borderLeftColor:driverColor(leg.driverId,ids)}} key={`${b.id}-${leg.kind}`}>
            <strong>{String(leg.time||"").slice(0,5)} · {b.customer_name}</strong>
            <span>{b.service_type==="roundtrip"?(isReturn?"↩ POWRÓT · ":"→ WYJAZD · "):""}{route}</span>
            <small>{pointToPoint?"TRANSPORT A → B · ":""}{d?.full_name??"BEZ OBSADY"} · {v?`${v.name} · ${v.registration}`:"brak pojazdu"} · {statusPl(b.status)}</small>
          </a>;
        })}
      </div>
    </div>)}
  </section>;
}
