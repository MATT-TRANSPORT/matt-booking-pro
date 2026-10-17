"use client";
import { useCustomerLocale } from "@/lib/useCustomerLocale";
const weddingCopy: Record<string,[string,string,string]> = {"TRANSPORT WESELNY":["Wedding transport","Hochzeitstransport","Svatební doprava"],"Dziękujemy za przesłanie danych!":["Thank you for your details!","Vielen Dank für Ihre Angaben!","Děkujeme za zaslané údaje!"],"Co dalej?":["What happens next?","Wie geht es weiter?","Co bude dál?"],"Na podstawie przesłanych informacji przygotujemy umowę i prześlemy ją na podany adres e-mail.":["We will prepare an agreement and send it to your email address.","Wir erstellen den Vertrag und senden ihn an Ihre E-Mail-Adresse.","Připravíme smlouvu a zašleme ji na váš e-mail."],"Jeżeli będziemy potrzebowali dodatkowych informacji, skontaktujemy się telefonicznie.":["If we need more information, we will call you.","Falls wir weitere Informationen benötigen, rufen wir Sie an.","Pokud budeme potřebovat další informace, zavoláme vám."],"WRÓĆ DO REZERWACJI":["BACK TO BOOKING","ZURÜCK ZUR BUCHUNG","ZPĚT K REZERVACI"],"Dane do przygotowania umowy":["Details for your agreement","Angaben zur Vertragserstellung","Údaje pro přípravu smlouvy"],"Prześlij najważniejsze informacje. Po ich otrzymaniu przygotujemy umowę i prześlemy ją e-mailem.":["Send us the key details. We will prepare an agreement and email it to you.","Senden Sie uns die wichtigsten Angaben. Wir erstellen den Vertrag und senden ihn per E-Mail.","Zašlete nám základní údaje. Připravíme smlouvu a pošleme ji e-mailem."],"Imię i nazwisko *":["Full name *","Vor- und Nachname *","Jméno a příjmení *"],"Data rozpoczęcia rozwozów *":["Transport start date *","Beginn der Fahrten – Datum *","Datum zahájení rozvozu *"],"Godzina rozpoczęcia rozwozów *":["Transport start time *","Beginn der Fahrten – Uhrzeit *","Čas zahájení rozvozu *"],"Nazwa restauracji *":["Venue name *","Name der Gaststätte *","Název restaurace *"],"Adres restauracji *":["Venue address *","Adresse der Gaststätte *","Adresa restaurace *"],"Ilość pojazdów *":["Number of vehicles *","Anzahl der Fahrzeuge *","Počet vozidel *"],"Numer telefonu *":["Phone number *","Telefonnummer *","Telefonní číslo *"],"Adres e-mail *":["Email address *","E-Mail-Adresse *","E-mailová adresa *"],"Pojazdy":["Vehicles","Fahrzeuge","Vozidla"],"Pojazd ":["Vehicle ","Fahrzeug ","Vozidlo "],"Samochód osobowy":["Car","Pkw","Osobní automobil"],"Bus 9-osobowy":["9-seat minibus","9-Sitzer-Kleinbus","Minibus pro 9 osob"],"Dodatkowe informacje (opcjonalnie)":["Additional information (optional)","Weitere Angaben (optional)","Další informace (nepovinné)"],"WYSYŁANIE...":["SENDING...","WIRD GESENDET...","ODESÍLÁNÍ..."],"WYŚLIJ DANE DO UMOWY":["SEND AGREEMENT DETAILS","VERTRAGSDATEN SENDEN","ODESLAT ÚDAJE KE SMLOUVĚ"],"Uzupełnij wymagane pola.":["Please complete the required fields.","Bitte füllen Sie alle Pflichtfelder aus.","Vyplňte povinná pole."],"Nie udało się wysłać zgłoszenia.":["Unable to send your request.","Ihre Anfrage konnte nicht gesendet werden.","Požadavek se nepodařilo odeslat."],"Zgłoszenie ":["Request ","Anfrage ","Žádost "]," zostało zapisane.":[" has been saved."," wurde gespeichert."," byla uložena."]};

import { useEffect, useState } from "react";

