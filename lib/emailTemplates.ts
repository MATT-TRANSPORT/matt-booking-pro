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
  travel_date: string;
  travel_time: string;
  return_date?: string | null;
  return_time?: string | null;
  passengers: number;
  vehicle_type: string;
  flight_number?: string | null;
  total_price: number | string;
  driver_name?: string | null;
  driver_phone?: string | null;
  vehicle_name?: string | null;
  vehicle_registration?: string | null;
};

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://matt-booking-pro.vercel.app";
}

function clientUrl(b: BookingMail) {
  return b.customer_access_token
    ? `${appBaseUrl()}/rezerwacja/${b.customer_access_token}`
    : null;
}

function adminUrl(b: BookingMail) {
  return b.id
    ? `${appBaseUrl()}/panel/rezerwacje/${b.id}`
    : null;
}

function routeText(b: BookingMail) {
  if (b.service_type === "from_airport") return `${b.airport_label} → ${b.pickup_address}`;
  if (b.service_type === "roundtrip") return `${b.pickup_address} ↔ ${b.airport_label}`;
  return `${b.pickup_address} → ${b.airport_label}`;
}

function shell(title: string, content: string) {
  return `
  <div style="margin:0;padding:32px 14px;background:#0b0e13;font-family:Arial,sans-serif;color:#f7f7f7">
    <div style="max-width:680px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:18px;overflow:hidden">
      <div style="padding:24px 28px;background:#10141b;border-bottom:1px solid #343b49">
        <div style="font-size:20px;font-weight:800;color:#f1d28b">MATT TRANSPORT</div>
        <div style="margin-top:5px;font-size:12px;color:#aab1bc">Transport zawsze na czas</div>
      </div>
      <div style="padding:28px">
        <h1 style="margin:0 0 18px;font-size:28px;color:#f7f7f7">${title}</h1>
        ${content}
      </div>
      <div style="padding:20px 28px;background:#10141b;border-top:1px solid #343b49;color:#aab1bc;font-size:13px;line-height:1.7">
        MATT TRANSPORT<br>
        tel. <a style="color:#f1d28b" href="tel:+48691242691">+48 691 242 691</a><br>
        <a style="color:#f1d28b" href="mailto:kontakt@matt-transport.pl">kontakt@matt-transport.pl</a><br>
        <a style="color:#f1d28b" href="https://matt-transport.pl">matt-transport.pl</a>
      </div>
    </div>
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
    <div style="background:#10141b;border:1px solid #343b49;border-radius:14px;padding:18px;line-height:1.8">
      <div><span style="color:#aab1bc">Numer rezerwacji:</span> ${number}</div>
      <div><span style="color:#aab1bc">Trasa:</span> <strong>${esc(routeText(b))}</strong></div>
      <div><span style="color:#aab1bc">Termin:</span> <strong>${esc(b.travel_date)} ${esc(b.travel_time)}</strong></div>
      <div><span style="color:#aab1bc">Pasażerowie:</span> <strong>${esc(b.passengers)}</strong></div>
      <div><span style="color:#aab1bc">Pojazd:</span> <strong>${esc(vehicle)}</strong></div>
      <div><span style="color:#aab1bc">Lot:</span> <strong>${esc(b.flight_number || "—")}</strong></div>
      <div><span style="color:#aab1bc">Kwota:</span> <strong style="color:#f1d28b">${Number(b.total_price).toFixed(2)} zł</strong></div>
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
      ${customerPortalButton(b)}`
    )
  };
}

export function assignedEmail(b: BookingMail) {
  return {
    subject: `Kierowca został przydzielony – ${b.booking_number}`,
    html: shell(
      "Kierowca i pojazd przypisani",
      `<p style="color:#aab1bc;line-height:1.7">
        Przydzieliliśmy obsadę do Twojego transferu.
      </p>
      ${details(b)}
      <div style="margin-top:18px;background:#10141b;border:1px solid #343b49;border-radius:14px;padding:18px;line-height:1.8">
        <div><span style="color:#aab1bc">Kierowca:</span> <strong>${esc(b.driver_name || "—")}</strong></div>
        <div><span style="color:#aab1bc">Telefon:</span> <strong>${esc(b.driver_phone || "—")}</strong></div>
        <div><span style="color:#aab1bc">Pojazd:</span> <strong>${esc(b.vehicle_name || "—")}</strong></div>
        <div><span style="color:#aab1bc">Rejestracja:</span> <strong>${esc(b.vehicle_registration || "—")}</strong></div>
      </div>
      ${customerPortalButton(b)}`
    )
  };
}

export function completedEmail(b: BookingMail) {
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

export function adminNewBookingEmail(b: BookingMail, customerEmail: string, customerPhone: string) {
  const url = adminUrl(b);
  return {
    subject: `NOWA REZERWACJA ${b.booking_number}`,
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
