"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PRICES } from "@/lib/pricing";

type Suggestion = {
  placeId?: string;
  text?: string;
};

type BookingSuccess = {
  bookingNumber: string;
  total: number;
  route: string;
  vehicle: string;
  email: string;
};

export default function BookingForm() {
  const customerSectionRef = useRef<HTMLDivElement | null>(null);
  const [serviceType, setServiceType] =
    useState<"to_airport" | "from_airport" | "roundtrip">("to_airport");
  const [address, setAddress] = useState("");
  const [airport, setAirport] = useState<keyof typeof PRICES>("balice");
  const [vehicle, setVehicle] = useState<"car" | "bus">("car");
  const [passengers, setPassengers] = useState(1);
  const [distanceKm, setDistanceKm] = useState(0);
  const [routeMessage, setRouteMessage] = useState(
    "Wpisz adres — trasa policzy się automatycznie."
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [travelDate, setTravelDate] = useState("");
  const [travelTime, setTravelTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [flight, setFlight] = useState("");
  const [returnFlight, setReturnFlight] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [invoice, setInvoice] = useState(false);
  const [nip, setNip] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<BookingSuccess | null>(null);

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
        const response = await fetch(
          `/api/places?q=${encodeURIComponent(address)}`
        );
        const data = await response.json();
        setSuggestions(data.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [address]);

  async function routeFor(value: string) {
    setRouteMessage("Obliczanie trasy...");
    setDistanceKm(0);

    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: value })
      });

      const data = await response.json();

      if (!response.ok) {
        setRouteMessage(data.error ?? "Nie udało się obliczyć trasy.");
        return;
      }

      setDistanceKm(data.distanceKm);
      setRouteMessage("Trasa została obliczona.");
    } catch {
      setRouteMessage("Nie udało się połączyć z usługą tras.");
    }
  }

  const quote = useMemo(() => {
    const multiplier = serviceType === "roundtrip" ? 2 : 1;
    const base = PRICES[airport][vehicle] * multiplier;
    const extra = Math.max(0, distanceKm - 40) * 2.4 * multiplier;
    const subtotal = base + extra;
    const vat = invoice ? subtotal * 0.08 : 0;

    return {
      base,
      extra,
      vat,
      total: subtotal + vat
    };
  }, [serviceType, airport, vehicle, distanceKm, invoice]);

  const routeText =
    serviceType === "from_airport"
      ? `${PRICES[airport].label} → ${address || "—"}`
      : serviceType === "roundtrip"
      ? `${address || "—"} ↔ ${PRICES[airport].label}`
      : `${address || "—"} → ${PRICES[airport].label}`;

  function mobileAdvanceAfterVehicle(nextVehicle: "car" | "bus") {
    setVehicle(nextVehicle);
    if (typeof window !== "undefined" && window.innerWidth <= 900) {
      window.setTimeout(() => {
        customerSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 180);
    }
  }

  function normalizeNip(value: string) {
    return value.replace(/\D/g, "").slice(0, 10);
  }

  function resetForm() {
    setServiceType("to_airport");
    setAddress("");
    setAirport("balice");
    setVehicle("car");
    setPassengers(1);
    setDistanceKm(0);
    setRouteMessage("Wpisz adres — trasa policzy się automatycznie.");
    setSuggestions([]);
    setTravelDate("");
    setTravelTime("");
    setReturnDate("");
    setReturnTime("");
    setFlight("");
    setReturnFlight("");
    setName("");
    setPhone("");
    setEmail("");
    setInvoice(false);
    setNip("");
    setNotes("");
    setResult("");
    setSuccess(null);
    setIsSubmitting(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (isSubmitting) return;

    setResult("");

    if (!address.trim()) {
      setResult("Wpisz i wybierz poprawny adres.");
      return;
    }

    if (!distanceKm) {
      setResult("Poczekaj na automatyczne obliczenie trasy.");
      return;
    }

    if (!travelDate || !travelTime) {
      setResult("Uzupełnij datę i godzinę przejazdu.");
      return;
    }

    if (!name.trim() || !phone.trim() || !email.trim()) {
      setResult("Uzupełnij imię i nazwisko, telefon oraz e-mail.");
      return;
    }

    if (invoice && normalizeNip(nip).length !== 10) {
      setResult("Podaj poprawny NIP składający się z 10 cyfr.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          flightNumber: flight,
          returnFlightNumber: returnFlight,
          customerName: name,
          phone,
          email,
          invoiceRequired: invoice,
          companyNip: invoice ? normalizeNip(nip) : null,
          notes: notes || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setResult(data.error ?? "Nie udało się zapisać rezerwacji.");
        setIsSubmitting(false);
        return;
      }

      setSuccess({
        bookingNumber: data.booking_number,
        total: Number(data.total_price),
        route: routeText,
        vehicle:
          vehicle === "car" ? "Samochód osobowy" : "Bus do 8 pasażerów",
        email
      });

      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setResult("Nie udało się połączyć z systemem rezerwacji.");
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="booking-success-shell">
        <section className="booking-success-card">
          <div className="success-check" aria-hidden="true">
            ✓
          </div>

          <span className="badge">MATT TRANSPORT</span>

          <h1>Rezerwacja przyjęta!</h1>
          <p className="success-lead">
            Dziękujemy za wybór MATT TRANSPORT.
          </p>

          <div className="success-number">
            <span>Numer rezerwacji</span>
            <strong>{success.bookingNumber}</strong>
          </div>

          <div className="success-details">
            <div>
              <span>Trasa</span>
              <strong>{success.route}</strong>
            </div>
            <div>
              <span>Pojazd</span>
              <strong>{success.vehicle}</strong>
            </div>
            <div>
              <span>Kwota</span>
              <strong>{success.total.toFixed(2)} zł</strong>
            </div>
          </div>

          <div className="success-next">
            <h2>Co dalej?</h2>
            <p>
              <strong>Potwierdzimy rezerwację do 60 minut.</strong>
            </p>
            <p>
              Po uruchomieniu powiadomień potwierdzenie zostanie również
              przesłane na adres <strong>{success.email}</strong>.
            </p>
            <p>
              Pilna rezerwacja lub pytania?{" "}
              <a href="tel:+48691242691">+48 691 242 691</a>
            </p>
          </div>

          <div className="booking-progress">
            <div className="progress-step done">
              <span>✓</span>
              <strong>Rezerwacja przyjęta</strong>
            </div>
            <div className="progress-step">
              <span>2</span>
              <strong>Potwierdzenie dyspozytora</strong>
            </div>
            <div className="progress-step">
              <span>3</span>
              <strong>Kierowca przypisany</strong>
            </div>
            <div className="progress-step">
              <span>4</span>
              <strong>Realizacja kursu</strong>
            </div>
          </div>

          <div className="success-actions">
            <button className="btn" onClick={resetForm}>
              NOWA REZERWACJA
            </button>
            <a className="btn secondary" href="https://matt-transport.pl">
              POWRÓT DO MATT-TRANSPORT.PL
            </a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="layout booking-form-wrap">
      <div className="card">
        <span className="badge">MATT TRANSPORT</span>
        <h1>Zarezerwuj transfer lotniskowy</h1>

        <div className="choice-grid">
          {[
            ["to_airport", "🛫 Transfer na lotnisko"],
            ["from_airport", "🛬 Odbiór z lotniska"],
            ["roundtrip", "🔁 W obie strony"]
          ].map(([key, title]) => (
            <button
              key={key}
              type="button"
              className={`choice ${serviceType === key ? "active" : ""}`}
              onClick={() => setServiceType(key as typeof serviceType)}
            >
              <strong>{title}</strong>
              <small>Wybierz rodzaj przejazdu</small>
            </button>
          ))}
        </div>

        <h3>Trasa</h3>
        <div className="grid">
          <label>
            {serviceType === "from_airport"
              ? "Adres docelowy"
              : "Adres odbioru"}
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="np. ul. Pszczyńska 10, Żory"
              autoComplete="off"
            />

            {suggestions.length > 0 && (
              <div className="address-suggestions">
                {suggestions.slice(0, 5).map((suggestion, index) => (
                  <button
                    key={suggestion.placeId ?? index}
                    type="button"
                    onClick={() => {
                      const value = suggestion.text ?? "";
                      setAddress(value);
                      setSuggestions([]);
                      routeFor(value);
                    }}
                  >
                    {suggestion.text}
                  </button>
                ))}
              </div>
            )}
          </label>

          <label>
            {serviceType === "from_airport"
              ? "Z którego lotniska?"
              : "Wybierz lotnisko"}
            <select
              value={airport}
              onChange={(e) =>
                setAirport(e.target.value as keyof typeof PRICES)
              }
            >
              {Object.entries(PRICES).map(([key, item]) => (
                <option value={key} key={key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h3>Termin</h3>
        <div className="grid">
          <label>
            {serviceType === "from_airport"
              ? "Data przylotu"
              : "Data wyjazdu"}
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
            />
          </label>

          <label>
            {serviceType === "from_airport"
              ? "Godzina przylotu"
              : "Godzina odbioru"}
            <input
              type="time"
              value={travelTime}
              onChange={(e) => setTravelTime(e.target.value)}
            />
          </label>

          <label>
            Numer lotu
            <input
              value={flight}
              onChange={(e) => setFlight(e.target.value)}
              placeholder="np. FR8214"
            />
          </label>

          <label>
            Pasażerowie
            <select
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>

          {serviceType === "roundtrip" && (
            <>
              <label>
                Data powrotu
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </label>
              <label>
                Godzina przylotu
                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                />
              </label>
              <label>
                Lot powrotny
                <input
                  value={returnFlight}
                  onChange={(e) => setReturnFlight(e.target.value)}
                />
              </label>
            </>
          )}
        </div>

        <h3>Pojazd</h3>
        <div className="choice-grid vehicle-grid">
          <button
            type="button"
            className={`choice ${vehicle === "car" ? "active" : ""}`}
            disabled={passengers > 3}
            onClick={() => mobileAdvanceAfterVehicle("car")}
          >
            <strong>Samochód osobowy</strong>
            <small>Do 3 pasażerów z bagażami</small>
          </button>

          <button
            type="button"
            className={`choice ${vehicle === "bus" ? "active" : ""}`}
            onClick={() => mobileAdvanceAfterVehicle("bus")}
          >
            <strong>Bus do 8 osób</strong>
            <small>Dla grup i większego bagażu</small>
          </button>
        </div>

        <div ref={customerSectionRef} className="booking-customer-section"><h3>Dane klienta</h3>
        <div className="grid">
          <label>
            Imię i nazwisko
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label>
            Telefon
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>

          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label>
            Faktura VAT
            <select
              value={invoice ? "1" : "0"}
              onChange={(e) => {
                const next = e.target.value === "1";
                setInvoice(next);
                if (!next) setNip("");
              }}
            >
              <option value="0">Nie</option>
              <option value="1">Tak, +8%</option>
            </select>
          </label>
          {invoice && (
            <label>
              NIP
              <input
                inputMode="numeric"
                maxLength={10}
                value={nip}
                onChange={(e) => setNip(normalizeNip(e.target.value))}
                placeholder="10 cyfr"
              />
            </label>
          )}
        </div>
        <label style={{ marginTop: 16 }}>
          Uwagi do rezerwacji
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Np. fotelik dziecięcy, duży bagaż, dodatkowe informacje..."
          />
        </label>
        </div>
      </div>

      <aside className="card summary">
        <h3>Podsumowanie live</h3>

        <div className="row">
          <span>Trasa</span>
          <strong>{routeText}</strong>
        </div>

        <div className="row">
          <span>Odległość</span>
          <strong>{distanceKm ? `${distanceKm} km` : "—"}</strong>
        </div>

        <div className="row">
          <span>Cena bazowa</span>
          <strong>{quote.base.toFixed(2)} zł</strong>
        </div>

        <div className="row">
          <span>Dopłata</span>
          <strong>{quote.extra.toFixed(2)} zł</strong>
        </div>

        <div className="row">
          <span>VAT</span>
          <strong>{quote.vat.toFixed(2)} zł</strong>
        </div>

        <div className="row total">
          <span>Razem</span>
          <strong>{quote.total.toFixed(2)} zł</strong>
        </div>

        <button
          className="btn booking-submit"
          style={{ width: "100%", marginTop: 16 }}
          onClick={submit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "⏳ ZAPISYWANIE REZERWACJI..." : "ZAREZERWUJ"}
        </button>

        {result && <div className="booking-error">{result}</div>}

        <p className="muted">
          Rezerwacje online minimum 48 godzin przed wyjazdem.
        </p>
        <p className="muted">
          Pilne rezerwacje:{" "}
          <a href="tel:+48691242691">+48 691 242 691</a>
        </p>
      </aside>
    </div>
  );
}
