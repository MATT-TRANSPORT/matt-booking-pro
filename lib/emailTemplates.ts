import { driverWhatsAppButton } from "@/lib/driverWhatsAppEmail";
import { bookingOrigin, panelOrigin } from "@/lib/bookingOrigin";
import { localizedStatusEmail } from "@/lib/localizedStatusEmails";
import { resolveCustomerLocale } from "@/lib/localizedBookingEmails";
import { travelGuideHtml } from "@/lib/travelGuide";
const esc = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

type BookingMail = {
  id?: string;
  booking_number: string;
  customer_access_token?: string | null;
  customer_name: string;
  pickup_address: string;
  airport_label: string;
  service_type: string;
  booking_source?: string | null;
  destination_address?: string | null;
  travel_date: string;
  travel_time: string;
  return_date?: string | null;
  return_time?: string | null;
  passengers: number;
  vehicle_type: string;
  flight_number?: string | null;
  total_price: number | string;
  price_net?: number | string | null;
  vat_rate?: number | string | null;
  vat_price?: number | string | null;
  price_gross?: number | string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  vehicle_name?: string | null;
  vehicle_registration?: string | null;
  return_driver_name?: string | null;
  return_driver_phone?: string | null;
  return_vehicle_name?: string | null;
  return_vehicle_registration?: string | null;
  company_id?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  customer_locale?: string | null;
  payment_link?: string | null;
  online_payment_requested?: boolean | null;
};

function customerBaseUrl() { return bookingOrigin(); }

function panelBaseUrl() { return panelOrigin(); }

function clientUrl(b: BookingMail) {
  return b.customer_access_token
    ? `${customerBaseUrl()}/rezerwacja/${b.customer_access_token}?lang=${resolveCustomerLocale(b.customer_locale)}`
    : null;
}

function adminUrl(b: BookingMail) {
  return b.id
    ? `${panelBaseUrl()}/panel/rezerwacje/${b.id}`
    : null;
}

function paymentPreferenceText(b: BookingMail) {
  if (b.company_id) {
    return b.payment_method === "employee_payment"
      ? "Płatność online firmy"
      : "Przelew firmowy";
  }

  if (b.payment_method === "online" || b.online_payment_requested) {
    return "Płatność online po potwierdzeniu";
  }

  if (b.payment_method === "bank_transfer") {
    return "Przelew tradycyjny";
  }

  return "Gotówka u kierowcy";
}

function routeText(b: BookingMail) {
  if (b.service_type === "from_airport") return `${b.airport_label} → ${b.pickup_address}`;
  if (b.service_type === "roundtrip") return `${b.pickup_address} ↔ ${b.airport_label}`;
  return `${b.pickup_address} → ${b.airport_label}`;
}

function shell(title: string, content: string) {
  return `
  <div style="margin:0;padding:24px 10px;background:#0b0e13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#f7f7f7">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;margin:0 auto;border-collapse:separate;border-spacing:0;background:#151923;border:1px solid #343b49;border-radius:22px;overflow:hidden">
      <tr><td style="padding:29px 26px;background:#10141b;border-bottom:3px solid #d5ae5d">
        <div style="font-size:23px;font-weight:800;letter-spacing:1px;color:#f1d28b">MATT TRANSPORT</div>
        <div style="margin-top:7px;font-size:13px;line-height:1.5;color:#aab1bc">Transport zawsze na czas</div>
      </td></tr>
      <tr><td style="padding:28px 24px">
        <h1 style="margin:0 0 19px;font-size:30px;font-weight:800;line-height:1.23;letter-spacing:-.4px;color:#fff">${title}</h1>
        ${content}
      </td></tr>
      <tr><td style="padding:22px 24px;background:#10141b;border-top:1px solid #343b49;color:#aab1bc;font-size:13px;line-height:1.9">
        <strong style="color:#f1d28b;font-size:14px">MATT TRANSPORT</strong><br>
        Telefon: <a style="color:#f1d28b;text-decoration:none" href="tel:+48691242691">+48 691 242 691</a><br>
        <a style="color:#f1d28b" href="mailto:kontakt@matt-transport.pl">kontakt@matt-transport.pl</a><br>
        <a style="color:#f1d28b" href="https://matt-transport.pl">matt-transport.pl</a>
      </td></tr>
    </table>
  </div>`;
}

