"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [distanceKm, setDistanceKm] = useState(0);
  const [travelDate, setTravelDate] = useState("");
  const [travelTime, setTravelTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [returnFlightNumber, setReturnFlightNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [routeMessage, setRouteMessage] = useState(
    "Wybierz pracownika lub wpisz adres."
  );
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const employee = employees.find((x) => x.id === employeeId);

  useEffect(() => {
    if (passengerMode === "existing" && employee?.default_address) {
      setAddress(employee.default_address);
      routeFor(employee.default_address);
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
      const response = await fetch(
        `/api/places?q=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      setSuggestions(data.suggestions ?? []);
    }, 350);

    return () => clearTimeout(timer);
  }, [address]);

  async function routeFor(value: string) {
    if (!value) return;
    setRouteMessage("Obliczanie trasy...");

    const response = await fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: value })
    });

    const data = await response.json();

    if (!response.ok) {
      setDistanceKm(0);
      setRouteMessage(data.error ?? "Nie udało się obliczyć trasy.");
      return;
    }

    setDistanceKm(Number(data.distanceKm));
    setRouteMessage(
      `✓ ${data.distanceKm} km od bazy · ${data.billableKm} km płatne`
    );
  }

  const quote = useMemo(() => {
    const multiplier = serviceType === "roundtrip" ? 2 : 1;
    const base = PRICES[airport][vehicle] * multiplier;
    const extra = Math.max(0, distanceKm - 40) * 2.4 * multiplier;
    return { base, extra, total: base + extra };
  }, [serviceType, airport, vehicle, distanceKm]);

  async function submit() {
    if (saving) return;

    if (passengerMode === "existing" && !employeeId) {
      setMessage("Wybierz pracownika.");
      return;
    }

    if (
      passengerMode === "new" &&
      (!newEmployee.firstName || !newEmployee.lastName || !newEmployee.phone)
    ) {
      setMessage("Podaj imię, nazwisko i telefon nowego pracownika.");
      return;
    }

    if (!address || !distanceKm || !travelDate || !travelTime) {
      setMessage("Uzupełnij trasę oraz termin.");
      return;
    }

    setSaving(true);
    setMessage("Zapisywanie rezerwacji...");

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
        distanceKm,
        travelDate,
        travelTime,
        returnDate,
        returnTime,
        flightNumber,
        returnFlightNumber,
        notes
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
    return (
      <div className="booking-success-card">
        <div className="success-check">✓</div>
        <span className="badge">MATT BOOKING PRO ENTERPRISE</span>
        <h1>Transport zamówiony</h1>
        <p className="success-lead">
          Rezerwacja firmowa została przyjęta.
        </p>

        <div className="success-number">
          <span>Numer rezerwacji</span>
          <strong>{success.booking_number}</strong>
        </div>

        <div className="success-details">
          <div>
            <span>Pasażer</span>
            <strong>{success.customer_name}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>Oczekuje na potwierdzenie</strong>
          </div>
          <div>
            <span>Kwota</span>
            <strong>{Number(success.total_price).toFixed(2)} zł</strong>
          </div>
        </div>

        <div className="success-actions">
          <a className="btn" href="/firma/nowa-rezerwacja">
            NOWA REZERWACJA
          </a>
          <a className="btn secondary" href="/firma/rezerwacje">
            MOJE REZERWACJE
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <div className="card">
        <span className="badge">REZERWACJA B2B</span>
        <h1>Nowy transport</h1>

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
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">— Wybierz pracownika —</option>
              {employees
                .filter((x) => x.active !== false)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.first_name} {x.last_name}
                  </option>
                ))}
            </select>
          </label>
        ) : (
          <div className="grid new-employee-inline">
            <label>
              Imię
              <input
                value={newEmployee.firstName}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, firstName: e.target.value })
                }
              />
            </label>
            <label>
              Nazwisko
              <input
                value={newEmployee.lastName}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, lastName: e.target.value })
                }
              />
            </label>
            <label>
              Telefon
              <input
                value={newEmployee.phone}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, phone: e.target.value })
                }
              />
            </label>
            <label>
              E-mail
              <input
                type="email"
                value={newEmployee.email}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, email: e.target.value })
                }
              />
            </label>
            <label>
              Domyślny adres
              <input
                value={newEmployee.defaultAddress}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    defaultAddress: e.target.value
                  })
                }
              />
            </label>
            <label>
              Dział
              <input
                value={newEmployee.department}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, department: e.target.value })
                }
              />
            </label>
          </div>
        )}

        <h3>Rodzaj przejazdu</h3>
        <div className="choice-grid">
          <button
            className={`choice ${serviceType === "to_airport" ? "active" : ""}`}
            onClick={() => setServiceType("to_airport")}
          >
            <strong>🛫 Na lotnisko</strong>
          </button>
          <button
            className={`choice ${serviceType === "from_airport" ? "active" : ""}`}
            onClick={() => setServiceType("from_airport")}
          >
            <strong>🛬 Z lotniska</strong>
          </button>
          <button
            className={`choice ${serviceType === "roundtrip" ? "active" : ""}`}
            onClick={() => setServiceType("roundtrip")}
          >
            <strong>🔁 W obie strony</strong>
          </button>
        </div>

        <h3>Trasa</h3>
        <div className="grid">
          <label>
            Adres
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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
                      routeFor(value);
                    }}
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            )}
          </label>

          <label>
            Lotnisko
            <select
              value={airport}
              onChange={(e) =>
                setAirport(e.target.value as keyof typeof PRICES)
              }
            >
              {Object.entries(PRICES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={`route-status ${distanceKm ? "ok" : ""}`}>
          {routeMessage}
        </div>

        <h3>Termin</h3>
        <div className="grid">
          <label>
            Data
            <input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
          </label>
          <label>
            Godzina
            <input type="time" value={travelTime} onChange={(e) => setTravelTime(e.target.value)} />
          </label>
          <label>
            Numer lotu
            <input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} />
          </label>
          <label>
            Pasażerowie
            <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}>
              {[1,2,3,4,5,6,7,8].map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>

          {serviceType === "roundtrip" && (
            <>
              <label>
                Data powrotu
                <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </label>
              <label>
                Godzina powrotu
                <input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} />
              </label>
              <label>
                Lot powrotny
                <input value={returnFlightNumber} onChange={(e) => setReturnFlightNumber(e.target.value)} />
              </label>
            </>
          )}
        </div>

        <h3>Pojazd</h3>
        <div className="choice-grid vehicle-grid">
          <button
            className={`choice ${vehicle === "car" ? "active" : ""}`}
            disabled={passengers > 3}
            onClick={() => setVehicle("car")}
          >
            <strong>Samochód osobowy</strong>
            <small>Do 3 pasażerów</small>
          </button>
          <button
            className={`choice ${vehicle === "bus" ? "active" : ""}`}
            onClick={() => setVehicle("bus")}
          >
            <strong>Bus do 8 osób</strong>
            <small>Grupy / większy bagaż</small>
          </button>
        </div>

        <label style={{ marginTop: 18 }}>
          Uwagi
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>

      <aside className="card summary">
        <h3>Podsumowanie B2B</h3>
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
        <div className="row">
          <span>Cena bazowa</span>
          <strong>{quote.base.toFixed(2)} zł</strong>
        </div>
        <div className="row">
          <span>Dopłata</span>
          <strong>{quote.extra.toFixed(2)} zł</strong>
        </div>
        <div className="row total">
          <span>Razem</span>
          <strong>{quote.total.toFixed(2)} zł</strong>
        </div>

        <button
          className="btn"
          style={{ width: "100%", marginTop: 16 }}
          disabled={saving}
          onClick={submit}
        >
          {saving ? "ZAMAWIANIE..." : "ZAMÓW TRANSPORT"}
        </button>

        {message && <div className="admin-save-message">{message}</div>}
      </aside>
    </div>
  );
}
