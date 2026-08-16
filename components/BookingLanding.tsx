"use client";
import {useEffect,useState} from "react";
import BookingForm from "@/components/BookingForm";
export default function BookingLanding(){
 const [step,setStep]=useState(1);
 useEffect(()=>{const h=(e:Event)=>setStep(Number((e as CustomEvent).detail?.step||1));window.addEventListener("matt:booking-step",h);return()=>window.removeEventListener("matt:booking-step",h)},[]);
 return <><div className="booking-brand-head"><img src="/MATT_TRANSPORT_gold_black.gif" alt="MATT TRANSPORT"/><div><strong>MATT TRANSPORT</strong><span>Transport zawsze na czas</span></div></div><BookingForm/>{step===1&&<section className="wedding-service-tile"><div className="wedding-rings">💍</div><div><span className="badge wedding-badge">TRANSPORT WESELNY</span><h2>Rozwożenie gości weselnych</h2><p>Potrzebujesz transportu dla gości po przyjęciu? Prześlij dane potrzebne do przygotowania umowy.</p></div><a className="btn wedding-cta" href="/wesele">PRZEJDŹ DO FORMULARZA</a></section>}</>;
}
