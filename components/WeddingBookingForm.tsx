"use client";
import { useEffect, useState } from "react";

export default function WeddingBookingForm(){
  const [form,setForm]=useState({
    customerName:"",startDate:"",startTime:"",
    restaurantName:"",restaurantAddress:"",
    vehiclesCount:1,vehicleTypes:["bus"] as ("car"|"bus")[],phone:"",email:"",notes:""
  });
  const [restaurantSuggestions,setRestaurantSuggestions]=useState<any[]>([]);

  useEffect(()=>{
    if(form.restaurantAddress.trim().length<3){setRestaurantSuggestions([]);return;}
    const timer=setTimeout(async()=>{
      try{
        const r=await fetch(`/api/places?q=${encodeURIComponent(form.restaurantAddress)}`);
        const d=await r.json();
        setRestaurantSuggestions(d.suggestions??[]);
      }catch{setRestaurantSuggestions([]);}
    },350);
    return()=>clearTimeout(timer);
  },[form.restaurantAddress]);
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
      <label className="wedding-address-field">Adres restauracji *
        <input autoComplete="off" value={form.restaurantAddress} onChange={e=>setForm({...form,restaurantAddress:e.target.value})}/>
        {restaurantSuggestions.length>0&&<div className="address-suggestions">
          {restaurantSuggestions.slice(0,5).map((s:any,i:number)=><button type="button" key={s.placeId??i} onClick={()=>{
            setForm({...form,restaurantAddress:s.text??""});setRestaurantSuggestions([]);
          }}>{s.text}</button>)}
        </div>}
      </label>
      <label>Ilość pojazdów *
        <input type="number" min={1} max={20} value={form.vehiclesCount} onChange={e=>{
          const n=Math.max(1,Math.min(20,Number(e.target.value)||1));
          const types=Array.from({length:n},(_,i)=>form.vehicleTypes[i]??"bus");
          setForm({...form,vehiclesCount:n,vehicleTypes:types});
        }}/>
      </label>
      <label>Numer telefonu *<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
      <label>Adres e-mail *<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    </div>
    <div className="wedding-vehicle-types">
      <h3>Pojazdy</h3>
      {form.vehicleTypes.map((type,i)=><div className="wedding-vehicle-row" key={i}>
        <strong>Pojazd {i+1}</strong>
        <select value={type} onChange={e=>{
          const vehicleTypes=[...form.vehicleTypes];
          vehicleTypes[i]=e.target.value as "car"|"bus";
          setForm({...form,vehicleTypes});
        }}>
          <option value="car">Samochód osobowy</option>
          <option value="bus">Bus 9-osobowy</option>
        </select>
      </div>)}
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
