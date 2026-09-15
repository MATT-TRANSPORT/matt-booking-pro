"use client";

import { useEffect, useMemo, useState } from "react";

type RepeatKind = "airport" | "general" | "wedding";

function routeText(template: any) {
  if (template.kind === "general") return `${template.origin || "—"} → ${template.destination || "—"}`;
  if (template.kind === "wedding") return `${template.restaurantName || "Wesele"} · ${template.restaurantAddress || ""}`;
  const airport = template.airportLabel || template.airport || "Lotnisko";
  if (template.serviceType === "from_airport") return `${airport} → ${template.address || "—"}`;
  if (template.serviceType === "roundtrip") return `${template.address || "—"} ↔ ${airport}`;
  return `${template.address || "—"} → ${airport}`;
}

export default function CustomerRepeatBooking({ expectedKind }: { expectedKind: RepeatKind }) {
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [travelDate, setTravelDate] = useState("");
  const [travelTime, setTravelTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [returnFlightNumber, setReturnFlightNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash"|"bank_transfer"|"online">("cash");
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState("");
  const [vehiclesCount, setVehiclesCount] = useState(1);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("matt_customer_repeat");
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || parsed.kind !== expectedKind) {
        setMessage("Nie znaleziono danych poprzedniej rezerwacji. Wróć do „Moich przejazdów” i wybierz „Zamów ponownie”.");
      } else {
        setTemplate(parsed);
        if (["cash", "bank_transfer", "online"].includes(parsed.paymentMethod)) {
          setPaymentMethod(parsed.paymentMethod);
        }
        if (expectedKind === "wedding") {
          setRestaurantName(parsed.restaurantName || "");
          setRestaurantAddress(parsed.restaurantAddress || "");
          setVehiclesCount(Math.max(1, Math.min(20, Number(parsed.vehiclesCount || 1))));
        }
      }
    } catch {
      setMessage("Nie udało się odczytać danych poprzedniej rezerwacji.");
    }
    setLoading(false);
  }, [expectedKind]);

  const isRoundtrip = useMemo(() => {
    if (!template) return false;
    return template.kind === "general" ? Boolean(template.roundtrip) : template.kind === "airport" && template.serviceType === "roundtrip";
  }, [template]);

  function validateSchedule() {
    if (!travelDate || !travelTime) return "Podaj nową datę i godzinę przejazdu.";
    const outbound = new Date(`${travelDate}T${travelTime}`).getTime();
    if (!Number.isFinite(outbound)) return "Podaj prawidłowy termin przejazdu.";
    if (isRoundtrip) {
      if (!returnDate || !returnTime) return "Podaj datę i godzinę powrotu.";
      const back = new Date(`${returnDate}T${returnTime}`).getTime();
      if (!Number.isFinite(back) || back <= outbound) return "Termin powrotu musi być późniejszy niż wyjazd.";
    }
    return "";
  }

  async function submit() {
    if (!template || saving) return;
    const scheduleError = validateSchedule();
    if (scheduleError) { setMessage(scheduleError); return; }
    setSaving(true);
    setMessage("");

    try {
      let response: Response;
      if (template.kind === "airport") {
        response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceType: template.serviceType,
            address: template.address,
            airport: template.airport,
            vehicleType: template.vehicle,
            passengers: template.passengers,
            distanceKm: Number(template.distanceKm || 0),
            travelDate,
            travelTime,
            returnDate: isRoundtrip ? returnDate : "",
            returnTime: isRoundtrip ? returnTime : "",
            flightNumber: flightNumber.trim() || null,
            returnFlightNumber: isRoundtrip ? (returnFlightNumber.trim() || null) : null,
            additionalStopAddress: template.additionalStopAddress || null,
            additionalStopPrimary: Boolean(template.additionalStopPrimary),
            additionalStopReturn: Boolean(template.additionalStopReturn),
            customerName: template.customerName,
            phone: template.phone,
            email: template.email,
            invoiceRequired: Boolean(template.invoiceRequired),
            companyNip: template.invoiceRequired ? (template.companyNip || null) : null,
            paymentMethod,
            onlinePaymentRequested: paymentMethod === "online",
            notes: template.notes || null
          })
        });
      } else if (template.kind === "general") {
        response = await fetch("/api/general-bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: template.origin,
            destination: template.destination,
            roundtrip: Boolean(template.roundtrip),
            travelDate,
            travelTime,
            returnDate: isRoundtrip ? returnDate : "",
            returnTime: isRoundtrip ? returnTime : "",
            passengers: Number(template.passengers || 1),
            vehicleType: template.vehicleType || "auto",
            category: template.category || "private",
            customerName: template.customerName,
            phone: template.phone,
            email: template.email,
            invoiceRequired: Boolean(template.invoiceRequired),
            notes: template.notes || null
          })
        });
      } else {
        response = await fetch("/api/wedding-bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: template.customerName,
            startDate: travelDate,
            startTime: travelTime,
            restaurantName,
            restaurantAddress,
            vehiclesCount,
            vehicleTypes: Array.from({ length: vehiclesCount }, () => "bus"),
            phone: template.phone,
            email: template.email,
            notes: template.notes || null
          })
        });
      }

      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Nie udało się utworzyć rezerwacji.");
      sessionStorage.removeItem("matt_customer_repeat");
      setSuccess(body);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się utworzyć rezerwacji.");
    }
    setSaving(false);
  }

  if (loading) return <section className="card customer-repeat-card"><h1>Przygotowuję rezerwację…</h1></section>;

  if (success) return <section className="card booking-success-card customer-repeat-success">
    <div className="success-check">✓</div>
    <span className="badge">MATT TRANSPORT</span>
    <h1>Nowa rezerwacja została przyjęta</h1>
    <div className="success-number"><span>Numer rezerwacji</span><strong>{success.booking_number || success.bookingNumber || "—"}</strong></div>
    {success.total_price != null && Number(success.total_price) > 0 && <div className="success-details"><div><span>Kwota</span><strong>{Number(success.total_price).toFixed(2)} zł</strong></div></div>}
    <p className="muted">Skopiowaliśmy dane poprzedniego przejazdu i zapisaliśmy nowy termin jako osobne zamówienie.</p>
    {success.customer_access_token && <a className="btn" href={`/rezerwacja/${success.customer_access_token}`}>OTWÓRZ NOWĄ REZERWACJĘ</a>}
    <a className="btn secondary" href="/moje-przejazdy">MOJE PRZEJAZDY</a>
  </section>;

  if (!template) return <section className="card customer-repeat-card"><span className="badge">MATT CUSTOMER</span><h1>Zamów ponownie</h1><div className="customer-trips-message">{message}</div><a className="btn" href="/moje-przejazdy">WRÓĆ DO MOICH PRZEJAZDÓW</a></section>;

  const airportPickup = template.kind === "airport" && template.serviceType === "from_airport";

  return <section className="card customer-repeat-card">
    <span className="badge">MATT CUSTOMER · ZAMÓW PONOWNIE</span>
    <h1>Ten sam transport, nowy termin</h1>
    <p className="muted">Skopiowaliśmy trasę i Twoje dane. Uzupełnij tylko nowy termin{template.kind === "airport" ? " oraz numer lotu, jeżeli go znasz" : ""}.</p>

    <div className="customer-repeat-route"><small>POPRZEDNIA TRASA</small><strong>{routeText(template)}</strong>{template.bookingNumber && <span>Rezerwacja {template.bookingNumber}</span>}</div>

    {template.kind === "wedding" && <div className="grid customer-repeat-extra">
      <label>Nazwa restauracji<input value={restaurantName} onChange={e => setRestaurantName(e.target.value)} /></label>
      <label>Adres restauracji<input value={restaurantAddress} onChange={e => setRestaurantAddress(e.target.value)} /></label>
      <label>Liczba pojazdów<input type="number" min={1} max={20} value={vehiclesCount} onChange={e => setVehiclesCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></label>
    </div>}

    <h2>Nowy termin</h2>
    <div className="grid">
      <label>{airportPickup ? "Data przylotu" : template.kind === "wedding" ? "Data rozpoczęcia rozwozów" : "Data wyjazdu"}<input type="date" value={travelDate} onChange={e => setTravelDate(e.target.value)} /></label>
      <label>{airportPickup ? "Godzina przylotu" : template.kind === "wedding" ? "Godzina rozpoczęcia" : "Godzina wyjazdu"}<input type="time" value={travelTime} onChange={e => setTravelTime(e.target.value)} /></label>
      {template.kind === "airport" && <label>Numer lotu<input value={flightNumber} onChange={e => setFlightNumber(e.target.value.toUpperCase())} placeholder="np. ENT7692" /></label>}
      {isRoundtrip && <>
        <label>Data powrotu<input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} /></label>
        <label>{template.kind === "airport" ? "Godzina przylotu powrotnego" : "Godzina powrotu"}<input type="time" value={returnTime} onChange={e => setReturnTime(e.target.value)} /></label>
        {template.kind === "airport" && <label>Lot powrotny<input value={returnFlightNumber} onChange={e => setReturnFlightNumber(e.target.value.toUpperCase())} placeholder="np. LO3880" /></label>}
      </>}
    </div>

    {template.kind === "airport" && <div className="customer-repeat-payment">
      <h2>Płatność</h2>
      <label>Sposób płatności<select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}><option value="cash">Gotówka u kierowcy</option><option value="bank_transfer">Przelew tradycyjny</option><option value="online">Płatność online po potwierdzeniu</option></select></label>
    </div>}

    <div className="customer-repeat-summary">
      <div><span>Klient</span><strong>{template.customerName || "—"}</strong></div>
      <div><span>Telefon</span><strong>{template.phone || "—"}</strong></div>
      <div><span>E-mail</span><strong>{template.email || "—"}</strong></div>
    </div>

    {message && <div className="customer-trips-message">{message}</div>}
    <button className="btn customer-repeat-submit" disabled={saving} onClick={submit}>{saving ? "TWORZENIE REZERWACJI…" : "ZAMÓW TEN TRANSPORT PONOWNIE"}</button>
    <a className="btn secondary customer-repeat-back" href="/moje-przejazdy">ANULUJ I WRÓĆ</a>
  </section>;
}
