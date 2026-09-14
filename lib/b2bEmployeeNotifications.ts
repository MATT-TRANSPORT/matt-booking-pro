import { appBaseUrl } from "@/lib/payment";

const esc = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function shortTime(value: unknown) {
  return String(value || "").slice(0, 5);
}

function routeText(b: any) {
  if (b.service_type === "from_airport") {
    return `${b.airport_label} → ${b.pickup_address}`;
  }
  if (b.service_type === "roundtrip") {
    return `${b.pickup_address} ↔ ${b.airport_label}`;
  }
  return `${b.pickup_address} → ${b.airport_label}`;
}

function employeePaymentUrl(b: any) {
  if (!b?.customer_access_token) return null;
  return `${appBaseUrl()}/platnosc/${b.customer_access_token}`;
}

function paymentSection(b: any) {
  if (b.payment_method !== "employee_payment") return "";

  if (b.payment_status === "paid") {
    return `
      <div style="margin-top:20px;padding:16px;border-radius:12px;background:#173d2a;border:1px solid #2f7650;color:#d4f5df">
        <strong>✓ Płatność została zaksięgowana.</strong><br>
        <span>✓ Payment has been received.</span>
      </div>`;
  }

  if (b.payment_status === "review") {
    return `
      <div style="margin-top:20px;padding:16px;border-radius:12px;background:#493915;border:1px solid #8b6d28;color:#ffe5a3">
        <strong>⚠ Płatność wymaga weryfikacji przez MATT TRANSPORT.</strong><br>
        <span>⚠ The payment requires verification by MATT TRANSPORT.</span>
      </div>`;
  }

  const url = employeePaymentUrl(b);
  if (!url) return "";

  return `
    <div style="margin-top:20px;padding:18px;border-radius:14px;background:#10141b;border:1px solid #5d4d2c">
      <div style="font-weight:900;color:#f1d28b;margin-bottom:8px">Płatność online / Online payment</div>
      <div style="color:#d7dbe1;line-height:1.6;margin-bottom:14px">
        Kwota brutto / Gross amount: <strong style="color:#fff">${Number(b.price_gross ?? b.total_price ?? 0).toFixed(2)} zł</strong>
      </div>
      <a href="${url}" style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 20px;border-radius:11px;text-decoration:none;font-weight:900">
        OPŁAĆ ONLINE / PAY ONLINE
      </a>
      <div style="margin-top:10px;color:#8f98a5;font-size:12px;line-height:1.5">
        Link jest indywidualny dla tej rezerwacji. Nie udostępniaj go osobom trzecim.<br>
        This link is unique to this booking. Do not share it with third parties.
      </div>
    </div>`;
}

function shell(titlePl: string, titleEn: string, content: string) {
  return `
    <div style="margin:0;padding:32px 14px;background:#0b0e13;font-family:Arial,sans-serif;color:#f7f7f7">
      <div style="max-width:700px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:18px;overflow:hidden">
        <div style="padding:24px 28px;background:#10141b;border-bottom:1px solid #343b49">
          <div style="font-size:20px;font-weight:900;color:#f1d28b">MATT TRANSPORT</div>
          <div style="margin-top:5px;font-size:12px;color:#aab1bc">Transport zawsze na czas · Always on time</div>
        </div>
        <div style="padding:28px">
          <h1 style="margin:0 0 6px;font-size:27px;color:#fff">${titlePl}</h1>
          <div style="margin-bottom:20px;font-size:18px;color:#f1d28b">${titleEn}</div>
          ${content}
        </div>
        <div style="padding:20px 28px;background:#10141b;border-top:1px solid #343b49;color:#aab1bc;font-size:13px;line-height:1.7">
          <strong style="color:#fff">MATT TRANSPORT</strong><br>
          tel. <a style="color:#f1d28b" href="tel:+48691242691">+48 691 242 691</a><br>
          <a style="color:#f1d28b" href="mailto:kontakt@matt-transport.pl">kontakt@matt-transport.pl</a><br>
          <a style="color:#f1d28b" href="https://matt-transport.pl">matt-transport.pl</a>
        </div>
      </div>
    </div>`;
}

