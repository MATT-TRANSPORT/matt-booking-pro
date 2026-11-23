import { resolveCustomerLocale } from "@/lib/bookingLocale";
import { MATT_GOOGLE_REVIEW_URL } from "@/lib/reviews";

const WESELE_Z_KLASA_REVIEW_URL = "https://www.weselezklasa.pl/matt-transport/#opinie";

const copy = {
  pl: {
    title: "Dziękujemy za wspólną podróż!",
    intro: "Dziękujemy za skorzystanie z usług MATT TRANSPORT. Jeśli masz chwilę, podziel się szczerą opinią o naszym przejeździe — to bardzo pomaga innym klientom.",
    google: "⭐ OCEŃ NAS W GOOGLE",
    wedding: "💛 OCEŃ NAS W WESELE Z KLASĄ",
    booking: "Rezerwacja",
    customer: "Klient",
    note: "Wybierz portal, w którym chcesz pozostawić opinię. Linki prowadzą bezpośrednio do stron opinii — bez dodatkowego formularza.",
  },
  en: {
    title: "Thank you for travelling with us!",
    intro: "Thank you for choosing MATT TRANSPORT. If you have a moment, please share your honest feedback — it helps other travellers.",
    google: "⭐ REVIEW US ON GOOGLE",
    wedding: "💛 REVIEW US ON WESELE Z KLASĄ",
    booking: "Booking",
    customer: "Customer",
    note: "Choose where to leave your review. Both links open the review websites directly, with no intermediate form.",
  },
  de: {
    title: "Vielen Dank für Ihre Fahrt!",
    intro: "Vielen Dank, dass Sie MATT TRANSPORT gewählt haben. Wir freuen uns über Ihre ehrliche Bewertung — damit helfen Sie auch anderen Reisenden.",
    google: "⭐ BEI GOOGLE BEWERTEN",
    wedding: "💛 BEI WESELE Z KLASĄ BEWERTEN",
    booking: "Buchung",
    customer: "Kunde",
    note: "Wählen Sie eine Bewertungsplattform. Beide Links führen direkt zur Bewertungsseite, ohne Zwischenformular.",
  },
  cs: {
    title: "Děkujeme za společnou cestu!",
    intro: "Děkujeme, že jste cestovali s MATT TRANSPORT. Budeme rádi za vaše upřímné hodnocení — pomůže i dalším cestujícím.",
    google: "⭐ OHODNOTIT NA GOOGLE",
    wedding: "💛 OHODNOTIT NA WESELE Z KLASĄ",
    booking: "Rezervace",
    customer: "Zákazník",
    note: "Vyberte si stránku, kde chcete napsat recenzi. Oba odkazy vedou přímo na stránky s hodnocením, bez mezikroku.",
  },
} as const;

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] || ch));

function reviewButton(url: string, label: string, secondary = false) {
  const bg = secondary ? "#252b36" : "#d5ae5d";
  const fg = secondary ? "#f1d28b" : "#10141b";
  return `<tr><td align="center" style="padding:6px 0"><a href="${esc(url)}" target="_blank" style="display:block;padding:15px 18px;border-radius:11px;background:${bg};color:${fg};border:1px solid #d5ae5d;text-decoration:none;font-size:14px;font-weight:800">${esc(label)}</a></td></tr>`;
}

// Existing automatic send timing and recipient selection remain unchanged.
// ratingUrl is retained in the signature for compatibility with current call sites.
export function reviewRatingEmail(booking: any, _ratingUrl: string) {
  const locale = resolveCustomerLocale(booking.customer_locale);
  const t = copy[locale];
  return {
    locale,
    subject: `${t.title} – ${booking.booking_number}`,
    html: `<div lang="${locale}" style="margin:0;padding:28px 12px;background:#0b0e13;font-family:Arial,sans-serif;color:#f7f7f7">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;margin:0 auto;background:#151923;border:1px solid #343b49;border-radius:18px">
        <tr><td style="padding:27px 26px;border-bottom:3px solid #d5ae5d">
          <div style="color:#f1d28b;font-weight:800;font-size:23px;letter-spacing:1px">MATT TRANSPORT</div>
        </td></tr>
        <tr><td style="padding:28px 26px">
          <h1 style="font-size:26px;line-height:1.3;margin:0 0 15px;color:#fff">${esc(t.title)}</h1>
          <p style="font-size:15px;line-height:1.7;color:#d5dbe5">${esc(t.intro)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0">
            ${reviewButton(MATT_GOOGLE_REVIEW_URL, t.google)}
            ${reviewButton(WESELE_Z_KLASA_REVIEW_URL, t.wedding, true)}
          </table>
          <p style="font-size:13px;line-height:1.6;color:#aab1bc">${esc(t.note)}</p>
          <p style="font-size:13px;line-height:1.7;color:#aab1bc">${esc(t.booking)}: <strong style="color:#fff">${esc(booking.booking_number)}</strong><br>${esc(t.customer)}: <strong style="color:#fff">${esc(booking.customer_name)}</strong></p>
        </td></tr>
        <tr><td style="padding:18px 26px;border-top:1px solid #343b49;font-size:13px;line-height:1.8;color:#aab1bc">
          <a href="https://matt-transport.pl" style="color:#f1d28b">matt-transport.pl</a> · <a href="tel:+48691242691" style="color:#f1d28b">+48 691 242 691</a><br>
          <a href="mailto:kontakt@matt-transport.pl" style="color:#f1d28b">kontakt@matt-transport.pl</a>
        </td></tr>
      </table>
    </div>`,
  };
}