function mailRow(label: string, value: string, emphasize = false) {
  return `<tr><td style="padding:11px 12px;color:#aab1bc;font-size:13px;vertical-align:top;border-bottom:1px solid #343b49;width:36%">${esc(label)}</td><td style="padding:11px 12px;color:${emphasize ? "#f1d28b" : "#fff"};font-size:14px;font-weight:700;line-height:1.5;vertical-align:top;border-bottom:1px solid #343b49;overflow-wrap:anywhere">${value}</td></tr>`;
}

function paymentButton(b: BookingMail) {
  const eligible =
    b.company_id
      ? b.payment_method === "employee_payment"
      : b.payment_method === "online" || Boolean(b.online_payment_requested);

  if (!eligible) return "";

  if (b.payment_status === "paid") {
    return `
      <div style="margin-top:18px;padding:16px;border-radius:12px;background:#1b3a2a;color:#c2efd2;font-weight:800">
        ✓ Płatność została zaksięgowana.
      </div>`;
  }

  if (b.payment_status === "review") {
    return `
      <div style="margin-top:18px;padding:16px;border-radius:12px;background:#493915;color:#ffe5a3">
        ⚠ Płatność wymaga weryfikacji przez MATT TRANSPORT.
      </div>`;
  }

  const url = b.company_id
    ? (b.id ? `${panelBaseUrl()}/firma/rezerwacje/${b.id}` : null)
    : (b.payment_link ||
      (b.customer_access_token
        ? `${customerBaseUrl()}/rezerwacja/${b.customer_access_token}?pay=1`
        : null));

  if (!url) return "";

  return `
    <div style="margin-top:20px;padding:18px;border-radius:14px;background:#10141b;border:1px solid #4f4733">
      <div style="font-weight:800;color:#f1d28b;margin-bottom:8px">Płatność online</div>
      <div style="color:#aab1bc;margin-bottom:14px">Kwota do zapłaty: <strong style="color:#fff">${Number(b.company_id ? (b.price_gross ?? b.total_price) : b.total_price).toFixed(2)} zł</strong></div>
      <a href="${url}" style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 20px;border-radius:11px;text-decoration:none;font-weight:900">
        ${b.company_id ? "PRZEJDŹ DO PŁATNOŚCI W PORTALU FIRMY" : "OPŁAĆ REZERWACJĘ ONLINE"}
      </a>
    </div>`;
}

function customerPortalButton(b: BookingMail) {
  const url = clientUrl(b);
  if (!url) return "";
  return `
    <div style="margin-top:20px">
      <a href="${url}" style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 20px;border-radius:11px;text-decoration:none;font-weight:800">
        ZOBACZ / ZMIEŃ REZERWACJĘ
      </a>
    </div>
    <p style="margin-top:10px;color:#aab1bc;font-size:12px;line-height:1.5">
      Ten link jest indywidualny dla Twojej rezerwacji. Nie udostępniaj go osobom trzecim.
    </p>`;
}

function bookingNumberForCustomer(b: BookingMail) {
  const url = clientUrl(b);
  return url
    ? `<a href="${url}" style="color:#f1d28b;font-weight:800;text-decoration:underline">${esc(b.booking_number)}</a>`
    : `<strong style="color:#f1d28b">${esc(b.booking_number)}</strong>`;
}

function bookingNumberForAdmin(b: BookingMail) {
  const url = adminUrl(b);
  return url
    ? `<a href="${url}" style="color:#f1d28b;font-weight:800;text-decoration:underline">${esc(b.booking_number)}</a>`
    : `<strong style="color:#f1d28b">${esc(b.booking_number)}</strong>`;
}

