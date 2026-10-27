"use client";
import { customerFetch } from "@/lib/customerFetch";
import { customerText } from "@/lib/customerCopy";
import { useCustomerLocale } from "@/lib/useCustomerLocale";
import CustomerPushControls from "@/components/CustomerPushControls";

import { useEffect, useMemo, useState } from "react";
import { useAirportPricing } from "@/lib/useAirportPricing";
import { clearGrowthTracking, growthFunnelSessionId, readGrowthTracking, resetGrowthFunnelSession, trackGrowthFunnelEvent } from "@/lib/growthTracking";
import { trackBookingPurchase } from "@/lib/ga4";
import type { BookingEntry } from "@/lib/bookingEntry";
import { takeAirportPlannerHandoff } from "@/lib/airportPlannerHandoff";

const airportCopy: Record<string,[string,string,string]> = {"Dziękujemy! Rezerwacja przyjęta":["Thank you! Booking received","Vielen Dank! Buchung eingegangen","Děkujeme! Rezervace přijata"],"🕐 Oczekuje na potwierdzenie":["🕐 Awaiting confirmation","🕐 Bestätigung ausstehend","🕐 Čeká na potvrzení"],"Co dalej?":["What happens next?","Wie geht es weiter?","Co bude dál?"],"Twoje zgłoszenie zostało przyjęte. Potwierdzimy rezerwację najszybciej jak to możliwe.":["Your request has been received. We will confirm your booking as soon as possible.","Ihre Anfrage ist eingegangen. Wir bestätigen Ihre Buchung schnellstmöglich.","Vaši poptávku jsme přijali. Rezervaci potvrdíme co nejdříve."],"Oczekuj wiadomości e-mail lub kontaktu z MATT TRANSPORT.":["Please look out for an email or contact from MATT TRANSPORT.","Bitte achten Sie auf eine E-Mail oder Nachricht von MATT TRANSPORT.","Očekávejte e-mail nebo kontakt od MATT TRANSPORT."],"Jakiego przejazdu potrzebujesz?":["What transfer do you need?","Welche Fahrt benötigen Sie?","Jakou přepravu potřebujete?"],"Trasa i lotnisko":["Route and airport","Strecke und Flughafen","Trasa a letiště"],"Termin przejazdu":["Travel date and time","Reisetermin","Termín jízdy"],"Wybierz pojazd":["Choose your vehicle","Fahrzeug auswählen","Vyberte vozidlo"],"Twoje dane":["Your details","Ihre Angaben","Vaše údaje"],"Podsumowanie":["Summary","Zusammenfassung","Shrnutí"],"Zarezerwuj transfer lotniskowy":["Book an airport transfer","Flughafentransfer buchen","Rezervovat letištní transfer"],"Sposób płatności":["Payment method","Zahlungsart","Způsob platby"],"Trasa":["Route","Strecke","Trasa"],"Termin":["Date and time","Termin","Termín"],"Pojazd":["Vehicle","Fahrzeug","Vozidlo"],"Dane klienta":["Customer details","Kundendaten","Údaje zákazníka"],"Adres docelowy":["Destination address","Zieladresse","Cílová adresa"],"Adres odbioru":["Pickup address","Abholadresse","Adresa vyzvednutí"],"Wpisz adres":["Enter address","Adresse eingeben","Zadejte adresu"],"Data":["Date","Datum","Datum"],"Godzina przylotu":["Arrival time","Ankunftszeit","Čas příletu"],"Godzina wyjazdu na lotnisko":["Departure time to airport","Abfahrtszeit zum Flughafen","Čas odjezdu na letiště"],"Lot wylotowy":["Outbound flight","Hinflug","Odletový let"],"Numer lotu":["Flight number","Flugnummer","Číslo letu"],"Pasażerowie":["Passengers","Fahrgäste","Cestující"],"Data powrotu":["Return date","Rückfahrtdatum","Datum návratu"],"Godzina przylotu powrotnego":["Return flight arrival time","Ankunftszeit des Rückflugs","Čas příletu zpátečního letu"],"Lot powrotny":["Return flight","Rückflug","Zpáteční let"],"Imię i nazwisko":["Full name","Vor- und Nachname","Jméno a příjmení"],"Telefon":["Phone","Telefon","Telefon"],"E-mail":["Email","E-Mail","E-mail"],"Faktura VAT":["VAT invoice","MwSt.-Rechnung","Faktura s DPH"],"Nie":["No","Nein","Ne"],"Tak, +8%":["Yes, +8%","Ja, +8%","Ano, +8 %"],"Uwagi do rezerwacji":["Booking notes","Anmerkungen zur Buchung","Poznámky k rezervaci"],"Lotnisko":["Airport","Flughafen","Letiště"],"Jakie lotnisko?":["Which airport?","Welcher Flughafen?","Jaké letiště?"],"np. Berlin Brandenburg":["e.g. Berlin Brandenburg","z. B. Berlin Brandenburg","např. Berlín Brandenburg"]};
const airportExtraCopy: Record<string,[string,string,string]> = {"NOWA REZERWACJA":["NEW BOOKING","NEUE BUCHUNG","NOVÁ REZERVACE"],"WSTECZ":["BACK","ZURÜCK","ZPĚT"],"DALEJ":["NEXT","WEITER","DALŠÍ"],"PODSUMOWANIE":["SUMMARY","ZUSAMMENFASSUNG","SHRNUTÍ"],"ZAREZERWUJ":["BOOK NOW","JETZT BUCHEN","REZERVOVAT"],"ZAPISYWANIE...":["SAVING...","WIRD GESPEICHERT...","UKLÁDÁNÍ..."],"OBLICZANIE TRASY...":["CALCULATING ROUTE...","ROUTE WIRD BERECHNET...","VÝPOČET TRASY..."],"Godzina przylotu":["Arrival time","Ankunftszeit","Čas příletu"],"Godzina wyjazdu na lotnisko":["Departure time to airport","Abfahrtszeit zum Flughafen","Čas odjezdu na letiště"],"Lotnisko":["Airport","Flughafen","Letiště"],"ZADZWOŃ":["CALL US","ANRUFEN","ZAVOLEJTE"],"OBLICZ PONOWNIE":["RECALCULATE","ERNEUT BERECHNEN","PŘEPOČÍTAT"],"ZADZWOŃ I ZAPYTAJ O CENĘ":["CALL FOR A QUOTE","PREIS TELEFONISCH ERFRAGEN","ZAVOLEJTE PRO CENU"],"Adres dodatkowego przystanku":["Additional stop address","Adresse des Zwischenstopps","Adresa další zastávky"],"Wpisz drugi adres":["Enter another address","Weitere Adresse eingeben","Zadejte další adresu"],"USUŃ":["REMOVE","ENTFERNEN","ODSTRANIT"],"Obliczanie dojazdu do adresu...":["Calculating route to address...","Route zur Adresse wird berechnet...","Výpočet trasy k adrese..."],"Obliczanie objazdu...":["Calculating detour...","Umweg wird berechnet...","Výpočet objížďky..."],"+ DODAJ DODATKOWY ADRES / PRZYSTANEK":["+ ADD ANOTHER ADDRESS / STOP","+ WEITERE ADRESSE / ZWISCHENSTOPP","+ PŘIDAT DALŠÍ ADRESU / ZASTÁVKU"],"Wyjazd na lotnisko (+20 zł)":["Outbound to airport (+20 PLN)","Hinfahrt zum Flughafen (+20 PLN)","Cesta na letiště (+20 PLN)"],"Powrót z lotniska (+20 zł)":["Return from airport (+20 PLN)","Rückfahrt vom Flughafen (+20 PLN)","Návrat z letiště (+20 PLN)"]};
// Contact validation is shared by desktop and mobile booking flows.
airportExtraCopy["Podaj poprawny adres e-mail."] = ["Enter a valid email address.", "Bitte geben Sie eine gültige E-Mail-Adresse ein.", "Zadejte platnou e-mailovou adresu."];
type Suggestion = { placeId?: string; text?: string };
type AirportKey = string | "other";

