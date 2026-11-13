import { resolveCustomerLocale } from "@/lib/bookingLocale";

type DocumentEmailInput = {
  customerName: string;
  bookingNumber: string;
  documentType: "invoice" | "correction";
  documentNumber?: string | null;
  fileName: string;
  downloadUrl: string;
  locale?: unknown;
};

const COPY = {
  pl: {
    subject: "Dokument do rezerwacji",
    title: "Dokument jest gotowy",
    hello: "Dzień dobry",
    body: "Dokument został wystawiony do Twojej rezerwacji. Możesz pobrać go bezpiecznie, korzystając z poniższego przycisku.",
    labels: { invoice: "Faktura / rachunek", correction: "Korekta" },
    number: "Numer dokumentu",
    booking: "Numer rezerwacji",
    button: "POBIERZ DOKUMENT",
    note: "Link jest indywidualny dla tej rezerwacji. Możesz użyć go ponownie, gdy będziesz potrzebować dokumentu.",
    support: "W razie pytań skontaktuj się z nami: kontakt@matt-transport.pl"
  },
  en: {
    subject: "Document for your booking",
    title: "Your document is ready",
    hello: "Hello",
    body: "A document has been issued for your booking. You can download it securely using the button below.",
    labels: { invoice: "Invoice / receipt", correction: "Correction" },
    number: "Document number",
    booking: "Booking reference",
    button: "DOWNLOAD DOCUMENT",
    note: "This link is unique to your booking. You can use it again whenever you need the document.",
    support: "If you have questions, contact kontakt@matt-transport.pl"
  },
  de: {
    subject: "Dokument zu Ihrer Buchung",
    title: "Ihr Dokument ist verfügbar",
    hello: "Guten Tag",
    body: "Für Ihre Buchung wurde ein Dokument ausgestellt. Sie können es sicher über die Schaltfläche unten herunterladen.",
    labels: { invoice: "Rechnung / Quittung", correction: "Korrektur" },
    number: "Dokumentnummer",
    booking: "Buchungsnummer",
    button: "DOKUMENT HERUNTERLADEN",
    note: "Dieser Link ist Ihrer Buchung zugeordnet und kann erneut verwendet werden.",
    support: "Bei Fragen kontaktieren Sie kontakt@matt-transport.pl"
  },
  cs: {
    subject: "Dokument k rezervaci",
    title: "Váš dokument je připraven",
    hello: "Dobrý den",
    body: "K vaší rezervaci byl vystaven dokument. Bezpečně si jej můžete stáhnout pomocí tlačítka níže.",
    labels: { invoice: "Faktura / účtenka", correction: "Opravný doklad" },
    number: "Číslo dokumentu",
    booking: "Číslo rezervace",
    button: "STÁHNOUT DOKUMENT",
    note: "Tento odkaz je přiřazen k vaší rezervaci a můžete jej použít opakovaně.",
    support: "V případě dotazů kontaktujte kontakt@matt-transport.pl"
  }
} as const;

function esc(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderDocumentSection(
  locale: keyof typeof COPY,
  input: DocumentEmailInput
) {
  const t = COPY[locale];
  const documentLabel = t.labels[input.documentType];
  const plainText = [
    `${t.hello} ${input.customerName},`,
    t.title,
    t.body,
    `${t.booking}: ${input.bookingNumber}`,
    `${documentLabel}: ${input.documentNumber || input.fileName}`,
    `${t.button}: ${input.downloadUrl}`,
    t.note,
    t.support
  ].join("\\n\\n");

  const html = `<section lang="${locale}" style="padding:26px">
    <h1 style="margin:0 0 16px;color:#fff;font-size:25px">${esc(t.title)}</h1>
    <p style="color:#c5cbd5;line-height:1.7">${esc(t.hello)} ${esc(input.customerName)},</p>
    <p style="color:#c5cbd5;line-height:1.7">${esc(t.body)}</p>
    <div style="margin:20px 0;padding:16px;background:#10141b;border:1px solid #343b49;border-radius:12px;line-height:1.8">
      <div><span style="color:#aab1bc">${esc(t.booking)}:</span> <strong>${esc(input.bookingNumber)}</strong></div>
      <div><span style="color:#aab1bc">${esc(documentLabel)}:</span> <strong>${esc(input.documentNumber || input.fileName)}</strong></div>
    </div>
    <p style="margin:24px 0;text-align:center">
      <a href="${esc(input.downloadUrl)}" style="display:inline-block;background:#d5ae5d;color:#111;padding:15px 22px;border-radius:10px;text-decoration:none;font-weight:900">${esc(t.button)}</a>
    </p>
    <p style="color:#aab1bc;font-size:13px;line-height:1.6">${esc(t.note)}</p>
    <p style="color:#aab1bc;font-size:13px;line-height:1.7">${esc(t.support)}</p>
  </section>`;
  return { html, text: plainText };
}

export function b2bDocumentEmail(input: DocumentEmailInput) {
  const locale = resolveCustomerLocale(input.locale);
  const primary = renderDocumentSection(locale, input);
  const sections = locale === "en"
    ? [primary]
    : [primary, renderDocumentSection("en", input)];
  const subject = `${COPY[locale].subject} – ${input.bookingNumber}`;
  const text = sections.map((section) => section.text).join("\\n\\n--------------------\\n\\n");
  const html = `<div style="margin:0;padding:28px 16px;background:#0b0e13;font-family:Arial,sans-serif;color:#f7f7f7">
    <div style="max-width:620px;margin:0 auto;background:#151923;border:1px solid #343b49;border-radius:18px;overflow:hidden">
      <div style="padding:24px;background:#10141b;border-bottom:3px solid #d5ae5d">
        <div style="font-size:22px;font-weight:800;letter-spacing:1px;color:#f1d28b">MATT TRANSPORT</div>
      </div>
      ${sections.map((section) => section.html).join('<div style="margin:0 26px;border-top:1px solid #343b49"></div>')}
      <div style="padding:20px 26px;background:#10141b;border-top:1px solid #343b49;color:#aab1bc;font-size:13px;line-height:1.7">
        <strong style="color:#f1d28b">MATT TRANSPORT</strong> · +48 691 242 691
      </div>
    </div>
  </div>`;
  return { subject, html, text, locale };
}
