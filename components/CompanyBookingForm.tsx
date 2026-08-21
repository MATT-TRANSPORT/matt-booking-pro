"use client";

import { useEffect, useState } from "react";
import { PRICES } from "@/lib/pricing";

export default function CompanyBookingForm({
  employees,
  companyName,
  commercialTerms
}: {
  employees: any[];
  companyName?: string;
  commercialTerms?: any | null;
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
  const [paymentInitialized, setPaymentInitialized] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [quote, setQuote] = useState<any>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const employee = employees.find((x) => x.id === employeeId);

  useEffect(() => {
    if (passengerMode === "existing" && employee?.default_address) {
      setAddress(employee.default_address);
    }
  }, [employeeId, passengerMode]);

  useEffect(() => {
    if (passengerMode === "new" && newEmployee.defaultAddress) {
      setAddress(newEmployee.defaultAddress);
    }
  }, [newEmployee.defaultAddress, passengerMode]);

  useEffect(() => {
    if (passengers > 3) setVehicle("bus");
  }, [passengers]);

  useEffect(() => {
    if (address.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/places?q=${encodeURIComponent(address)}`);
        const data = await response.json();
        setSuggestions(data.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [address]);

  useEffect(() => {
    if (address.trim().length < 5) {
      setQuote(null);
      setQuoteError("");
      return;
    }

    const timer = setTimeout(() => {
      quoteFor(address);
    }, 650);

    return () => clearTimeout(timer);
  }, [address, airport, vehicle, serviceType]);

  async function quoteFor(value: string) {
    if (!value || quoteBusy) return;
    setQuoteBusy(true);
    setQuoteError("");

    try {
      const response = await fetch("/api/company/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: value,
          airport,
          vehicleType: vehicle,
          serviceType
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setQuote(null);
        setQuoteError(data.error ?? "Nie udało się przygotować wyceny.");
      } else {
        setQuote(data);
        if (!paymentInitialized) {
          setPaymentMethod(data.defaultPaymentMethod || "company_transfer");
          setPaymentInitialized(true);
        }
      }
    } catch {
      setQuote(null);
      setQuoteError("Nie udało się połączyć z kalkulatorem B2B.");
    }

    setQuoteBusy(false);
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

    if (!quote) {
      setMessage("Poczekaj na poprawną wycenę B2B.");
      return;
    }

    setSaving(true);
    setMessage("Zapisywanie rezerwacji i ponowne przeliczanie ceny na serwerze...");

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
    const net = Number(success.price_net ?? success.quote?.net ?? 0);
    const vat = Number(success.vat_price ?? success.quote?.vat ?? 0);
    const gross = Number(success.price_gross ?? success.total_price ?? 0);

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
          Wszystkie ceny B2B są cenami netto. Do ceny doliczany jest VAT 8%.
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
        <span className="badge">B2B PRO</span>
        <h1>Nowy transport</h1>

        <div className="b2b-booking-terms-banner">
          <div>
            <small>WARUNKI {companyName ? companyName.toUpperCase() : "KONTRAHENTA"}</small>
            <strong>
              {commercialTerms
                ? `${Number(commercialTerms.free_km ?? 0).toFixed(1)} km bez dopłaty · ${Number(commercialTerms.extra_km_rate_net ?? 0).toFixed(2)} zł netto/km ponad limit`
                : "Warunki handlowe zostaną pobrane przy wycenie"}
            </strong>
            <span>
              {commercialTerms?.use_custom_pricing ? "Cennik indywidualny" : "Cennik standardowy MATT / indywidualny fallback"}
              {commercialTerms?.effective_from ? ` · ważny od ${commercialTerms.effective_from}` : ""}
            </span>
          </div>
          <a href="/firma/cennik">ZOBACZ CENNIK →</a>
        </div>

        <h3>Pasażer</h3>
        <div className="passenger-mode">
          <button
            type="button"
            className={passengerMode === "existing" ? "active" : ""}
            onClick={() => setPassengerMode("existing")}
            disabled={!employees.length}
          >
            Z listy pracowników
          </button>
          <button
            type="button"
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
                <option key={x.id} value={x.id}>{x.first_name} {x.last_name}</option>
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
          <button type="button" className={`choice ${serviceType === "to_airport" ? "active" : ""}`} onClick={() => setServiceType("to_airport")}><strong>🛫 Na lotnisko</strong></button>
          <button type="button" className={`choice ${serviceType === "from_airport" ? "active" : ""}`} onClick={() => setServiceType("from_airport")}><strong>🛬 Z lotniska</strong></button>
          <button type="button" className={`choice ${serviceType === "roundtrip" ? "active" : ""}`} onClick={() => setServiceType("roundtrip")}><strong>🔁 W obie strony</strong></button>
        </div>

        <h3>{serviceType === "from_airport" ? "Skąd odbieramy pasażera?" : "Dokąd jedziemy?"}</h3>
        <div className="grid">
          <label className={serviceType === "from_airport" ? "route-address second" : "route-address first"}>
            {serviceType === "from_airport" ? "Adres docelowy" : "Adres odbioru"}
            <input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="off" />
            {suggestions.length > 0 && (
              <div className="address-suggestions">
                {suggestions.slice(0, 5).map((s: any, i: number) => (
                  <button key={s.placeId ?? i} type="button" onClick={() => {
                    const value = s.text ?? "";
                    setAddress(value);
                    setSuggestions([]);
                    setTimeout(() => quoteFor(value), 0);
                  }}>{s.text}</button>
                ))}
              </div>
            )}
          </label>

          <label className={serviceType === "from_airport" ? "route-airport first" : "route-airport second"}>
            {serviceType === "from_airport" ? "Z jakiego lotniska?" : "Lotnisko"}
            <select value={airport} onChange={(e) => setAirport(e.target.value as keyof typeof PRICES)}>
              {Object.entries(PRICES).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className={`route-status ${quote ? "ok" : ""}`}>
          {quoteBusy
            ? "Obliczanie odległości od siedziby kontrahenta i wyceny..."
            : quote
            ? `✓ ${quote.distanceKm.toFixed(1)} km od siedziby kontrahenta · ${quote.billableKm.toFixed(1)} km płatne`
            : quoteError || "Wybierz dokładny adres, aby pobrać indywidualną wycenę."}
        </div>

        <h3>Termin</h3>
        <div className="grid">
          <label>Data<input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} /></label>
          <label>Godzina<input type="time" value={travelTime} onChange={(e) => setTravelTime(e.target.value)} /></label>
          <label>Numer lotu<input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} /></label>
          <label>Pasażerowie<select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}>{[1,2,3,4,5,6,7,8].map((x) => <option key={x}>{x}</option>)}</select></label>
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
          <button type="button" className={`choice ${vehicle === "car" ? "active" : ""}`} disabled={passengers > 3} onClick={() => setVehicle("car")}><strong>Samochód osobowy</strong><small>Do 3 pasażerów</small></button>
          <button type="button" className={`choice ${vehicle === "bus" ? "active" : ""}`} onClick={() => setVehicle("bus")}><strong>Bus do 8 osób</strong><small>Grupy / większy bagaż</small></button>
        </div>

        <h3>Płatność</h3>
        <div className="choice-grid">
          <button type="button" className={`choice ${paymentMethod === "company_transfer" ? "active" : ""}`} onClick={() => { setPaymentMethod("company_transfer"); setPaymentInitialized(true); }}><strong>🏢 Przelew firmowy</strong><small>Rozliczenie zgodnie z warunkami firmy</small></button>
          <button type="button" className={`choice ${paymentMethod === "employee_payment" ? "active" : ""}`} onClick={() => { setPaymentMethod("employee_payment"); setPaymentInitialized(true); }}><strong>👤 Płatność pracownika</strong><small>Pracownik płaci kwotę BRUTTO</small></button>
        </div>

        <label style={{ marginTop: 18 }}>Uwagi<textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      </div>

      <aside className="card summary">
        <span className="badge">TWOJE WARUNKI</span>
        <h3>Podsumowanie B2B</h3>
        <div className="row"><span>Pasażer</span><strong>{passengerMode === "existing" ? (employee ? `${employee.first_name} ${employee.last_name}` : "—") : `${newEmployee.firstName} ${newEmployee.lastName}`.trim() || "—"}</strong></div>

        {quote ? (
          <>
            <div className="row"><span>Warunki ważne od</span><strong>{quote.effectiveFrom || "—"}</strong></div>
            <div className="row"><span>Siedziba kontrahenta</span><strong style={{ textAlign: "right", maxWidth: "60%" }}>{quote.originAddress}</strong></div>
            <div className="row"><span>Odległość od siedziby</span><strong>{quote.distanceKm.toFixed(1)} km</strong></div>
            <div className="row"><span>Limit bez dopłaty</span><strong>{quote.freeKm.toFixed(1)} km</strong></div>
            <div className="row"><span>Km płatne</span><strong>{quote.billableKm.toFixed(1)} km</strong></div>
            <div className="row"><span>Stawka ponad limit</span><strong>{quote.extraKmRateNet.toFixed(2)} zł netto/km</strong></div>
            <div className="row"><span>Cena 1 strony</span><strong>{quote.baseOneWayNet.toFixed(2)} zł netto</strong></div>
            {quote.multiplier > 1 && <div className="row"><span>Mnożnik przejazdu</span><strong>× {quote.multiplier}</strong></div>}
            <div className="row"><span>Cena bazowa</span><strong>{quote.basePriceNet.toFixed(2)} zł netto</strong></div>
            <div className="row"><span>Dopłata km</span><strong>{quote.extraPriceNet.toFixed(2)} zł netto</strong></div>
            <div className="row total"><span>RAZEM NETTO</span><strong>{quote.net.toFixed(2)} zł</strong></div>
            <div className="row"><span>VAT {quote.vatRate.toFixed(0)}%</span><strong>{quote.vat.toFixed(2)} zł</strong></div>
            <div className="row total"><span>RAZEM BRUTTO</span><strong>{quote.gross.toFixed(2)} zł</strong></div>
            <p className="muted" style={{ marginTop: 12 }}>
              {quote.pricingSource === "custom" ? "Indywidualny cennik kontrahenta." : "Cena standardowa MATT dla tej pozycji."}<br />
              Wszystkie ceny B2B są cenami NETTO + 8% VAT.
            </p>
          </>
        ) : (
          <p className="muted">Wycena pojawi się po wskazaniu dokładnego adresu pasażera.</p>
        )}

        <button className="btn" style={{ width: "100%", marginTop: 16 }} disabled={saving || quoteBusy || !quote} onClick={submit}>
          {saving ? "ZAMAWIANIE..." : "ZAMÓW TRANSPORT"}
        </button>
        {message && <div className="admin-save-message">{message}</div>}
      </aside>
    </div>
  );
}
