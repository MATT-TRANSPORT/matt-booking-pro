"use client";
import {useEffect,useState} from "react";
import BookingForm from "@/components/BookingForm";

const MAIN_SITE_URL = "https://www.matt-transport.pl/";

export default function BookingLanding(){
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
  <BookingForm/>
  {step===1&&<section className="booking-site-bridge" aria-label="Pełna oferta MATT TRANSPORT">
   <div><strong>Chcesz najpierw poznać pełną ofertę?</strong><span>Transfery, przewozy prywatne i firmowe, wesela oraz pozostałe usługi MATT TRANSPORT.</span></div>
   <a href={MAIN_SITE_URL}>PRZEJDŹ NA MATT-TRANSPORT.PL</a>
  </section>}
  {step===1&&<section className="wedding-service-tile"><div className="wedding-rings">💍</div><div><span className="badge wedding-badge">TRANSPORT WESELNY</span><h2>Rozwożenie gości weselnych</h2><p>Potrzebujesz transportu dla gości po przyjęciu? Prześlij dane potrzebne do przygotowania umowy.</p></div><a className="btn wedding-cta" href="/wesele">PRZEJDŹ DO FORMULARZA</a></section>}
 </>;
}
