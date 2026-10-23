import { resolveCustomerLocale } from "@/lib/bookingLocale";

const notices = {
  pl: ["Wiadomość z systemu rezerwacji MATT TRANSPORT", "Jeśli oczekujesz powiadomienia o rezerwacji, a wiadomość trafiła do folderu Spam, oznacz ją jako „To nie spam” i dodaj kontakt@matt-transport.pl do kontaktów. W razie wątpliwości skontaktuj się z nami bezpośrednio. Nigdy nie podawaj hasła ani danych płatniczych w odpowiedzi na e-mail."],
  en: ["Message from the MATT TRANSPORT booking system", "If you are expecting a booking notification and this message went to Spam, mark it as Not spam and add kontakt@matt-transport.pl to your contacts. If in doubt, contact us directly. Never reply to an email with your password or payment details."],
  de: ["Nachricht aus dem Buchungssystem von MATT TRANSPORT", "Wenn Sie eine Buchungsnachricht erwarten und diese im Spamordner gelandet ist, markieren Sie sie als Kein Spam und fügen Sie kontakt@matt-transport.pl Ihren Kontakten hinzu. Kontaktieren Sie uns im Zweifel direkt. Antworten Sie niemals mit Ihrem Passwort oder Ihren Zahlungsdaten auf eine E-Mail."],
  cs: ["Zpráva z rezervačního systému MATT TRANSPORT", "Pokud očekáváte zprávu o rezervaci a skončila ve spamu, označte ji jako Není spam a přidejte kontakt@matt-transport.pl do kontaktů. V případě pochybností nás kontaktujte přímo. Nikdy neposílejte heslo ani platební údaje v odpovědi na e-mail."]
} as const;

export function emailTrustNotice(value: unknown) {
  const locale = resolveCustomerLocale(value);
  const [title, body] = notices[locale];
  return {
    text: `\n\n---\n${title}\n${body}`,
    html: `<div lang="${locale}" style="margin-top:24px;padding:14px 16px;border-top:1px solid #dedede;font:13px/1.6 Arial,sans-serif;color:#555"><strong>${title}</strong><br>${body}</div>`
  };
}
