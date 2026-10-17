"use client";
import { resolveCustomerLocale } from "@/lib/localizedBookingEmails";
const generalCopy: Record<string,[string,string,string]> = {"Zapytanie o transport przyjęte":["Transport request received","Transportanfrage eingegangen","Poptávka dopravy přijata"],"WYCENA INDYWIDUALNA":["CUSTOM QUOTE","INDIVIDUELLES ANGEBOT","INDIVIDUÁLNÍ NABÍDKA"],"Sprawdzimy dostępność pojazdu i przygotujemy cenę. Otrzymasz potwierdzenie od MATT TRANSPORT.":["We will check availability and prepare your quote. MATT TRANSPORT will confirm your request.","Wir prüfen die Verfügbarkeit und erstellen ein Angebot. MATT TRANSPORT bestätigt Ihre Anfrage.","Ověříme dostupnost vozidla a připravíme cenu. MATT TRANSPORT vám zašle potvrzení."],"Numer zgłoszenia":["Request reference","Anfragenummer","Číslo poptávky"],"Trasa":["Route","Strecke","Trasa"],"Dystans w jedną stronę":["One-way distance","Entfernung einfache Fahrt","Vzdálenost jedním směrem"],"Cena":["Price","Preis","Cena"],"Do indywidualnej wyceny":["Quote on request","Preis auf Anfrage","Cena na vyžádání"],"OTWÓRZ REZERWACJĘ":["VIEW BOOKING","BUCHUNG ANSEHEN","ZOBRAZIT REZERVACI"],"NOWA REZERWACJA":["NEW BOOKING","NEUE BUCHUNG","NOVÁ REZERVACE"],"TRANSPORT A → B":["TRANSPORT A → B","TRANSPORT A → B","DOPRAVA A → B"],"Transport pozostały":["Other transport","Weitere Fahrten","Ostatní doprava"],"Podaj trasę i termin. System obliczy dystans, a MATT TRANSPORT przygotuje indywidualną wycenę.":["Enter your route and date. We will calculate the distance and prepare a custom quote.","Geben Sie Strecke und Termin ein. Wir berechnen die Entfernung und erstellen ein individuelles Angebot.","Zadejte trasu a termín. Spočítáme vzdálenost a připravíme individuální nabídku."],"1. Trasa":["1. Route","1. Strecke","1. Trasa"],"Punkt A — skąd jedziemy":["Point A — pickup location","Punkt A — Abholort","Bod A — místo vyzvednutí"],"Wpisz adres odbioru":["Enter pickup address","Abholadresse eingeben","Zadejte adresu vyzvednutí"],"Punkt B — dokąd jedziemy":["Point B — destination","Punkt B — Zielort","Bod B — cíl cesty"],"Wpisz adres docelowy":["Enter destination address","Zieladresse eingeben","Zadejte cílovou adresu"]," Potrzebuję również transportu powrotnego":[" I also need a return transfer"," Ich benötige auch eine Rückfahrt"," Potřebuji také zpáteční dopravu"],"2. Termin":["2. Date and time","2. Termin","2. Termín"],"Data wyjazdu":["Departure date","Abfahrtsdatum","Datum odjezdu"],"Godzina wyjazdu":["Departure time","Abfahrtszeit","Čas odjezdu"],"Data powrotu":["Return date","Rückfahrtdatum","Datum návratu"],"Godzina powrotu":["Return time","Rückfahrtszeit","Čas návratu"],"3. Pasażerowie i pojazd":["3. Passengers and vehicle","3. Fahrgäste und Fahrzeug","3. Cestující a vozidlo"],"Liczba pasażerów":["Number of passengers","Anzahl der Fahrgäste","Počet cestujících"],"Preferowany pojazd":["Preferred vehicle","Gewünschtes Fahrzeug","Preferované vozidlo"],"Dobierzcie pojazd":["Choose a vehicle for me","Fahrzeug auswählen lassen","Vyberte mi vozidlo"],"Samochód osobowy":["Car","Pkw","Osobní automobil"],"Bus do 8 pasażerów":["Minibus up to 8 passengers","Kleinbus bis 8 Fahrgäste","Minibus až pro 8 cestujících"],"Autokar do 30 pasażerów":["Coach up to 30 passengers","Reisebus bis 30 Fahrgäste","Autobus až pro 30 cestujících"],"Rodzaj przewozu":["Transport category","Art der Fahrt","Druh přepravy"],"Prywatny":["Private","Privat","Soukromá"],"Impreza / wydarzenie":["Event","Veranstaltung","Akce"],"Szkoła / klub / grupa":["School / club / group","Schule / Verein / Gruppe","Škola / klub / skupina"],"Pracowniczy / firmowy":["Employee / business","Mitarbeiter / Geschäftlich","Zaměstnanecká / firemní"],"Inny":["Other","Sonstige","Jiná"],"Dla tej liczby pasażerów rekomendujemy autokar.":["We recommend a coach for this group size.","Für diese Gruppengröße empfehlen wir einen Reisebus.","Pro tento počet cestujících doporučujeme autobus."],"Dla tej liczby pasażerów rekomendujemy bus.":["We recommend a minibus for this group size.","Für diese Gruppengröße empfehlen wir einen Kleinbus.","Pro tento počet cestujících doporučujeme minibus."],"Możesz pozostawić dobór pojazdu po stronie MATT TRANSPORT.":["MATT TRANSPORT can select a suitable vehicle for you.","MATT TRANSPORT kann das passende Fahrzeug für Sie auswählen.","MATT TRANSPORT pro vás může vybrat vhodné vozidlo."],"4. Dane kontaktowe":["4. Contact details","4. Kontaktdaten","4. Kontaktní údaje"],"Imię i nazwisko":["Full name","Vor- und Nachname","Jméno a příjmení"],"Telefon":["Phone","Telefon","Telefon"],"E-mail":["Email","E-Mail","E-mail"]," Potrzebuję faktury VAT":[" I need a VAT invoice"," Ich benötige eine Rechnung mit MwSt."," Potřebuji fakturu s DPH"],"Uwagi / dodatkowe przystanki":["Notes / additional stops","Hinweise / zusätzliche Stopps","Poznámky / další zastávky"],"Np. dodatkowy adres, bagaż, fotelik, wymagania grupy...":["E.g. extra address, luggage, child seat, group requirements...","Z. B. zusätzliche Adresse, Gepäck, Kindersitz, Gruppenwünsche...","Např. další adresa, zavazadla, dětská sedačka, požadavky skupiny..."],"WYSYŁANIE...":["SENDING...","WIRD GESENDET...","ODESÍLÁNÍ..."],"OBLICZANIE TRASY...":["CALCULATING ROUTE...","ROUTE WIRD BERECHNET...","VÝPOČET TRASY..."],"WYŚLIJ ZAPYTANIE O WYCENĘ":["REQUEST A QUOTE","ANGEBOT ANFORDERN","ODESLAT POPTÁVKU"],"Rezerwacja online wymaga minimum 24 godzin wyprzedzenia. Pilne zlecenia: ":["Online requests must be made at least 24 hours in advance. Urgent bookings: ","Online-Anfragen müssen mindestens 24 Stunden im Voraus erfolgen. Dringende Buchungen: ","Online poptávky je nutné podat alespoň 24 hodin předem. Naléhavé objednávky: "],"PODSUMOWANIE":["SUMMARY","ZUSAMMENFASSUNG","SHRNUTÍ"],"Punkt A":["Point A","Punkt A","Bod A"],"Punkt B":["Point B","Punkt B","Bod B"],"+ transport powrotny":["+ return transfer","+ Rückfahrt","+ zpáteční doprava"],"Dystans":["Distance","Entfernung","Vzdálenost"],"liczę...":["calculating...","wird berechnet...","počítám..."],"Szac. czas jazdy":["Estimated journey time","Geschätzte Fahrzeit","Odhadovaná doba jízdy"],"Pasażerowie":["Passengers","Fahrgäste","Cestující"],"Wycena":["Quote","Angebot","Nabídka"],"INDYWIDUALNA":["CUSTOM","INDIVIDUELL","INDIVIDUÁLNÍ"],"Po wysłaniu zapytania dyspozytor sprawdzi pojazd, dostępność i ostateczną cenę.":["After submitting, our dispatcher will confirm vehicle availability and the final price.","Nach dem Absenden prüft unsere Disposition Fahrzeug, Verfügbarkeit und Endpreis.","Po odeslání dispečer ověří vozidlo, dostupnost a konečnou cenu."],"Uzupełnij wymagane pola.":["Please complete all required fields.","Bitte füllen Sie alle Pflichtfelder aus.","Vyplňte povinná pole."],"Podaj liczbę pasażerów od 1 do 30.":["Enter 1 to 30 passengers.","Bitte geben Sie 1 bis 30 Fahrgäste ein.","Zadejte 1 až 30 cestujících."],"Uzupełnij termin powrotu.":["Enter your return date and time.","Bitte geben Sie den Rückfahrttermin ein.","Zadejte datum a čas návratu."],"Nie udało się wysłać zgłoszenia.":["Unable to submit your request.","Die Anfrage konnte nicht gesendet werden.","Poptávku se nepodařilo odeslat."],"Nie udało się połączyć z systemem rezerwacji.":["Could not connect to the booking system.","Verbindung zum Buchungssystem fehlgeschlagen.","Nepodařilo se připojit k rezervačnímu systému."]};


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
  const [locale,setLocale]=useState("pl");
  useEffect(()=>{const update=()=>setLocale(resolveCustomerLocale(new URLSearchParams(window.location.search).get("lang")||window.localStorage.getItem("matt-booking-locale")));update();window.addEventListener("popstate",update);return()=>window.removeEventListener("popstate",update)},[]);
  const t=(key:string)=>locale==="pl"?key:generalCopy[key]?.[locale==="en"?0:locale==="de"?1:2]??key;
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
    if (passengerCount > 8) return t("Dla tej liczby pasażerów rekomendujemy autokar.");
    if (passengerCount > 3) return t("Dla tej liczby pasażerów rekomendujemy bus.");
    return t("Możesz pozostawić dobór pojazdu po stronie MATT TRANSPORT.");
  }, [passengerCount,locale]);

  async function submit() {
    setMessage("");
    if (!origin.trim() || !destination.trim() || !travelDate || !travelTime || !customerName.trim() || !phone.trim() || !email.trim()) {
      setMessage(t("Uzupełnij wymagane pola.")); return;
    }
    if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 30) {
      setMessage(t("Podaj liczbę pasażerów od 1 do 30.")); return;
    }
    if (roundtrip && (!returnDate || !returnTime)) { setMessage(t("Uzupełnij termin powrotu.")); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/general-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, origin, destination, roundtrip, travelDate, travelTime, returnDate, returnTime, passengers: passengerCount, vehicleType, category, customerName, phone, email, invoiceRequired, notes })
      });
      const d = await r.json();
      if (!r.ok) { setMessage(d.error || t("Nie udało się wysłać zgłoszenia.")); setSaving(false); return; }
      setSuccess(d);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setMessage(t("Nie udało się połączyć z systemem rezerwacji."));
    }
    setSaving(false);
  }

  if (success) return <section className="card booking-success-card general-transport-success">
    <div className="success-check">✓</div>
    <span className="badge">MATT TRANSPORT</span>
    <h1>{t("Zapytanie o transport przyjęte")}</h1>
    <div className="pending-confirmation-badge">{t("WYCENA INDYWIDUALNA")}</div>
    <p>{t("Sprawdzimy dostępność pojazdu i przygotujemy cenę. Otrzymasz potwierdzenie od MATT TRANSPORT.")}</p>
    <div className="success-number"><span>{t("Numer zgłoszenia")}</span><strong>{success.booking_number}</strong></div>
    <div className="success-details">
      <div><span>{t("Trasa")}</span><strong>{origin} → {destination}{roundtrip ? ` → ${origin}` : ""}</strong></div>
      <div><span>{t("Dystans w jedną stronę")}</span><strong>{Number(success.distance_km || 0).toFixed(1)} km</strong></div>
      <div><span>{t("Cena")}</span><strong>{t("Do indywidualnej wyceny")}</strong></div>
    </div>
    {success.customer_access_token && <a className="btn" href={`/rezerwacja/${success.customer_access_token}?lang=${locale}`}>{t("OTWÓRZ REZERWACJĘ")}</a>}
    <a className="btn secondary" href={`/booking?lang=${locale}`}>{t("NOWA REZERWACJA")}</a>
  </section>;

  return <section className="general-transport-layout">
    <div className="card">
      <span className="badge">{t("TRANSPORT A → B")}</span>
      <h1>{t("Transport pozostały")}</h1>
      <p className="muted">{t("Podaj trasę i termin. System obliczy dystans, a MATT TRANSPORT przygotuje indywidualną wycenę.")}</p>

      <h2>{t("1. Trasa")}</h2>
      <div className="grid">
        <label>{t("Punkt A — skąd jedziemy")}
          <input value={origin} onChange={(e)=>setOrigin(e.target.value)} placeholder={t("Wpisz adres odbioru")} autoComplete="off" />
          {originSuggestions.length>0 && <div className="address-suggestions">{originSuggestions.slice(0,5).map((x,i)=><button type="button" key={x.placeId??i} onClick={()=>{setOrigin(x.text??"");setOriginSuggestions([]);}}>{x.text}</button>)}</div>}
        </label>
        <label>{t("Punkt B — dokąd jedziemy")}
          <input value={destination} onChange={(e)=>setDestination(e.target.value)} placeholder={t("Wpisz adres docelowy")} autoComplete="off" />
          {destinationSuggestions.length>0 && <div className="address-suggestions">{destinationSuggestions.slice(0,5).map((x,i)=><button type="button" key={x.placeId??i} onClick={()=>{setDestination(x.text??"");setDestinationSuggestions([]);}}>{x.text}</button>)}</div>}
        </label>
      </div>
      <label className="general-roundtrip-check"><input type="checkbox" checked={roundtrip} onChange={(e)=>setRoundtrip(e.target.checked)} />{t(" Potrzebuję również transportu powrotnego")}</label>

      <h2>{t("2. Termin")}</h2>
      <div className="grid">
        <label>{t("Data wyjazdu")}<input type="date" value={travelDate} onChange={(e)=>setTravelDate(e.target.value)} /></label>
        <label>{t("Godzina wyjazdu")}<input type="time" value={travelTime} onChange={(e)=>setTravelTime(e.target.value)} /></label>
        {roundtrip && <><label>{t("Data powrotu")}<input type="date" value={returnDate} onChange={(e)=>setReturnDate(e.target.value)} /></label><label>{t("Godzina powrotu")}<input type="time" value={returnTime} onChange={(e)=>setReturnTime(e.target.value)} /></label></>}
      </div>

      <h2>{t("3. Pasażerowie i pojazd")}</h2>
      <div className="grid">
        <label>{t("Liczba pasażerów")}<input type="number" min={1} max={30} step={1} inputMode="numeric" value={passengers} onChange={(e)=>setPassengers(e.target.value)} onBlur={()=>setPassengers(String(Math.max(1,Math.min(30,Number(passengers)||1))))} /></label>
        <label>{t("Preferowany pojazd")}<select value={vehicleType} onChange={(e)=>setVehicleType(e.target.value)}><option value="auto">{t("Dobierzcie pojazd")}</option><option value="car">{t("Samochód osobowy")}</option><option value="bus">{t("Bus do 8 pasażerów")}</option><option value="coach">{t("Autokar do 30 pasażerów")}</option></select></label>
        <label>{t("Rodzaj przewozu")}<select value={category} onChange={(e)=>setCategory(e.target.value)}><option value="private">{t("Prywatny")}</option><option value="event">{t("Impreza / wydarzenie")}</option><option value="school_club">{t("Szkoła / klub / grupa")}</option><option value="employee">{t("Pracowniczy / firmowy")}</option><option value="other">{t("Inny")}</option></select></label>
      </div>
      <p className="muted">{vehicleHint}</p>

      <h2>{t("4. Dane kontaktowe")}</h2>
      <div className="grid">
        <label>{t("Imię i nazwisko")}<input value={customerName} onChange={(e)=>setCustomerName(e.target.value)} /></label>
        <label>{t("Telefon")}<input type="tel" value={phone} onChange={(e)=>setPhone(e.target.value)} /></label>
        <label>{t("E-mail")}<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></label>
      </div>
      <label className="general-roundtrip-check"><input type="checkbox" checked={invoiceRequired} onChange={(e)=>setInvoiceRequired(e.target.checked)} />{t(" Potrzebuję faktury VAT")}</label>
      <label>{t("Uwagi / dodatkowe przystanki")}<textarea rows={4} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder={t("Np. dodatkowy adres, bagaż, fotelik, wymagania grupy...")} /></label>
      {message && <div className="admin-save-message" style={{marginTop:14}}>{message}</div>}
      <button className="btn" style={{marginTop:16,width:"100%"}} disabled={saving||routeBusy} onClick={submit}>{saving?t("WYSYŁANIE..."):routeBusy?t("OBLICZANIE TRASY..."):t("WYŚLIJ ZAPYTANIE O WYCENĘ")}</button>
      <p className="muted" style={{marginTop:12}}>{t("Rezerwacja online wymaga minimum 24 godzin wyprzedzenia. Pilne zlecenia: ")}<a href="tel:+48691242691">+48 691 242 691</a>.</p>
    </div>

    <aside className="card summary general-transport-summary">
      <span className="badge">{t("PODSUMOWANIE")}</span>
      <h2>{origin||t("Punkt A")} → {destination||t("Punkt B")}</h2>
      {roundtrip && <p><strong>{t("+ transport powrotny")}</strong></p>}
      <div className="row"><span>{t("Dystans")}</span><strong>{routeBusy?t("liczę..."):route?`${route.distanceKm.toFixed(1)} km`:"—"}</strong></div>
      {route?.durationSeconds ? <div className="row"><span>{t("Szac. czas jazdy")}</span><strong>{formatDuration(route.durationSeconds)}</strong></div> : null}
      <div className="row"><span>{t("Pasażerowie")}</span><strong>{passengerCount || "—"}</strong></div>
      <div className="row"><span>{t("Wycena")}</span><strong>{t("INDYWIDUALNA")}</strong></div>
      <p className="muted">{t("Po wysłaniu zapytania dyspozytor sprawdzi pojazd, dostępność i ostateczną cenę.")}</p>
    </aside>
  </section>;
}
