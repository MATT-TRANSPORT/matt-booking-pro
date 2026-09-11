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
   <p>Wybierz jedną z trzech głównych usług.</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 260px), 1fr))",gap:16,marginTop:18}}>
    <div className="card" style={{display:"flex",flexDirection:"column",gap:10}}><div style={{fontSize:34}}>✈️</div><h2>Transfery na lotniska</h2><p className="muted" style={{flex:1}}>Wybierz lotnisko, termin i pojazd. System od razu obliczy cenę przejazdu.</p><a className="btn" href="/booking?entry=transport_choice_airport">TRANSFER LOTNISKOWY</a></div>
    <div className="card" style={{display:"flex",flexDirection:"column",gap:10}}><div style={{fontSize:34}}>💍</div><h2>Transport weselny</h2><p className="muted" style={{flex:1}}>Rozwożenie gości i transport weselny. Prześlij dane potrzebne do przygotowania umowy.</p><a className="btn wedding-cta" href="/wesele">TRANSPORT WESELNY</a></div>
    <div className="card" style={{display:"flex",flexDirection:"column",gap:10}}><div style={{fontSize:34}}>🚐</div><h2>Transport pozostały</h2><p className="muted" style={{flex:1}}>Przejazd z punktu A do punktu B: prywatny, grupowy, bus lub autokar. Przygotujemy indywidualną wycenę.</p><a className="btn" href="/transport">TRANSPORT A → B</a></div>
   </div>
   <p style={{marginTop:18}}>Wolisz porozmawiać? <a href="tel:+48691242691">+48 691 242 691</a></p>
  </section> : <BookingForm initialEntry={initialEntry}/>}
  {!initialEntry?.chooseService&&step===1&&<section className="booking-site-bridge" aria-label="Pełna oferta MATT TRANSPORT">
   <div><strong>Inny rodzaj transportu?</strong><span>Wróć do wyboru usług albo zobacz pełną ofertę MATT TRANSPORT.</span></div>
   <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><a href="/booking">WYBIERZ INNĄ USŁUGĘ</a><a href={MAIN_SITE_URL}>PEŁNA OFERTA ↗</a></div>
  </section>}
 </>;
}
