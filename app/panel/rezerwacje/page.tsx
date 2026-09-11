import PanelNav from "@/components/PanelNav";
import { panelClient } from "@/lib/panel";
import { statusPl } from "@/lib/status";
import { isArchivedBooking, isOverdueBooking, sortBookingsChronologically, statusStageClass } from "@/lib/bookingOps";
import { bookingRouteText } from "@/lib/bookingRoute";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; view?: string }> }) {
  const { q = "", view = "active" } = await searchParams;
  const { s } = await panelClient();
  let query = s.from("bookings").select("*,drivers:drivers!bookings_driver_id_fkey(full_name,color)").limit(700);
  if (q.trim()) query = query.or(`booking_number.ilike.%${q}%,customer_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);

  const { data, error } = await query;
  const all = sortBookingsChronologically(data ?? []);
  const rows = all.filter((b: any) => {
    if (view === "completed") return b.status === "completed";
    if (view === "cancelled") return b.status === "cancelled";
    if (view === "archive") return isArchivedBooking(b);
    if (view === "all") return true;
    return !isArchivedBooking(b);
  });

  const counts = {
    active: all.filter((b:any)=>!isArchivedBooking(b)).length,
    completed: all.filter((b:any)=>b.status==="completed").length,
    cancelled: all.filter((b:any)=>b.status==="cancelled").length,
    all: all.length
  };
  const href=(v:string)=>`/panel/rezerwacje?view=${v}&q=${encodeURIComponent(q)}`;
  const price=(b:any)=>b.quote_required?"Wycena indywidualna":b.company_id?`${Number(b.price_net ?? b.total_price).toFixed(2)} zł netto · ${Number(b.price_gross ?? b.total_price).toFixed(2)} zł brutto`:`${Number(b.total_price).toFixed(2)} zł`;

  return <main className="container">
    <h1>Rezerwacje / wyszukiwarka</h1><PanelNav/>
    <div className="booking-view-tabs">
      <a className={view==="active"?"active":""} href={href("active")}>AKTYWNE ({counts.active})</a>
      <a className={view==="completed"?"active":""} href={href("completed")}>ZAKOŃCZONE ({counts.completed})</a>
      <a className={view==="cancelled"?"active":""} href={href("cancelled")}>ANULOWANE ({counts.cancelled})</a>
      <a className={view==="all"?"active":""} href={href("all")}>WSZYSTKIE ({counts.all})</a>
    </div>
    {error&&<div className="card" style={{borderColor:"#dc2626",marginBottom:16}}><strong>Nie udało się pobrać rezerwacji.</strong></div>}
    <form className="archive-search"><input type="hidden" name="view" value={view}/><input name="q" defaultValue={q} placeholder="Numer, nazwisko, telefon lub e-mail"/><button className="btn">SZUKAJ</button></form>

    <div className="desktop-table card"><table className="table booking-archive-table"><thead><tr><th>Numer</th><th>Termin / trasa</th><th>Klient</th><th>Kierowca</th><th>Cena</th><th>Status</th></tr></thead><tbody>
      {rows.map((b:any)=>{const driver=Array.isArray(b.drivers)?b.drivers[0]:b.drivers;const overdue=isOverdueBooking(b);return <tr key={b.id} className={`${statusStageClass(b.status)} ${overdue?"booking-overdue":""}`}>
        <td><a className="booking-number-link" href={`/panel/rezerwacje/${b.id}`}>{b.booking_number}</a>{b.quote_required&&<div className="quote-required-badge">WYCENA</div>}{overdue&&<div className="overdue-badge">⚠ TERMIN MINĄŁ</div>}</td>
        <td>{b.travel_date}<br/>{String(b.travel_time||"").slice(0,5)}<br/><small>{bookingRouteText(b,"primary")}</small></td>
        <td>{b.customer_name}<br/>{b.phone||"—"}</td>
        <td>{driver?<span className="driver-color-badge" style={{borderColor:driver.color||"#D6AD55"}}><i style={{background:driver.color||"#D6AD55"}}/>{driver.full_name}</span>:"—"}</td>
        <td>{price(b)}</td><td><span className={`status ${b.status}`}>{statusPl(b.status)}</span></td>
      </tr>})}
    </tbody></table></div>

    <div className="mobile-card-list booking-mobile-list">{rows.map((b:any)=>{const overdue=isOverdueBooking(b);const driver=Array.isArray(b.drivers)?b.drivers[0]:b.drivers;return <a className={`mobile-data-card booking-stage-card ${statusStageClass(b.status)} ${overdue?"booking-overdue":""}`} href={`/panel/rezerwacje/${b.id}`} key={b.id}>
      <div className="mobile-booking-head"><strong>{b.booking_number}</strong><span className={`status ${b.status}`}>{statusPl(b.status)}</span></div>
      {b.quote_required&&<span className="quote-required-badge">WYCENA INDYWIDUALNA</span>}{overdue&&<span className="overdue-badge">⚠ TERMIN MINĄŁ — wymaga zamknięcia</span>}
      <span>{b.customer_name}</span><span>{b.travel_date} {String(b.travel_time||"").slice(0,5)}</span><small>{bookingRouteText(b,"primary")}</small>
      {driver&&<span className="driver-color-badge" style={{borderColor:driver.color||"#D6AD55"}}><i style={{background:driver.color||"#D6AD55"}}/>{driver.full_name}</span>}
      <span>{price(b)}</span>
    </a>})}</div>
    {!rows.length&&<div className="card empty-state"><strong>Brak rezerwacji w tym widoku.</strong></div>}
  </main>;
}
