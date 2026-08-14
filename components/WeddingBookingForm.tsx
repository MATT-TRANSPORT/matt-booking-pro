"use client";
import { useState } from "react";

export default function WeddingBookingForm(){
  const [form,setForm]=useState({
    customerName:"",startDate:"",startTime:"",
    restaurantName:"",restaurantAddress:"",
    vehiclesCount:1,phone:"",email:"",notes:""
  });
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [success,setSuccess]=useState<any>(null);

  async function submit(){
    if(!form.customerName||!form.startDate||!form.startTime||!form.restaurantName||
       !form.restaurantAddress||!form.phone||!form.email){
      setMessage("Uzupełnij wymagane pola."); return;
    }
    setSaving(true); setMessage("");
    const res=await fetch("/api/wedding-bookings",{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)
    });
    const data=await res.json();
    if(!res.ok){setMessage(data.error??"Nie udało się wysłać zgłoszenia.");setSaving(false);return;}
    setSuccess(data);setSaving(false);window.scrollTo({top:0,behavior:"smooth"});
  }

  if(success) return <div className="booking-success-card wedding-success">
    <div className="success-check">💍</div>
    <span className="badge wedding-badge">TRANSPORT WESELNY</span>
    <h1>Dziękujemy za przesłanie danych!</h1>
    <p className="success-lead">Zgłoszenie <strong>{success.booking_number}</strong> zostało zapisane.</p>
    <div className="client-next-step">
      <strong>Co dalej?</strong>
      <p>Na podstawie przesłanych informacji przygotujemy umowę i prześlemy ją na podany adres e-mail.</p>
      <p>Jeżeli będziemy potrzebowali dodatkowych informacji, skontaktujemy się telefonicznie.</p>
    </div>
    <a className="btn" href="/booking">WRÓĆ DO REZERWACJI</a>
  </div>;

  return <div className="card wedding-form-card">
    <span className="badge wedding-badge">💍 TRANSPORT WESELNY</span>
    <h1>Dane do przygotowania umowy</h1>
    <p className="muted">Prześlij najważniejsze informacje. Po ich otrzymaniu przygotujemy umowę i prześlemy ją e-mailem.</p>
    <div className="grid">
      <label>Imię i nazwisko *<input value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/></label>
      <label>Data rozpoczęcia rozwozów *<input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label>
      <label>Godzina rozpoczęcia rozwozów *<input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label>
      <label>Nazwa restauracji *<input value={form.restaurantName} onChange={e=>setForm({...form,restaurantName:e.target.value})}/></label>
      <label>Adres restauracji *<input value={form.restaurantAddress} onChange={e=>setForm({...form,restaurantAddress:e.target.value})}/></label>
      <label>Ilość samochodów *<input type="number" min={1} max={20} value={form.vehiclesCount} onChange={e=>setForm({...form,vehiclesCount:Number(e.target.value)})}/></label>
      <label>Numer telefonu *<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
      <label>Adres e-mail *<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    </div>
    <label style={{marginTop:14}}>Dodatkowe informacje (opcjonalnie)
      <textarea rows={4} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
    </label>
    {message&&<div className="booking-error">{message}</div>}
    <button className="btn wedding-submit" disabled={saving} onClick={submit}>
      {saving?"WYSYŁANIE...":"WYŚLIJ DANE DO UMOWY"}
    </button>
  </div>;
}
