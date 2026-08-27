"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export default function CompanyCreateForm(){
  const router=useRouter();const [open,setOpen]=useState(false);const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");
  const [f,setF]=useState({name:"",nip:"",email:"",phone:"",contactPerson:"",paymentDays:14,freeKm:40,defaultPayment:"company_transfer",notes:"",createPortal:true});
  async function save(){if(!f.name){setMessage("Podaj nazwę firmy.");return}setSaving(true);
    const r=await fetch("/api/admin/companies",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create",...f})});const d=await r.json();
    if(!r.ok){setMessage(d.error??"Błąd zapisu.");setSaving(false);return}if(f.createPortal&&f.email){await fetch("/api/admin/portal-access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"company",id:d.id})});}window.location.href=`/panel/firmy/${d.id}`;
  }
  return <div className="company-create-wrap"><button className="btn" onClick={()=>setOpen(!open)}>+ DODAJ FIRMĘ</button>
    {open&&<div className="card company-create-form"><h2>Nowa firma</h2><div className="grid">
      <label>Nazwa firmy *<input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></label><label>NIP<input value={f.nip} onChange={e=>setF({...f,nip:e.target.value})}/></label>
      <label>E-mail<input type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></label><label>Telefon<input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></label>
      <label>Osoba kontaktowa<input value={f.contactPerson} onChange={e=>setF({...f,contactPerson:e.target.value})}/></label><label>Termin płatności<input type="number" value={f.paymentDays} onChange={e=>setF({...f,paymentDays:Number(e.target.value)})}/></label>
      <label>Startowy limit bez dopłaty (km)<input type="number" value={f.freeKm} onChange={e=>setF({...f,freeKm:Number(e.target.value)})}/></label>
      <label>Domyślna płatność<select value={f.defaultPayment} onChange={e=>setF({...f,defaultPayment:e.target.value})}><option value="company_transfer">Przelew firmowy</option><option value="employee_payment">Płatność online firmy</option></select></label>
    </div><label className="portal-create-toggle"><input type="checkbox" checked={f.createPortal} onChange={e=>setF({...f,createPortal:e.target.checked})}/> Utwórz konto administratora firmy i wyślij link do ustawienia hasła</label><label style={{marginTop:12}}>Notatki wewnętrzne<textarea rows={3} value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></label>
    <p className="muted">Po utworzeniu firmy ustaw siedzibę kontrahenta i pełny cennik w sekcji B2B PRO → Warunki handlowe.</p>{message&&<div className="booking-error">{message}</div>}<button className="btn" onClick={save} disabled={saving}>{saving?"ZAPISYWANIE...":"UTWÓRZ FIRMĘ"}</button></div>}
  </div>
}