export default function BookingForm({initialEntry}: {initialEntry?: BookingEntry}) {
 const fetchCustomer=(input:RequestInfo|URL,init?:RequestInit)=>customerFetch(locale,input,init);
  const { airports } = useAirportPricing();
  const locale = useCustomerLocale();
  const t=(key:string)=>locale==="pl"?key:(airportCopy[key]??airportExtraCopy[key])?.[locale==="en"?0:locale==="de"?1:2]??customerText(key,locale);
  const [mobile, setMobile] = useState(false);
  const [step, setStep] = useState(1);

  const [serviceType,setServiceType] = useState<"to_airport"|"from_airport"|"roundtrip">("to_airport");
  const [address,setAddress] = useState("");
  const [airport,setAirport] = useState<AirportKey>(initialEntry?.airport ?? "balice");
  const [otherAirport,setOtherAirport] = useState("");
  const [vehicle,setVehicle] = useState<"car"|"bus">(initialEntry?.vehicle ?? "car");
  const [passengers,setPassengers] = useState(1);
  const [distanceKm,setDistanceKm] = useState(0);
  const [calculatedAddress,setCalculatedAddress] = useState("");
  const [routeBusy,setRouteBusy] = useState(false);
  const [routeError,setRouteError] = useState("");
  const [routeRetry,setRouteRetry] = useState(0);
  const routeReady = !!address.trim() && calculatedAddress === address.trim() && !routeBusy && !routeError;
  const [suggestions,setSuggestions] = useState<Suggestion[]>([]);
  const [additionalStopEnabled,setAdditionalStopEnabled] = useState(false);
  const [additionalStopAddress,setAdditionalStopAddress] = useState("");
  const [additionalStopPrimary,setAdditionalStopPrimary] = useState(true);
  const [additionalStopReturn,setAdditionalStopReturn] = useState(false);
  const [additionalStopSuggestions,setAdditionalStopSuggestions] = useState<Suggestion[]>([]);
  const [additionalStopQuote,setAdditionalStopQuote] = useState<any>(null);
  const [additionalStopBusy,setAdditionalStopBusy] = useState(false);
  const [additionalStopError,setAdditionalStopError] = useState("");
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
  const [paymentMethod,setPaymentMethod] = useState<"cash"|"online">("cash");
  const onlinePaymentRequested = paymentMethod === "online";
  const [nip,setNip] = useState("");
  const [notes,setNotes] = useState("");
  const [message,setMessage] = useState("");
  const [saving,setSaving] = useState(false);
  const [success,setSuccess] = useState<any>(null);
  const [plannerImported, setPlannerImported] = useState(false);

  useEffect(() => {
    if (!initialEntry?.fromPlanner) return;
    const saved = takeAirportPlannerHandoff(initialEntry.airport);
    if (!saved) return;
    setServiceType("to_airport");
    setAddress(saved.address);
    setTravelDate(saved.travelDate);
    setTravelTime(saved.travelTime);
    setPlannerImported(true);
    setStep(2);
    window.dispatchEvent(new CustomEvent("matt:booking-step", { detail: { step: 2 } }));
    // The normal address route check recalculates the price for this booking.
  }, [initialEntry?.fromPlanner, initialEntry?.airport]);

  useEffect(()=>{
    const f=()=>setMobile(window.innerWidth<=900);
    f(); window.addEventListener("resize",f);
    return()=>window.removeEventListener("resize",f);
  },[]);

  useEffect(()=>{ if(passengers>3) setVehicle("bus"); },[passengers]);

  useEffect(()=>{
    if(airport==="other"||airports[airport]) return;
    const fallback = airports.balice ? "balice" : Object.keys(airports)[0];
    if(fallback) setAirport(fallback);
  },[airports,airport]);

  useEffect(()=>{
    if(address.trim().length<3){ setSuggestions([]); return; }
    const controller = new AbortController();
    const timer=setTimeout(async()=>{
      try{
        const r=await fetchCustomer(`/api/places?q=${encodeURIComponent(address)}`, {signal:controller.signal});
        const d=await r.json();
        if(!controller.signal.aborted) setSuggestions(r.ok ? d.suggestions??[] : []);
      }catch{ if(!controller.signal.aborted) setSuggestions([]); }
    },350);
    return()=>{clearTimeout(timer); controller.abort();};
  },[address]);

  useEffect(()=>{
    const value = address.trim();
    const controller = new AbortController();
    setDistanceKm(0);
    setCalculatedAddress("");
    setRouteError("");
    if(value.length<3 || airport==="other") { setRouteBusy(false); return; }
    setRouteBusy(true);
    const timer = setTimeout(async()=>{
      try {
        const r = await fetchCustomer("/api/route", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({address:value}), signal:controller.signal
        });
        const d = await r.json();
        if(controller.signal.aborted) return;
        if(!r.ok || typeof d.distanceKm!=="number" || !Number.isFinite(d.distanceKm) || d.distanceKm<0) {
          throw new Error(t("Nie udało się obliczyć dojazdu."));
        }
        setDistanceKm(d.distanceKm);
        setCalculatedAddress(value);
      } catch {
        if(!controller.signal.aborted) setRouteError(t("Nie udało się obliczyć dojazdu. Sprawdź adres (miejscowość, ulica i numer) i spróbuj ponownie."));
      } finally {
        if(!controller.signal.aborted) setRouteBusy(false);
      }
    },600);
    return()=>{clearTimeout(timer); controller.abort();};
  },[address,airport,routeRetry]);

  useEffect(()=>{
    if(serviceType!=="roundtrip") {
      setAdditionalStopReturn(false);
      setReturnDate("");
      setReturnTime("");
      setReturnFlight("");
    }
  },[serviceType]);

  useEffect(()=>{
    if(!additionalStopEnabled||additionalStopAddress.trim().length<3){ setAdditionalStopSuggestions([]); return; }
    const timer=setTimeout(async()=>{
      try{
        const r=await fetchCustomer(`/api/places?q=${encodeURIComponent(additionalStopAddress)}`);
        const d=await r.json();
        setAdditionalStopSuggestions(d.suggestions??[]);
      }catch{ setAdditionalStopSuggestions([]); }
    },350);
    return()=>clearTimeout(timer);
  },[additionalStopEnabled,additionalStopAddress]);

  useEffect(()=>{
    const active=additionalStopEnabled&&additionalStopAddress.trim().length>=5&&address.trim().length>=5&&airport!=="other"&&
      (additionalStopPrimary||(serviceType==="roundtrip"&&additionalStopReturn));
    if(!active){ setAdditionalStopQuote(null); setAdditionalStopError(""); setAdditionalStopBusy(false); return; }
    setAdditionalStopQuote(null);
    const timer=setTimeout(async()=>{
      setAdditionalStopBusy(true); setAdditionalStopError("");
      try{
        const r=await fetchCustomer("/api/additional-stop/quote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
          serviceType,address,airport,additionalStopAddress,additionalStopPrimary,additionalStopReturn:serviceType==="roundtrip"&&additionalStopReturn
        })});
        const d=await r.json();
        if(r.ok) setAdditionalStopQuote(d); else setAdditionalStopError(d.error??t("Nie udało się obliczyć przystanku."));
      }catch{ setAdditionalStopError(t("Nie udało się obliczyć dodatkowego przystanku.")); }
      setAdditionalStopBusy(false);
    },500);
    return()=>clearTimeout(timer);
  },[additionalStopEnabled,additionalStopAddress,additionalStopPrimary,additionalStopReturn,address,airport,serviceType]);

  function chooseAddress(value:string){
    setAddress(value); setSuggestions([]);
  }

  const standardAirport = airport!=="other";
  const item = standardAirport ? airports[airport] : null;
  const quote = useMemo(()=>{
    if(!item) return {base:0,extra:0,stopFee:0,stopExtraKm:0,stopExtra:0,vat:0,total:0};
    const m=serviceType==="roundtrip"?2:1;
    const base=item[vehicle]*m;
    const extra=routeReady?Math.max(0,distanceKm-40)*2.4*m:0;
    const stopFee=additionalStopEnabled?Number(additionalStopQuote?.stopFee||0):0;
    const stopExtraKm=additionalStopEnabled?Number(additionalStopQuote?.totalExtraKm||0):0;
    const stopExtra=additionalStopEnabled?Number(additionalStopQuote?.stopExtraPrice||0):0;
    const subtotal=base+extra+stopFee+stopExtra;
    const vat=invoice?subtotal*0.08:0;
    return {base,extra,stopFee,stopExtraKm,stopExtra,vat,total:subtotal+vat};
  },[item,serviceType,vehicle,distanceKm,routeReady,invoice,additionalStopEnabled,additionalStopQuote]);

  const airportLabel = airport==="other" ? (otherAirport||t("Inne lotnisko")) : (airports[airport]?.label || t("Lotnisko"));
  const activeStop = additionalStopEnabled && additionalStopAddress.trim() ? additionalStopAddress.trim() : "";
  const stopLegText = serviceType === "roundtrip"
    ? additionalStopPrimary && additionalStopReturn
      ? t("wyjazd i powrót")
      : additionalStopReturn
      ? t("powrót")
      : t("wyjazd")
    : "";
  const routeText = serviceType==="from_airport"
    ? (activeStop ? `${airportLabel} → ${activeStop} → ${address||"—"}` : `${airportLabel} → ${address||"—"}`)
    : serviceType==="roundtrip"
    ? `${address||"—"} ↔ ${airportLabel}${activeStop ? ` · ${t("przystanek")}: ${activeStop} (${stopLegText})` : ""}`
    : (activeStop ? `${address||"—"} → ${activeStop} → ${airportLabel}` : `${address||"—"} → ${airportLabel}`);
  const paymentMethodText = paymentMethod === "online"
    ? t("Płatność online po potwierdzeniu")
    : t("Gotówka u kierowcy");

  const funnelDetails = {
    serviceType,
    airportKey: airport,
    vehicleType: vehicle,
    quoteTotal: quote.total
  };

  useEffect(() => {
    trackGrowthFunnelEvent("landing", funnelDetails);
    // Jedno wejście = jedna sesja formularza. Dalsze zdarzenia są deduplikowane po session_id + event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (routeReady && (airport !== "other" || otherAirport.trim().length >= 3)) {
      trackGrowthFunnelEvent("route_ready", funnelDetails);
    }
  }, [routeReady, airport, otherAirport, serviceType, vehicle, quote.total]);

  useEffect(() => {
    if (travelDate && travelTime && roundtripScheduleReady()) trackGrowthFunnelEvent("trip_ready", funnelDetails);
  }, [travelDate, travelTime, returnDate, returnTime, serviceType, airport, vehicle, quote.total]);

  useEffect(() => {
    if (quote.total > 0 && ((!mobile && routeReady) || (mobile && step === 6))) {
      trackGrowthFunnelEvent("quote_viewed", funnelDetails);
    }
  }, [mobile, step, routeReady, airport, quote.total, serviceType, vehicle]);

  useEffect(() => {
    if (name.trim() || phone.trim() || email.trim()) {
      trackGrowthFunnelEvent("customer_started", funnelDetails);
    }
  }, [name, phone, email, serviceType, airport, vehicle, quote.total]);

  useEffect(() => {
    const customerReady = Boolean(name.trim() && phone.trim() && email.trim() && (!invoice || nip10(nip).length === 10));
    const bookingReady = Boolean(routeReady && travelDate && travelTime && roundtripScheduleReady() && airport !== "other" && customerReady);
    if (bookingReady && (!mobile || step === 6)) {
      trackGrowthFunnelEvent("ready_to_submit", funnelDetails);
    }
  }, [name, phone, email, invoice, nip, routeReady, travelDate, travelTime, returnDate, returnTime, airport, mobile, step, serviceType, vehicle, quote.total]);

  function markFunnelStarted() {
    trackGrowthFunnelEvent("form_started", funnelDetails);
  }

  function nip10(v:string){ return v.replace(/\D/g,"").slice(0,10); }
  function go(n:number){setStep(n);if(typeof window!=="undefined"){window.dispatchEvent(new CustomEvent("matt:booking-step",{detail:{step:n}}));setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),60);}}
  function roundtripScheduleReady(){
    if(serviceType!=="roundtrip") return true;
    if(!travelDate||!travelTime||!returnDate||!returnTime) return false;
    const outbound = new Date(`${travelDate}T${travelTime}`).getTime();
    const back = new Date(`${returnDate}T${returnTime}`).getTime();
    return Number.isFinite(outbound) && Number.isFinite(back) && back > outbound;
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  function valid(n:number){
    if(n===2) return routeReady && (airport!=="other" || otherAirport.trim().length>=3) && (!additionalStopEnabled || (!!additionalStopAddress.trim() && !additionalStopBusy && !!additionalStopQuote));
    if(n===3) return !!travelDate && !!travelTime && roundtripScheduleReady();
    if(n===5) return !!name.trim() && !!phone.trim() && emailValid && (!invoice || nip10(nip).length===10);
    return true;
  }

  async function submit(){
    if(saving) return;
    if(airport==="other"){ setMessage(t("Dla tego lotniska wycena jest indywidualna telefonicznie.")); return; }
    const missing = [
      !address.trim() && t("adres"), !travelDate && t("data wyjazdu"), !travelTime && t("godzina przejazdu"),
      !name.trim() && t("imię i nazwisko"), !phone.trim() && t("telefon"), !email.trim() && t("e-mail")
    ].filter(Boolean);
    if(missing.length){ setMessage(`${t("Uzupełnij")}: ${missing.join(", ")}.`); return; }
    if(!emailValid){ setMessage(t("Podaj poprawny adres e-mail.")); return; }
    if(!routeReady){ setMessage(routeError || t("Poczekaj na obliczenie dojazdu dla podanego adresu.")); return; }
    if(serviceType==="roundtrip"&&(!returnDate||!returnTime)){ setMessage(t("Dla przejazdu w obie strony podaj datę i godzinę powrotu.")); return; }
    if(serviceType==="roundtrip"&&!roundtripScheduleReady()){ setMessage(t("Termin powrotu musi być późniejszy niż wyjazd.")); return; }
    if(invoice&&nip10(nip).length!==10){ setMessage(t("Podaj poprawny 10-cyfrowy NIP.")); return; }
    if(additionalStopEnabled&&(!additionalStopAddress.trim()||(!additionalStopPrimary&&!(serviceType==="roundtrip"&&additionalStopReturn))||!additionalStopQuote)){ setMessage(t("Poczekaj na poprawne obliczenie dodatkowego przystanku.")); return; }
    setSaving(true); setMessage("");
    const tracking = readGrowthTracking();
    try {
    const r=await fetchCustomer("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      serviceType,address,airport,vehicleType:vehicle,passengers,distanceKm,travelDate,travelTime,
      returnDate,returnTime,flightNumber:flight,returnFlightNumber:returnFlight,
      additionalStopAddress:additionalStopEnabled?additionalStopAddress:null,additionalStopPrimary:additionalStopEnabled&&additionalStopPrimary,additionalStopReturn:additionalStopEnabled&&serviceType==="roundtrip"&&additionalStopReturn,
      locale,customerName:name,phone,email,invoiceRequired:invoice,companyNip:invoice?nip10(nip):null,paymentMethod,onlinePaymentRequested,notes:notes||null,
      tracking,
      funnelSessionId: growthFunnelSessionId()
    })});
    const d=await r.json();
    if(!r.ok){ setMessage(d.error??t("Błąd rezerwacji.")); setSaving(false); return; }
    trackBookingPurchase({
      bookingNumber: d.booking_number,
      value: Number(d.total_price),
      serviceType,
      airportLabel
    });
    setSuccess(d); setSaving(false);
    clearGrowthTracking();
    resetGrowthFunnelSession();
    window.scrollTo({top:0,behavior:"smooth"});
    } catch {
      setMessage(t("Nie udało się połączyć z systemem rezerwacji."));
    } finally { setSaving(false); }
  }

  if(success){
    return <div className="booking-success-card">
      <div className="success-check">✓</div>
      <span className="badge">MATT TRANSPORT</span>
      <h1>{t("Dziękujemy! Rezerwacja przyjęta")}</h1><div className="pending-confirmation-badge">{t("🕐 Oczekuje na potwierdzenie")}</div><div className="client-next-step"><strong>{t("Co dalej?")}</strong><p>{t("Twoje zgłoszenie zostało przyjęte. Potwierdzimy rezerwację najszybciej jak to możliwe.")}</p><p>{t("Oczekuj wiadomości e-mail lub kontaktu z MATT TRANSPORT.")}</p></div>
      <div className="success-number"><span>{t("Numer rezerwacji")}</span><strong>{success.booking_number}</strong></div>
      <div className="success-details"><div><span>{t("Trasa")}</span><strong>{routeText}</strong></div>{serviceType==="roundtrip"&&<div><span>{t("Powrót")}</span><strong>{returnDate} {returnTime}</strong></div>}<div><span>{t("Kwota")}</span><strong>{Number(success.total_price).toFixed(2)} zł</strong></div><div><span>{t("Płatność")}</span><strong>{paymentMethodText}</strong></div></div>
      {success.customer_access_token && <CustomerPushControls customerLocale={locale} token={success.customer_access_token} />}
      <div className="success-actions"><a className="btn" href={`/booking?lang=${locale}`}>{t("NOWA REZERWACJA")}</a></div>
    </div>;
  }

  const renderAirportSelect = () => <label>{t("Lotnisko")}<select value={airport} onChange={e=>{const v=e.target.value as AirportKey;setAirport(v);if(v!=="other")setOtherAirport("");}}>
      {Object.entries(airports).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
      <option value="other">{t("Inne lotnisko")}</option>
    </select>
  </label>;

  const renderOtherAirportBox = () => airport==="other" ? <div className="individual-quote-box">
    <label>{t("Jakie lotnisko?")}<input value={otherAirport} onChange={e=>setOtherAirport(e.target.value)} placeholder={t("np. Berlin Brandenburg")}/></label>
    <strong>{t("Wycena indywidualna")}</strong>
    <p>{t("Dla tego lotniska cenę ustalamy indywidualnie telefonicznie.")}</p>
    <a className="btn" href="tel:+48691242691">📞 {t("ZADZWOŃ I ZAPYTAJ O CENĘ")}</a>
  </div> : null;

  const renderRouteStatus = () => airport!=="other" && <div aria-live="polite">
    {routeBusy && <div className="route-status">{t("Obliczanie dojazdu do adresu...")}</div>}
    {routeError && <div className="booking-error">{routeError}<br/><button type="button" className="btn secondary" onClick={()=>setRouteRetry(n=>n+1)}>{t("OBLICZ PONOWNIE")}</button></div>}
    {routeReady && <div className="route-status ok">{t("Dojazd z bazy w Książenicach:")}{distanceKm.toFixed(1)} {t("km · 40 km w cenie.")}</div>}
  </div>;

  const renderAdditionalStopBox = () => !additionalStopEnabled ? <button type="button" className="btn secondary additional-stop-toggle" onClick={()=>setAdditionalStopEnabled(true)}>{t("+ DODAJ DODATKOWY ADRES / PRZYSTANEK")}</button> : <div className="additional-stop-box">
    <div className="additional-stop-head"><div><strong>{t("Dodatkowy adres / przystanek")}</strong><small>{t("+20,00 zł za każdy użyty kierunek. Dopłata kilometrowa tylko za faktyczny objazd poza normalną trasę.")}</small></div><button type="button" className="btn secondary" onClick={()=>{setAdditionalStopEnabled(false);setAdditionalStopAddress("");setAdditionalStopPrimary(true);setAdditionalStopReturn(false);setAdditionalStopSuggestions([]);setAdditionalStopQuote(null);setAdditionalStopError("");}}>{t("USUŃ")}</button></div>
    <label>{t("Adres dodatkowego przystanku")}<input value={additionalStopAddress} onChange={e=>setAdditionalStopAddress(e.target.value)} autoComplete="off" placeholder={t("Wpisz drugi adres")}/>{additionalStopSuggestions.length>0&&<div className="address-suggestions">{additionalStopSuggestions.slice(0,5).map((x,i)=><button key={x.placeId??i} type="button" onClick={()=>{setAdditionalStopAddress(x.text??"");setAdditionalStopSuggestions([]);}}>{x.text}</button>)}</div>}</label>
    {serviceType==="roundtrip"?<div className="additional-stop-directions"><label><input type="checkbox" checked={additionalStopPrimary} onChange={e=>setAdditionalStopPrimary(e.target.checked)}/> {t("Wyjazd na lotnisko (+20 zł)")}</label><label><input type="checkbox" checked={additionalStopReturn} onChange={e=>setAdditionalStopReturn(e.target.checked)}/> {t("Powrót z lotniska (+20 zł)")}</label></div>:<p className="muted">{t("Przystanek dotyczy tego przejazdu · +20,00 zł.")}</p>}
    {additionalStopBusy&&<div className="route-status">{t("Obliczanie objazdu...")}</div>}
    {additionalStopError&&<div className="booking-error">{additionalStopError}</div>}
    {additionalStopQuote&&!additionalStopBusy&&<div className="route-status ok">{Number(additionalStopQuote.totalExtraKm||0)>0?`${t("Objazd poza trasą")}: ${Number(additionalStopQuote.totalExtraKm).toFixed(1)} km · ${t("Dopłata")} ${Number(additionalStopQuote.stopExtraPrice).toFixed(2)} zł`:t("✓ Przystanek jest na trasie — bez dopłaty kilometrowej.")}</div>}
  </div>;

  const googleRatingBadge = <a
    className="badge"
    href="https://www.google.com/maps/search/?api=1&query=MATT%20TRANSPORT%20Rybnik&query_place_id=ChIJpcffIH5JEUcR7xEM9paQ2Gs"
    target="_blank"
    rel="noreferrer"
    title={t("Zobacz opinie MATT TRANSPORT w Google")}
    aria-label={t("Ocena MATT TRANSPORT w Google: 5.0 na 5")}
  >{t("★★★★★ 5.0 w Google")}</a>;

  if(mobile){
    return <div className="mobile-booking-wizard" onClickCapture={markFunnelStarted} onInputCapture={markFunnelStarted}>
      <div className="wizard-header">
        <div className="wizard-header-top"><span className="badge">MATT TRANSPORT</span><strong>{t("Krok")} {step} {t("z 6")}</strong></div>
        <div style={{marginTop:8}}>{googleRatingBadge}</div>
        <div className="wizard-progress"><span style={{width:`${Math.round(step/6*100)}%`}}/></div>
      </div>

      {step===1&&<section className="card wizard-card">
        <h1>{t("Jakiego przejazdu potrzebujesz?")}</h1>
        <div className="wizard-choice-list">
          <button onClick={()=>{setServiceType("to_airport");go(2)}}><strong>{t("🛫 Transfer na lotnisko")}</strong><span>{t("Z adresu na wybrane lotnisko")}</span></button>
          <button onClick={()=>{setServiceType("from_airport");go(2)}}><strong>{t("🛬 Odbiór z lotniska")}</strong><span>{t("Z lotniska pod wskazany adres")}</span></button>
          <button onClick={()=>{setServiceType("roundtrip");go(2)}}><strong>{t("🔁 W obie strony")}</strong><span>{t("Wyjazd i powrót")}</span></button>
        </div>
      </section>}

      {step===2&&<section className="card wizard-card">
        <h1>{t("Trasa i lotnisko")}</h1>
        {plannerImported&&<p className="route-status ok" role="status">{t("Adres i godzina wyjazdu zostały uzupełnione na podstawie planera. Sprawdź je przed rezerwacją.")}</p>}
        <label>{serviceType==="from_airport"?t("Adres docelowy"):t("Adres odbioru")}
          <input value={address} onChange={e=>setAddress(e.target.value)} placeholder={t("Wpisz adres")}/>
          {suggestions.length>0&&<div className="address-suggestions">{suggestions.slice(0,5).map((s,i)=><button key={s.placeId??i} type="button" onClick={()=>chooseAddress(s.text??"")}>{s.text}</button>)}</div>}
        </label>
        {renderRouteStatus()}
        {renderAirportSelect()}
        {renderOtherAirportBox()}
        {airport!=="other"&&renderAdditionalStopBox()}
        <div className="wizard-nav"><button className="btn secondary" onClick={()=>go(1)}>{t("WSTECZ")}</button>{airport!=="other"&&<button className="btn" disabled={!valid(2)} onClick={()=>go(3)}>{t("DALEJ")}</button>}</div>
      </section>}

      {step===3&&<section className="card wizard-card">
        <h1>{t("Termin przejazdu")}</h1>
        <p className="muted flight-time-hint">{t("Dla wyjazdu na lotnisko podaj godzinę, o której chcesz wyjechać spod wskazanego adresu. Przy odbiorze z lotniska podaj godzinę przylotu z rozkładu lotu.")}</p>
        <div className="grid">
          <label>{t("Data")}<input required type="date" value={travelDate} onChange={e=>setTravelDate(e.target.value)}/></label>
          <label>{serviceType === "from_airport" ? t("Godzina przylotu") : t("Godzina wyjazdu na lotnisko")}<input required type="time" value={travelTime} onChange={e=>setTravelTime(e.target.value)}/></label>
          <label>{serviceType==="roundtrip"?t("Lot wylotowy"):t("Numer lotu")}<input value={flight} onChange={e=>setFlight(e.target.value)} placeholder={t("np. FR8214")}/></label>
          <label>{t("Pasażerowie")}<select value={passengers} onChange={e=>setPassengers(Number(e.target.value))}>{[1,2,3,4,5,6,7,8].map(n=><option key={n}>{n}</option>)}</select></label>
          {serviceType==="roundtrip"&&<>
            <label>{t("Data powrotu")}<input required min={travelDate||undefined} type="date" value={returnDate} onChange={e=>setReturnDate(e.target.value)}/></label>
            <label>{t("Godzina przylotu powrotnego")}<input required type="time" value={returnTime} onChange={e=>setReturnTime(e.target.value)}/></label>
            <label>{t("Lot powrotny")}<input value={returnFlight} onChange={e=>setReturnFlight(e.target.value)}/></label>
          </>}
        </div>
        <div className="wizard-nav"><button className="btn secondary" onClick={()=>go(2)}>{t("WSTECZ")}</button><button className="btn" disabled={!valid(3)} onClick={()=>go(4)}>{t("DALEJ")}</button></div>
      </section>}

      {step===4&&<section className="card wizard-card">
        <h1>{t("Wybierz pojazd")}</h1>
        <div className="wizard-choice-list">
          <button disabled={passengers>3} onClick={()=>{setVehicle("car");go(5)}}><strong>{t("🚘 Samochód osobowy")}</strong><span>{t("Do 3 pasażerów z bagażami")}</span></button>
          <button onClick={()=>{setVehicle("bus");go(5)}}><strong>{t("🚐 Bus do 8 osób")}</strong><span>{t("Dla grup i większego bagażu")}</span></button>
        </div>
        <div className="wizard-nav one"><button className="btn secondary" onClick={()=>go(3)}>{t("WSTECZ")}</button></div>
      </section>}

      {step===5&&<section className="card wizard-card">
        <h1>{t("Twoje dane")}</h1>
        <div className="grid">
          <label>{t("Imię i nazwisko")}<input autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
          <label>{t("Telefon")}<input type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
          <label>{t("E-mail")}<input type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(email.trim()) && !emailValid} value={email} onChange={e=>{setEmail(e.target.value);if(message===t("Podaj poprawny adres e-mail."))setMessage("");}}/>{email.trim() && !emailValid && <small role="status" style={{display:"block",color:"#ffb8b8",marginTop:6}}>{t("Podaj poprawny adres e-mail.")}</small>}</label>
          <label>{t("Faktura VAT")}<select value={invoice?"1":"0"} onChange={e=>{const n=e.target.value==="1";setInvoice(n);if(!n)setNip("");}}><option value="0">{t("Nie")}</option><option value="1">{t("Tak, +8%")}</option></select></label>
          {invoice&&<label>NIP<input inputMode="numeric" maxLength={10} value={nip} onChange={e=>setNip(nip10(e.target.value))}/></label>}
        </div>
        <label style={{marginTop:14}}>{t("Uwagi do rezerwacji")}<textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
        <div className="payment-method-section">
          <h3>{t("Sposób płatności")}</h3>
          <div className="payment-method-grid">
            <label className={`payment-method-choice ${paymentMethod==="cash"?"selected":""}`}>
              <input type="radio" name="payment-method-mobile" value="cash" checked={paymentMethod==="cash"} onChange={()=>setPaymentMethod("cash")}/>
              <span><strong>{t("💵 Gotówka")}</strong><small>{t("Płatność kierowcy przy realizacji przejazdu.")}</small></span>
            </label>
            <label className={`payment-method-choice ${paymentMethod==="online"?"selected":""}`}>
              <input type="radio" name="payment-method-mobile" value="online" checked={paymentMethod==="online"} onChange={()=>setPaymentMethod("online")}/>
              <span><strong>{t("💳 Płatność online")}</strong><small>{t("Po potwierdzeniu rezerwacji pojawi się bezpieczny przycisk płatności online.")}</small></span>
            </label>
          </div>
        </div>
        <div className="wizard-nav"><button className="btn secondary" onClick={()=>go(4)}>{t("WSTECZ")}</button><button className="btn" disabled={!valid(5)} onClick={()=>go(6)}>{t("PODSUMOWANIE")}</button></div>
      </section>}

      {step===6&&<section className="card wizard-card">
        <h1>{t("Podsumowanie")}</h1>
        <div className="wizard-summary">
          <div><span>{t("Trasa")}</span><strong>{routeText}</strong></div>
          <div><span>{t("Dojazd do adresu")}</span><strong>{routeReady?`${distanceKm.toFixed(1)} km`:routeBusy?t("Obliczanie..."):t("Nieobliczony")}</strong></div>
          <div><span>{t("Termin")}</span><strong>{travelDate} {travelTime}</strong></div>
          {serviceType==="roundtrip"&&<div><span>{t("Powrót")}</span><strong>{returnDate} {returnTime}</strong></div>}
          <div><span>{t("Pojazd")}</span><strong>{vehicle==="car"?t("Samochód osobowy"):t("Bus do 8 osób")}</strong></div>
          <div><span>{t("Pasażerowie")}</span><strong>{passengers}</strong></div>
          {additionalStopEnabled&&additionalStopAddress&&<div><span>{t("Dodatkowy przystanek")}</span><strong>{additionalStopAddress}</strong></div>}
          {quote.stopFee>0&&<div><span>{t("Opłata za przystanek")}</span><strong>{quote.stopFee.toFixed(2)} zł</strong></div>}
          {quote.stopExtraKm>0&&<div><span>{t("Objazd poza trasą")}</span><strong>{quote.stopExtraKm.toFixed(1)} km · {quote.stopExtra.toFixed(2)} zł</strong></div>}
          <div><span>{t("Płatność")}</span><strong>{paymentMethodText}</strong></div>
          <div className="total"><span>{t("Razem")}</span><strong>{quote.total.toFixed(2)} zł</strong></div>
        </div>
        {message&&<div className="booking-error">{message}</div>}
        <div className="wizard-final-actions"><button className="btn secondary" onClick={()=>go(5)}>{t("WSTECZ")}</button><button className="btn" disabled={saving||routeBusy} onClick={submit}>{saving?t("ZAPISYWANIE..."):routeBusy?t("OBLICZANIE TRASY..."):t("ZAREZERWUJ")}</button></div>
      </section>}
    </div>;
  }

  return <div className="layout booking-form-wrap" onClickCapture={markFunnelStarted} onInputCapture={markFunnelStarted}>
    <div className="card">
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><span className="badge">MATT TRANSPORT</span>{googleRatingBadge}</div><h1>{t("Zarezerwuj transfer lotniskowy")}</h1>
      <div className="choice-grid">
        <button className={`choice ${serviceType==="to_airport"?"active":""}`} onClick={()=>setServiceType("to_airport")}><strong>{t("🛫 Transfer na lotnisko")}</strong></button>
        <button className={`choice ${serviceType==="from_airport"?"active":""}`} onClick={()=>setServiceType("from_airport")}><strong>{t("🛬 Odbiór z lotniska")}</strong></button>
        <button className={`choice ${serviceType==="roundtrip"?"active":""}`} onClick={()=>setServiceType("roundtrip")}><strong>{t("🔁 W obie strony")}</strong></button>
      </div>
      <h3>{t("Trasa")}</h3>
      <div className="grid">
        <label>{serviceType==="from_airport"?t("Adres docelowy"):t("Adres odbioru")}<input value={address} onChange={e=>setAddress(e.target.value)} placeholder={t("Wpisz adres")}/>{suggestions.length>0&&<div className="address-suggestions">{suggestions.slice(0,5).map((s,i)=><button key={s.placeId??i} type="button" onClick={()=>chooseAddress(s.text??"")}>{s.text}</button>)}</div>}</label>
        {renderAirportSelect()}
      </div>
      {renderRouteStatus()}
      {renderOtherAirportBox()}
      {airport!=="other"&&renderAdditionalStopBox()}
      <h3>{t("Termin")}</h3>
      <p className="muted flight-time-hint">{t("Dla wyjazdu na lotnisko podaj godzinę wyjazdu spod wskazanego adresu. Przy odbiorze z lotniska podaj godzinę przylotu z rozkładu lotu.")}</p>
      <div className="grid">
        <label>{t("Data")}<input required type="date" value={travelDate} onChange={e=>setTravelDate(e.target.value)}/></label>
        <label>{serviceType === "from_airport" ? t("Godzina przylotu") : t("Godzina wyjazdu na lotnisko")}<input required type="time" value={travelTime} onChange={e=>setTravelTime(e.target.value)}/></label>
        <label>{serviceType==="roundtrip"?t("Lot wylotowy"):t("Numer lotu")}<input value={flight} onChange={e=>setFlight(e.target.value)}/></label>
        <label>{t("Pasażerowie")}<select value={passengers} onChange={e=>setPassengers(Number(e.target.value))}>{[1,2,3,4,5,6,7,8].map(n=><option key={n}>{n}</option>)}</select></label>
        {serviceType==="roundtrip"&&<>
          <label>{t("Data powrotu")}<input required min={travelDate||undefined} type="date" value={returnDate} onChange={e=>setReturnDate(e.target.value)}/></label>
          <label>{t("Godzina przylotu powrotnego")}<input required type="time" value={returnTime} onChange={e=>setReturnTime(e.target.value)}/></label>
          <label>{t("Lot powrotny")}<input value={returnFlight} onChange={e=>setReturnFlight(e.target.value)}/></label>
        </>}
      </div>
      <h3>{t("Pojazd")}</h3>
      <div className="choice-grid vehicle-grid">
        <button className={`choice ${vehicle==="car"?"active":""}`} disabled={passengers>3} onClick={()=>setVehicle("car")}><strong>{t("Samochód osobowy")}</strong></button>
        <button className={`choice ${vehicle==="bus"?"active":""}`} onClick={()=>setVehicle("bus")}><strong>{t("Bus do 8 osób")}</strong></button>
      </div>
      <h3>{t("Dane klienta")}</h3>
      <div className="grid">
        <label>{t("Imię i nazwisko")}<input autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
        <label>{t("Telefon")}<input type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
        <label>{t("E-mail")}<input type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(email.trim()) && !emailValid} value={email} onChange={e=>{setEmail(e.target.value);if(message===t("Podaj poprawny adres e-mail."))setMessage("");}}/>{email.trim() && !emailValid && <small role="status" style={{display:"block",color:"#ffb8b8",marginTop:6}}>{t("Podaj poprawny adres e-mail.")}</small>}</label>
        <label>{t("Faktura VAT")}<select value={invoice?"1":"0"} onChange={e=>setInvoice(e.target.value==="1")}><option value="0">{t("Nie")}</option><option value="1">{t("Tak, +8%")}</option></select></label>
        {invoice&&<label>NIP<input inputMode="numeric" maxLength={10} value={nip} onChange={e=>setNip(nip10(e.target.value))}/></label>}
      </div>
      <label style={{marginTop:16}}>{t("Uwagi do rezerwacji")}<textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
      <div className="payment-method-section">
        <h3>{t("Sposób płatności")}</h3>
        <div className="payment-method-grid">
          <label className={`payment-method-choice ${paymentMethod==="cash"?"selected":""}`}>
            <input type="radio" name="payment-method-desktop" value="cash" checked={paymentMethod==="cash"} onChange={()=>setPaymentMethod("cash")}/>
            <span><strong>{t("💵 Gotówka")}</strong><small>{t("Płatność kierowcy przy realizacji przejazdu.")}</small></span>
          </label>
          <label className={`payment-method-choice ${paymentMethod==="online"?"selected":""}`}>
            <input type="radio" name="payment-method-desktop" value="online" checked={paymentMethod==="online"} onChange={()=>setPaymentMethod("online")}/>
            <span><strong>{t("💳 Płatność online")}</strong><small>{t("Po potwierdzeniu rezerwacji pojawi się bezpieczny przycisk płatności online.")}</small></span>
          </label>
        </div>
      </div>

    </div>
    <aside className="card summary">
      <h3>{t("Podsumowanie")}</h3>
      {airport==="other"?<>
        <div className="individual-quote-summary"><strong>{t("Wycena indywidualna")}</strong><span>{otherAirport||t("Inne lotnisko")}</span></div>
        <a className="btn" style={{width:"100%",marginTop:16}} href="tel:+48691242691">📞 {t("ZADZWOŃ")}</a>
      </>:<>
        <div className="row"><span>{t("Trasa")}</span><strong>{routeText}</strong></div>
        <div className="row"><span>{t("Dojazd do adresu")}</span><strong>{routeReady?`${distanceKm.toFixed(1)} km`:routeBusy?t("Obliczanie..."):t("Nieobliczony")}</strong></div>
        <div className="row"><span>{t("Termin")}</span><strong>{travelDate||"—"} {travelTime||""}</strong></div>
        {serviceType==="roundtrip"&&<div className="row"><span>{t("Powrót")}</span><strong>{returnDate||"—"} {returnTime||""}</strong></div>}
        <div className="row"><span>{t("Cena bazowa")}</span><strong>{quote.base.toFixed(2)} zł</strong></div>
        <div className="row"><span>{t("Dopłata")}</span><strong>{quote.extra.toFixed(2)} zł</strong></div>
        {additionalStopEnabled&&additionalStopAddress&&<div className="row"><span>{t("Dodatkowy przystanek")}</span><strong style={{textAlign:"right",maxWidth:"60%"}}>{additionalStopAddress}</strong></div>}
        {quote.stopFee>0&&<div className="row"><span>{t("Opłata za przystanek")}</span><strong>{quote.stopFee.toFixed(2)} zł</strong></div>}
        {quote.stopExtraKm>0&&<div className="row"><span>{t("Objazd poza trasą")}</span><strong>{quote.stopExtraKm.toFixed(1)} km · {quote.stopExtra.toFixed(2)} zł</strong></div>}
        <div className="row"><span>{t("VAT")}</span><strong>{quote.vat.toFixed(2)} zł</strong></div>
        <div className="row"><span>{t("Płatność")}</span><strong>{paymentMethodText}</strong></div>
        <div className="row total"><span>{t("Razem")}</span><strong>{quote.total.toFixed(2)} zł</strong></div>
        <button className="btn" style={{width:"100%",marginTop:16}} disabled={saving||routeBusy} onClick={submit}>{saving?t("ZAPISYWANIE..."):routeBusy?t("OBLICZANIE TRASY..."):t("ZAREZERWUJ")}</button>
      </>}
      {message&&<div className="booking-error">{message}</div>}
    </aside>
  </div>;
}