function details(b: BookingMail, forAdmin = false) {
  const vehicle = b.vehicle_type === "bus" ? "Bus do 8 pasażerów" : "Samochód osobowy";
  const number = forAdmin ? bookingNumberForAdmin(b) : bookingNumberForCustomer(b);
  return `
    <div style="margin:20px 0;background:#10141b;border:1px solid #343b49;border-radius:17px;overflow:hidden">
      <div style="padding:15px 14px;background:#1c222d;color:#f1d28b;font-weight:800;font-size:15px">SZCZEGÓŁY REZERWACJI</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;table-layout:fixed">
        ${mailRow("Numer rezerwacji",number,true)}
        ${mailRow("Trasa",esc(routeText(b)))}
        ${mailRow(b.service_type === "from_airport" ? "Przylot" : "Wylot",esc(b.travel_date)+" · "+esc(b.travel_time))}
        ${b.service_type === "roundtrip" && b.return_date ? mailRow("Przylot powrotny",esc(b.return_date)+" · "+esc(b.return_time || "—")) : ""}
        ${mailRow("Pasażerowie",esc(b.passengers))}
        ${mailRow("Pojazd",esc(vehicle))}
        ${mailRow("Lot",esc(b.flight_number || "—"))}
        ${b.company_id
          ? mailRow("Netto",Number(b.price_net ?? b.total_price).toFixed(2)+" zł")
            +mailRow("VAT "+Number(b.vat_rate ?? 8).toFixed(0)+"%",Number(b.vat_price ?? 0).toFixed(2)+" zł")
            +mailRow("Brutto",Number(b.price_gross ?? b.total_price).toFixed(2)+" zł",true)
          : mailRow("Kwota",Number(b.total_price).toFixed(2)+" zł",true)}
        ${mailRow("Płatność",esc(paymentPreferenceText(b)))}
      </table>
      ${b.company_id ? '<div style="padding:11px 12px;color:#aab1bc;font-size:12px">Ceny B2B: netto + VAT 8%.</div>' : ""}
    </div>`;
}

export function receivedEmail(b: BookingMail) {
  return {
    subject: `Przyjęliśmy rezerwację ${b.booking_number}`,
    html: shell(
      "Rezerwacja została przyjęta",
      `<p style="color:#aab1bc;line-height:1.7">
        Dzień dobry ${esc(b.customer_name)}, dziękujemy za złożenie rezerwacji.
        Rezerwacja oczekuje teraz na potwierdzenie przez naszego dyspozytora.
      </p>
      ${details(b)}
      <div style="margin-top:18px;padding:16px;border-radius:12px;background:#1b3a2a;color:#c2efd2">
        Potwierdzimy rezerwację do 60 minut.
      </div>
      ${customerPortalButton(b)}`
    )
  };
}

export function confirmedEmail(b: BookingMail) {
  if (resolveCustomerLocale(b.customer_locale) !== "pl") return localizedStatusEmail("confirmed", b);
  return {
    subject: `Rezerwacja ${b.booking_number} została potwierdzona`,
    html: shell(
      "Rezerwacja potwierdzona",
      `<p style="color:#aab1bc;line-height:1.7">
        Twoja rezerwacja została potwierdzona przez MATT TRANSPORT.
      </p>
      ${details(b)}
      <div style="margin-top:18px;padding:16px;border-radius:12px;background:#1b3a2a;color:#c2efd2">
        Kurs został przyjęty do realizacji.
      </div>
      ${paymentButton(b)}
      ${customerPortalButton(b)}`
    )
  };
}

