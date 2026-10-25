import type { BookingLocale } from "@/lib/bookingLocale";

/** Returns an external WhatsApp link only for a plausible international mobile number. */
export function driverWhatsAppUrl(phone: string | null | undefined, bookingNumber: string, locale: BookingLocale = "pl"): string | null {
  const raw = String(phone || "").trim();
  if (!raw || /[a-z]/i.test(raw)) return null;
  let digits = raw.replace(/[\s().-]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (/^\d{9}$/.test(digits)) digits = "48" + digits;
  if (!/^\d{10,15}$/.test(digits) || /^0+$/.test(digits)) return null;
  const greet: Record<BookingLocale,string> = {
    pl: "Dzień dobry, kontaktuję się w sprawie rezerwacji",
    en: "Hello, I am contacting you about booking",
    de: "Guten Tag, ich melde mich wegen der Buchung",
    cs: "Dobrý den, píšu ohledně rezervace"
  };
  return "https://wa.me/" + digits + "?text=" + encodeURIComponent(greet[locale] + " " + bookingNumber);
}

export function driverWhatsAppButton(phone: string | null | undefined, bookingNumber: string, locale: BookingLocale = "pl"): string {
  const url = driverWhatsAppUrl(phone, bookingNumber, locale);
  if (!url) return "";
  const label: Record<BookingLocale,string> = {
    pl: "NAPISZ DO KIEROWCY NA WHATSAPP",
    en: "MESSAGE DRIVER ON WHATSAPP",
    de: "FAHRER PER WHATSAPP KONTAKTIEREN",
    cs: "NAPSAT ŘIDIČI NA WHATSAPP"
  };
  return '<p style="margin:14px 0 6px"><a href="' + url.replaceAll("&","&amp;") + '" style="display:inline-block;padding:13px 17px;border-radius:12px;background:#217d51;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;line-height:1.5">' + label[locale] + '</a></p>';
}
