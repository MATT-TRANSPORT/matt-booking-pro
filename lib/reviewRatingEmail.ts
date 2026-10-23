import { resolveCustomerLocale, withCustomerLocale } from "@/lib/bookingLocale";

const copy = {
  pl:{title:"Jak minęła podróż?",intro:"Dziękujemy za przejazd. Oceń usługę w skali 1–5 — zajmie to kilka sekund.",rate:"⭐ OCEŃ PRZEJAZD",booking:"Rezerwacja",customer:"Klient",note:"Po najwyższej ocenie możesz jednym kliknięciem opublikować opinię również w Google. Niższa ocena i uwagi trafią bezpośrednio do MATT TRANSPORT."},
  en:{title:"How was your journey?",intro:"Thank you for travelling with us. Rate the service from 1 to 5 — it only takes a few seconds.",rate:"⭐ RATE YOUR JOURNEY",booking:"Booking",customer:"Customer",note:"After the highest rating you can also publish a Google review with one click. Lower ratings and comments go directly to MATT TRANSPORT."},
  de:{title:"Wie war Ihre Fahrt?",intro:"Vielen Dank für Ihre Fahrt. Bewerten Sie den Service mit 1 bis 5 Sternen — es dauert nur wenige Sekunden.",rate:"⭐ FAHRT BEWERTEN",booking:"Buchung",customer:"Kunde",note:"Nach der höchsten Bewertung können Sie mit einem Klick auch eine Google-Bewertung veröffentlichen. Niedrigere Bewertungen und Hinweise gehen direkt an MATT TRANSPORT."},
  cs:{title:"Jaká byla vaše cesta?",intro:"Děkujeme za jízdu. Ohodnoťte službu od 1 do 5 — zabere to jen pár sekund.",rate:"⭐ OHODNOTIT JÍZDU",booking:"Rezervace",customer:"Zákazník",note:"Po nejvyšším hodnocení můžete jedním kliknutím zveřejnit recenzi také na Googlu. Nižší hodnocení a připomínky dostane přímo MATT TRANSPORT."}
} as const;
const esc=(value:unknown)=>String(value??"").replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch));

export function reviewRatingEmail(booking:any,ratingUrl:string) {
  const locale=resolveCustomerLocale(booking.customer_locale),t=copy[locale];
  const url=withCustomerLocale(ratingUrl,locale);
  return {locale,subject:`${t.title} – ${booking.booking_number}`,html:`<div lang="${locale}" style="font-family:Arial,sans-serif;background:#10141b;color:#f7f7f7;padding:28px;line-height:1.7"><h2 style="color:#f1d28b">MATT TRANSPORT</h2><h1>${t.title}</h1><p>${t.intro}</p><p><a href="${esc(url)}" style="color:#f1d28b">${t.rate}</a></p><p>${t.booking}: <strong>${esc(booking.booking_number)}</strong><br>${t.customer}: <strong>${esc(booking.customer_name)}</strong></p><p>${t.note}</p></div>`};
}
