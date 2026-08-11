"use client";
import { useEffect,useMemo,useState } from "react";
import { PRICES } from "@/lib/pricing";

export default function CompanyBookingForm({employees}:{employees:any[]}) {
  const [employeeId,setEmployeeId]=useState("");
  const [serviceType,setServiceType]=useState<"to_airport"|"from_airport"|"roundtrip">("to_airport");
  const [address,setAddress]=useState("");
  const [airport,setAirport]=useState<keyof typeof PRICES>("balice");
  const [vehicle,setVehicle]=useState<"car"|"bus">("car");
  const [passengers,setPassengers]=useState(1);
  const [distanceKm,setDistanceKm]=useState(0);
  const [travelDate,setTravelDate]=useState(""); const [travelTime,setTravelTime]=useState("");
  const [returnDate,setReturnDate]=useState(""); const [returnTime,setReturnTime]=useState("");
  const [flightNumber,setFlightNumber]=useState(""); const [returnFlightNumber,setReturnFlightNumber]=useState("");
  const [notes,setNotes]=useState(""); const [suggestions,setSuggestions]=useState<any[]>([]);
  const [routeMessage,setRouteMessage]=useState("Wybierz pracownika lub wpisz adres.");
  const [message,setMessage]=useState(""); const [saving,setSaving]=useState(false); const [success,setSuccess]=useState<any>(null);
  const employee=employees.find(x=>x.id===employeeId);

  useEffect(()=>{if(employee?.default_address){setAddress(employee.default_address);routeFor(employee.default_address)}},[employeeId]);
  useEffect(()=>{if(passengers>3)setVehicle("bus")},[passengers]);
  useEffect(()=>{if(address.trim().length<3){setSuggestions([]);return} const t=setTimeout(async()=>{const r=await fetch(`/api/places?q=${encodeURIComponent(address)}`);const d=await r.json();setSuggestions(d.suggestions??[])},350);return()=>clearTimeout(t)},[address]);

  async function routeFor(v:string){
    const r=await fetch("/api/route",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({address:v})}); const d=await r.json();
    if(!r.ok){setDistanceKm(0);setRouteMessage(d.error??"Błąd trasy.");return}
    setDistanceKm(Number(d.distanceKm)); setRouteMessage(`✓ ${d.distanceKm} km od bazy · ${d.billableKm} km płatne`);
  }

  const quote=useMemo(()=>{const m=serviceType==="roundtrip"?2:1;const base=PRICES[airport][vehicle]*m;const extra=Math.max(0,distanceKm-20)*2.4*m;return{base,extra,total:base+extra}},[serviceType,airport,vehicle,distanceKm]);

  async function submit(){
    if(!employeeId){setMessage("Wybierz pracownika.");return}
    if(!address||!distanceKm||!travelDate||!travelTime){setMessage("Uzupełnij trasę i termin.");return}
    setSaving(true);setMessage("Zapisywanie...");
    const r=await fetch("/api/company/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({employeeId,serviceType,address,airport,vehicleType:vehicle,passengers,distanceKm,travelDate,travelTime,returnDate,returnTime,flightNumber,returnFlightNumber,notes})});
    const d=await r.json(); if(!r.ok){setMessage(d.error??"Błąd zapisu.");setSaving(false);return}
    setSuccess(d);setSaving(false);setMessage("");
  }

  if(success) return <div className="booking-success-card"><div className="success-check">✓</div><span className="badge">MATT BOOKING PRO ENTERPRISE</span><h1>Transport zamówiony</h1><p className="success-lead">Rezerwacja firmowa została przyjęta.</p><div className="success-number"><span>Numer rezerwacji</span><strong>{success.booking_number}</strong></div><div className="success-details"><div><span>Pasażer</span><strong>{employee?.first_name} {employee?.last_name}</strong></div><div><span>Status</span><strong>Oczekuje na potwierdzenie</strong></div><div><span>Kwota</span><strong>{Number(success.total_price).toFixed(2)} zł</strong></div></div><div className="success-actions"><a className="btn" href="/firma/nowa-rezerwacja">NOWA REZERWACJA</a><a className="btn secondary" href="/firma/rezerwacje">MOJE REZERWACJE</a></div></div>;

  return <div className="layout"><div className="card"><span className="badge">REZERWACJA B2B</span><h1>Nowy transport</h1>
    <h3>Pasażer</h3><label>Pracownik<select value={employeeId} onChange={e=>setEmployeeId(e.target.value)}><option value="">— Wybierz pracownika —</option>{employees.filter(x=>x.active!==false).map(x=><option key={x.id} value={x.id}>{x.first_name} {x.last_name}</option>)}</select></label>
    <h3>Rodzaj przejazdu</h3><div className="choice-grid">
      <button className={`choice ${serviceType==="to_airport"?"active":""}`} onClick={()=>setServiceType("to_airport")}><strong>🛫 Na lotnisko</strong></button>
      <button className={`choice ${serviceType==="from_airport"?"active":""}`} onClick={()=>setServiceType("from_airport")}><strong>🛬 Z lotniska</strong></button>
      <button className={`choice ${serviceType==="roundtrip"?"active":""}`} onClick={()=>setServiceType("roundtrip")}><strong>🔁 W obie strony</strong></button>
    </div>
    <h3>Trasa</h3><div className="grid"><label>Adres<input value={address} onChange={e=>setAddress(e.target.value)} autoComplete="off"/>{suggestions.length>0&&<div className="address-suggestions">{suggestions.slice(0,5).map((s:any,i:number)=><button key={s.placeId??i} type="button" onClick={()=>{const v=s.text??"";setAddress(v);setSuggestions([]);routeFor(v)}}>{s.text}</button>)}</div>}</label>
    <label>Lotnisko<select value={airport} onChange={e=>setAirport(e.target.value as keyof typeof PRICES)}>{Object.entries(PRICES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label></div>
    <div className={`route-status ${distanceKm?"ok":""}`}>{routeMessage}</div>
    <h3>Termin</h3><div className="grid"><label>Data<input type="date" value={travelDate} onChange={e=>setTravelDate(e.target.value)}/></label><label>Godzina<input type="time" value={travelTime} onChange={e=>setTravelTime(e.target.value)}/></label><label>Numer lotu<input value={flightNumber} onChange={e=>setFlightNumber(e.target.value)}/></label><label>Pasażerowie<select value={passengers} onChange={e=>setPassengers(Number(e.target.value))}>{[1,2,3,4,5,6,7,8].map(n=><option key={n}>{n}</option>)}</select></label>
    {serviceType==="roundtrip"&&<><label>Data powrotu<input type="date" value={returnDate} onChange={e=>setReturnDate(e.target.value)}/></label><label>Godzina powrotu<input type="time" value={returnTime} onChange={e=>setReturnTime(e.target.value)}/></label><label>Lot powrotny<input value={returnFlightNumber} onChange={e=>setReturnFlightNumber(e.target.value)}/></label></>}</div>
    <h3>Pojazd</h3><div className="choice-grid vehicle-grid"><button className={`choice ${vehicle==="car"?"active":""}`} disabled={passengers>3} onClick={()=>setVehicle("car")}><strong>Samochód osobowy</strong><small>Do 3 pasażerów</small></button><button className={`choice ${vehicle==="bus"?"active":""}`} onClick={()=>setVehicle("bus")}><strong>Bus do 8 osób</strong><small>Grupy / większy bagaż</small></button></div>
    <label style={{marginTop:18}}>Uwagi<textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
  </div><aside className="card summary"><h3>Podsumowanie B2B</h3><div className="row"><span>Pracownik</span><strong>{employee?`${employee.first_name} ${employee.last_name}`:"—"}</strong></div><div className="row"><span>Cena bazowa</span><strong>{quote.base.toFixed(2)} zł</strong></div><div className="row"><span>Dopłata</span><strong>{quote.extra.toFixed(2)} zł</strong></div><div className="row total"><span>Razem</span><strong>{quote.total.toFixed(2)} zł</strong></div><button className="btn" style={{width:"100%",marginTop:16}} disabled={saving} onClick={submit}>{saving?"ZAMAWIANIE...":"ZAMÓW TRANSPORT"}</button>{message&&<div className="admin-save-message">{message}</div>}</aside></div>;
}