function assignedSummary(b: BookingMail) {
  const date = esc(b.travel_date) + " · " + esc(String(b.travel_time).slice(0,5));
  const route = esc(routeText(b));
  return `
    <div style="margin:18px 0 14px;background:#242d3c;border:1px solid #404858;border-radius:18px;padding:20px">
      <div style="color:#e9c780;font-size:12px;font-weight:800;letter-spacing:1px">TWOJA REZERWACJA</div>
      <div style="margin:12px 0 8px;color:#ffffff;font-size:17px;font-weight:750;line-height:1.45;overflow-wrap:anywhere">${route}</div>
      <div style="color:#e9c780;font-size:17px;font-weight:700">${date}</div>
      ${b.service_type === "roundtrip" && b.return_date ? '<div style="margin-top:6px;color:#b9c1cf;font-size:13px">Powrót: '+esc(b.return_date)+' · '+esc(String(b.return_time||"").slice(0,5))+'</div>' : ""}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:15px;border-top:1px solid #404858"><tr>
        <td width="50%" style="padding-top:13px;vertical-align:top;color:#aab4c3;font-size:12px">PASAŻEROWIE<br><strong style="color:#fff;font-size:15px">${esc(b.passengers)}</strong></td>
        <td width="50%" style="padding-top:13px;vertical-align:top;color:#aab4c3;font-size:12px">POJAZD<br><strong style="color:#fff;font-size:15px">${esc(b.vehicle_type === "bus" ? "Bus do 8 osób" : "Osobowy")}</strong></td>
      </tr></table>
      <div style="margin-top:14px;color:#aab4c3;font-size:12px">Numer: <strong style="color:#f1d28b">${bookingNumberForCustomer(b)}</strong> · Kwota: <strong style="color:#f1d28b">${Number(b.total_price).toFixed(2)} zł</strong></div>
    </div>`;
}

function assignedDriverCard(b: BookingMail, isReturn = false) {
  const name = isReturn ? b.return_driver_name : b.driver_name;
  const phone = isReturn ? b.return_driver_phone : b.driver_phone;
  const vehicle = isReturn ? b.return_vehicle_name : b.vehicle_name;
  const registration = isReturn ? b.return_vehicle_registration : b.vehicle_registration;
  const dial = String(phone || "").replace(/[^+\d]/g,"");
  return `
    <div style="margin:14px 0;background:#1b2930;border:1px solid #35654f;border-radius:18px;padding:20px">
      <div style="color:#b1e3c7;font-size:12px;font-weight:800;letter-spacing:1px">${isReturn ? "KIEROWCA POWROTNY" : "TWÓJ KIEROWCA"}</div>
      <div style="margin-top:8px;color:#fff;font-size:24px;line-height:1.25;font-weight:800">${esc(name || "Jeszcze nie przypisano")}</div>
      <div style="margin:7px 0;color:#d8dee8;font-size:15px">${esc(phone || "Telefon jeszcze niedostępny")}</div>
      <div style="color:#aab4c3;font-size:13px">${esc(vehicle || "Pojazd w przygotowaniu")}${registration ? " · "+esc(registration) : ""}</div>
      ${driverWhatsAppButton(phone,b.booking_number)}
      ${dial ? '<p style="margin:12px 0 0"><a href="tel:'+esc(dial)+'" style="color:#e9c780;font-size:14px;font-weight:700">Zadzwoń do kierowcy</a></p>' : ""}
    </div>`;
}

export function assignedEmail(b: BookingMail) {
  if (resolveCustomerLocale(b.customer_locale) !== "pl") return localizedStatusEmail("assigned", b, {guideHtml:travelGuideHtml(b.service_type,b.customer_locale, !b.destination_address && b.booking_source !== "public_general")});
  return {
    subject: `Kierowca został przydzielony – ${b.booking_number}`,
    html: shell(
      "Twój kierowca jest gotowy",
      `<p style="color:#aab1bc;line-height:1.65">Przydzieliliśmy obsadę do Twojego transferu.</p>
      ${assignedSummary(b)}
      ${assignedDriverCard(b)}
      ${b.service_type === "roundtrip" ? assignedDriverCard(b,true) : ""}
      ${travelGuideHtml(b.service_type, b.customer_locale, !b.destination_address && b.booking_source !== "public_general")}
      ${paymentButton(b)}
      ${customerPortalButton(b)}`
    )
  };
}

