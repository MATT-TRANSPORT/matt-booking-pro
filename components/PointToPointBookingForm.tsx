"use client";

import { useEffect, useState } from "react";

type Suggestion = { placeId?: string; text?: string };

export default function PointToPointBookingForm(){
  const [originAddress,setOriginAddress]=useState("");
  const [destinationAddress,setDestinationAddress]=useState("");
  const [originSuggestions,setOriginSuggestions]=useState<Suggestion[]>([]);
  const [destinationSuggestions,setDestinationSuggestions]=useState<Suggestion[]>([]);
  const [travelDate,setTravelDate]=useState("");
  const [travelTime,setTravelTime]=useState("");
  const [roundtrip,setRoundtrip]=useState(false);
  const [returnDate,setReturnDate]=useState("");
  const [returnTime,setReturnTime]=useState("");
  const [passengers,setPassengers]=useState(1);
  const [vehicleType,setVehicleType]=useState<"car"|"bus"|"coach">("car");
  const [customerName,setCustomerName]=useState("");
  const [phone,setPhone]=useState("");
  const [email,setEmail]=useState("");
  const [invoiceRequired,setInvoiceRequired]=useState(false);
  const [companyNip,setCompanyNip]=useState("");
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [success,setSuccess]=useState<any>(null);

  useEffect(()=>{
    if(passengers>8)setVehicleType("coach");
    else if(passengers>3&&vehicleType==="car")setVehicleType("bus");
  },[passengers,vehicleType]);

  useEffect(()=>{
    if(originAddress.trim().length<3){setOriginSuggestions([]);return;}
    const timer=setTimeout(async()=>{try{const r=await fetch(`/api/places?q=${encodeURIComponent(originAddress)}`);const d=await r.json();setOriginSuggestions(d.suggestions??[]);}catch{setOriginSuggestions([]);}},350);
    return()=>clearTimeout(timer);
  },[originAddress]);

  useEffect(()=>{
    if(destinationAddress.trim().length<3){setDestinationSuggestions([]);return;}
    const timer=setTimeout(async()=>{try{const r=await fetch(`/api/places?q=${encodeURIComponent(destinationAddress)}`);const d=await r.json();setDestinationSuggestions(d.suggestions??[]);}catch{setDestinationSuggestions([]);}},350);
    return()=>clearTimeout(timer);
  },[destinationAddress]);

  async function submit(){
    if(!originAddress.trim()||!destinationAddress.trim()||!travelDate||!travelTime||!customerName.trim()||!phone.trim()||!email.trim()){
      setMessage("Uzupełnij wymagane pola.");return;
    }
    if(roundtrip&&(!returnDate||!returnTime)){setMessage("Podaj datę i godzinę powrotu.");return;}
    if(invoiceRequired&&companyNip.replace(/\D/g,"").length!==10){setMessage("Podaj poprawny 10-cyfrowy NIP.");return;}
    setSaving(true);setMessage("");
    try{
      const r=await fetch("/api/point-to-point-bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({originAddress,destinationAddress,travelDate,travelTime,roundtrip,returnDate,returnTime,passengers,vehicleType,customerName,phone,email,invoiceRequired,companyNip,notes})});
      const d=await r.json();
      if(!r.ok){setMessage(d.error||"Nie udało się wysłać zgłoszenia.");return;}
      setSuccess(d);window.scrollTo({top:0,behavior:"smooth"});
    }catch{setMessage("Nie udało się połączyć z systemem rezerwacji.");}
    finally{setSaving(false);}
  }

  if(success)return <div className="booking-success-card">
    <div className="success-check">✓</div>
    <span className="badge">TRANSPORT A → B</span>
    <h1>Dziękujemy! Zapytanie przyjęte</h1>
    <div className="pending-confirmation-badge">🕐 OCZEKUJE NA WYCENĘ I POTWIERDZENIE</div>
    <div className="success-number"><span>Numer zgłoszenia</span><strong>{success.booking_number}</strong></div>
    <div className="success-details"><div><span>Trasa</span><strong>{success.route}</strong></div><div><span>Dystans</span><strong>{Number(success.distance_km||0).toFixed(1)} km</strong></div><div><span>Wycena</span><strong>Indywidualna</strong></div></div>
    <div className="client-next-step"><strong>Co dalej?</strong><p>Sprawdzimy dostępność pojazdu i przygotujemy cenę. Po weryfikacji skontaktujemy się z Tobą telefonicznie lub e-mailem.</p></div>
    <div className="success-actions"><a className="btn" href="/booking">WRÓĆ DO WYBORU USŁUG</a></div>
  </div>;

  return <div className="card">
    <span className="badge">🚐 TRANSPORT POZOSTAŁY</span>
    <h1>Transport z punktu A do punktu B</h1>
    <p className="muted">Podaj trasę i termin. Ten rodzaj transportu wyceniamy indywidualnie po sprawdzeniu dostępności odpowiedniego pojazdu.</p>

    <h2>Trasa</h2>
    <div className="grid">
      <label>Punkt A · adres odbioru *
        <input autoComplete="off" value={originAddress} onChange={e=>setOriginAddress(e.target.value)} placeholder="Wpisz adres początkowy"/>
        {originSuggestions.length>0&&<div className="address-suggestions">{originSuggestions.slice(0,5).map((s,i)=><button type="button" key={s.placeId??i} onClick={()=>{setOriginAddress(s.text??"");setOriginSuggestions([]);}}>{s.text}</button>)}</div>}
      </label>
      <label>Punkt B · adres docelowy *
        <input autoComplete="off" value={destinationAddress} onChange={e=>setDestinationAddress(e.target.value)} placeholder="Wpisz adres docelowy"/>
        {destinationSuggestions.length>0&&<div className="address-suggestions">{destinationSuggestions.slice(0,5).map((s,i)=><button type="button" key={s.placeId??i} onClick={()=>{setDestinationAddress(s.text??"");setDestinationSuggestions([]);}}>{s.text}</button>)}</div>}
      </label>
    </div>

    <h2>Termin i pojazd</h2>
    <div className="grid">
      <label>Data wyjazdu *<input type="date" value={travelDate} onChange={e=>setTravelDate(e.target.value)}/></label>
      <label>Godzina wyjazdu *<input type="time" value={travelTime} onChange={e=>setTravelTime(e.target.value)}/></label>
      <label>Liczba pasażerów *<input type="number" min={1} max={30} value={passengers} onChange={e=>setPassengers(Math.max(1,Math.min(30,Number(e.target.value)||1)))}/></label>
      <label>Pojazd *
        <select value={vehicleType} onChange={e=>setVehicleType(e.target.value as any)}>
          <option value="car">Samochód osobowy · do 3 pasażerów</option>
          <option value="bus">Bus · do 8 pasażerów</option>
          <option value="coach">Autokar SCANIA · do 30 pasażerów</option>
        </select>
      </label>
    </div>
    <label style={{marginTop:14,display:"flex",gap:10,alignItems:"center"}}><input type="checkbox" checked={roundtrip} onChange={e=>setRoundtrip(e.target.checked)} style={{width:"auto"}}/> Potrzebuję również transportu powrotnego</label>
    {roundtrip&&<div className="grid" style={{marginTop:12}}><label>Data powrotu *<input type="date" value={returnDate} onChange={e=>setReturnDate(e.target.value)}/></label><label>Godzina powrotu *<input type="time" value={returnTime} onChange={e=>setReturnTime(e.target.value)}/></label></div>}

    <h2>Dane kontaktowe</h2>
    <div className="grid">
      <label>Imię i nazwisko *<input value={customerName} onChange={e=>setCustomerName(e.target.value)}/></label>
      <label>Telefon *<input value={phone} onChange={e=>setPhone(e.target.value)}/></label>
      <label>E-mail *<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
    </div>
    <label style={{marginTop:14,display:"flex",gap:10,alignItems:"center"}}><input type="checkbox" checked={invoiceRequired} onChange={e=>setInvoiceRequired(e.target.checked)} style={{width:"auto"}}/> Potrzebuję faktury VAT</label>
    {invoiceRequired&&<label style={{marginTop:12}}>NIP *<input inputMode="numeric" value={companyNip} onChange={e=>setCompanyNip(e.target.value.replace(/\D/g,"").slice(0,10))}/></label>}
    <label style={{marginTop:14}}>Uwagi (opcjonalnie)<textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Bagaż, sprzęt, dodatkowe wymagania, charakter przewozu..."/></label>

    <div className="card" style={{marginTop:18,borderColor:"#7a6231"}}><strong>Wycena indywidualna</strong><p className="muted" style={{marginBottom:0}}>Po wysłaniu zgłoszenia obliczymy trasę, sprawdzimy dostępność pojazdu i potwierdzimy cenę. Minimalne wyprzedzenie rezerwacji online: 24 godziny.</p></div>
    {message&&<div className="booking-error">{message}</div>}
    <button className="btn" style={{width:"100%",marginTop:16}} disabled={saving} onClick={submit}>{saving?"WYSYŁANIE...":"WYŚLIJ ZAPYTANIE O TRANSPORT"}</button>
  </div>;
}
