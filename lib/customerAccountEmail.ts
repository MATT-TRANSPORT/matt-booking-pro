import { resolveCustomerLocale } from "@/lib/bookingLocale";
import { escapeCustomerHtml } from "@/lib/customerAccount";

const copy = {
  pl:{title:"Moje przejazdy",intro:"Otrzymaliśmy prośbę o dostęp do rezerwacji powiązanych z adresem",instructions:"Kliknij poniżej, aby bezpiecznie otworzyć historię i najbliższe przejazdy. Link jest jednorazowy i ważny przez 15 minut.",open:"OTWÓRZ MOJE PRZEJAZDY",ignore:"Jeżeli to nie Ty prosiłeś o dostęp, zignoruj tę wiadomość. Nikt nie uzyska dostępu bez kliknięcia linku wysłanego na Twój e-mail."},
  en:{title:"My rides",intro:"We received a request to access bookings associated with",instructions:"Click below to securely open your history and upcoming rides. This link can be used once and is valid for 15 minutes.",open:"OPEN MY RIDES",ignore:"If you did not request access, ignore this message. No one can gain access without opening the link sent to your email."},
  de:{title:"Meine Fahrten",intro:"Wir haben eine Anfrage für den Zugriff auf Buchungen zu dieser E-Mail-Adresse erhalten",instructions:"Öffnen Sie über den Link sicher Ihren Verlauf und Ihre anstehenden Fahrten. Der Link kann einmal verwendet werden und ist 15 Minuten gültig.",open:"MEINE FAHRTEN ÖFFNEN",ignore:"Wenn Sie den Zugriff nicht angefordert haben, ignorieren Sie diese Nachricht. Ohne Öffnen des an Ihre E-Mail gesendeten Links erhält niemand Zugriff."},
  cs:{title:"Moje jízdy",intro:"Obdrželi jsme žádost o přístup k rezervacím spojeným s adresou",instructions:"Kliknutím níže bezpečně otevřete historii a nadcházející jízdy. Odkaz je jednorázový a platí 15 minut.",open:"OTEVŘÍT MOJE JÍZDY",ignore:"Pokud jste o přístup nežádali, zprávu ignorujte. Bez otevření odkazu zaslaného na váš e-mail nikdo přístup nezíská."}
} as const;
export function customerAccountEmail(value: unknown, email: string, loginUrl: string) {
  const locale=resolveCustomerLocale(value),t=copy[locale],esc=escapeCustomerHtml;
  return {locale,subject:`MATT TRANSPORT — ${t.title}`,html:`<div lang="${locale}" style="font-family:Arial,sans-serif;background:#10141b;color:white;padding:28px;line-height:1.7"><h2 style="color:#f1d28b">MATT TRANSPORT</h2><h1>${t.title}</h1><p>${t.intro} <strong>${esc(email)}</strong>.</p><p>${t.instructions}</p><p><a style="color:#f1d28b" href="${esc(loginUrl)}">${t.open}</a></p><p>${t.ignore}</p></div>`};
}
