"use client";import {useState} from "react";import {useRouter} from "next/navigation";
export default function CompanyTermsEditor({company}:{company:any}){
 const router=useRouter();const [saving,setSaving]=useState(false);const [msg,setMsg]=useState("");
 const [f,setF]=useState({paymentDays:company.payment_days??14,discount:company.discount_percent??0,freeKm:company.free_pickup_km??40,defaultPayment:company.default_payment_method??"company_transfer",useCustomPricing:!!company.use_custom_pricing,notes:company.internal_notes??""});
 async function save(){setSaving(true);const r=await fetch("/api/admin/companies",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"terms",id:company.id,...f})});const d=await r.json();setMsg(r.ok?"✓ Warunki zapisane.":d.error??"Błąd.");setSaving(false);if(r.ok)router.refresh();}
 return <div className="card"><h2>Warunki handlowe</h2><div className="grid">
  <label>Termin płatności (dni)<input type="number" value={f.paymentDays} onChange={e=>setF({...f,paymentDays:Number(e.target.value)})}/></label>
  <label>Rabat %<input type="number" step="0.1" value={f.discount} onChange={e=>setF({...f,discount:Number(e.target.value)})}/></label>
  <label>Darmowy dojazd (km)<input type="number" value={f.freeKm} onChange={e=>setF({...f,freeKm:Number(e.target.value)})}/></label>
  <label>Domyślna płatność<select value={f.defaultPayment} onChange={e=>setF({...f,defaultPayment:e.target.value})}><option value="company_transfer">Przelew firmowy</option><option value="employee_payment">Płatność pracownika</option></select></label>
  <label>Cennik indywidualny<select value={f.useCustomPricing?"1":"0"} onChange={e=>setF({...f,useCustomPricing:e.target.value==="1"})}><option value="0">Wyłączony</option><option value="1">Włączony</option></select></label>
 </div><label style={{marginTop:12}}>Notatki handlowe<textarea rows={4} value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></label>
 <button className="btn" disabled={saving} onClick={save}>{saving?"ZAPISYWANIE...":"ZAPISZ WARUNKI"}</button>{msg&&<div className="admin-save-message">{msg}</div>}</div>
}