export default function WeddingBookingForm(){
  const locale = useCustomerLocale();
  const t=(key:string)=>locale==="pl"?key:weddingCopy[key]?.[locale==="en"?0:locale==="de"?1:2]??key;
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
      setMessage(t("Uzupełnij wymagane pola.")); return;
    }
    setSaving(true); setMessage("");
    const res=await fetch("/api/wedding-bookings",{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,locale})
    });
    const data=await res.json();
    if(!res.ok){setMessage(data.error??t("Nie udało się wysłać zgłoszenia."));setSaving(false);return;}
    setSuccess(data);setSaving(false);window.scrollTo({top:0,behavior:"smooth"});
  }

  if(success) return <div className="booking-success-card wedding-success">
    <div className="success-check">💍</div>
    <span className="badge wedding-badge">{t("TRANSPORT WESELNY")}</span>
    <h1>{t("Dziękujemy za przesłanie danych!")}</h1>
    <p className="success-lead">{t("Zgłoszenie ")}<strong>{success.booking_number}</strong>{t(" zostało zapisane.")}</p>
    <div className="client-next-step">
      <strong>{t("Co dalej?")}</strong>
      <p>{t("Na podstawie przesłanych informacji przygotujemy umowę i prześlemy ją na podany adres e-mail.")}</p>
      <p>{t("Jeżeli będziemy potrzebowali dodatkowych informacji, skontaktujemy się telefonicznie.")}</p>
    </div>
    <a className="btn" href={`/booking?lang=${locale}`}>{t("WRÓĆ DO REZERWACJI")}</a>
  </div>;

  return <div className="card wedding-form-card">
    <span className="badge wedding-badge">💍 {t("TRANSPORT WESELNY")}</span>
    <h1>{t("Dane do przygotowania umowy")}</h1>
    <p className="muted">{t("Prześlij najważniejsze informacje. Po ich otrzymaniu przygotujemy umowę i prześlemy ją e-mailem.")}</p>
    <div className="grid">
      <label>{t("Imię i nazwisko *")}<input value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/></label>
      <label>{t("Data rozpoczęcia rozwozów *")}<input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label>
      <label>{t("Godzina rozpoczęcia rozwozów *")}<input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label>
      <label>{t("Nazwa restauracji *")}<input value={form.restaurantName} onChange={e=>setForm({...form,restaurantName:e.target.value})}/></label>
      <label className="wedding-address-field">{t("Adres restauracji *")}
        <input autoComplete="off" value={form.restaurantAddress} onChange={e=>setForm({...form,restaurantAddress:e.target.value})}/>
        {restaurantSuggestions.length>0&&<div className="address-suggestions">
          {restaurantSuggestions.slice(0,5).map((s:any,i:number)=><button type="button" key={s.placeId??i} onClick={()=>{
            setForm({...form,restaurantAddress:s.text??""});setRestaurantSuggestions([]);
          }}>{s.text}</button>)}
        </div>}
      </label>
      <label>{t("Ilość pojazdów *")}
        <input type="number" min={1} max={20} value={form.vehiclesCount} onChange={e=>{
          const n=Math.max(1,Math.min(20,Number(e.target.value)||1));
          const types=Array.from({length:n},(_,i)=>form.vehicleTypes[i]??"bus");
          setForm({...form,vehiclesCount:n,vehicleTypes:types});
        }}/>
      </label>
      <label>{t("Numer telefonu *")}<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
      <label>{t("Adres e-mail *")}<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    </div>
    <div className="wedding-vehicle-types">
      <h3>{t("Pojazdy")}</h3>
      {form.vehicleTypes.map((type,i)=><div className="wedding-vehicle-row" key={i}>
        <strong>{t("Pojazd ")}{i+1}</strong>
        <select value={type} onChange={e=>{
          const vehicleTypes=[...form.vehicleTypes];
          vehicleTypes[i]=e.target.value as "car"|"bus";
          setForm({...form,vehicleTypes});
        }}>
          <option value="car">{t("Samochód osobowy")}</option>
          <option value="bus">{t("Bus 9-osobowy")}</option>
        </select>
      </div>)}
    </div>
    <label style={{marginTop:14}}>{t("Dodatkowe informacje (opcjonalnie)")}
      <textarea rows={4} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
    </label>
    {message&&<div className="booking-error">{message}</div>}
    <button className="btn wedding-submit" disabled={saving} onClick={submit}>
      {saving?t("WYSYŁANIE..."):t("WYŚLIJ DANE DO UMOWY")}
    </button>
  </div>;
}
