import { resolveCustomerLocale } from "@/lib/bookingLocale";
import type { CustomerNotificationKind } from "@/lib/customerNotifications";

type Details = { number: string; date: string; time: string; route: string; driver: string; vehicle: string; flight: string; delay: number };
type Messages = Record<CustomerNotificationKind, (d: Details) => string>;
const messages: Record<"en" | "de" | "cs", Messages> = {
  en: {
    received: d => `We have received booking ${d.number} for ${d.date} at ${d.time}. Awaiting confirmation by MATT TRANSPORT.`,
    confirmed: d => `Booking ${d.number} is confirmed. ${d.date} at ${d.time}, ${d.route}.`,
    assigned: d => `Driver assigned to booking ${d.number}: ${d.driver}${d.vehicle ? `. Vehicle: ${d.vehicle}` : ""}.`,
    reminder_24h: d => `Reminder for your journey tomorrow, ${d.number}: ${d.date} at ${d.time}. Route: ${d.route}. Details are available in your booking portal.`,
    reminder_120: d => `Reminder: journey ${d.number} is today at ${d.time}. Route: ${d.route}.`,
    review_request: () => "Thank you for travelling with MATT TRANSPORT. Rate your journey from 1 to 5. It takes just a few seconds and helps us maintain our service standards.",
    in_progress: d => `Driver ${d.driver} is on the way for booking ${d.number}.`,
    arrived: d => `Driver ${d.driver} has arrived at the pickup point for booking ${d.number}.`,
    completed: d => `Booking ${d.number} is complete. Thank you for travelling with MATT TRANSPORT.`,
    cancelled: d => `Booking ${d.number} has been cancelled. Questions? Call +48 691 242 691.`,
    flight_delay: d => `We are monitoring flight ${d.flight}. Current delay: ${d.delay} min. Your driver receives updates; you do not need to change booking ${d.number}.`,
    flight_cancelled: d => `Flight ${d.flight} for booking ${d.number} has been marked as cancelled. MATT TRANSPORT will contact you to agree the next steps.`,
    flight_diverted: d => `Flight ${d.flight} for booking ${d.number} has been diverted. We are monitoring the situation and will contact you if needed.`
  },
  de: {
    received: d => `Ihre Buchung ${d.number} für den ${d.date} um ${d.time} ist eingegangen. Die Bestätigung durch MATT TRANSPORT steht noch aus.`,
    confirmed: d => `Buchung ${d.number} ist bestätigt. ${d.date} um ${d.time}, ${d.route}.`,
    assigned: d => `Fahrer für Buchung ${d.number}: ${d.driver}${d.vehicle ? `. Fahrzeug: ${d.vehicle}` : ""}.`,
    reminder_24h: d => `Erinnerung an Ihre morgige Fahrt ${d.number}: ${d.date} um ${d.time}. Strecke: ${d.route}. Einzelheiten finden Sie im Buchungsportal.`,
    reminder_120: d => `Erinnerung: Fahrt ${d.number} ist heute um ${d.time}. Strecke: ${d.route}.`,
    review_request: () => "Vielen Dank für Ihre Fahrt mit MATT TRANSPORT. Bewerten Sie Ihre Fahrt mit 1 bis 5 Sternen. Es dauert nur wenige Sekunden und hilft uns, unseren Servicestandard zu halten.",
    in_progress: d => `Fahrer ${d.driver} ist für Buchung ${d.number} unterwegs.`,
    arrived: d => `Fahrer ${d.driver} ist am Abholort für Buchung ${d.number} angekommen.`,
    completed: d => `Buchung ${d.number} ist abgeschlossen. Vielen Dank für Ihre Fahrt mit MATT TRANSPORT.`,
    cancelled: d => `Buchung ${d.number} wurde storniert. Bei Fragen: +48 691 242 691.`,
    flight_delay: d => `Wir verfolgen Flug ${d.flight}. Aktuelle Verspätung: ${d.delay} Min. Ihr Fahrer erhält Aktualisierungen; Sie müssen Buchung ${d.number} nicht ändern.`,
    flight_cancelled: d => `Flug ${d.flight} für Buchung ${d.number} wurde als annulliert gemeldet. MATT TRANSPORT wird Sie kontaktieren, um das weitere Vorgehen abzustimmen.`,
    flight_diverted: d => `Flug ${d.flight} für Buchung ${d.number} wurde umgeleitet. Wir beobachten die Lage und kontaktieren Sie bei Bedarf.`
  },
  cs: {
    received: d => `Přijali jsme rezervaci ${d.number} na ${d.date} v ${d.time}. Čeká na potvrzení MATT TRANSPORT.`,
    confirmed: d => `Rezervace ${d.number} je potvrzena. ${d.date} v ${d.time}, ${d.route}.`,
    assigned: d => `Řidič pro rezervaci ${d.number}: ${d.driver}${d.vehicle ? `. Vozidlo: ${d.vehicle}` : ""}.`,
    reminder_24h: d => `Připomínáme zítřejší jízdu ${d.number}: ${d.date} v ${d.time}. Trasa: ${d.route}. Podrobnosti najdete v portálu rezervace.`,
    reminder_120: d => `Připomínka: jízda ${d.number} je dnes v ${d.time}. Trasa: ${d.route}.`,
    review_request: () => "Děkujeme za cestu s MATT TRANSPORT. Ohodnoťte jízdu od 1 do 5. Zabere to jen pár sekund a pomůže nám udržet kvalitu služeb.",
    in_progress: d => `Řidič ${d.driver} vyrazil k rezervaci ${d.number}.`,
    arrived: d => `Řidič ${d.driver} je na místě vyzvednutí pro rezervaci ${d.number}.`,
    completed: d => `Rezervace ${d.number} je dokončena. Děkujeme za cestu s MATT TRANSPORT.`,
    cancelled: d => `Rezervace ${d.number} byla zrušena. V případě dotazů volejte +48 691 242 691.`,
    flight_delay: d => `Sledujeme let ${d.flight}. Aktuální zpoždění: ${d.delay} min. Řidič dostává aktualizace; rezervaci ${d.number} nemusíte měnit.`,
    flight_cancelled: d => `Let ${d.flight} pro rezervaci ${d.number} byl označen jako zrušený. MATT TRANSPORT vás kontaktuje ohledně dalšího postupu.`,
    flight_diverted: d => `Let ${d.flight} pro rezervaci ${d.number} byl odkloněn. Sledujeme situaci a v případě potřeby vás kontaktujeme.`
  }
};

export function localizedCustomerUpdate(localeInput: unknown, kind: CustomerNotificationKind, details: Details): string | null {
  const locale = resolveCustomerLocale(localeInput);
  return locale === "pl" ? null : messages[locale][kind](details);
}
