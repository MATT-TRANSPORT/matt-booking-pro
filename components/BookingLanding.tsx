"use client";
import {useEffect,useState} from "react";
import BookingForm from "@/components/BookingForm";
import type { BookingEntry } from "@/lib/bookingEntry";

const MAIN_SITE_URL = "https://www.matt-transport.pl/";

export default function BookingLanding({initialEntry}: {initialEntry?: BookingEntry}){
 const [step,setStep]=useState(1);
 useEffect(()=>{const h=(e:Event)=>setStep(Number((e as CustomEvent).detail?.step||1));window.addEventListener("matt:booking-step",h);return()=>window.removeEventListener("matt:booking-step",h)},[]);
 const chooseService=initialEntry?.chooseService!==false;
 return <>
  <div className="booking-brand-head">
   <a className="booking-brand-main-link" href={MAIN_SITE_URL} aria-label="Przejdź na stronę MATT TRANSPORT">
    <img src="/MATT_TRANSPORT_gold_black.gif" alt="MATT TRANSPORT"/>
    <div><strong>MATT TRANSPORT</strong><span>Transport zawsze na czas</span></div>
   </a>
   <a className="booking-site-back" href={MAIN_SITE_URL}>PEŁNA OFERTA ↗</a>
  </div>
  {chooseService ? <section className="card booking-service-hub" aria-labelledby="service-choice-title">
   <span className="badge">MATT BOOKING</span>
   <h1 id="service-choice-title">Jakiego transportu potrzebujesz?</h1>
   <p className="muted">Wybierz usługę. Wszystkie zgłoszenia trafiają bezpośrednio do dyspozytorni MATT TRANSPORT.</p>
   <div className="booking-service-grid">
    <a className="booking-service-card" href="/booking?service=airport">
      <span className="booking-service-icon">✈️</span><strong>Transfery na lotniska</strong><small>Wycena online, lotniska, monitoring lotu i płatność online.</small><b>WYBIERAM →</b>
    </a>
    <a className="booking-service-card" href="/wesele">
      <span className="booking-service-icon">💍</span><strong>Transport weselny</strong><small>Transport i rozwożenie gości weselnych samochodem, busem lub większą flotą.</small><b>WYBIERAM →</b>
    </a>
    <a className="booking-service-card" href="/transport">
      <span className="booking-service-icon">🚐</span><strong>Transport pozostały</strong><small>Przejazd z punktu A do punktu B, grupy, wydarzenia, szkoły i inne przewozy.</small><b>WYBIERAM →</b>
    </a>
   </div>
   <p className="booking-hub-contact">Wolisz porozmawiać? <a href="tel:+48691242691">+48 691 242 691</a></p>
  </section> : <>
    <div className="booking-change-service"><a href="/booking">← ZMIEŃ RODZAJ TRANSPORTU</a></div>
    <BookingForm initialEntry={initialEntry}/>
  </>}
  {!chooseService&&step===1&&<section className="booking-site-bridge" aria-label="Pełna oferta MATT TRANSPORT">
   <div><strong>Chcesz najpierw poznać pełną ofertę?</strong><span>Transfery, przewozy prywatne i firmowe, wesela oraz pozostałe usługi MATT TRANSPORT.</span></div>
   <a href={MAIN_SITE_URL}>PRZEJDŹ NA MATT-TRANSPORT.PL</a>
  </section>}
 </>;
}
