import PanelNav from "@/components/PanelNav";
import {panelClient} from "@/lib/panel";
import {statusPl} from "@/lib/status";
import {bookingHasReturnLeg} from "@/lib/bookingOps";
import {bookingRouteText} from "@/lib/bookingRoute";

const palette=["#d5ae5d","#4f8bd6","#52a86b","#a975d1","#d27a5a","#4eb9b0","#cf6b91","#8794aa"];
function one(value:any){return Array.isArray(value)?value[0]:value}
function driverColor(id:string|null,ids:string[]){if(!id)return "#6b7280";const i=Math.max(0,ids.indexOf(id));return palette[i%palette.length]}

export default async function CalendarPage(){
  const {s}=await panelClient();
  const {data}=await s.from("bookings").select("*,drivers:drivers!bookings_driver_id_fkey(id,full_name),vehicles:vehicles!bookings_vehicle_id_fkey(name,registration),return_driver:drivers!bookings_return_driver_id_fkey(id,full_name),return_vehicle:vehicles!bookings_return_vehicle_id_fkey(name,registration)").order("travel_date").order("travel_time").limit(700);
  const rows=data??[];
  const ids=[...new Set(rows.flatMap((x:any)=>[x.driver_id,x.return_driver_id]).filter(Boolean))] as string[];
  const events:any[]=[];
  for(const b of rows){
    events.push({booking:b,leg:"primary",date:b.travel_date,time:b.travel_time,driverId:b.driver_id,driver:one(b.drivers),vehicle:one(b.vehicles)});
    if(bookingHasReturnLeg(b)&&b.return_date){events.push({booking:b,leg:"return",date:b.return_date,time:b.return_time,driverId:b.return_driver_id||b.driver_id,driver:one(b.return_driver)||one(b.drivers),vehicle:one(b.return_vehicle)||one(b.vehicles)})}
  }
  events.sort((a,b)=>`${a.date}T${String(a.time||"00:00")}`.localeCompare(`${b.date}T${String(b.time||"00:00")}`));
  const grouped=events.reduce((acc:Record<string,any[]>,event:any)=>{(acc[event.date]??=[]).push(event);return acc},{});
  const driverName=(id:string)=>{for(const b of rows){const p=one(b.drivers);const r=one(b.return_driver);if(p?.id===id)return p.full_name;if(r?.id===id)return r.full_name}return "Kierowca"};

  return <main className="container"><span className="badge">WSZYSTKIE STATUSY</span><h1>Kalendarz kursów</h1><p className="muted">Wyjazdy i powroty w jednej chronologii. Zakończone i anulowane przejazdy pozostają widoczne jako historia.</p><PanelNav/>
    <div className="driver-legend">{ids.map(id=><span key={id}><i style={{background:driverColor(id,ids)}}/>{driverName(id)}</span>)}<span><i style={{background:"#6b7280"}}/>BEZ OBSADY</span></div>
    {Object.entries(grouped).map(([date,list])=><div className="card calendar-day" key={date}><h2>{date}</h2><div className="calendar-events">
      {(list as any[]).map((event:any)=>{const b=event.booking;const general=String(b.service_type||"").startsWith("point_to_point");return <a href={`/panel/rezerwacje/${b.id}`} className={`calendar-event ${b.status||""}`} style={{borderLeftColor:driverColor(event.driverId,ids),opacity:b.status==="cancelled"?.62:1}} key={`${b.id}-${event.leg}`}>
        <strong>{String(event.time||"").slice(0,5)} · {event.leg==="return"?"POWRÓT · ":""}{b.customer_name}</strong>
        <span>{bookingRouteText(b,event.leg)}</span>
        <small>{general?"🚐 TRANSPORT A→B · ":""}{event.driver?.full_name??"BEZ OBSADY"} · {event.vehicle?`${event.vehicle.name} · ${event.vehicle.registration}`:"brak pojazdu"} · {statusPl(b.status)}</small>
      </a>})}
    </div></div>)}
    {!events.length&&<div className="card empty-state"><strong>Brak przejazdów w kalendarzu.</strong></div>}
  </main>
}
