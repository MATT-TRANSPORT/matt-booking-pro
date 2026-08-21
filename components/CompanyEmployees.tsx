"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

function txt(value:any){
  return value === null || value === undefined
    ? ""
    : String(value);
}

export default function CompanyEmployees({employees}:{employees:any[]}) {
  const safeEmployees = Array.isArray(employees)
    ? employees.filter(Boolean)
    : [];
  const router=useRouter();
  const [form,setForm]=useState({firstName:"",lastName:"",phone:"",email:"",defaultAddress:"",department:""});
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);

  async function add(){
    if(!form.firstName||!form.lastName){setMessage("Podaj imię i nazwisko.");return}
    setSaving(true);
    const r=await fetch("/api/company/employees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create",...form})});
    const d=await r.json();
    if(!r.ok){setMessage(d.error??"Błąd zapisu.");setSaving(false);return}
    setForm({firstName:"",lastName:"",phone:"",email:"",defaultAddress:"",department:""});
    setMessage("✓ Pracownik dodany.");setSaving(false);router.refresh();
  }

  async function toggle(id:string,active:boolean){
    const r=await fetch("/api/company/employees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"toggle",id,active:!active})});
    const d=await r.json(); if(!r.ok){setMessage(d.error??"Błąd.");return} router.refresh();
  }

  return <>
    <div className="card"><h2>Dodaj pracownika</h2><div className="grid">
      <label>Imię<input value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/></label>
      <label>Nazwisko<input value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/></label>
      <label>Telefon<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
      <label>E-mail<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label>Domyślny adres<input value={form.defaultAddress} onChange={e=>setForm({...form,defaultAddress:e.target.value})}/></label>
      <label>Dział<input value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/></label>
    </div><button className="btn" style={{marginTop:16}} disabled={saving} onClick={add}>{saving?"ZAPISYWANIE...":"DODAJ PRACOWNIKA"}</button>{message&&<div className="admin-save-message">{message}</div>}</div>
    <div className="card" style={{marginTop:18}}><h2>Pracownicy</h2><table className="table"><thead><tr><th>Pracownik</th><th>Kontakt</th><th>Dział</th><th>Adres</th><th>Status</th></tr></thead>
    <tbody>{safeEmployees.map(x=><tr key={x.id}><td><strong>{txt(x.first_name)} {txt(x.last_name)}</strong></td><td>{txt(x.phone)||"—"}<br/><span className="muted">{txt(x.email)||"—"}</span></td><td>{txt(x.department)||"—"}</td><td>{txt(x.default_address)||"—"}</td><td><button className="btn secondary company-small-btn" onClick={()=>toggle(x.id,x.active)}>{x.active?"Aktywny":"Nieaktywny"}</button></td></tr>)}</tbody></table></div>
  </>;
}
