import { appBaseUrl } from "@/lib/payment";
import { resolveCustomerLocale } from "@/lib/bookingLocale";
import { customerText } from "@/lib/customerCopy";
import { travelGuideHtml } from "@/lib/travelGuide";

const copy = {
  pl: {
    confirmed:"Transport został potwierdzony",assigned:"Dane kierowcy i pojazdu",
    confirmedIntro:"Dzień dobry, transport zamówiony przez Twoją firmę został potwierdzony przez MATT TRANSPORT.",
    assignedIntro:"Poniżej znajdziesz aktualne dane operacyjne Twojego przejazdu. Jeśli obsada została zmieniona, ta wiadomość zastępuje wcześniejsze dane.",
    gross:"Kwota brutto",private:"Link jest indywidualny dla tej rezerwacji. Nie udostępniaj go osobom trzecim.",
    outbound:"WYJAZD",back:"POWRÓT",registration:"Nr rejestracyjny",unassigned:"Jeszcze nie przypisano",phone:"Telefon",driver:"Kierowca",vehicle:"Pojazd"
  },
  en: {
    confirmed:"Your transport has been confirmed",assigned:"Driver and vehicle details",
    confirmedIntro:"Hello, the transport booked by your company has been confirmed by MATT TRANSPORT.",
    assignedIntro:"Below are the current operational details of your trip. If the assignment has changed, this message replaces the previous details.",
    gross:"Gross amount",private:"This link is unique to this booking. Do not share it with third parties.",
    outbound:"OUTBOUND",back:"RETURN",registration:"Registration",unassigned:"Not assigned yet",phone:"Phone",driver:"Driver",vehicle:"Vehicle"
  },
  de: {
    confirmed:"Ihre Fahrt wurde bestätigt",assigned:"Angaben zu Fahrer und Fahrzeug",
    confirmedIntro:"Guten Tag, die von Ihrer Firma bestellte Fahrt wurde von MATT TRANSPORT bestätigt.",
    assignedIntro:"Hier finden Sie die aktuellen Angaben zu Ihrer Fahrt. Bei einer Änderung der Besetzung ersetzt diese Nachricht die bisherigen Angaben.",
    gross:"Bruttobetrag",private:"Dieser Link gilt nur für diese Buchung. Geben Sie ihn nicht an Dritte weiter.",
    outbound:"HINFAHRT",back:"RÜCKFAHRT",registration:"Kennzeichen",unassigned:"Noch nicht zugewiesen",phone:"Telefon",driver:"Fahrer",vehicle:"Fahrzeug"
  },
  cs: {
    confirmed:"Vaše doprava byla potvrzena",assigned:"Údaje o řidiči a vozidle",
    confirmedIntro:"Dobrý den, doprava objednaná vaší firmou byla potvrzena společností MATT TRANSPORT.",
    assignedIntro:"Níže najdete aktuální údaje o vaší jízdě. Pokud došlo ke změně obsazení, tato zpráva nahrazuje předchozí údaje.",
    gross:"Částka včetně DPH",private:"Tento odkaz je určen pouze pro tuto rezervaci. Nesdílejte jej s dalšími osobami.",
    outbound:"ODJEZD",back:"NÁVRAT",registration:"SPZ",unassigned:"Zatím nepřiřazeno",phone:"Telefon",driver:"Řidič",vehicle:"Vozidlo"
  }
} as const;

const esc=(value:unknown)=>String(value??"").replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch));
const time=(value:unknown)=>String(value||"").slice(0,5);

function employeeEmail(kind:"confirmed"|"assigned",b:any) {
  const locale=resolveCustomerLocale(b.customer_locale),t=copy[locale];
  const label=(key:string)=>customerText(key,locale);
  const row=(name:string,value:unknown)=>`<div><span style="color:#aab1bc">${esc(name)}:</span> <strong>${esc(value)}</strong></div>`;
  const route=b.service_type==="from_airport"?`${b.airport_label} → ${b.pickup_address}`:`${b.pickup_address} ${b.service_type==="roundtrip"?"↔":"→"} ${b.destination_address||b.airport_label}`;
  const details=row(label("Numer rezerwacji"),b.booking_number)+row(label("Pasażer"),b.customer_name||"—")+row(label("Trasa"),route)+row(label("Termin"),`${b.travel_date} · ${time(b.travel_time)}`)+(b.service_type==="roundtrip"&&b.return_date?row(label("Powrót"),`${b.return_date} · ${time(b.return_time)}`):"");
  const driverBox=(back:boolean)=>`<h3>${back?t.back:t.outbound}</h3>${row(t.driver,(back?b.return_driver_name:b.driver_name)||t.unassigned)}${row(t.phone,(back?b.return_driver_phone:b.driver_phone)||"—")}${row(t.vehicle,(back?b.return_vehicle_name:b.vehicle_name)||t.unassigned)}${row(t.registration,(back?b.return_vehicle_registration:b.vehicle_registration)||"—")}`;
  let payment="";
  if(b.payment_method==="employee_payment") {
    if(b.payment_status==="paid") payment=`<p>${esc(label("✓ Płatność została zaksięgowana."))}</p>`;
    else if(b.payment_status==="review") payment=`<p>${esc(label("⚠ Płatność wymaga weryfikacji przez MATT TRANSPORT."))}</p>`;
    else if(b.payment_status==="refunded") payment=`<p>${esc(label("↩ Zarejestrowano zwrot."))}</p>`;
    else if(b.customer_access_token&&b.status!=="cancelled") {
      const url=`${appBaseUrl()}/platnosc/${encodeURIComponent(b.customer_access_token)}?lang=${locale}`;
      payment=`<section style="margin-top:20px;padding:18px;border:1px solid #5d4d2c;border-radius:12px"><h3>${esc(label("Płatność online"))}</h3>${row(t.gross,`${Number(b.price_gross??b.total_price??0).toFixed(2)} PLN`)}<p><a style="color:#f1d28b" href="${esc(url)}">${esc(label("💳 OPŁAĆ ONLINE"))}</a></p><small>${esc(t.private)}</small></section>`;
    }
  }
  const assignments=kind==="assigned"?`<section style="padding:18px;border:1px solid #343b49;border-radius:12px;margin-top:18px">${driverBox(false)}${b.service_type==="roundtrip"?driverBox(true):""}</section>`:"";
  const guide=kind==="assigned"?travelGuideHtml(b.service_type,locale,!b.destination_address&&b.booking_source!=="public_general"):"";
  return {locale,subject:`MATT TRANSPORT · ${t[kind]} · ${b.booking_number}`,html:`<div lang="${locale}" style="padding:28px;background:#10141b;color:#f7f7f7;font-family:Arial,sans-serif;line-height:1.8"><h2 style="color:#f1d28b">MATT TRANSPORT</h2><h1>${t[kind]}</h1><p>${kind==="confirmed"?t.confirmedIntro:t.assignedIntro}</p><section style="padding:18px;border:1px solid #343b49;border-radius:12px">${details}</section>${assignments}${payment}${guide}<p>+48 691 242 691 · kontakt@matt-transport.pl</p></div>`};
}

export function b2bEmployeeConfirmedEmail(b:any) { return employeeEmail("confirmed",b); }
export function b2bEmployeeAssignedEmail(b:any) { return employeeEmail("assigned",b); }
