import PanelNav from "@/components/PanelNav";
import EmailTestButton from "@/components/EmailTestButton";
import DashboardQuickActions from "@/components/DashboardQuickActions";
import FlightStatusBadge from "@/components/FlightStatusBadge";
import FlightRefreshAllButton from "@/components/FlightRefreshAllButton";
import FlightAlertBadge from "@/components/FlightAlertBadge";
import FlightAutomationStatus from "@/components/FlightAutomationStatus";
import { panelClient } from "@/lib/panel";
import { statusPl } from "@/lib/status";
import { isArchivedBooking, sortBookingsChronologically, statusStageClass, warsawToday } from "@/lib/bookingOps";
import { bookingHasMissingAssignment, bookingLegs, isDispatcherOverdue, warsawNowKey } from "@/lib/dispatcherOps";
import { driverRouteText } from "@/lib/driverOps";
import { bookingRouteText } from "@/lib/bookingRoute";

export default async function PanelPage() {
  const { s } = await panelClient();
  const today = warsawToday();
  const [
    { count: pending }, { count: todayCount }, { count: b2bPending },
    { data: bookings, error: bookingsError }, { data: weddings }, { data: vehicles }
  ] = await Promise.all([
    s.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
    s.from("bookings").select("*", { count: "exact", head: true }).eq("travel_date", today).not("status", "in", "(completed,cancelled)"),
    s.from("bookings").select("*", { count: "exact", head: true }).not("company_id", "is", null).in("status", ["pending","confirmed","assigned"]),
    s.from("bookings").select("*,companies(name),drivers:drivers!bookings_driver_id_fkey(full_name,color),return_drivers:drivers!bookings_return_driver_id_fkey(full_name,color)").limit(500),
    s.from("wedding_bookings").select("*").order("created_at", { ascending: false }).limit(30),
    s.from("vehicles").select("id,name,registration,inspection_date,insurance_date,active").eq("active", true).order("name")
  ]);

  const allBookings = sortBookingsChronologically(bookings ?? []);
  const bookingIds = allBookings.map((b:any)=>b.id);
  let flightRows:any[]=[]; let flightAlerts:any[]=[];
  if(bookingIds.length){
    const [flights,alerts]=await Promise.all([
      s.from("booking_flights").select("*").in("booking_id",bookingIds),
      s.from("booking_flight_alerts").select("*").in("booking_id",bookingIds).eq("active",true).order("updated_at",{ascending:false})
    ]);
    flightRows=flights.data??[]; flightAlerts=alerts.data??[];
  }
  const flightByBookingLeg=new Map(flightRows.map((f:any)=>[`${f.booking_id}:${f.leg||"primary"}`,f]));
  const alertByBookingLeg=new Map<string,any>();
  for(const alert of flightAlerts){const key=`${alert.booking_id}:${alert.leg||"primary"}`;const current=alertByBookingLeg.get(key);const rank=alert.severity==="critical"?3:alert.severity==="warning"?2:1;const currentRank=current?.severity==="critical"?3:current?.severity==="warning"?2:current?1:0;if(!current||rank>currentRank)alertByBookingLeg.set(key,alert)}
  const {data:lastRun}=await s.from("flight_monitor_runs").select("*").order("started_at",{ascending:false}).limit(1).maybeSingle();

  const activeBookings=allBookings.filter((b:any)=>!isArchivedBooking(b));
  const closedBookings=allBookings.filter((b:any)=>isArchivedBooking(b)).slice(0,12);
  const nowKey=warsawNowKey();
  const alertUnassigned=activeBookings.filter((b:any)=>bookingHasMissingAssignment(b)).length;
  const alertPayment=activeBookings.filter((b:any)=>b.payment_status==="review").length;
  const alertChanged=activeBookings.filter((b:any)=>b.status==="pending"&&b.customer_last_edited_at).length;
  const alertOverdue=activeBookings.filter((b:any)=>isDispatcherOverdue(b,nowKey)).length;
  const alertFlights=flightAlerts.filter((a:any)=>a.active&&!a.acknowledged_at&&["warning","critical"].includes(a.severity)).length;
  const alertQuotes=activeBookings.filter((b:any)=>b.quote_required&&b.quote_status==="pending").length;

  const todayMs=Date.parse(`${today}T00:00:00Z`);
  const daysUntil=(value?:string|null)=>{if(!value)return null;const target=Date.parse(`${String(value).slice(0,10)}T00:00:00Z`);return Number.isFinite(target)?Math.ceil((target-todayMs)/86400000):null};
  const fleetAttention=(vehicles??[]).filter((v:any)=>[daysUntil(v.inspection_date),daysUntil(v.insurance_date)].some((d)=>d!==null&&d<=30));

  const liveStatuses=new Set(["in_progress","arrived","picked_up"]);
  const upcoming:any[]=[];
  for(const b of activeBookings){
    const legs=bookingLegs(b);const live=liveStatuses.has(String(b.status||""));
    const activePastLeg=live?[...legs].filter((leg)=>leg.operationalStartKey<=nowKey).sort((a,z)=>z.operationalStartKey.localeCompare(a.operationalStartKey))[0]:null;
    for(const leg of legs){const currentLive=activePastLeg?.kind===leg.kind;if(!currentLive&&leg.operationalEndKey<nowKey)continue;upcoming.push({kind:"booking",sortKey:currentLive?`0000-${nowKey}`:`1000-${leg.operationalStartKey}`,leg,data:b})}
  }
  for(const b of (weddings??[]).filter((x:any)=>!["completed","cancelled"].includes(String(x.status||"")))){const key=`${String(b.start_date||"9999-12-31").slice(0,10)}T${String(b.start_time||"23:59").slice(0,5)}`;if(key>=nowKey)upcoming.push({kind:"wedding",sortKey:`1000-${key}`,data:b})}
  upcoming.sort((a,b)=>a.sortKey.localeCompare(b.sortKey));

  return <main className="container">
    <span className="badge">panel.matt-transport.pl</span><h1>MATT Booking PRO</h1><PanelNav/>
    {bookingsError&&<div className="card" style={{borderColor:"#dc2626",marginBottom:16}}><strong>Nie udało się pobrać rezerwacji z Supabase.</strong></div>}

    <div className="ops-alert-center card"><div><h2>Wymaga uwagi</h2><span>Problemy, które mogą wymagać działania dyspozytora.</span></div>
      <div className="ops-alert-grid ops-alert-grid-seven">
        <a className={alertOverdue?"alert-danger":""} href="/panel/dyspozytor"><strong>{alertOverdue}</strong><span>Termin minął</span></a>
        <a className={alertFlights?"alert-danger":""} href="/panel/dyspozytor"><strong>{alertFlights}</strong><span>Loty z alertem</span></a>
        <a href="/panel/dyspozytor"><strong>{alertUnassigned}</strong><span>Bez pełnej obsady</span></a>
        <a href="/panel/rezerwacje?view=active"><strong>{alertChanged}</strong><span>Zmiany klientów</span></a>
        <a className={alertPayment?"alert-danger":""} href="/panel/rezerwacje?view=active"><strong>{alertPayment}</strong><span>Płatności do weryfikacji</span></a>
        <a className={alertQuotes?"alert-danger":""} href="/panel/rezerwacje?view=active"><strong>{alertQuotes}</strong><span>Wyceny A→B</span></a>
        <a href="/panel/pojazdy"><strong>{fleetAttention.length}</strong><span>Flota ≤30 dni</span></a>
      </div>
    </div>

    <section className="card" style={{marginTop:18}}><div className="company-section-head"><div><h2>Najbliższe transporty</h2><p className="muted">Chronologicznie według realnego terminu wyjazdu lub powrotu. Najbliższy kurs jest zawsze na górze.</p></div><a className="btn secondary" href="/panel/dyspozytor">PLAN KURSÓW</a></div>
      <div className="dashboard-feed">{upcoming.slice(0,50).map((x:any)=>{
        if(x.kind==="wedding"){const b=x.data;return <div className="dashboard-feed-card wedding-order" key={`w-${b.id}`}><div className="feed-icon">💍</div><div><span className="origin-badge wedding">WESELE</span><a href={`/panel/wesela/${b.id}`}><strong>{b.booking_number} · {b.customer_name}</strong></a><span>{b.start_date} {b.start_time} · {b.restaurant_name}</span></div><div className="feed-status">Oczekuje</div></div>}
        const b=x.data,leg=x.leg;const company=Array.isArray(b.companies)?b.companies[0]:b.companies;const primaryDriver=Array.isArray(b.drivers)?b.drivers[0]:b.drivers;const returnDriver=Array.isArray(b.return_drivers)?b.return_drivers[0]:b.return_drivers;const driver=leg?.kind==="return"?returnDriver:primaryDriver;const overdue=isDispatcherOverdue(b,nowKey);const flight=flightByBookingLeg.get(`${b.id}:${leg.kind}`)??null;const flightAlert=alertByBookingLeg.get(`${b.id}:${leg.kind}`)??null;const general=String(b.service_type||"").startsWith("point_to_point");
        return <div className={`dashboard-feed-card booking-stage-card ${statusStageClass(b.status)} ${b.company_id?"b2b-order":""} ${overdue?"booking-overdue":""}`} key={`${b.id}-${leg.kind}`}>
          <div className="feed-icon">{b.company_id?"🏢":general?"🚐":"✈️"}</div><div>{b.company_id?<span className="origin-badge b2b">B2B · {company?.name??"Firma"}</span>:<span className="origin-badge private">{general?"TRANSPORT A→B":"INDYWIDUALNY"}</span>}{b.quote_required&&<span className="quote-required-badge">WYCENA</span>}<span className="dashboard-upcoming-leg">{leg.kind==="return"?"↩ POWRÓT":"→ WYJAZD"}</span><a href={`/panel/rezerwacje/${b.id}`}><strong>{b.booking_number} · {b.customer_name}</strong></a><span className="dashboard-upcoming-time">{leg.date} {String(leg.time||"").slice(0,5)} · {driverRouteText(b,leg.kind)}</span>{(leg.kind==="return"?b.return_flight_number:b.flight_number)&&<FlightStatusBadge flight={flight} flightNumber={leg.kind==="return"?b.return_flight_number:b.flight_number}/>} {flightAlert&&<FlightAlertBadge alert={flightAlert} compact/>}{overdue&&<span className="overdue-badge">⚠ TERMIN MINĄŁ — status niezamknięty</span>}<DashboardQuickActions booking={b}/></div>
          <div className="dashboard-feed-meta">{driver&&<span className="driver-color-badge" style={{borderColor:driver.color||"#D6AD55"}}><i style={{background:driver.color||"#D6AD55"}}/>{driver.full_name}</span>}<div className={`feed-status ${b.status}`}>{statusPl(b.status)}</div></div>
        </div>
      })}</div>
    </section>

    <section className="card trip-history-section"><div className="company-section-head"><div><h2>Ostatnio zakończone i anulowane</h2><p className="muted">Historia pozostaje widoczna, ale nie zasłania bieżących kursów.</p></div><a className="btn secondary" href="/panel/dyspozytor?view=all">WSZYSTKIE</a></div>
      {closedBookings.length?closedBookings.map((b:any)=><a className="trip-history-row" href={`/panel/rezerwacje/${b.id}`} key={b.id}><span><strong>{b.booking_number} · {b.customer_name}</strong><br/><small className="muted">{b.travel_date} {String(b.travel_time||"").slice(0,5)} · {bookingRouteText(b)}</small></span><span className={`trip-history-status ${b.status}`}>{statusPl(b.status)}</span></a>):<div className="empty-state"><strong>Brak zakończonych lub anulowanych przejazdów.</strong></div>}
    </section>

    <div className="admin-quick-row"><EmailTestButton/><FlightRefreshAllButton/><a className="btn secondary" href="/panel/dyspozytor?view=all">HISTORIA</a><a className="btn secondary" href="/panel/dyspozytor">PLAN KURSÓW</a></div>
    <FlightAutomationStatus lastRun={lastRun}/>
    <div className="stats" style={{marginTop:18}}><div className="card stat"><strong>{pending??0}</strong><p className="muted">Oczekujące</p></div><div className="card stat"><strong>{todayCount??0}</strong><p className="muted">Aktywne dzisiaj</p></div><div className="card stat"><strong>{b2bPending??0}</strong><p className="muted">Aktywne B2B</p></div><div className="card stat"><strong>{alertOverdue}</strong><p className="muted">Po terminie</p></div></div>
  </main>;
}
