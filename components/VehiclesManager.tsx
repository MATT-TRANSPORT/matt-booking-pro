"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

function daysUntil(date?:string|null){
  if(!date)return null;
  const a=new Date();a.setHours(0,0,0,0);
  const b=new Date(`${date}T00:00:00`);
  return Math.ceil((b.getTime()-a.getTime())/86400000);
}

export default function VehiclesManager({vehicles}:{vehicles:any[]}) {
  const router=useRouter();
  const empty={id:"",name:"",registration:"",color:"",seats:4,type:"car",mileage:"",inspectionDate:"",insuranceDate:"",notes:"",active:true};
  const [form,setForm]=useState<any>(empty);
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);

  function edit(x:any){setForm({id:x.id,name:x.name||"",registration:x.registration||"",color:x.color||"",seats:x.seats||4,type:x.type||"car",mileage:x.mileage??"",inspectionDate:x.inspection_date||"",insuranceDate:x.insurance_date||"",notes:x.notes||"",active:x.active!==false});window.scrollTo({top:0,behavior:"smooth"});}
  async function save(){
    if(!form.name||!form.registration){setMessage("Podaj nazwę i rejestrację.");return}
    setSaving(true);
    const r=await fetch("/api/admin/vehicles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:form.id?"update":"create",...form})});
    const d=await r.json(); if(!r.ok){setMessage(d.error??"Błąd zapisu.");setSaving(false);return}
    setMessage(form.id?"✓ Pojazd zaktualizowany.":"✓ Pojazd dodany."); setForm(empty); setSaving(false); router.refresh();
  }

  return <>
    <div className="card">
      <h2>{form.id?"Edytuj pojazd":"Dodaj pojazd"}</h2>
      <div className="grid">
        <label>Nazwa / model<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label>Rejestracja<input value={form.registration} onChange={e=>setForm({...form,registration:e.target.value.toUpperCase()})}/></label>
        <label>Kolor<input value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></label>
        <label>Liczba miejsc<input type="number" min={1} max={60} value={form.seats} onChange={e=>setForm({...form,seats:Number(e.target.value)})}/></label>
        <label>Typ<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="car">Samochód</option><option value="bus">Bus</option><option value="coach">Autokar</option></select></label>
        <label>Przebieg (km)<input type="number" min={0} value={form.mileage} onChange={e=>setForm({...form,mileage:e.target.value})}/></label>
        <label>Przegląd ważny do<input type="date" value={form.inspectionDate} onChange={e=>setForm({...form,inspectionDate:e.target.value})}/></label>
        <label>Ubezpieczenie ważne do<input type="date" value={form.insuranceDate} onChange={e=>setForm({...form,insuranceDate:e.target.value})}/></label>
      </div>
      <label style={{marginTop:12}}>Uwagi<textarea rows={3} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      {form.id&&<label style={{marginTop:12}}>Status<select value={form.active?"1":"0"} onChange={e=>setForm({...form,active:e.target.value==="1"})}><option value="1">Aktywny</option><option value="0">Nieaktywny</option></select></label>}
      <div className="manager-actions"><button className="btn" disabled={saving} onClick={save}>{saving?"ZAPISYWANIE...":form.id?"ZAPISZ ZMIANY":"DODAJ POJAZD"}</button>{form.id&&<button className="btn secondary" onClick={()=>setForm(empty)}>ANULUJ</button>}</div>
      {message&&<div className="admin-save-message">{message}</div>}
    </div>
    <div className="card" style={{marginTop:18}}>
      <h2>Pojazdy</h2>
      <table className="table"><thead><tr><th>Pojazd</th><th>Rejestracja</th><th>Przegląd</th><th>Ubezpieczenie</th><th>Status</th><th></th></tr></thead>
      <tbody>{vehicles.map((x:any)=>{const a=daysUntil(x.inspection_date),b=daysUntil(x.insurance_date);return <tr key={x.id}><td><strong>{x.name}</strong><br/><span className="muted">{x.color||"—"} · {x.seats} miejsc</span></td><td>{x.registration}</td><td><Expiry date={x.inspection_date} days={a}/></td><td><Expiry date={x.insurance_date} days={b}/></td><td>{x.active===false?"Nieaktywny":"Aktywny"}</td><td><button className="btn secondary company-small-btn" onClick={()=>edit(x)}>EDYTUJ</button></td></tr>})}</tbody></table>
    </div>
  </>;
}
function Expiry({date,days}:{date?:string|null;days:number|null}){if(!date)return <span className="muted">Brak daty</span>;const cls=days!==null&&days<0?"expiry danger":days!==null&&days<=30?"expiry warning":"expiry ok";return <div className={cls}><strong>{date}</strong><small>{days===null?"":days<0?`${Math.abs(days)} dni po terminie`:`${days} dni`}</small></div>}
