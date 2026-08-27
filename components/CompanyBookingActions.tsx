"use client";

import { useEffect, useState } from "react";
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
  const [editQuote, setEditQuote] = useState<any>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
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

  useEffect(() => {
    if (!editing || form.address.trim().length < 5) return;
    const timer = setTimeout(() => loadQuote(form), 600);
    return () => clearTimeout(timer);
  }, [editing, form.address, form.airport, form.vehicleType, form.serviceType]);

  async function loadQuote(next: typeof form) {
    setQuoteBusy(true);
    try {
      const r = await fetch("/api/company/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: next.address,
          airport: next.airport,
          vehicleType: next.vehicleType,
          serviceType: next.serviceType,
          termsId: booking.company_pricing_terms_id || null
        })
      });
      const d = await r.json();
      setEditQuote(r.ok ? d : null);
      if (!r.ok) setMessage(d.error || "Nie udało się przeliczyć ceny.");
    } catch {
      setEditQuote(null);
    }
    setQuoteBusy(false);
  }

  async function addressChanged(value: string) {
    setForm({ ...form, address: value });
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const response = await fetch(`/api/places?q=${encodeURIComponent(value)}`);
    const data = await response.json();
    setSuggestions(data.suggestions ?? []);
  }

  function chooseAddress(value: string) {
    const next = { ...form, address: value };
    setForm(next);
    setSuggestions([]);
    loadQuote(next);
  }

  async function save() {
    setSaving(true);
    setMessage("Zapisywanie zmian...");

    const response = await fetch(`/api/company/bookings/${booking.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", ...form })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się zapisać zmian.");
      setSaving(false);
      return;
    }

    setMessage("✓ Rezerwacja została zaktualizowana i przeliczona na serwerze.");
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function cancelBooking() {
    if (saving) return;
    setSaving(true);
    setMessage("Anulowanie rezerwacji...");

    const response = await fetch(`/api/company/bookings/${booking.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się anulować rezerwacji.");
      setSaving(false);
      return;
    }

    setMessage(
      data.payment_requires_review
        ? "✓ Rezerwacja anulowana. Płatność była zaksięgowana i wymaga weryfikacji ewentualnego zwrotu przez MATT TRANSPORT."
        : "✓ Rezerwacja została anulowana."
    );
    setSaving(false);
    setCancelConfirm(false);
    router.refresh();
  }

  async function repeat() {
    if (!repeatDate || !repeatTime) {
      setMessage("Podaj datę i godzinę nowego przejazdu.");
      return;
    }
    setSaving(true);
    setMessage("Tworzenie nowej rezerwacji wg aktualnych warunków B2B...");

    const response = await fetch(`/api/company/bookings/${booking.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "repeat", travelDate: repeatDate, travelTime: repeatTime })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się powtórzyć rezerwacji.");
      setSaving(false);
      return;
    }
    window.location.href = `/firma/rezerwacje/${data.id}`;
  }

  const cancellable = ["pending", "confirmed", "assigned"].includes(booking.status);
  const editable = cancellable && !["paid", "review"].includes(booking.payment_status);

  return (
    <div className="card company-actions">
      <h2>Akcje</h2>
      <button className="btn" style={{ width: "100%" }} disabled={!editable} onClick={() => setEditing(!editing)}>
        {editing ? "ZAMKNIJ EDYCJĘ" : "EDYTUJ REZERWACJĘ"}
      </button>

      {!editable && <p className="muted">{["paid", "review"].includes(booking.payment_status) && cancellable ? "Rezerwacji z zaksięgowaną lub weryfikowaną płatnością nie można samodzielnie edytować. Możesz ją anulować albo skontaktować się z MATT TRANSPORT." : "Rezerwacja w realizacji lub zakończona nie może być edytowana przez portal firmy."}</p>}

      {cancellable && !cancelConfirm && (
        <button className="btn secondary company-cancel-btn" style={{ width: "100%", marginTop: 10 }} disabled={saving} onClick={() => setCancelConfirm(true)}>
          ANULUJ REZERWACJĘ
        </button>
      )}

      {cancellable && cancelConfirm && (
        <div className="company-cancel-confirm">
          <strong>Czy na pewno anulować tę rezerwację?</strong>
          <p className="muted">Kurs zostanie anulowany i usunięty z Google Calendar. {booking.payment_status === "paid" || booking.payment_status === "review" ? "Płatność nie zostanie automatycznie zwrócona — MATT zweryfikuje zwrot ręcznie." : "Niewykorzystana sesja płatności Stripe zostanie wygaszona."}</p>
          <div>
            <button className="btn secondary" disabled={saving} onClick={() => setCancelConfirm(false)}>NIE, ZOSTAW</button>
            <button className="btn company-cancel-confirm-btn" disabled={saving} onClick={cancelBooking}>{saving ? "ANULOWANIE..." : "TAK, ANULUJ"}</button>
          </div>
        </div>
      )}

      <button className="btn secondary" style={{ width: "100%", marginTop: 10 }} onClick={() => setRepeatOpen(!repeatOpen)}>
        POWTÓRZ REZERWACJĘ
      </button>

      {repeatOpen && (
        <div className="repeat-box">
          <p className="muted">Nowy kurs zostanie wyceniony według warunków handlowych obowiązujących w dniu utworzenia.</p>
          <label>Nowa data<input type="date" value={repeatDate} onChange={(e) => setRepeatDate(e.target.value)} /></label>
          <label>{booking.service_type === "from_airport" ? "Nowa godzina przylotu" : "Nowa godzina wyjazdu na lotnisko"}<input type="time" value={repeatTime} onChange={(e) => setRepeatTime(e.target.value)} /></label>
          <button className="btn" onClick={repeat} disabled={saving}>UTWÓRZ NOWY KURS</button>
        </div>
      )}

      {editing && (
        <div className="company-edit-form">
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
            <select value={form.airport} onChange={(e) => setForm({ ...form, airport: e.target.value })}>
              {Object.entries(PRICES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <div className="grid">
            <label>Data<input type="date" value={form.travelDate} onChange={(e) => setForm({ ...form, travelDate: e.target.value })} /></label>
            <label>{booking.service_type === "from_airport" ? "Godzina przylotu" : "Godzina wyjazdu na lotnisko"}<input type="time" value={form.travelTime} onChange={(e) => setForm({ ...form, travelTime: e.target.value })} /></label>
            <label>Lot<input value={form.flightNumber} onChange={(e) => setForm({ ...form, flightNumber: e.target.value })} /></label>
            <label>
              Pasażerowie
              <select value={form.passengers} onChange={(e) => {
                const count = Number(e.target.value);
                setForm({ ...form, passengers: count, vehicleType: count > 3 ? "bus" : form.vehicleType });
              }}>
                {[1,2,3,4,5,6,7,8].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
            <label>
              Pojazd
              <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                <option value="car" disabled={form.passengers > 3}>Samochód osobowy</option>
                <option value="bus">Bus do 8 osób</option>
              </select>
            </label>
          </div>

          {quoteBusy && <p className="muted">Przeliczanie ceny...</p>}
          {editQuote && (
            <div style={{ marginTop: 12, padding: 12, border: "1px solid #4f4733", borderRadius: 10 }}>
              <strong>Nowa wycena: {editQuote.net.toFixed(2)} zł netto + VAT {editQuote.vatRate.toFixed(0)}% = {editQuote.gross.toFixed(2)} zł brutto</strong>
              <div className="muted">{editQuote.distanceKm.toFixed(1)} km od siedziby · {editQuote.billableKm.toFixed(1)} km płatne</div>
            </div>
          )}

          <label>Uwagi<textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <button className="btn" style={{ width: "100%", marginTop: 12 }} disabled={saving || quoteBusy} onClick={save}>
            {saving ? "ZAPISYWANIE..." : "ZAPISZ ZMIANY"}
          </button>
        </div>
      )}

      {message && <div className="admin-save-message">{message}</div>}
    </div>
  );
}
