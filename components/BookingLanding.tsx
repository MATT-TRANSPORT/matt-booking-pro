"use client";
import {useEffect,useState} from "react";
import BookingForm from "@/components/BookingForm";
import type { BookingEntry } from "@/lib/bookingEntry";

const MAIN_SITE_URL = "https://www.matt-transport.pl/";

export default function BookingLanding({initialEntry}: {initialEntry?: BookingEntry}){
 const [step,setStep]=useState(1);
 useEffect(()=>{const h=(e:Event)=>setStep(Number((e as CustomEvent).detail?.step||1));window.addEventListener("matt:booking-step",h);return()=>window.removeEventListener("matt:booking-step",h)},[]);
 return <>
  <div className="booking-brand-head">
   <a className="booking-brand-main-link" href={MAIN_SITE_URL} aria-label="Przejdź na stronę MATT TRANSPORT">
    <img src="/MATT_TRANSPORT_gold_black.gif" alt="MATT TRANSPORT"/>
    <div><strong>MATT TRANSPORT</strong><span>Transport zawsze na czas</span></div>
   </a>
   <a className="booking-site-back" href={MAIN_SITE_URL}>PEŁNA OFERTA ↗</a>
  </div>
  {initialEntry?.chooseService ? <section className="card" aria-labelledby="service-choice-title">
   <span className="badge">MATT TRANSPORT</span>
   <h1 id="service-choice-title">Jakiego transportu potrzebujesz?</h1>
   <p>Wybierz usługę, aby przejść do odpowiedniego formularza.</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 250px), 1fr))",gap:16}}>
    <div className="card"><h2>Transfer lotniskowy</h2><p>Wybierz lotnisko, termin i pojazd. Sprawdź cenę przejazdu.</p><a className="btn" href="/?entry=transport_choice_airport">SPRAWDŹ CENĘ I ZAREZERWUJ</a></div>
    <div className="card"><h2>Transport dla firmy</h2><p>Stałe dojazdy pracowników i przewozy dopasowane do harmonogramu zmian.</p><a className="btn" href="https://matt-transport.pl/transport-pracownikow-slask/#matt-b2b-wycena">ZAPYTAJ O WYCENĘ DLA FIRMY</a></div>
    <div className="card"><h2>Transport weselny</h2><p>Prześlij szczegóły przewozu i rozwożenia gości weselnych.</p><a className="btn" href="/wesele">PRZEJDŹ DO FORMULARZA</a></div>
    <div className="card"><h2>Bus, autokar lub inny przejazd</h2><p>Podaj trasę, termin i liczbę osób. Ustalimy dostępność i przygotujemy wycenę.</p><a className="btn" href="https://matt-transport.pl/kontakt/">ZAPYTAJ O PRZEWÓZ</a></div>
   </div>
   <p>Wolisz porozmawiać? <a href="tel:+48691242691">+48 691 242 691</a></p>
  </section> : <BookingForm initialEntry={initialEntry}/>}
  {!initialEntry?.chooseService&&step===1&&<section className="booking-site-bridge" aria-label="Pełna oferta MATT TRANSPORT">
   <div><strong>Chcesz najpierw poznać pełną ofertę?</strong><span>Transfery, przewozy prywatne i firmowe, wesela oraz pozostałe usługi MATT TRANSPORT.</span></div>
   <a href={MAIN_SITE_URL}>PRZEJDŹ NA MATT-TRANSPORT.PL</a>
  </section>}
  {!initialEntry?.chooseService&&step===1&&<section className="wedding-service-tile"><div className="wedding-rings">💍</div><div><span className="badge wedding-badge">TRANSPORT WESELNY</span><h2>Rozwożenie gości weselnych</h2><p>Potrzebujesz transportu dla gości po przyjęciu? Prześlij dane potrzebne do przygotowania umowy.</p></div><a className="btn wedding-cta" href="/wesele">PRZEJDŹ DO FORMULARZA</a></section>}
 </>;
}
