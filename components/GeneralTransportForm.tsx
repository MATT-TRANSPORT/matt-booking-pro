"use client";

import { useEffect, useMemo, useState } from "react";

type Suggestion = { placeId?: string; text?: string };

function formatDuration(seconds: number) {
  if (!seconds) return "";
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

export default function GeneralTransportForm() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<Suggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<Suggestion[]>([]);
  const [roundtrip, setRoundtrip] = useState(false);
  const [travelDate, setTravelDate] = useState("");
  const [travelTime, setTravelTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [passengers, setPassengers] = useState("1");
  const passengerCount = passengers === "" ? 0 : Number(passengers);
  const [vehicleType, setVehicleType] = useState("auto");
  const [category, setCategory] = useState("private");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [invoiceRequired, setInvoiceRequired] = useState(false);
  const [notes, setNotes] = useState("");
  const [route, setRoute] = useState<{distanceKm:number;durationSeconds?:number|null}|null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  useEffect(() => {
    if (origin.trim().length < 3) { setOriginSuggestions([]); return; }
    const timer = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(origin)}`);
        const d = await r.json();
        setOriginSuggestions(d.suggestions ?? []);
      } catch { setOriginSuggestions([]); }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [origin]);

  useEffect(() => {
    if (destination.trim().length < 3) { setDestinationSuggestions([]); return; }
    const timer = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(destination)}`);
        const d = await r.json();
        setDestinationSuggestions(d.suggestions ?? []);
      } catch { setDestinationSuggestions([]); }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [destination]);

  useEffect(() => {
    if (origin.trim().length < 5 || destination.trim().length < 5) { setRoute(null); return; }
    const timer = window.setTimeout(async () => {
      setRouteBusy(true);
      try {
        const r = await fetch("/api/general-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin, destination })
        });
        const d = await r.json();
        setRoute(r.ok ? d : null);
      } catch { setRoute(null); }
      setRouteBusy(false);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [origin, destination]);

  useEffect(() => {
    if (!roundtrip) { setReturnDate(""); setReturnTime(""); }
  }, [roundtrip]);

  const vehicleHint = useMemo(() => {
    if (passengerCount > 8) return "Dla tej liczby pasażerów rekomendujemy autokar.";
    if (passengerCount > 3) return "Dla tej liczby pasażerów rekomendujemy bus.";
    return "Możesz pozostawić dobór pojazdu po stronie MATT TRANSPORT.";
  }, [passengerCount]);

  async function submit() {
    setMessage("");
    if (!origin.trim() || !destination.trim() || !travelDate || !travelTime || !customerName.trim() || !phone.trim() || !email.trim()) {
      setMessage("Uzupełnij wymagane pola."); return;
    }
    if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 30) {
      setMessage("Podaj liczbę pasażerów od 1 do 30."); return;
    }
    if (roundtrip && (!returnDate || !returnTime)) { setMessage("Uzupełnij termin powrotu."); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/general-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, roundtrip, travelDate, travelTime, returnDate, returnTime, passengers: passengerCount, vehicleType, category, customerName, phone, email, invoiceRequired, notes })
      });
      const d = await r.json();
      if (!r.ok) { setMessage(d.error || "Nie udało się wysłać zgłoszenia."); setSaving(false); return; }
      setSuccess(d);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setMessage("Nie udało się połączyć z systemem rezerwacji.");
    }
    setSaving(false);
  }

  if (success) return <section className="card booking-success-card general-transport-success">
    <div className="success-check">✓</div>
    <span className="badge">MATT TRANSPORT</span>
    <h1>Zapytanie o transport przyjęte</h1>
    <div className="pending-confirmation-badge">WYCENA INDYWIDUALNA</div>
    <p>Sprawdzimy dostępność pojazdu i przygotujemy cenę. Otrzymasz potwierdzenie od MATT TRANSPORT.</p>
    <div className="success-number"><span>Numer zgłoszenia</span><strong>{success.booking_number}</strong></div>
    <div className="success-details">
      <div><span>Trasa</span><strong>{origin} → {destination}{roundtrip ? ` → ${origin}` : ""}</strong></div>
      <div><span>Dystans w jedną stronę</span><strong>{Number(success.distance_km || 0).toFixed(1)} km</strong></div>
      <div><span>Cena</span><strong>Do indywidualnej wyceny</strong></div>
    </div>
    {success.customer_access_token && <a className="btn" href={`/rezerwacja/${success.customer_access_token}`}>OTWÓRZ REZERWACJĘ</a>}
    <a className="btn secondary" href="/booking">NOWA REZERWACJA</a>
  </section>;

  return <section className="general-transport-layout">
    <div className="card">
      <span className="badge">TRANSPORT A → B</span>
      <h1>Transport pozostały</h1>
      <p className="muted">Podaj trasę i termin. System obliczy dystans, a MATT TRANSPORT przygotuje indywidualną wycenę.</p>

      <h2>1. Trasa</h2>
      <div className="grid">
        <label>Punkt A — skąd jedziemy
          <input value={origin} onChange={(e)=>setOrigin(e.target.value)} placeholder="Wpisz adres odbioru" autoComplete="off" />
          {originSuggestions.length>0 && <div className="address-suggestions">{originSuggestions.slice(0,5).map((x,i)=><button type="button" key={x.placeId??i} onClick={()=>{setOrigin(x.text??"");setOriginSuggestions([]);}}>{x.text}</button>)}</div>}
        </label>
        <label>Punkt B — dokąd jedziemy
          <input value={destination} onChange={(e)=>setDestination(e.target.value)} placeholder="Wpisz adres docelowy" autoComplete="off" />
          {destinationSuggestions.length>0 && <div className="address-suggestions">{destinationSuggestions.slice(0,5).map((x,i)=><button type="button" key={x.placeId??i} onClick={()=>{setDestination(x.text??"");setDestinationSuggestions([]);}}>{x.text}</button>)}</div>}
        </label>
      </div>
      <label className="general-roundtrip-check"><input type="checkbox" checked={roundtrip} onChange={(e)=>setRoundtrip(e.target.checked)} /> Potrzebuję również transportu powrotnego</label>

      <h2>2. Termin</h2>
      <div className="grid">
        <label>Data wyjazdu<input type="date" value={travelDate} onChange={(e)=>setTravelDate(e.target.value)} /></label>
        <label>Godzina wyjazdu<input type="time" value={travelTime} onChange={(e)=>setTravelTime(e.target.value)} /></label>
        {roundtrip && <><label>Data powrotu<input type="date" value={returnDate} onChange={(e)=>setReturnDate(e.target.value)} /></label><label>Godzina powrotu<input type="time" value={returnTime} onChange={(e)=>setReturnTime(e.target.value)} /></label></>}
      </div>

      <h2>3. Pasażerowie i pojazd</h2>
      <div className="grid">
        <label>Liczba pasażerów<input type="number" min={1} max={30} step={1} inputMode="numeric" value={passengers} onChange={(e)=>setPassengers(e.target.value)} onBlur={()=>setPassengers(String(Math.max(1,Math.min(30,Number(passengers)||1))))} /></label>
        <label>Preferowany pojazd<select value={vehicleType} onChange={(e)=>setVehicleType(e.target.value)}><option value="auto">Dobierzcie pojazd</option><option value="car">Samochód osobowy</option><option value="bus">Bus do 8 pasażerów</option><option value="coach">Autokar do 30 pasażerów</option></select></label>
        <label>Rodzaj przewozu<select value={category} onChange={(e)=>setCategory(e.target.value)}><option value="private">Prywatny</option><option value="event">Impreza / wydarzenie</option><option value="school_club">Szkoła / klub / grupa</option><option value="employee">Pracowniczy / firmowy</option><option value="other">Inny</option></select></label>
      </div>
      <p className="muted">{vehicleHint}</p>

      <h2>4. Dane kontaktowe</h2>
      <div className="grid">
        <label>Imię i nazwisko<input value={customerName} onChange={(e)=>setCustomerName(e.target.value)} /></label>
        <label>Telefon<input type="tel" value={phone} onChange={(e)=>setPhone(e.target.value)} /></label>
        <label>E-mail<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></label>
      </div>
      <label className="general-roundtrip-check"><input type="checkbox" checked={invoiceRequired} onChange={(e)=>setInvoiceRequired(e.target.checked)} /> Potrzebuję faktury VAT</label>
      <label>Uwagi / dodatkowe przystanki<textarea rows={4} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Np. dodatkowy adres, bagaż, fotelik, wymagania grupy..." /></label>
      {message && <div className="admin-save-message" style={{marginTop:14}}>{message}</div>}
      <button className="btn" style={{marginTop:16,width:"100%"}} disabled={saving||routeBusy} onClick={submit}>{saving?"WYSYŁANIE...":routeBusy?"OBLICZANIE TRASY...":"WYŚLIJ ZAPYTANIE O WYCENĘ"}</button>
      <p className="muted" style={{marginTop:12}}>Rezerwacja online wymaga minimum 24 godzin wyprzedzenia. Pilne zlecenia: <a href="tel:+48691242691">+48 691 242 691</a>.</p>
    </div>

    <aside className="card summary general-transport-summary">
      <span className="badge">PODSUMOWANIE</span>
      <h2>{origin||"Punkt A"} → {destination||"Punkt B"}</h2>
      {roundtrip && <p><strong>+ transport powrotny</strong></p>}
      <div className="row"><span>Dystans</span><strong>{routeBusy?"liczę...":route?`${route.distanceKm.toFixed(1)} km`:"—"}</strong></div>
      {route?.durationSeconds ? <div className="row"><span>Szac. czas jazdy</span><strong>{formatDuration(route.durationSeconds)}</strong></div> : null}
      <div className="row"><span>Pasażerowie</span><strong>{passengerCount || "—"}</strong></div>
      <div className="row"><span>Wycena</span><strong>INDYWIDUALNA</strong></div>
      <p className="muted">Po wysłaniu zapytania dyspozytor sprawdzi pojazd, dostępność i ostateczną cenę.</p>
    </aside>
  </section>;
}
