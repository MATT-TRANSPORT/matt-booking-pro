"use client";
import {useEffect,useState} from "react";
import { useCustomerLocale, CUSTOMER_LOCALE_EVENT } from "@/lib/useCustomerLocale";
import { customerText } from "@/lib/customerCopy";
import BookingForm from "@/components/BookingForm";
import CustomerAppInstall from "@/components/CustomerAppInstall";
import type { BookingEntry } from "@/lib/bookingEntry";
import {BOOKING_LANGUAGE_NAMES,BOOKING_LOCALES,bookingHubTranslations,isBookingLocale,type BookingLocale} from "@/lib/bookingLocale";

const MAIN_SITE_URL = "https://www.matt-transport.pl/";

export default function BookingLanding({initialEntry}: {initialEntry?: BookingEntry}){
 const [step,setStep]=useState(1);
 const locale = useCustomerLocale();
 const changeLocale=(next:BookingLocale)=>{
   const url=new URL(window.location.href);
   url.searchParams.set("lang",next);
   window.history.replaceState(null,"",url.toString());
   try { window.localStorage.setItem("matt-booking-locale",next); } catch { /* URL remains the source of truth. */ }
   window.dispatchEvent(new Event(CUSTOMER_LOCALE_EVENT));
 };
 const localized=(path:string)=>`${path}${path.includes("?")?"&":"?"}lang=${locale}`;
 const t=bookingHubTranslations[locale];
 useEffect(()=>{const h=(e:Event)=>setStep(Number((e as CustomEvent).detail?.step||1));window.addEventListener("matt:booking-step",h);return()=>window.removeEventListener("matt:booking-step",h)},[]);
 const chooseService=initialEntry?.chooseService!==false;
 return <>
  <div className="booking-brand-head">
   <a className="booking-brand-main-link" href={MAIN_SITE_URL} aria-label={customerText("Przejdź na stronę MATT TRANSPORT",locale)}>
    <img src="/MATT_TRANSPORT_gold_black.gif" alt="MATT TRANSPORT"/>
    <div><strong>MATT TRANSPORT</strong><span>{t.tagline}</span></div>
   </a>
   <a className="booking-site-back" href={MAIN_SITE_URL}>{t.offer}</a>
  </div>
  <nav aria-label={t.language} className="booking-language-switch">
    {BOOKING_LOCALES.map(code=><button className="booking-language-button" key={code} type="button" onClick={()=>changeLocale(code)} aria-label={BOOKING_LANGUAGE_NAMES[code]} aria-pressed={locale===code} title={BOOKING_LANGUAGE_NAMES[code]}>
      <img src={`/flags/${code}.svg`} alt="" width={28} height={18} aria-hidden="true" />
      <span>{code.toUpperCase()}</span>
    </button>)}
  </nav>
  {chooseService ? <section className="card booking-service-hub" aria-labelledby="service-choice-title">
   <span className="badge">MATT BOOKING</span>
   <h1 id="service-choice-title">{t.heading}</h1>
   <p className="muted">{t.intro}</p>
   <div className="booking-service-grid">
    <a className="booking-service-card" href={localized("/booking?service=airport")}>
      <span className="booking-service-icon">✈️</span><strong>{t.airport}</strong><small>{t.airportDesc}</small><b>{t.choose}</b>
    </a>
    <a className="booking-service-card" href={localized("/wesele")}>
      <span className="booking-service-icon">💍</span><strong>{t.wedding}</strong><small>{t.weddingDesc}</small><b>{t.choose}</b>
    </a>
    <a className="booking-service-card" href={localized("/transport")}>
      <span className="booking-service-icon">🚐</span><strong>{t.other}</strong><small>{t.otherDesc}</small><b>{t.choose}</b>
    </a>
   </div>
   <nav className="customer-quick-grid" aria-label={t.shortcuts}>
    <a className="customer-quick-card customer-quick-trips" href={localized("/moje-przejazdy")}>
      <span className="customer-quick-icon" aria-hidden="true">👤</span>
      <strong>{t.account}</strong>
    </a>
    <a className="customer-quick-card customer-quick-planner" href="https://matt-transport.pl/o-ktorej-wyjechac-na-lotnisko/">
      <span className="customer-quick-icon" aria-hidden="true">⏱️</span>
      <strong>{t.planner}</strong>
    </a>
    <CustomerAppInstall />
   </nav>
   <p className="booking-hub-contact">{t.contact} <a href="tel:+48691242691">+48 691 242 691</a></p>
  </section> : <>
    <div className="booking-change-service"><a href={localized("/booking")}>{t.change}</a></div>
    <BookingForm initialEntry={initialEntry}/>
  </>}
  {!chooseService&&step===1&&<section className="booking-site-bridge" aria-label={customerText("Pełna oferta MATT TRANSPORT",locale)}>
   <div><strong>{t.bridgeTitle}</strong><span>{t.bridgeDesc}</span></div>
   <a href={MAIN_SITE_URL}>{t.bridgeLink}</a>
  </section>}
 </>;
}
