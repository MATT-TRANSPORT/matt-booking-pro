"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DriversManager({drivers}:{drivers:any[]}) {
  const router=useRouter();
  const empty={id:"",fullName:"",phone:"",email:"",licenseNumber:"",userId:"",notes:"",color:"#D6AD55",active:true};
  const [form,setForm]=useState<any>(empty);
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);

  function edit(x:any){
    setForm({id:x.id,fullName:x.full_name||"",phone:x.phone||"",email:x.email||"",licenseNumber:x.license_number||"",userId:x.user_id||"",notes:x.notes||"",color:x.color||"#D6AD55",active:x.active!==false});
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function save(){
    if(!form.fullName){setMessage("Podaj imię i nazwisko.");return}
    setSaving(true);
    const r=await fetch("/api/admin/drivers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:form.id?"update":"create",...form})});
    const d=await r.json();
    if(!r.ok){setMessage(d.error??"Błąd zapisu.");setSaving(false);return}
    setMessage(form.id?"✓ Kierowca zaktualizowany.":"✓ Kierowca dodany.");
    setForm(empty); setSaving(false); router.refresh();
  }

  return <>
    <div className="card">
      <h2>{form.id?"Edytuj kierowcę":"Dodaj kierowcę"}</h2>
      <div className="grid">
        <label>Imię i nazwisko<input value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></label>
        <label>Telefon<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
        <label>E-mail<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
        <label>Numer prawa jazdy<input value={form.licenseNumber} onChange={e=>setForm({...form,licenseNumber:e.target.value})}/></label>
        <label>Kolor kierowcy<input type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></label><label>UUID konta logowania<input value={form.userId} onChange={e=>setForm({...form,userId:e.target.value})} placeholder="Supabase Auth user UUID"/></label>
      </div>
      <label style={{marginTop:12}}>Uwagi<textarea rows={3} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      {form.id&&<label style={{marginTop:12}}>Status<select value={form.active?"1":"0"} onChange={e=>setForm({...form,active:e.target.value==="1"})}><option value="1">Aktywny</option><option value="0">Nieaktywny</option></select></label>}
      <div className="manager-actions"><button className="btn" disabled={saving} onClick={save}>{saving?"ZAPISYWANIE...":form.id?"ZAPISZ ZMIANY":"DODAJ KIEROWCĘ"}</button>{form.id&&<button className="btn secondary" onClick={()=>setForm(empty)}>ANULUJ</button>}</div>
      {message&&<div className="admin-save-message">{message}</div>}
    </div>
    <div className="card" style={{marginTop:18}}>
      <h2>Kierowcy</h2>
      <table className="table"><thead><tr><th>Kierowca</th><th>Telefon</th><th>E-mail</th><th>Status</th><th></th></tr></thead>
      <tbody>{drivers.map((x:any)=><tr key={x.id}><td><span className="driver-color-dot" style={{background:x.color||"#D6AD55"}}/><strong>{x.full_name}</strong></td><td>{x.phone||"—"}</td><td>{x.email||"—"}</td><td>{x.active===false?"Nieaktywny":"Aktywny"}</td><td><button className="btn secondary company-small-btn" onClick={()=>edit(x)}>EDYTUJ</button></td></tr>)}</tbody></table>
    </div>
  </>;
}
