"use client";
import CustomerPushControls from "@/components/CustomerPushControls";

import { useEffect, useMemo, useState } from "react";
import { PRICES } from "@/lib/pricing";

type Suggestion = { placeId?: string; text?: string };
type AirportKey = keyof typeof PRICES | "other";

export default function BookingForm() {
  const [mobile, setMobile] = useState(false);
  const [step, setStep] = useState(1);

  const [serviceType,setServiceType] = useState<"to_airport"|"from_airport"|"roundtrip">("to_airport");
  const [address,setAddress] = useState("");
  const [airport,setAirport] = useState<AirportKey>("balice");
  const [otherAirport,setOtherAirport] = useState("");
  const [vehicle,setVehicle] = useState<"car"|"bus">("car");
  const [passengers,setPassengers] = useState(1);
  const [distanceKm,setDistanceKm] = useState(0);
  const [suggestions,setSuggestions] = useState<Suggestion[]>([]);
  const [travelDate,setTravelDate] = useState("");
  const [travelTime,setTravelTime] = useState("");
  const [returnDate,setReturnDate] = useState("");
  const [returnTime,setReturnTime] = useState("");
  const [flight,setFlight] = useState("");
  const [returnFlight,setReturnFlight] = useState("");
  const [name,setName] = useState("");
  const [phone,setPhone] = useState("");
  const [email,setEmail] = useState("");
  const [invoice,setInvoice] = useState(false);
  const [paymentMethod,setPaymentMethod] = useState<"cash"|"bank_transfer"|"online">("cash");
  const onlinePaymentRequested = paymentMethod === "online";
  const [nip,setNip] = useState("");
  const [notes,setNotes] = useState("");
  const [message,setMessage] = useState("");
  const [saving,setSaving] = useState(false);
  const [success,setSuccess] = useState<any>(null);

  useEffect(()=>{
    const f=()=>setMobile(window.innerWidth<=900);
    f(); window.addEventListener("resize",f);
    return()=>window.removeEventListener("resize",f);
  },[]);

  useEffect(()=>{ if(passengers>3) setVehicle("bus"); },[passengers]);

  useEffect(()=>{
    if(address.trim().length<3){ setSuggestions([]); return; }
    const timer=setTimeout(async()=>{
      try{
        const r=await fetch(`/api/places?q=${encodeURIComponent(address)}`);
        const d=await r.json();
        setSuggestions(d.suggestions??[]);
      }catch{ setSuggestions([]); }
    },350);
    return()=>clearTimeout(timer);
  },[address]);

  async function chooseAddress(value:string){
    setAddress(value); setSuggestions([]);
    const r=await fetch("/api/route",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({address:value})});
    const d=await r.json();
    if(r.ok) setDistanceKm(Number(d.distanceKm));
  }

  const standardAirport = airport!=="other";
  const item = standardAirport ? PRICES[airport as keyof typeof PRICES] : null;
  const quote = useMemo(()=>{
    if(!item) return {base:0,extra:0,vat:0,total:0};
    const m=serviceType==="roundtrip"?2:1;
    const base=item[vehicle]*m;
    const extra=Math.max(0,distanceKm-40)*2.4*m;
    const subtotal=base+extra;
    const vat=invoice?subtotal*0.08:0;
    return {base,extra,vat,total:subtotal+vat};
  },[item,serviceType,vehicle,distanceKm,invoice]);

  const airportLabel = airport==="other" ? (otherAirport||"Inne lotnisko") : PRICES[airport as keyof typeof PRICES].label;
  const routeText = serviceType==="from_airport" ? `${airportLabel} → ${address||"—"}` : serviceType==="roundtrip" ? `${address||"—"} ↔ ${airportLabel}` : `${address||"—"} → ${airportLabel}`;
  const paymentMethodText = paymentMethod === "online"
    ? "Płatność online po potwierdzeniu"
    : paymentMethod === "bank_transfer"
    ? "Przelew tradycyjny"
    : "Gotówka u kierowcy";

  function nip10(v:string){ return v.replace(/\D/g,"").slice(0,10); }
  function go(n:number){setStep(n);if(typeof window!=="undefined"){window.dispatchEvent(new CustomEvent("matt:booking-step",{detail:{step:n}}));setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),60);}}

  function valid(n:number){
    if(n===2) return !!address && !!distanceKm && (airport!=="other" || otherAirport.trim().length>=3);
    if(n===3) return !!travelDate && !!travelTime;
    if(n===5) return !!name.trim() && !!phone.trim() && !!email.trim() && (!invoice || nip10(nip).length===10);
    return true;
  }

  async function submit(){
    if(airport==="other"){ setMessage("Dla tego lotniska wycena jest indywidualna telefonicznie."); return; }
    if(!address||!distanceKm||!travelDate||!travelTime||!name||!phone||!email){ setMessage("Uzupełnij wymagane dane."); return; }
    if(invoice&&nip10(nip).length!==10){ setMessage("Podaj poprawny 10-cyfrowy NIP."); return; }
    setSaving(true); setMessage("");
    const r=await fetch("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      serviceType,address,airport,vehicleType:vehicle,passengers,distanceKm,travelDate,travelTime,
      returnDate,returnTime,flightNumber:flight,returnFlightNumber:returnFlight,
      customerName:name,phone,email,invoiceRequired:invoice,companyNip:invoice?nip10(nip):null,paymentMethod,onlinePaymentRequested,notes:notes||null
    })});
    const d=await r.json();
    if(!r.ok){ setMessage(d.error??"Błąd rezerwacji."); setSaving(false); return; }
    setSuccess(d); setSaving(false);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  if(success){
    return <div className="booking-success-card">
      <div className="success-check">✓</div>
      <span className="badge">MATT TRANSPORT</span>
      <h1>Dziękujemy! Rezerwacja przyjęta</h1><div className="pending-confirmation-badge">🕐 Oczekuje na potwierdzenie</div><div className="client-next-step"><strong>Co dalej?</strong><p>Twoje zgłoszenie zostało przyjęte. Potwierdzimy rezerwację najszybciej jak to możliwe.</p><p>Oczekuj wiadomości e-mail lub kontaktu z MATT TRANSPORT.</p></div>
      <div className="success-number"><span>Numer rezerwacji</span><strong>{success.booking_number}</strong></div>
      <div className="success-details"><div><span>Trasa</span><strong>{routeText}</strong></div><div><span>Kwota</span><strong>{Number(success.total_price).toFixed(2)} zł</strong></div><div><span>Płatność</span><strong>{paymentMethodText}</strong></div></div>
      {success.customer_access_token && <CustomerPushControls token={success.customer_access_token} />}
      <div className="success-actions"><a className="btn" href="/booking">NOWA REZERWACJA</a></div>
    </div>;
  }

  const AirportSelect = () => <label>Lotnisko
    <select value={airport} onChange={e=>{const v=e.target.value as AirportKey;setAirport(v);if(v!=="other")setOtherAirport("");}}>
      {Object.entries(PRICES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
      <option value="other">Inne lotnisko</option>
    </select>
  </label>;

  const OtherAirportBox = () => airport==="other" ? <div className="individual-quote-box">
    <label>Jakie lotnisko?<input value={otherAirport} onChange={e=>setOtherAirport(e.target.value)} placeholder="np. Berlin Brandenburg"/></label>
    <strong>Wycena indywidualna</strong>
    <p>Dla tego lotniska cenę ustalamy indywidualnie telefonicznie.</p>
    <a className="btn" href="tel:+48691242691">📞 ZADZWOŃ I ZAPYTAJ O CENĘ</a>
  </div> : null;

  if(mobile){
    return <div className="mobile-booking-wizard">
      <div className="wizard-header">
        <div className="wizard-header-top"><span className="badge">MATT TRANSPORT</span><strong>Krok {step} z 6</strong></div>
        <div className="wizard-progress"><span style={{width:`${Math.round(step/6*100)}%`}}/></div>
      </div>

      {step===1&&<section className="card wizard-card">
        <h1>Jakiego przejazdu potrzebujesz?</h1>
        <div className="wizard-choice-list">
          <button onClick={()=>{setServiceType("to_airport");go(2)}}><strong>🛫 Transfer na lotnisko</strong><span>Z adresu na wybrane lotnisko</span></button>
          <button onClick={()=>{setServiceType("from_airport");go(2)}}><strong>🛬 Odbiór z lotniska</strong><span>Z lotniska pod wskazany adres</span></button>
          <button onClick={()=>{setServiceType("roundtrip");go(2)}}><strong>🔁 W obie strony</strong><span>Wyjazd i powrót</span></button>
        </div>
      </section>}

      {step===2&&<section className="card wizard-card">
        <h1>Trasa i lotnisko</h1>
        <label>{serviceType==="from_airport"?"Adres docelowy":"Adres odbioru"}
          <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Wpisz adres"/>
          {suggestions.length>0&&<div className="address-suggestions">{suggestions.slice(0,5).map((s,i)=><button key={s.placeId??i} type="button" onClick={()=>chooseAddress(s.text??"")}>{s.text}</button>)}</div>}
        </label>
        <AirportSelect/>
        <OtherAirportBox/>
        <div className="wizard-nav"><button className="btn secondary" onClick={()=>go(1)}>WSTECZ</button>{airport!=="other"&&<button className="btn" disabled={!valid(2)} onClick={()=>go(3)}>DALEJ</button>}</div>
      </section>}

      {step===3&&<section className="card wizard-card">
        <h1>Termin przejazdu</h1>
        <p className="muted flight-time-hint">Podaj godzinę wylotu / przylotu z rozkładu lotu. MATT BOOKING sam wyznacza wcześniejszy czas zajętości kierowcy.</p>
        <div className="grid">
          <label>Data<input type="date" value={travelDate} onChange={e=>setTravelDate(e.target.value)}/></label>
          <label>{serviceType === "from_airport" ? "Godzina przylotu" : "Godzina wylotu"}<input type="time" value={travelTime} onChange={e=>setTravelTime(e.target.value)}/></label>
          <label>Numer lotu<input value={flight} onChange={e=>setFlight(e.target.value)} placeholder="np. FR8214"/></label>
          <label>Pasażerowie<select value={passengers} onChange={e=>setPassengers(Number(e.target.value))}>{[1,2,3,4,5,6,7,8].map(n=><option key={n}>{n}</option>)}</select></label>
          {serviceType==="roundtrip"&&<>
            <label>Data powrotu<input type="date" value={returnDate} onChange={e=>setReturnDate(e.target.value)}/></label>
            <label>Godzina przylotu powrotnego<input type="time" value={returnTime} onChange={e=>setReturnTime(e.target.value)}/></label>
            <label>Lot powrotny<input value={returnFlight} onChange={e=>setReturnFlight(e.target.value)}/></label>
          </>}
        </div>
        <div className="wizard-nav"><button className="btn secondary" onClick={()=>go(2)}>WSTECZ</button><button className="btn" disabled={!valid(3)} onClick={()=>go(4)}>DALEJ</button></div>
      </section>}

      {step===4&&<section className="card wizard-card">
        <h1>Wybierz pojazd</h1>
        <div className="wizard-choice-list">
          <button disabled={passengers>3} onClick={()=>{setVehicle("car");go(5)}}><strong>🚘 Samochód osobowy</strong><span>Do 3 pasażerów z bagażami</span></button>
          <button onClick={()=>{setVehicle("bus");go(5)}}><strong>🚐 Bus do 8 osób</strong><span>Dla grup i większego bagażu</span></button>
        </div>
        <div className="wizard-nav one"><button className="btn secondary" onClick={()=>go(3)}>WSTECZ</button></div>
      </section>}

      {step===5&&<section className="card wizard-card">
        <h1>Twoje dane</h1>
        <div className="grid">
          <label>Imię i nazwisko<input value={name} onChange={e=>setName(e.target.value)}/></label>
          <label>Telefon<input value={phone} onChange={e=>setPhone(e.target.value)}/></label>
          <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label>Faktura VAT<select value={invoice?"1":"0"} onChange={e=>{const n=e.target.value==="1";setInvoice(n);if(!n)setNip("");}}><option value="0">Nie</option><option value="1">Tak, +8%</option></select></label>
          {invoice&&<label>NIP<input inputMode="numeric" maxLength={10} value={nip} onChange={e=>setNip(nip10(e.target.value))}/></label>}
        </div>
        <label style={{marginTop:14}}>Uwagi do rezerwacji<textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
        <div className="payment-method-section">
          <h3>Sposób płatności</h3>
          <div className="payment-method-grid">
            <label className={`payment-method-choice ${paymentMethod==="cash"?"selected":""}`}>
              <input type="radio" name="payment-method-mobile" value="cash" checked={paymentMethod==="cash"} onChange={()=>setPaymentMethod("cash")}/>
              <span><strong>💵 Gotówka</strong><small>Płatność kierowcy przy realizacji przejazdu.</small></span>
            </label>
            <label className={`payment-method-choice ${paymentMethod==="bank_transfer"?"selected":""}`}>
              <input type="radio" name="payment-method-mobile" value="bank_transfer" checked={paymentMethod==="bank_transfer"} onChange={()=>setPaymentMethod("bank_transfer")}/>
              <span><strong>🏦 Przelew tradycyjny</strong><small>Dane do przelewu ustalimy / przekażemy po potwierdzeniu rezerwacji.</small></span>
            </label>
            <label className={`payment-method-choice ${paymentMethod==="online"?"selected":""}`}>
              <input type="radio" name="payment-method-mobile" value="online" checked={paymentMethod==="online"} onChange={()=>setPaymentMethod("online")}/>
              <span><strong>💳 Płatność online</strong><small>Po potwierdzeniu rezerwacji pojawi się bezpieczny przycisk płatności online.</small></span>
            </label>
          </div>
        </div>
        <div className="wizard-nav"><button className="btn secondary" onClick={()=>go(4)}>WSTECZ</button><button className="btn" disabled={!valid(5)} onClick={()=>go(6)}>PODSUMOWANIE</button></div>
      </section>}

      {step===6&&<section className="card wizard-card">
        <h1>Podsumowanie</h1>
        <div className="wizard-summary">
          <div><span>Trasa</span><strong>{routeText}</strong></div>
          <div><span>Termin</span><strong>{travelDate} {travelTime}</strong></div>
          <div><span>Pojazd</span><strong>{vehicle==="car"?"Samochód osobowy":"Bus do 8 osób"}</strong></div>
          <div><span>Pasażerowie</span><strong>{passengers}</strong></div>
          <div><span>Płatność</span><strong>{paymentMethodText}</strong></div>
          <div className="total"><span>Razem</span><strong>{quote.total.toFixed(2)} zł</strong></div>
        </div>
        {message&&<div className="booking-error">{message}</div>}
        <div className="wizard-final-actions"><button className="btn secondary" onClick={()=>go(5)}>WSTECZ</button><button className="btn" disabled={saving} onClick={submit}>{saving?"ZAPISYWANIE...":"ZAREZERWUJ"}</button></div>
      </section>}
    </div>;
  }

  return <div className="layout booking-form-wrap">
    <div className="card">
      <span className="badge">MATT TRANSPORT</span><h1>Zarezerwuj transfer lotniskowy</h1>
      <div className="choice-grid">
        <button className={`choice ${serviceType==="to_airport"?"active":""}`} onClick={()=>setServiceType("to_airport")}><strong>🛫 Transfer na lotnisko</strong></button>
        <button className={`choice ${serviceType==="from_airport"?"active":""}`} onClick={()=>setServiceType("from_airport")}><strong>🛬 Odbiór z lotniska</strong></button>
        <button className={`choice ${serviceType==="roundtrip"?"active":""}`} onClick={()=>setServiceType("roundtrip")}><strong>🔁 W obie strony</strong></button>
      </div>
      <h3>Trasa</h3>
      <div className="grid">
        <label>{serviceType==="from_airport"?"Adres docelowy":"Adres odbioru"}<input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Wpisz adres"/>{suggestions.length>0&&<div className="address-suggestions">{suggestions.slice(0,5).map((s,i)=><button key={s.placeId??i} type="button" onClick={()=>chooseAddress(s.text??"")}>{s.text}</button>)}</div>}</label>
        <AirportSelect/>
      </div>
      <OtherAirportBox/>
      <h3>Termin</h3>
      <p className="muted flight-time-hint">Podaj godzinę wylotu / przylotu z rozkładu lotu. Czas operacyjny kierowcy liczony jest automatycznie.</p>
      <div className="grid">
        <label>Data<input type="date" value={travelDate} onChange={e=>setTravelDate(e.target.value)}/></label>
        <label>{serviceType === "from_airport" ? "Godzina przylotu" : "Godzina wylotu"}<input type="time" value={travelTime} onChange={e=>setTravelTime(e.target.value)}/></label>
        <label>Numer lotu<input value={flight} onChange={e=>setFlight(e.target.value)}/></label>
        <label>Pasażerowie<select value={passengers} onChange={e=>setPassengers(Number(e.target.value))}>{[1,2,3,4,5,6,7,8].map(n=><option key={n}>{n}</option>)}</select></label>
      </div>
      <h3>Pojazd</h3>
      <div className="choice-grid vehicle-grid">
        <button className={`choice ${vehicle==="car"?"active":""}`} disabled={passengers>3} onClick={()=>setVehicle("car")}><strong>Samochód osobowy</strong></button>
        <button className={`choice ${vehicle==="bus"?"active":""}`} onClick={()=>setVehicle("bus")}><strong>Bus do 8 osób</strong></button>
      </div>
      <h3>Dane klienta</h3>
      <div className="grid">
        <label>Imię i nazwisko<input value={name} onChange={e=>setName(e.target.value)}/></label>
        <label>Telefon<input value={phone} onChange={e=>setPhone(e.target.value)}/></label>
        <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>Faktura VAT<select value={invoice?"1":"0"} onChange={e=>setInvoice(e.target.value==="1")}><option value="0">Nie</option><option value="1">Tak, +8%</option></select></label>
        {invoice&&<label>NIP<input inputMode="numeric" maxLength={10} value={nip} onChange={e=>setNip(nip10(e.target.value))}/></label>}
      </div>
      <label style={{marginTop:16}}>Uwagi do rezerwacji<textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
      <div className="payment-method-section">
        <h3>Sposób płatności</h3>
        <div className="payment-method-grid">
          <label className={`payment-method-choice ${paymentMethod==="cash"?"selected":""}`}>
            <input type="radio" name="payment-method-desktop" value="cash" checked={paymentMethod==="cash"} onChange={()=>setPaymentMethod("cash")}/>
            <span><strong>💵 Gotówka</strong><small>Płatność kierowcy przy realizacji przejazdu.</small></span>
          </label>
          <label className={`payment-method-choice ${paymentMethod==="bank_transfer"?"selected":""}`}>
            <input type="radio" name="payment-method-desktop" value="bank_transfer" checked={paymentMethod==="bank_transfer"} onChange={()=>setPaymentMethod("bank_transfer")}/>
            <span><strong>🏦 Przelew tradycyjny</strong><small>Dane do przelewu ustalimy / przekażemy po potwierdzeniu rezerwacji.</small></span>
          </label>
          <label className={`payment-method-choice ${paymentMethod==="online"?"selected":""}`}>
            <input type="radio" name="payment-method-desktop" value="online" checked={paymentMethod==="online"} onChange={()=>setPaymentMethod("online")}/>
            <span><strong>💳 Płatność online</strong><small>Po potwierdzeniu rezerwacji pojawi się bezpieczny przycisk płatności online.</small></span>
          </label>
        </div>
      </div>

    </div>
    <aside className="card summary">
      <h3>Podsumowanie</h3>
      {airport==="other"?<>
        <div className="individual-quote-summary"><strong>Wycena indywidualna</strong><span>{otherAirport||"Inne lotnisko"}</span></div>
        <a className="btn" style={{width:"100%",marginTop:16}} href="tel:+48691242691">📞 ZADZWOŃ</a>
      </>:<>
        <div className="row"><span>Trasa</span><strong>{routeText}</strong></div>
        <div className="row"><span>Cena bazowa</span><strong>{quote.base.toFixed(2)} zł</strong></div>
        <div className="row"><span>Dopłata</span><strong>{quote.extra.toFixed(2)} zł</strong></div>
        <div className="row"><span>VAT</span><strong>{quote.vat.toFixed(2)} zł</strong></div>
        <div className="row"><span>Płatność</span><strong>{paymentMethodText}</strong></div>
        <div className="row total"><span>Razem</span><strong>{quote.total.toFixed(2)} zł</strong></div>
        <button className="btn" style={{width:"100%",marginTop:16}} disabled={saving} onClick={submit}>{saving?"ZAPISYWANIE...":"ZAREZERWUJ"}</button>
      </>}
      {message&&<div className="booking-error">{message}</div>}
    </aside>
  </div>;
}
