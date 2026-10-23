import { bookingOrigin } from "@/lib/bookingOrigin";
import { resolveCustomerLocale } from "@/lib/bookingLocale";
import { customerText } from "@/lib/customerCopy";

type QuoteKind = "offered" | "accepted" | "rejected";
const copy = {
  pl: {offered:"Wycena transportu jest gotowa",accepted:"Potwierdzenie zamówienia",rejected:"Potwierdzamy rezygnację z wyceny",offerInfo:"Ta wiadomość nie potwierdza jeszcze realizacji transportu. Otwórz wycenę i wybierz, czy ją akceptujesz. Akceptacja oznacza odpłatne zamówienie transportu na wskazaną kwotę.",acceptInfo:"Dziękujemy. Twoje zamówienie zostało przyjęte do realizacji.",rejectInfo:"Wycena nie została zaakceptowana i zlecenie nie będzie realizowane. Jeśli zmienisz zdanie, skontaktuj się z nami.",valid:"Wycena ważna do",open:"SPRAWDŹ I ZAAKCEPTUJ WYCENĘ",details:"OTWÓRZ REZERWACJĘ",online:"Płatność online jest dostępna w portalu rezerwacji."},
  en: {offered:"Your transport quote is ready",accepted:"Order confirmation",rejected:"Quote declined",offerInfo:"This message does not yet confirm your transport. Open the quote and choose whether to accept it. Accepting places a paid transport order for the amount shown.",acceptInfo:"Thank you. Your transport order has been confirmed.",rejectInfo:"The quote was not accepted and the transport will not be carried out. Contact us if you change your mind.",valid:"Quote valid until",open:"VIEW AND ACCEPT QUOTE",details:"VIEW BOOKING",online:"Online payment is available in your booking portal."},
  de: {offered:"Ihr Transportangebot ist bereit",accepted:"Auftragsbestätigung",rejected:"Angebot abgelehnt",offerInfo:"Diese Nachricht bestätigt die Fahrt noch nicht. Öffnen Sie das Angebot und entscheiden Sie, ob Sie es annehmen. Mit der Annahme bestellen Sie die Fahrt kostenpflichtig zum angegebenen Betrag.",acceptInfo:"Vielen Dank. Ihr Transportauftrag wurde bestätigt.",rejectInfo:"Das Angebot wurde nicht angenommen und die Fahrt wird nicht durchgeführt. Kontaktieren Sie uns, falls Sie es sich anders überlegen.",valid:"Angebot gültig bis",open:"ANGEBOT ANSEHEN UND ANNEHMEN",details:"BUCHUNG ANSEHEN",online:"Die Online-Zahlung ist in Ihrem Buchungsportal verfügbar."},
  cs: {offered:"Vaše nabídka dopravy je připravena",accepted:"Potvrzení objednávky",rejected:"Nabídka odmítnuta",offerInfo:"Tato zpráva zatím nepotvrzuje dopravu. Otevřete nabídku a rozhodněte se, zda ji přijmete. Přijetím závazně objednáváte dopravu za uvedenou částku.",acceptInfo:"Děkujeme. Vaše objednávka dopravy byla potvrzena.",rejectInfo:"Nabídka nebyla přijata a doprava nebude uskutečněna. Pokud si to rozmyslíte, kontaktujte nás.",valid:"Nabídka platí do",open:"ZOBRAZIT A PŘIJMOUT NABÍDKU",details:"ZOBRAZIT REZERVACI",online:"Online platba je dostupná v portálu rezervace."}
} as const;
const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char] || char));

export function localizedQuoteEmail(kind: QuoteKind, booking: any) {
  const locale = resolveCustomerLocale(booking.customer_locale), t = copy[locale];
  const title = t[kind];
  const info = kind === "offered" ? t.offerInfo : kind === "accepted" ? t.acceptInfo : t.rejectInfo;
  const label = (key: string) => customerText(key, locale);
  const row = (key: string, value: unknown) => `<p>${escape(label(key))}: <strong>${escape(value)}</strong></p>`;
  const portal = booking.customer_access_token ? `${bookingOrigin()}/rezerwacja/${encodeURIComponent(booking.customer_access_token)}?lang=${locale}` : null;
  const expires = new Date(booking.quote_expires_at || "");
  const expiry = Number.isFinite(expires.getTime()) ? expires.toLocaleString({pl:'pl-PL',en:'en-GB',de:'de-DE',cs:'cs-CZ'}[locale],{timeZone:'Europe/Warsaw',dateStyle:'short',timeStyle:'short'}) : null;
  const route = `${booking.pickup_address} ${booking.service_type === "roundtrip" ? "↔" : "→"} ${booking.destination_address || booking.airport_label}`;
  return {
    locale,
    subject: `${title} · ${booking.booking_number}`,
    html: `<div lang="${locale}" style="font-family:Arial,sans-serif;background:#10141b;color:#f7f7f7;padding:28px;line-height:1.7"><h2 style="color:#f1d28b">MATT TRANSPORT</h2><h1>${escape(title)}</h1><p>${escape(info)}</p>${row('Numer rezerwacji',booking.booking_number)}${row('Trasa',route)}${row('Termin',`${booking.travel_date} ${String(booking.travel_time||'').slice(0,5)}`)}${booking.return_date ? row('Powrót',`${booking.return_date} ${String(booking.return_time||'').slice(0,5)}`) : ''}${row('Kwota',`${Number(booking.total_price||0).toFixed(2)} PLN`)}${row('Sposób płatności',label(booking.payment_method==='online'?'Płatność online':booking.payment_method==='bank_transfer'?'Przelew tradycyjny':'Gotówka u kierowcy'))}${booking.quote_note ? `<p>${escape(booking.quote_note)}</p>` : ''}${kind==='offered'&&expiry?`<p>${escape(t.valid)}: <strong>${escape(expiry)}</strong> (Europe/Warsaw)</p>`:''}${kind==='accepted'&&booking.payment_method==='online'?`<p>${escape(t.online)}</p>`:''}${portal ? `<p><a style="color:#f1d28b" href="${escape(portal)}">${escape(kind==='offered'?t.open:t.details)}</a></p>` : ''}<p>+48 691 242 691 · kontakt@matt-transport.pl</p></div>`
  };
}
