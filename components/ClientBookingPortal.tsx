"use client";

import { useEffect, useState } from "react";

const STATUS: Record<string,string> = {
  pending:"Oczekuje na potwierdzenie",
  confirmed:"Potwierdzona",
  assigned:"Kierowca przypisany",
  in_progress:"Kierowca w drodze",
  arrived:"Kierowca na miejscu",
  picked_up:"Pasażer odebrany",
  completed:"Zakończona",
  cancelled:"Anulowana"
};

export default function ClientBookingPortal({ token }: { token:string }) {
  const [data,setData] = useState<any>(null);
  const [form,setForm] = useState<any>(null);
  const [message,setMessage] = useState("");
  const [saving,setSaving] = useState(false);

  useEffect(()=>{
    fetch(`/api/client-booking/${token}`)
      .then(r=>r.json().then(d=>({ok:r.ok,d})))
      .then(({ok,d})=>{
        if(!ok){setMessage(d.error||"Nie znaleziono rezerwacji.");return;}
        setData(d);
        const b=d.booking;
        setForm({
          pickupAddress:b.pickup_address||"",
          travelDate:b.travel_date||"",
          travelTime:b.travel_time||"",
          returnDate:b.return_date||"",
          returnTime:b.return_time||"",
          flightNumber:b.flight_number||"",
          returnFlightNumber:b.return_flight_number||"",
          passengers:b.passengers||1,
          vehicleType:b.vehicle_type||"car",
          invoiceRequired:!!b.invoice_required,
          companyNip:b.company_nip||"",
          notes:b.notes||""
        });
      });
  },[token]);

  async function save(){
    setSaving(true); setMessage("");
    const r=await fetch(`/api/client-booking/${token}`,{
      method:"PATCH",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(form)
    });
    const d=await r.json();
    if(!r.ok){setMessage(d.error||"Nie udało się zapisać zmian.");setSaving(false);return;}
    setData((old:any)=>({...old,booking:d.booking,editable:true}));
    setMessage(d.requiresReconfirmation
      ?"Zmiany zapisane. Rezerwacja oczekuje teraz na ponowne potwierdzenie przez MATT TRANSPORT."
      :"Zmiany zostały zapisane.");
    setSaving(false);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  if(message && !data) return <main className="container client-portal-shell"><div className="card"><h1>Twoja rezerwacja</h1><div className="booking-error">{message}</div></div></main>;
  if(!data||!form) return <main className="container client-portal-shell"><div className="card"><h1>Ładowanie rezerwacji…</h1></div></main>;

  const b=data.booking;
  const editable=data.editable && !["in_progress","arrived","picked_up","completed","cancelled"].includes(b.status);
  const driver=Array.isArray(b.drivers)?b.drivers[0]:b.drivers;
  const vehicle=Array.isArray(b.vehicles)?b.vehicles[0]:b.vehicles;

  return <main className="container client-portal-shell">
    <div className="card client-portal-hero">
      <span className="badge">MATT TRANSPORT</span>
      <h1>Rezerwacja {b.booking_number}</h1>
      <div className={`client-booking-status ${b.status}`}>{STATUS[b.status]||b.status}</div>
      <p className="muted">Tutaj możesz sprawdzić szczegóły swojej rezerwacji{editable?" i wprowadzić dozwolone zmiany.":"."}</p>
    </div>

    <div className="client-portal-grid">
      <section className="card">
        <h2>Szczegóły przejazdu</h2>
        <div className="grid">
          <label>Adres
            <input disabled={!editable} value={form.pickupAddress} onChange={e=>setForm({...form,pickupAddress:e.target.value})}/>
          </label>
          <label>Data
            <input disabled={!editable} type="date" value={form.travelDate} onChange={e=>setForm({...form,travelDate:e.target.value})}/>
          </label>
          <label>Godzina
            <input disabled={!editable} type="time" value={form.travelTime} onChange={e=>setForm({...form,travelTime:e.target.value})}/>
          </label>
          <label>Numer lotu
            <input disabled={!editable} value={form.flightNumber} onChange={e=>setForm({...form,flightNumber:e.target.value})}/>
          </label>
          <label>Pasażerowie
            <select disabled={!editable} value={form.passengers} onChange={e=>{const p=Number(e.target.value);setForm({...form,passengers:p,vehicleType:p>3?"bus":form.vehicleType})}}>
              {[1,2,3,4,5,6,7,8].map(n=><option key={n}>{n}</option>)}
            </select>
          </label>
          <label>Pojazd
            <select disabled={!editable} value={form.vehicleType} onChange={e=>setForm({...form,vehicleType:e.target.value})}>
              <option value="car" disabled={form.passengers>3}>Samochód osobowy</option>
              <option value="bus">Bus do 8 osób</option>
            </select>
          </label>
          {b.service_type==="roundtrip"&&<>
            <label>Data powrotu<input disabled={!editable} type="date" value={form.returnDate} onChange={e=>setForm({...form,returnDate:e.target.value})}/></label>
            <label>Godzina powrotu<input disabled={!editable} type="time" value={form.returnTime} onChange={e=>setForm({...form,returnTime:e.target.value})}/></label>
            <label>Lot powrotny<input disabled={!editable} value={form.returnFlightNumber} onChange={e=>setForm({...form,returnFlightNumber:e.target.value})}/></label>
          </>}
        </div>

        <label style={{marginTop:14}}>Uwagi
          <textarea disabled={!editable} rows={4} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
        </label>

        <div className="grid" style={{marginTop:14}}>
          <label>Faktura VAT
            <select disabled={!editable} value={form.invoiceRequired?"1":"0"} onChange={e=>setForm({...form,invoiceRequired:e.target.value==="1"})}>
              <option value="0">Nie</option><option value="1">Tak</option>
            </select>
          </label>
          {form.invoiceRequired&&<label>NIP<input disabled={!editable} inputMode="numeric" maxLength={10} value={form.companyNip} onChange={e=>setForm({...form,companyNip:e.target.value.replace(/\D/g,"").slice(0,10)})}/></label>}
        </div>

        {editable&&<div className="client-edit-warning">
          Zmiana adresu, daty lub godziny powoduje ponowne sprawdzenie rezerwacji przez MATT TRANSPORT.
        </div>}

        {message&&<div className={message.startsWith("Zmiany")?"client-success-message":"booking-error"}>{message}</div>}

        {editable&&<button className="btn" style={{width:"100%",marginTop:16}} disabled={saving} onClick={save}>{saving?"ZAPISYWANIE...":"ZAPISZ ZMIANY"}</button>}
      </section>

      <aside className="card client-booking-summary">
        <h2>Podsumowanie</h2>
        <div><span>Lotnisko</span><strong>{b.airport_label}</strong></div>
        <div><span>Kwota</span><strong>{Number(b.total_price).toFixed(2)} zł</strong></div>
        <div><span>Status</span><strong>{STATUS[b.status]||b.status}</strong></div>
        {vehicle&&<div><span>Pojazd</span><strong>{vehicle.name} · {vehicle.registration}</strong></div>}
        {driver&&<div><span>Kierowca</span><strong>{driver.full_name}</strong></div>}
        {driver?.phone&&<a className="btn secondary" href={`tel:${driver.phone}`}>📞 ZADZWOŃ DO KIEROWCY</a>}
        <a className="btn secondary" href="tel:+48691242691">📞 MATT TRANSPORT</a>
      </aside>
    </div>
  </main>;
}
