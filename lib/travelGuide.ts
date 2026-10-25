import { resolveCustomerLocale } from "@/lib/localizedBookingEmails";
import type { BookingLocale } from "@/lib/bookingLocale";

type GuideKind = "departure" | "arrival";
const guides: Record<BookingLocale, Record<GuideKind, { heading: string; steps: string[]; note: string }>> = {
  pl: {
    departure: { heading: "Twoja podróż na lotnisko krok po kroku", steps: ["Przygotuj dokumenty podróży, bilety i bagaże.", "Bądź gotowy kilka minut przed umówioną godziną odbioru.", "Kierowca odbierze Cię ze wskazanego adresu.", "Jeśli zmienią się plany lub ilość bagażu, skontaktuj się z kierowcą.", "Rozsiądź się wygodnie — zawieziemy Cię bezpiecznie na lotnisko."], note: "Sprawdź godzinę odprawy i wymagany zapas czasu przed odlotem." },
    arrival: { heading: "Odbiór z lotniska krok po kroku", steps: ["Monitorujemy dostępne informacje o Twoim locie.", "Jeśli dowiesz się o opóźnieniu lub zmianie planów, poinformuj kierowcę.", "Po wylądowaniu odbierz bagaże.", "Udaj się do miejsca odbioru uzgodnionego z kierowcą (np. Kiss & Fly, jeśli jest dostępne) i daj znać, że jesteś gotowy.", "Rozsiądź się wygodnie — bezpiecznie dowieziemy Cię do celu."], note: "Miejsce odbioru zależy od zasad danego lotniska. W razie wątpliwości skontaktuj się z kierowcą." }
  },
  en: {
    departure: { heading: "Your airport transfer: step by step", steps: ["Prepare your travel documents, tickets and luggage.", "Be ready a few minutes before your scheduled pickup.", "Your driver will collect you from the agreed address.", "Tell your driver if your plans or luggage requirements change.", "Sit back and relax — we'll take you safely to the airport."], note: "Allow enough time for check-in and airport security." },
    arrival: { heading: "Your airport pickup: step by step", steps: ["We monitor available updates about your flight.", "Let your driver know if you become aware of a delay or change of plans.", "Collect your luggage after landing.", "Go to the pickup point agreed with your driver (such as Kiss & Fly, where available) and let them know you're ready.", "Sit back and relax — we'll take you safely to your destination."], note: "Pickup arrangements vary by airport. Contact your driver if you are unsure." }
  },
  de: {
    departure: { heading: "Ihr Flughafentransfer: Schritt für Schritt", steps: ["Halten Sie Reisedokumente, Tickets und Gepäck bereit.", "Seien Sie einige Minuten vor der vereinbarten Abholzeit bereit.", "Ihr Fahrer holt Sie an der vereinbarten Adresse ab.", "Informieren Sie Ihren Fahrer über Änderungen Ihrer Pläne oder Ihres Gepäcks.", "Lehnen Sie sich zurück — wir bringen Sie sicher zum Flughafen."], note: "Planen Sie genügend Zeit für Check-in und Sicherheitskontrolle ein." },
    arrival: { heading: "Ihre Abholung am Flughafen: Schritt für Schritt", steps: ["Wir verfolgen die verfügbaren Informationen zu Ihrem Flug.", "Informieren Sie Ihren Fahrer, wenn Sie von einer Verspätung oder Planänderung erfahren.", "Holen Sie nach der Landung Ihr Gepäck ab.", "Gehen Sie zum mit Ihrem Fahrer vereinbarten Treffpunkt (z. B. Kiss & Fly, sofern vorhanden) und melden Sie sich dort.", "Lehnen Sie sich zurück — wir bringen Sie sicher ans Ziel."], note: "Der Abholort hängt von den Regeln des Flughafens ab. Fragen Sie im Zweifel Ihren Fahrer." }
  },
  cs: {
    departure: { heading: "Cesta na letiště krok za krokem", steps: ["Připravte si cestovní doklady, letenky a zavazadla.", "Buďte připraveni několik minut před domluveným časem vyzvednutí.", "Řidič vás vyzvedne na dohodnuté adrese.", "Pokud se změní vaše plány nebo množství zavazadel, informujte řidiče.", "Pohodlně se usaďte — bezpečně vás dopravíme na letiště."], note: "Počítejte s dostatečnou rezervou na odbavení a bezpečnostní kontrolu." },
    arrival: { heading: "Vyzvednutí na letišti krok za krokem", steps: ["Sledujeme dostupné informace o vašem letu.", "Pokud zjistíte zpoždění nebo změnu plánů, informujte řidiče.", "Po přistání si vyzvedněte zavazadla.", "Přejděte na místo vyzvednutí dohodnuté s řidičem (například Kiss & Fly, pokud je k dispozici) a dejte mu vědět, že jste připraveni.", "Pohodlně se usaďte — bezpečně vás dopravíme do cíle."], note: "Místo vyzvednutí se liší podle pravidel letiště. V případě nejasností kontaktujte řidiče." }
  }
};

function esc(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }

export function travelGuideHtml(serviceType: string, localeInput: unknown, airportTransfer = true) {
  // Non-airport bookings must not receive airport pickup instructions.
  if (!airportTransfer || !["to_airport", "from_airport", "roundtrip"].includes(serviceType)) return "";
  const locale = resolveCustomerLocale(localeInput);
  const kinds: GuideKind[] = serviceType === "roundtrip" ? ["departure", "arrival"] : [serviceType === "from_airport" ? "arrival" : "departure"];
  return kinds.map(kind => {
    const guide = guides[locale][kind];
    return `<section lang="${locale}" style="margin-top:20px;padding:18px;border:1px solid #343b49;border-radius:14px;background:#10141b"><h2 style="color:#f1d28b;font-size:20px">${esc(guide.heading)}</h2><ol style="padding-left:22px;line-height:1.8;color:#f7f7f7;font-family:Arial,sans-serif">${guide.steps.map(step => `<li style="padding-bottom:8px">${esc(step)}</li>`).join("")}</ol><p style="color:#aab1bc;font-size:13px">${esc(guide.note)}</p></section>`;
  }).join("");
}
