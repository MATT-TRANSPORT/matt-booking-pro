"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function WeddingAssignments({booking,slots,drivers,vehicles}:{booking:any,slots:any[],drivers:any[],vehicles:any[]}){
  const router=useRouter();
  const initial=Array.from({length:Number(booking.vehicles_count||1)},(_,i)=>{
    const x=slots.find((s:any)=>Number(s.slot_no)===i+1);
    return {slotNo:i+1,requestedVehicleType:x?.requested_vehicle_type??"bus",driverId:x?.driver_id??"",vehicleId:x?.vehicle_id??""};
  });
  const [rows,setRows]=useState(initial);
  const [msg,setMsg]=useState("");
  const [saving,setSaving]=useState(false);
  async function save(){
    setSaving(true);setMsg("");
    const r=await fetch(`/api/admin/wedding-bookings/${booking.id}/assignments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({assignments:rows})});
    const d=await r.json();
    setSaving(false);
    setMsg(r.ok?(d.email_sent?"✓ Obsada zapisana. Klient otrzymał uroczyste potwierdzenie e-mail.":"✓ Obsada zapisana."):(d.error??"Błąd zapisu."));
    if(r.ok)router.refresh();
  }
  return <div className="card wedding-ops-card">
    <h2>💍 Obsada transportu</h2>
    <p className="muted">Uzupełnij kierowcę i konkretny samochód dla każdego zamówionego pojazdu. E-mail wysyłamy dopiero po zapisaniu kompletnej obsady.</p>
    <div className="wedding-assignment-list">
      {rows.map((row:any,i:number)=><div className="wedding-assignment-row" key={row.slotNo}>
        <div><strong>Pojazd {row.slotNo}</strong><span>{row.requestedVehicleType==="car"?"Samochód osobowy":"Bus 9-osobowy"}</span></div>
        <label>Kierowca<select value={row.driverId} onChange={e=>setRows(rows.map((x:any,j:number)=>j===i?{...x,driverId:e.target.value}:x))}>
          <option value="">— wybierz —</option>{drivers.filter((d:any)=>d.active!==false).map((d:any)=><option value={d.id} key={d.id}>{d.full_name}</option>)}
        </select></label>
        <label>Samochód<select value={row.vehicleId} onChange={e=>setRows(rows.map((x:any,j:number)=>j===i?{...x,vehicleId:e.target.value}:x))}>
          <option value="">— wybierz —</option>{vehicles.filter((v:any)=>v.active!==false).map((v:any)=><option value={v.id} key={v.id}>{v.name} · {v.registration}</option>)}
        </select></label>
      </div>)}
    </div>
    <button className="btn wedding-submit" disabled={saving} onClick={save}>{saving?"ZAPISYWANIE...":"ZAPISZ OBSADĘ"}</button>
    {msg&&<div className="admin-save-message">{msg}</div>}
  </div>;
}
