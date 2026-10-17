import { isBookingLocale, type BookingLocale } from "@/lib/bookingLocale";

/** Customer-facing email copy. Polish is the safe fallback for legacy bookings. */
export function resolveCustomerLocale(value: unknown): BookingLocale {
  return isBookingLocale(value) ? value : "pl";
}

const copy = {
  pl: { receivedSubject: "Przyjęliśmy rezerwację", receivedTitle: "Rezerwacja została przyjęta", greeting: "Dzień dobry", received: "Dziękujemy za złożenie rezerwacji. Otrzymaliśmy zgłoszenie i oczekuje ono na potwierdzenie przez dyspozytora.", eta: "Potwierdzimy rezerwację do 60 minut.", number: "Numer rezerwacji", details: "Szczegóły rezerwacji", support: "Pytania? Napisz na kontakt@matt-transport.pl." },
  en: { receivedSubject: "Booking request received", receivedTitle: "We have received your booking", greeting: "Hello", received: "Thank you for your booking request. Our dispatch team will review and confirm your booking.", eta: "We will confirm your booking within 60 minutes.", number: "Booking reference", details: "Booking details", support: "Questions? Email kontakt@matt-transport.pl." },
  de: { receivedSubject: "Buchungsanfrage eingegangen", receivedTitle: "Ihre Buchungsanfrage ist eingegangen", greeting: "Guten Tag", received: "Vielen Dank für Ihre Buchungsanfrage. Unsere Disposition wird Ihre Buchung prüfen und bestätigen.", eta: "Wir bestätigen Ihre Buchung innerhalb von 60 Minuten.", number: "Buchungsnummer", details: "Buchungsdetails", support: "Fragen? Schreiben Sie an kontakt@matt-transport.pl." },
  cs: { receivedSubject: "Přijali jsme vaši rezervaci", receivedTitle: "Vaše rezervace byla přijata", greeting: "Dobrý den", received: "Děkujeme za rezervaci. Náš dispečink vaši žádost zkontroluje a potvrdí.", eta: "Rezervaci potvrdíme do 60 minut.", number: "Číslo rezervace", details: "Údaje o rezervaci", support: "Dotazy? Napište na kontakt@matt-transport.pl." }
} as const;

function escapeHtml(value: unknown): string {
  return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

export type LocalizedBookingEmailInput = {
  booking_number: string;
  customer_name: string;
  customer_access_token?: string | null;
  locale?: BookingLocale | null;
};

export function localizedReceivedEmail(b: LocalizedBookingEmailInput) {
  const locale = resolveCustomerLocale(b.locale);
  const t = copy[locale];
  const bookingUrl = b.customer_access_token
    ? "https://booking.matt-transport.pl/rezerwacja/" + encodeURIComponent(b.customer_access_token) + "?lang=" + locale
    : null;
  const text = [
    t.receivedTitle,
    t.greeting + " " + b.customer_name + ",",
    t.received,
    t.number + ": " + b.booking_number,
    t.eta,
    bookingUrl ? t.details + ": " + bookingUrl : "",
    t.support
  ].filter(Boolean).join("\n\n");
  const html = `<div lang="${locale}" style="font-family:Arial,sans-serif;background:#10141b;color:#f7f7f7;padding:28px;line-height:1.7"><h1 style="color:#f1d28b">MATT TRANSPORT</h1><h2>${escapeHtml(t.receivedTitle)}</h2><p>${escapeHtml(t.greeting)} ${escapeHtml(b.customer_name)},</p><p>${escapeHtml(t.received)}</p><p>${escapeHtml(t.number)}: <strong>${escapeHtml(b.booking_number)}</strong></p><p>${escapeHtml(t.eta)}</p>${bookingUrl ? `<p><a style="color:#f1d28b" href="${escapeHtml(bookingUrl)}">${escapeHtml(t.details)}</a></p>` : ""}<p>${escapeHtml(t.support)}</p></div>`;
  return { subject: t.receivedSubject + " – " + b.booking_number, html, text };
}
