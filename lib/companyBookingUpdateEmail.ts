import { companyText } from "@/lib/companyCopy";
import { bookingOrigin } from "@/lib/bookingOrigin";
import { resolveCustomerLocale, withCustomerLocale } from "@/lib/bookingLocale";
import { escapeCustomerHtml } from "@/lib/customerAccount";

const copy={
 pl:{updated:"Zmieniono rezerwację",cancelled:"Anulowano rezerwację",updatedText:"Rezerwacja została zaktualizowana. Aktualne szczegóły znajdziesz w portalu firmy.",cancelledText:"Rezerwacja została anulowana i nie będzie realizowana.",paid:"Płatność była już zaksięgowana. MATT TRANSPORT zweryfikuje ewentualny zwrot zgodnie z warunkami anulacji.",open:"OTWÓRZ REZERWACJĘ",terms:"Wszystkie ceny B2B są cenami netto + 8% VAT."},
 en:{updated:"Booking updated",cancelled:"Booking cancelled",updatedText:"The booking has been updated. You can find the current details in your company portal.",cancelledText:"The booking has been cancelled and the trip will not take place.",paid:"Payment had already been recorded. MATT TRANSPORT will review any refund under the cancellation terms.",open:"OPEN BOOKING",terms:"All B2B prices are net prices plus 8% VAT."},
 de:{updated:"Buchung geändert",cancelled:"Buchung storniert",updatedText:"Die Buchung wurde aktualisiert. Die aktuellen Details finden Sie im Firmenportal.",cancelledText:"Die Buchung wurde storniert. Die Fahrt findet nicht statt.",paid:"Die Zahlung war bereits verbucht. MATT TRANSPORT prüft eine mögliche Erstattung gemäß den Stornierungsbedingungen.",open:"BUCHUNG ÖFFNEN",terms:"Alle B2B-Preise sind Nettopreise zuzüglich 8 % MwSt."},
 cs:{updated:"Rezervace změněna",cancelled:"Rezervace zrušena",updatedText:"Rezervace byla aktualizována. Aktuální podrobnosti najdete ve firemním portálu.",cancelledText:"Rezervace byla zrušena a jízda se neuskuteční.",paid:"Platba již byla zaúčtována. MATT TRANSPORT posoudí případné vrácení podle storno podmínek.",open:"OTEVŘÍT REZERVACI",terms:"Všechny ceny B2B jsou bez DPH + 8 % DPH."}
} as const;
export function companyBookingUpdateEmail(kind:"updated"|"cancelled",booking:any,wasPaid=false){
 const locale=resolveCustomerLocale(booking.customer_locale),t=copy[locale],esc=escapeCustomerHtml;
 const origin=bookingOrigin();
 const url=withCustomerLocale(`${origin}/firma/rezerwacje/${encodeURIComponent(booking.id)}`,locale);
 return {locale,subject:`${t[kind]} ${booking.booking_number}`,html:`<div lang="${locale}" style="font-family:Arial,sans-serif;padding:28px"><h2>MATT TRANSPORT</h2><h1>${t[kind]} ${esc(booking.booking_number)}</h1><p>${kind==="updated"?t.updatedText:t.cancelledText}</p>${kind==="updated" && booking.status==="pending"?`<p><strong>${companyText("Zmiany oczekują na potwierdzenie przez MATT TRANSPORT.",locale)}</strong></p>`:""}${wasPaid?`<p>${t.paid}</p>`:""}<p><a href="${esc(url)}">${t.open}</a></p><p>${t.terms}</p><p>+48 691 242 691</p></div>`};
}
