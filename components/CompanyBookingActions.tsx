"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PRICES } from "@/lib/pricing";

export default function CompanyBookingActions({ booking }: { booking: any }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatDate, setRepeatDate] = useState("");
  const [repeatTime, setRepeatTime] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [quote, setQuote] = useState<any>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [form, setForm] = useState({
    serviceType: booking.service_type,
    address: booking.pickup_address,
    airport: booking.airport_key,
    travelDate: booking.travel_date,
    travelTime: String(booking.travel_time).slice(0, 5),
    flightNumber: booking.flight_number ?? "",
    passengers: Number(booking.passengers),
    vehicleType: booking.vehicle_type,
    notes: booking.notes ?? ""
  });

  async function addressChanged(value: string) {
    setForm({ ...form, address: value });
    setQuote(null);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const response = await fetch(`/api/places?q=${encodeURIComponent(value)}`);
    const data = await response.json();
    setSuggestions(data.suggestions ?? []);
  }

  async function refreshQuote(next = form) {
    if (!next.address) return;
    setQuoteBusy(true);
    setMessage("Obliczanie wyceny od siedziby kontrahenta...");

    const response = await fetch("/api/company/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: next.address,
        serviceType: next.serviceType,
        airport: next.airport,
        travelDate: next.travelDate,
        vehicleType: next.vehicleType
      })
    });
    const data = await response.json();
    setQuoteBusy(false);

    if (!response.ok) {
      setQuote(null);
      setMessage(data.error ?? "Nie udało się obliczyć wyceny.");
      return;
    }

    setQuote(data);
    setMessage("");
  }

  async function chooseAddress(value: string) {
    const next = { ...form, address: value };
    setForm(next);
    setSuggestions([]);
    await refreshQuote(next);
  }

  async function save() {
    setSaving(true);
    setMessage("Zapisywanie zmian i ponowne liczenie ceny...");

    const response = await fetch(`/api/company/bookings/${booking.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        ...form
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się zapisać zmian.");
      setSaving(false);
      return;
    }

    setMessage("✓ Rezerwacja została zaktualizowana i przeliczona.");
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function repeat() {
    if (!repeatDate || !repeatTime) {
      setMessage("Podaj datę i godzinę nowego przejazdu.");
      return;
    }

    setSaving(true);
    setMessage("Tworzenie nowej rezerwacji według warunków obowiązujących w nowym terminie...");

    const response = await fetch(`/api/company/bookings/${booking.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "repeat",
        travelDate: repeatDate,
        travelTime: repeatTime
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się powtórzyć rezerwacji.");
      setSaving(false);
      return;
    }

    window.location.href = `/firma/rezerwacje/${data.id}`;
  }

  const editable = ["pending", "confirmed", "assigned"].includes(booking.status);

  return (
    <div className="card company-actions">
      <h2>Akcje</h2>

      <button
        className="btn"
        style={{ width: "100%" }}
        disabled={!editable}
        onClick={() => setEditing(!editing)}
      >
        {editing ? "ZAMKNIJ EDYCJĘ" : "EDYTUJ REZERWACJĘ"}
      </button>

      {!editable && (
        <p className="muted">
          Rezerwacja w realizacji lub zakończona nie może być edytowana przez portal firmy.
        </p>
      )}

      <button
        className="btn secondary"
        style={{ width: "100%", marginTop: 10 }}
        onClick={() => setRepeatOpen(!repeatOpen)}
      >
        POWTÓRZ REZERWACJĘ
      </button>

      {repeatOpen && (
        <div className="repeat-box">
          <p className="muted">
            Cena nowego kursu zostanie policzona według wersji warunków obowiązującej w wybranym dniu.
          </p>
          <label>Nowa data<input type="date" value={repeatDate} onChange={(e) => setRepeatDate(e.target.value)} /></label>
          <label>Nowa godzina<input type="time" value={repeatTime} onChange={(e) => setRepeatTime(e.target.value)} /></label>
          <button className="btn" onClick={repeat} disabled={saving}>UTWÓRZ NOWY KURS</button>
        </div>
      )}

      {editing && (
        <div className="company-edit-form">
          <div className="b2b-vat-note">
            Edycja może zmienić cenę. Wszystkie ceny B2B: <strong>NETTO + 8% VAT</strong>.
          </div>
          <label>
            Adres
            <input value={form.address} onChange={(e) => addressChanged(e.target.value)} />
            {suggestions.length > 0 && (
              <div className="address-suggestions">
                {suggestions.slice(0, 5).map((s: any, i: number) => (
                  <button key={s.placeId ?? i} type="button" onClick={() => chooseAddress(s.text ?? "")}>{s.text}</button>
                ))}
              </div>
            )}
          </label>
          <label>
            Lotnisko
            <select
              value={form.airport}
              onChange={(e) => {
                const next = { ...form, airport: e.target.value };
                setForm(next);
                refreshQuote(next);
              }}
            >
              {Object.entries(PRICES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </select>
          </label>
          <div className="grid">
            <label>
              Data
              <input
                type="date"
                value={form.travelDate}
                onChange={(e) => {
                  const next = { ...form, travelDate: e.target.value };
                  setForm(next);
                  refreshQuote(next);
                }}
              />
            </label>
            <label>Godzina<input type="time" value={form.travelTime} onChange={(e) => setForm({ ...form, travelTime: e.target.value })} /></label>
            <label>Lot<input value={form.flightNumber} onChange={(e) => setForm({ ...form, flightNumber: e.target.value })} /></label>
            <label>
              Pasażerowie
              <select value={form.passengers} onChange={(e) => {
                const count = Number(e.target.value);
                const next = { ...form, passengers: count, vehicleType: count > 3 ? "bus" : form.vehicleType };
                setForm(next);
                refreshQuote(next);
              }}>
                {[1,2,3,4,5,6,7,8].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
            <label>
              Pojazd
              <select value={form.vehicleType} onChange={(e) => {
                const next = { ...form, vehicleType: e.target.value };
                setForm(next);
                refreshQuote(next);
              }}>
                <option value="car" disabled={form.passengers > 3}>Samochód osobowy</option>
                <option value="bus">Bus do 8 osób</option>
              </select>
            </label>
          </div>
          <label>Uwagi<textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>

          <button className="btn secondary" style={{ width: "100%", marginTop: 10 }} disabled={quoteBusy} onClick={() => refreshQuote()}>
            {quoteBusy ? "OBLICZANIE..." : "PRZELICZ CENĘ"}
          </button>

          {quote && (
            <div className="b2b-edit-quote">
              <div><span>Netto</span><strong>{Number(quote.net).toFixed(2)} zł</strong></div>
              <div><span>VAT 8%</span><strong>{Number(quote.vat).toFixed(2)} zł</strong></div>
              <div><span>Brutto</span><strong>{Number(quote.gross).toFixed(2)} zł</strong></div>
              <small>{Number(quote.distanceFromHeadquartersKm).toFixed(1)} km od siedziby · {Number(quote.billableKm).toFixed(1)} km ponad limit</small>
            </div>
          )}

          <button className="btn" style={{ width: "100%", marginTop: 12 }} disabled={saving} onClick={save}>
            {saving ? "ZAPISYWANIE..." : "ZAPISZ ZMIANY"}
          </button>
        </div>
      )}

      {message && <div className="admin-save-message">{message}</div>}
    </div>
  );
}