export function completedEmail(b: BookingMail) {
  if (resolveCustomerLocale(b.customer_locale) !== "pl") return localizedStatusEmail("completed", b);
  return {
    subject: `Dziękujemy za przejazd – ${b.booking_number}`,
    html: shell(
      "Dziękujemy za podróż z MATT TRANSPORT",
      `<p style="color:#aab1bc;line-height:1.7">
        Kurs ${esc(b.booking_number)} został zakończony. Dziękujemy za zaufanie
        i zapraszamy przy kolejnej podróży.
      </p>
      ${details(b)}`
    )
  };
}

export function cancelledEmail(b: BookingMail) {
  if (resolveCustomerLocale(b.customer_locale) !== "pl") return localizedStatusEmail("cancelled", b);
  const paidNotice =
    b.payment_status === "paid" ||
    b.payment_status === "review"
      ? `
        <div style="margin-top:18px;padding:16px;border-radius:12px;background:#493915;color:#ffe5a3">
          Płatność była już zaksięgowana. MATT TRANSPORT zweryfikuje ewentualny zwrot zgodnie z warunkami anulacji. Nie wykonuj kolejnej płatności.
        </div>`
      : "";

  return {
    subject: `Rezerwacja ${b.booking_number} została anulowana`,
    html: shell(
      "Rezerwacja anulowana",
      `<p style="color:#aab1bc;line-height:1.7">
        Potwierdzamy anulowanie rezerwacji ${esc(b.booking_number)}.
      </p>
      ${details(b)}
      <div style="margin-top:18px;padding:16px;border-radius:12px;background:#3a2023;color:#ffd1d6">
        Rezerwacja nie będzie realizowana.
      </div>
      ${paidNotice}
      <p style="margin-top:18px;color:#aab1bc;line-height:1.7">
        W razie pytań skontaktuj się z nami pod numerem +48 691 242 691.
      </p>`
    )
  };
}


export function paymentReceivedEmail(b: BookingMail) {
  if (resolveCustomerLocale(b.customer_locale) !== "pl") return localizedStatusEmail("paymentReceived", b);
  return {
    subject: `Płatność zaksięgowana – ${b.booking_number}`,
    html: shell(
      "Płatność została zaksięgowana",
      `<p style="color:#aab1bc;line-height:1.7">
        Dziękujemy. Otrzymaliśmy płatność za rezerwację.
      </p>
      ${details(b)}
      <div style="margin-top:18px;padding:16px;border-radius:12px;background:#1b3a2a;color:#c2efd2;font-weight:800">
        ✓ OPŁACONO · ${Number(b.total_price).toFixed(2)} zł
      </div>
      ${customerPortalButton(b)}`
    )
  };
}

export function paymentRefundedEmail(b: BookingMail) {
  if (resolveCustomerLocale(b.customer_locale) !== "pl") return localizedStatusEmail("paymentRefunded", b);
  return {
    subject: `Zwrot płatności – ${b.booking_number}`,
    html: shell(
      "Zwrot płatności",
      `<p style="color:#aab1bc;line-height:1.7">
        W systemie zarejestrowaliśmy zwrot płatności dla tej rezerwacji.
      </p>
      ${details(b)}
      <div style="margin-top:18px;padding:16px;border-radius:12px;background:#3d3425;color:#ffe0a3">
        ↩ Status płatności: ZWROT
      </div>`
    )
  };
}