function bookingSummary(b: any) {
  return `
    <div style="background:#10141b;border:1px solid #343b49;border-radius:14px;padding:18px;line-height:1.85">
      <div><span style="color:#aab1bc">Rezerwacja / Booking:</span> <strong style="color:#f1d28b">${esc(b.booking_number)}</strong></div>
      <div><span style="color:#aab1bc">Pasażer / Passenger:</span> <strong>${esc(b.customer_name || "—")}</strong></div>
      <div><span style="color:#aab1bc">Trasa / Route:</span> <strong>${esc(routeText(b))}</strong></div>
      <div><span style="color:#aab1bc">Termin / Date & time:</span> <strong>${esc(b.travel_date)} · ${esc(shortTime(b.travel_time))}</strong></div>
      ${b.service_type === "roundtrip" && b.return_date ? `<div><span style="color:#aab1bc">Powrót / Return:</span> <strong>${esc(b.return_date)} · ${esc(shortTime(b.return_time))}</strong></div>` : ""}
    </div>`;
}

function assignmentBox(b: any) {
  return `
    <div style="margin-top:18px;background:#10141b;border:1px solid #343b49;border-radius:14px;padding:18px;line-height:1.85">
      <div style="font-weight:900;color:#f1d28b;margin-bottom:8px">→ WYJAZD / OUTBOUND</div>
      <div><span style="color:#aab1bc">Kierowca / Driver:</span> <strong>${esc(b.driver_name || "—")}</strong></div>
      <div><span style="color:#aab1bc">Telefon / Phone:</span> <strong>${esc(b.driver_phone || "—")}</strong></div>
      <div><span style="color:#aab1bc">Pojazd / Vehicle:</span> <strong>${esc(b.vehicle_name || "—")}</strong></div>
      <div><span style="color:#aab1bc">Nr rej. / Registration:</span> <strong>${esc(b.vehicle_registration || "—")}</strong></div>
      ${b.service_type === "roundtrip" ? `
        <div style="height:1px;background:#343b49;margin:16px 0"></div>
        <div style="font-weight:900;color:#f1d28b;margin-bottom:8px">↩ POWRÓT / RETURN</div>
        <div><span style="color:#aab1bc">Kierowca / Driver:</span> <strong>${esc(b.return_driver_name || "Jeszcze nie przypisano / Not assigned yet")}</strong></div>
        <div><span style="color:#aab1bc">Telefon / Phone:</span> <strong>${esc(b.return_driver_phone || "—")}</strong></div>
        <div><span style="color:#aab1bc">Pojazd / Vehicle:</span> <strong>${esc(b.return_vehicle_name || "Jeszcze nie przypisano / Not assigned yet")}</strong></div>
        <div><span style="color:#aab1bc">Nr rej. / Registration:</span> <strong>${esc(b.return_vehicle_registration || "—")}</strong></div>` : ""}
    </div>`;
}

export function b2bEmployeeConfirmedEmail(b: any) {
  return {
    subject: `MATT TRANSPORT · Potwierdzenie / Confirmation · ${b.booking_number}`,
    html: shell(
      "Transport został potwierdzony",
      "Your transport has been confirmed",
      `<p style="color:#d7dbe1;line-height:1.7">
        Dzień dobry, transport zamówiony przez Twoją firmę został potwierdzony przez MATT TRANSPORT.<br>
        Hello, the transport booked by your company has been confirmed by MATT TRANSPORT.
      </p>
      ${bookingSummary(b)}
      ${paymentSection(b)}`
    )
  };
}

export function b2bEmployeeAssignedEmail(b: any) {
  return {
    subject: `MATT TRANSPORT · Kierowca i pojazd / Driver & vehicle · ${b.booking_number}`,
    html: shell(
      "Dane kierowcy i pojazdu",
      "Driver and vehicle details",
      `<p style="color:#d7dbe1;line-height:1.7">
        Poniżej znajdziesz aktualne dane operacyjne Twojego przejazdu. Jeśli obsada została zmieniona, ta wiadomość zastępuje wcześniejsze dane.<br>
        Below are the current operational details of your trip. If the assignment has changed, this message replaces the previous details.
      </p>
      ${bookingSummary(b)}
      ${assignmentBox(b)}
      ${paymentSection(b)}`
    )
  };
}
