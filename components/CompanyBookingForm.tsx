"use client";

import { useEffect, useState } from "react";
import { PRICES } from "@/lib/pricing";

export default function CompanyBookingForm({
  employees
}: {
  employees: any[];
}) {
  const [passengerMode, setPassengerMode] = useState<"existing" | "new">(
    employees.length ? "existing" : "new"
  );
  const [employeeId, setEmployeeId] = useState("");
  const [newEmployee, setNewEmployee] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    defaultAddress: "",
    department: ""
  });
  const [serviceType, setServiceType] =
    useState<"to_airport" | "from_airport" | "roundtrip">("to_airport");
  const [address, setAddress] = useState("");
  const [airport, setAirport] = useState<keyof typeof PRICES>("balice");
  const [vehicle, setVehicle] = useState<"car" | "bus">("car");
  const [passengers, setPassengers] = useState(1);
  const [travelDate, setTravelDate] = useState("");
  const [travelTime, setTravelTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [returnFlightNumber, setReturnFlightNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<"company_transfer" | "employee_payment">("company_transfer");
  const [paymentTouched, setPaymentTouched] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [routeMessage, setRouteMessage] = useState(
    "Wybierz pracownika lub wpisz adres."
  );
  const [quote, setQuote] = useState<any>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const employee = employees.find((x) => x.id === employeeId);

  async function refreshQuote(value = address, overrides: any = {}) {
    const targetAddress = String(value || "").trim();
    if (!targetAddress) return;

    setQuoteBusy(true);
    setRouteMessage("Obliczanie trasy od siedziby kontrahenta...");

    const response = await fetch("/api/company/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: targetAddress,
        serviceType: overrides.serviceType ?? serviceType,
        airport: overrides.airport ?? airport,
        vehicleType: overrides.vehicleType ?? vehicle,
        travelDate: overrides.travelDate ?? travelDate
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setQuote(null);
      setRouteMessage(data.error ?? "Nie udało się obliczyć wyceny B2B.");
      setQuoteBusy(false);
      return;
    }

    setQuote(data);
    setRouteMessage(
      `✓ ${Number(data.distanceFromHeadquartersKm).toFixed(1)} km od siedziby kontrahenta · ${Number(data.billableKm).toFixed(1)} km płatne`
    );

    if (!paymentTouched) {
      setPaymentMethod(
        data.defaultPaymentMethod === "employee_payment"
          ? "employee_payment"
          : "company_transfer"
      );
    }

    setQuoteBusy(false);
  }

  useEffect(() => {
    if (passengerMode === "existing" && employee?.default_address) {
      setAddress(employee.default_address);
      refreshQuote(employee.default_address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, passengerMode]);

  useEffect(() => {
    if (passengerMode === "new" && newEmployee.defaultAddress) {
      setAddress(newEmployee.defaultAddress);
      setQuote(null);
      setRouteMessage("Wybierz adres z podpowiedzi lub kliknij OBLICZ WYCENĘ.");
    }
  }, [newEmployee.defaultAddress, passengerMode]);

  useEffect(() => {
    if (passengers > 3 && vehicle !== "bus") {
      setVehicle("bus");
      if (address) refreshQuote(address, { vehicleType: "bus" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passengers]);

  useEffect(() => {
    if (address.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const response = await fetch(
        `/api/places?q=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      setSuggestions(data.suggestions ?? []);
    }, 350);

    return () => clearTimeout(timer);
  }, [address]);

  function chooseService(value: typeof serviceType) {
    setServiceType(value);
    if (address) refreshQuote(address, { serviceType: value });
  }

  function chooseAirport(value: keyof typeof PRICES) {
    setAirport(value);
    if (address) refreshQuote(address, { airport: value });
  }

  function chooseVehicle(value: "car" | "bus") {
    setVehicle(value);
    if (address) refreshQuote(address, { vehicleType: value });
  }

  function chooseTravelDate(value: string) {
    setTravelDate(value);
    if (address) refreshQuote(address, { travelDate: value });
  }

  async function submit() {
    if (saving) return;

    if (passengerMode === "existing" && !employeeId) {
      setMessage("Wybierz pracownika.");
      return;
    }

    if (
      passengerMode === "new" &&
      (!newEmployee.firstName || !newEmployee.lastName)
    ) {
      setMessage("Podaj imię i nazwisko nowego pracownika.");
      return;
    }

    if (!address || !travelDate || !travelTime) {
      setMessage("Uzupełnij adres oraz termin.");
      return;
    }

    setSaving(true);
    setMessage("Serwer ponownie sprawdza wycenę i zapisuje rezerwację...");

    const response = await fetch("/api/company/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: passengerMode === "existing" ? employeeId : null,
        newEmployee: passengerMode === "new" ? newEmployee : null,
        serviceType,
        address,
        airport,
        vehicleType: vehicle,
        passengers,
        travelDate,
        travelTime,
        returnDate,
        returnTime,
        flightNumber,
        returnFlightNumber,
        notes,
        paymentMethod
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się zapisać rezerwacji.");
      setSaving(false);
      return;
    }

    setSuccess(data);
    setMessage("");
    setSaving(false);
  }

  if (success) {
    const net = Number(success.b2b_net ?? 0);
    const vat = Number(success.b2b_vat ?? 0);
    const gross = Number(success.b2b_gross ?? success.total_price ?? 0);

    return (
      <div className="booking-success-card">
        <div className="success-check">✓</div>
        <span className="badge">MATT BOOKING PRO · B2B PRO</span>
        <h1>Transport zamówiony</h1>
        <p className="success-lead">Rezerwacja firmowa została przyjęta.</p>

        <div className="success-number">
          <span>Numer rezerwacji</span>
          <strong>{success.booking_number}</strong>
        </div>

        <div className="success-details">
          <div><span>Pasażer</span><strong>{success.customer_name}</strong></div>
          <div><span>Netto</span><strong>{net.toFixed(2)} zł</strong></div>
          <div><span>VAT 8%</span><strong>{vat.toFixed(2)} zł</strong></div>
          <div><span>Brutto</span><strong>{gross.toFixed(2)} zł</strong></div>
        </div>

        <p className="muted">
          Wszystkie ceny B2B są cenami netto. Do ceny doliczono 8% VAT.
        </p>

        <div className="success-actions">
          <a className="btn" href="/firma/nowa-rezerwacja">NOWA REZERWACJA</a>
          <a className="btn secondary" href="/firma/rezerwacje">MOJE REZERWACJE</a>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <div className="card">
        <span className="badge">REZERWACJA B2B PRO</span>
        <h1>Nowy transport</h1>

        <div className="b2b-vat-note">
          Wszystkie ceny są cenami <strong>NETTO</strong>. System dolicza <strong>8% VAT</strong>.
        </div>

        <h3>Pasażer</h3>
        <div className="passenger-mode">
          <button
            className={passengerMode === "existing" ? "active" : ""}
            onClick={() => setPassengerMode("existing")}
            disabled={!employees.length}
          >
            Z listy pracowników
          </button>
          <button
            className={passengerMode === "new" ? "active" : ""}
            onClick={() => setPassengerMode("new")}
          >
            + Nowy pracownik
          </button>
        </div>

        {passengerMode === "existing" ? (
          <label>
            Pracownik
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">— Wybierz pracownika —</option>
              {employees.filter((x) => x.active !== false).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.first_name} {x.last_name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid new-employee-inline">
            <label>Imię<input value={newEmployee.firstName} onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })} /></label>
            <label>Nazwisko<input value={newEmployee.lastName} onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })} /></label>
            <label>Telefon<input value={newEmployee.phone} onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })} /></label>
            <label>E-mail<input type="email" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} /></label>
            <label>Domyślny adres<input value={newEmployee.defaultAddress} onChange={(e) => setNewEmployee({ ...newEmployee, defaultAddress: e.target.value })} /></label>
            <label>Dział<input value={newEmployee.department} onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })} /></label>
          </div>
        )}

        <h3>Rodzaj przejazdu</h3>
        <div className="choice-grid">
          <button className={`choice ${serviceType === "to_airport" ? "active" : ""}`} onClick={() => chooseService("to_airport")}><strong>🛫 Na lotnisko</strong></button>
          <button className={`choice ${serviceType === "from_airport" ? "active" : ""}`} onClick={() => chooseService("from_airport")}><strong>🛬 Z lotniska</strong></button>
          <button className={`choice ${serviceType === "roundtrip" ? "active" : ""}`} onClick={() => chooseService("roundtrip")}><strong>🔁 W obie strony</strong></button>
        </div>

        <h3>{serviceType === "from_airport" ? "Dokąd jedzie pasażer?" : "Skąd odbieramy pasażera?"}</h3>
        <div className="grid">
          <label className={serviceType === "from_airport" ? "route-address second" : "route-address first"}>
            {serviceType === "from_airport" ? "Adres docelowy" : "Adres odbioru"}
            <input
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setQuote(null);
              }}
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <div className="address-suggestions">
                {suggestions.slice(0, 5).map((s: any, i: number) => (
                  <button
                    key={s.placeId ?? i}
                    type="button"
                    onClick={() => {
                      const value = s.text ?? "";
                      setAddress(value);
                      setSuggestions([]);
                      refreshQuote(value);
                    }}
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            )}
          </label>

          <label className={serviceType === "from_airport" ? "route-airport first" : "route-airport second"}>
            {serviceType === "from_airport" ? "Z jakiego lotniska?" : "Lotnisko"}
            <select value={airport} onChange={(e) => chooseAirport(e.target.value as keyof typeof PRICES)}>
              {Object.entries(PRICES).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className={`route-status ${quote ? "ok" : ""}`}>{routeMessage}</div>
        {address && !quote && (
          <button type="button" className="btn secondary" disabled={quoteBusy} onClick={() => refreshQuote()}>
            {quoteBusy ? "OBLICZANIE..." : "OBLICZ WYCENĘ B2B"}
          </button>
        )}

        <h3>Termin</h3>
        <div className="grid">
          <label>Data<input type="date" value={travelDate} onChange={(e) => chooseTravelDate(e.target.value)} /></label>
          <label>Godzina<input type="time" value={travelTime} onChange={(e) => setTravelTime(e.target.value)} /></label>
          <label>Numer lotu<input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} /></label>
          <label>
            Pasażerowie
            <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}>
              {[1,2,3,4,5,6,7,8].map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          {serviceType === "roundtrip" && (
            <>
              <label>Data powrotu<input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} /></label>
              <label>Godzina powrotu<input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} /></label>
              <label>Lot powrotny<input value={returnFlightNumber} onChange={(e) => setReturnFlightNumber(e.target.value)} /></label>
            </>
          )}
        </div>

        <h3>Pojazd</h3>
        <div className="choice-grid vehicle-grid">
          <button className={`choice ${vehicle === "car" ? "active" : ""}`} disabled={passengers > 3} onClick={() => chooseVehicle("car")}>
            <strong>Samochód osobowy</strong><small>Do 3 pasażerów</small>
          </button>
          <button className={`choice ${vehicle === "bus" ? "active" : ""}`} onClick={() => chooseVehicle("bus")}>
            <strong>Bus do 8 osób</strong><small>Grupy / większy bagaż</small>
          </button>
        </div>

        <h3>Płatność</h3>
        <div className="choice-grid">
          <button type="button" className={`choice ${paymentMethod === "company_transfer" ? "active" : ""}`} onClick={() => { setPaymentTouched(true); setPaymentMethod("company_transfer"); }}>
            <strong>🏢 Przelew firmowy</strong><small>Rozliczenie zgodnie z warunkami firmy</small>
          </button>
          <button type="button" className={`choice ${paymentMethod === "employee_payment" ? "active" : ""}`} onClick={() => { setPaymentTouched(true); setPaymentMethod("employee_payment"); }}>
            <strong>👤 Płatność pracownika</strong><small>Pracownik płaci kwotę BRUTTO</small>
          </button>
        </div>

        <label style={{ marginTop: 18 }}>
          Uwagi
          <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>

      <aside className="card summary b2b-summary">
        <h3>Podsumowanie B2B PRO</h3>
        <div className="row">
          <span>Pasażer</span>
          <strong>
            {passengerMode === "existing"
              ? employee
                ? `${employee.first_name} ${employee.last_name}`
                : "—"
              : `${newEmployee.firstName} ${newEmployee.lastName}`.trim() || "—"}
          </strong>
        </div>

        {quote ? (
          <>
            <div className="b2b-terms-mini">
              <strong>Twoje warunki</strong>
              <span>Siedziba: {quote.headquartersAddress}</span>
              <span>Bez dopłaty: {Number(quote.freeKm).toFixed(1)} km od siedziby</span>
              <span>Powyżej: {Number(quote.extraKmRateNet).toFixed(2)} zł netto/km</span>
              <span>Cennik: {quote.pricingMode === "custom" ? "indywidualny" : "standardowy MATT"}</span>
              <span>Ważne od: {quote.termsEffectiveFrom}</span>
            </div>

            <div className="row"><span>Cena bazowa netto</span><strong>{Number(quote.baseNet).toFixed(2)} zł</strong></div>
            <div className="row"><span>Odległość od siedziby</span><strong>{Number(quote.distanceFromHeadquartersKm).toFixed(1)} km</strong></div>
            <div className="row"><span>Km ponad limit</span><strong>{Number(quote.billableKm).toFixed(1)} km</strong></div>
            <div className="row"><span>Dopłata netto</span><strong>{Number(quote.extraNet).toFixed(2)} zł</strong></div>
            {Number(quote.discountNet) > 0 && (
              <div className="row"><span>Rabat</span><strong>-{Number(quote.discountNet).toFixed(2)} zł</strong></div>
            )}
            <div className="row"><span>Razem netto</span><strong>{Number(quote.net).toFixed(2)} zł</strong></div>
            <div className="row"><span>VAT {Number(quote.vatRate).toFixed(0)}%</span><strong>{Number(quote.vat).toFixed(2)} zł</strong></div>
            <div className="row total"><span>Razem brutto</span><strong>{Number(quote.gross).toFixed(2)} zł</strong></div>
          </>
        ) : (
          <p className="muted">Wybierz adres i oblicz wycenę. Serwer policzy dystans od siedziby Twojej firmy.</p>
        )}

        <button
          className="btn"
          style={{ width: "100%", marginTop: 16 }}
          disabled={saving || quoteBusy || !quote}
          onClick={submit}
        >
          {saving ? "ZAMAWIANIE..." : "ZAMÓW TRANSPORT"}
        </button>

        {message && <div className="admin-save-message">{message}</div>}
      </aside>
    </div>
  );
}