export function adminNewBookingEmail(b: BookingMail, customerEmail: string, customerPhone: string) {
  const url = adminUrl(b);
  const vehicle = b.vehicle_type === "bus" ? "Bus do 8 pasażerów" : "Samochód osobowy";
  const text = [
    `🔔 NOWA REZERWACJA — ${b.booking_number}`,
    "",
    "TRASA",
    routeText(b),
    "",
    "TERMIN",
    `${b.service_type === "from_airport" ? "Przylot" : "Wylot"}: ${b.travel_date} · ${String(b.travel_time || "").slice(0, 5)}`,
    b.service_type === "roundtrip" && b.return_date
      ? `Powrót: ${b.return_date} · ${String(b.return_time || "—").slice(0, 5)}`
      : "",
    "",
    "KLIENT",
    b.customer_name,
    `tel. ${customerPhone || "—"}`,
    `e-mail: ${customerEmail || "—"}`,
    "",
    "SZCZEGÓŁY",
    `Pasażerowie: ${b.passengers}`,
    `Pojazd: ${vehicle}`,
    `Lot: ${b.flight_number || "—"}`,
    `Kwota: ${Number(b.company_id ? (b.price_gross ?? b.total_price) : b.total_price).toFixed(2).replace(".", ",")} zł`,
    `Płatność: ${paymentPreferenceText(b)}`,
    "",
    "OTWÓRZ REZERWACJĘ:",
    url || "https://panel.matt-transport.pl/panel"
  ].filter(Boolean).join("\n");

  return {
    subject: `NOWA REZERWACJA ${b.booking_number}`,
    text,
    html: shell(
      "Nowa rezerwacja w MATT Booking PRO",
      `${details(b, true)}
      <div style="margin-top:18px;background:#10141b;border:1px solid #343b49;border-radius:14px;padding:18px;line-height:1.8">
        <div><span style="color:#aab1bc">Klient:</span> <strong>${esc(b.customer_name)}</strong></div>
        <div><span style="color:#aab1bc">Telefon:</span> <strong>${esc(customerPhone)}</strong></div>
        <div><span style="color:#aab1bc">E-mail:</span> <strong>${esc(customerEmail)}</strong></div>
      </div>
      ${url ? `<div style="margin-top:20px"><a href="${url}" style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 20px;border-radius:11px;text-decoration:none;font-weight:800">OTWÓRZ REZERWACJĘ W PANELU</a></div>` : ""}`
    )
  };
}

export function reviewRequestEmail(b: BookingMail, reviewUrl: string) {
  if (resolveCustomerLocale(b.customer_locale) !== "pl") return localizedStatusEmail("review", b, {reviewUrl});
  return {
    subject: `Jak minęła podróż? – ${b.booking_number}`,
    html: shell(
      "Dziękujemy za podróż z MATT TRANSPORT",
      `<p style="color:#aab1bc;line-height:1.7">
        Dziękujemy za skorzystanie z MATT TRANSPORT. Mamy nadzieję, że przejazd
        przebiegł komfortowo i zgodnie z planem.
      </p>
      <p style="color:#aab1bc;line-height:1.7">
        Jeśli masz chwilę, będziemy wdzięczni za krótką opinię w Google.
        Przycisk poniżej otworzy bezpośrednio formularz opinii MATT TRANSPORT — bez szukania naszej firmy na mapie.
      </p>
      <div style="margin:24px 0;text-align:center">
        <a href="${esc(reviewUrl)}" style="display:inline-block;background:#d5ae5d;color:#111;padding:15px 24px;border-radius:11px;text-decoration:none;font-weight:900">
          ⭐ WYSTAW OPINIĘ W GOOGLE
        </a>
      </div>
      <div style="background:#10141b;border:1px solid #343b49;border-radius:14px;padding:16px;line-height:1.7">
        <span style="color:#aab1bc">Rezerwacja:</span> <strong>${esc(b.booking_number)}</strong><br/>
        <span style="color:#aab1bc">Trasa:</span> <strong>${esc(routeText(b))}</strong>
      </div>
      <p style="margin-top:18px;color:#aab1bc;font-size:12px;line-height:1.6">
        Jeśli podczas przejazdu coś wymagało naszej uwagi, możesz też odpowiedzieć bezpośrednio na tę wiadomość.
      </p>`
    )
  };
}
