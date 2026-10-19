"use client";
import { customerFetch } from "@/lib/customerFetch";
import { useCustomerLocale } from "@/lib/useCustomerLocale";
import { companyText } from "@/lib/companyCopy";
import { withCustomerLocale } from "@/lib/bookingLocale";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAirportPricing } from "@/lib/useAirportPricing";

export default function CompanyBookingActions({ customerLocale, booking }: { customerLocale?: unknown; booking: any }) {
 const fetchCustomer=(input:RequestInfo|URL,init?:RequestInit)=>customerFetch(locale,input,init);
  const locale=useCustomerLocale(customerLocale);
  const t=(key:string)=>companyText(key,locale);
  const href=(path:string)=>withCustomerLocale(path,locale);
  const router = useRouter();
  const { airports } = useAirportPricing();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatDate, setRepeatDate] = useState("");
  const [repeatTime, setRepeatTime] = useState("");
  const [repeatReturnDate, setRepeatReturnDate] = useState("");
  const [repeatReturnTime, setRepeatReturnTime] = useState("");
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
      const r = await fetchCustomer("/api/company/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale,
          address: next.address,
          airport: next.airport,
          vehicleType: next.vehicleType,
          serviceType: next.serviceType,
          termsId: booking.company_pricing_terms_id || null
        })
      });
      const d = await r.json();
      setEditQuote(r.ok ? d : null);
      if (!r.ok) setMessage(d.error || t("Nie udało się przeliczyć ceny."));
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
    const response = await fetchCustomer(`/api/places?q=${encodeURIComponent(value)}`);
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
    setMessage(t("Zapisywanie zmian..."));

    const response = await fetchCustomer(`/api/company/bookings/${booking.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, action: "update", ...form })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? t("Nie udało się zapisać zmian."));
      setSaving(false);
      return;
    }

    setMessage(t("✓ Rezerwacja została zaktualizowana i przeliczona na serwerze."));
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function cancelBooking() {
    if (saving) return;
    setSaving(true);
    setMessage(t("Anulowanie rezerwacji..."));

    const response = await fetchCustomer(`/api/company/bookings/${booking.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, action: "cancel" })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? t("Nie udało się anulować rezerwacji."));
      setSaving(false);
      return;
    }

    setMessage(
      data.payment_requires_review
        ? t("✓ Rezerwacja anulowana. Płatność była zaksięgowana i wymaga weryfikacji ewentualnego zwrotu przez MATT TRANSPORT.")
        : t("✓ Rezerwacja została anulowana.")
    );
    setSaving(false);
    setCancelConfirm(false);
    router.refresh();
  }

  async function repeat() {
    if (!repeatDate || !repeatTime) {
      setMessage(t("Podaj datę i godzinę nowego przejazdu."));
      return;
    }
    if (booking.service_type === "roundtrip" && (!repeatReturnDate || !repeatReturnTime || `${repeatReturnDate}T${repeatReturnTime}` <= `${repeatDate}T${repeatTime}`)) {
      setMessage(t("Powrót musi nastąpić po wyjeździe."));
      return;
    }
    setSaving(true);
    setMessage(t("Tworzenie nowej rezerwacji wg aktualnych warunków B2B..."));

    const response = await fetchCustomer(`/api/company/bookings/${booking.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, action: "repeat", travelDate: repeatDate, travelTime: repeatTime, returnDate: repeatReturnDate, returnTime: repeatReturnTime })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? t("Nie udało się powtórzyć rezerwacji."));
      setSaving(false);
      return;
    }
    window.location.href = href(`/firma/rezerwacje/${data.id}`);
  }

  const cancellable = ["pending", "confirmed", "assigned"].includes(booking.status);
  const editable = cancellable && !["paid", "review"].includes(booking.payment_status);

  return (
    <div className="card company-actions">
      <h2>{t("Akcje")}</h2>
      <button className="btn" style={{ width: "100%" }} disabled={!editable} onClick={() => setEditing(!editing)}>
        {editing ? t("ZAMKNIJ EDYCJĘ") : t("EDYTUJ REZERWACJĘ")}
      </button>

      {!editable && <p className="muted">{["paid", "review"].includes(booking.payment_status) && cancellable ? t("Rezerwacji z zaksięgowaną lub weryfikowaną płatnością nie można samodzielnie edytować. Możesz ją anulować albo skontaktować się z MATT TRANSPORT.") : t("Rezerwacja w realizacji lub zakończona nie może być edytowana przez portal firmy.")}</p>}

      {cancellable && !cancelConfirm && (
        <button className="btn secondary company-cancel-btn" style={{ width: "100%", marginTop: 10 }} disabled={saving} onClick={() => setCancelConfirm(true)}>
           {t("ANULUJ REZERWACJĘ")} </button>
      )}

      {cancellable && cancelConfirm && (
        <div className="company-cancel-confirm">
          <strong>{t("Czy na pewno anulować tę rezerwację?")}</strong>
          <p className="muted">{t("Kurs zostanie anulowany i usunięty z Google Calendar.")} {booking.payment_status === "paid" || booking.payment_status === "review" ? t("Płatność nie zostanie automatycznie zwrócona — MATT zweryfikuje zwrot ręcznie.") : t("Niewykorzystana sesja płatności Stripe zostanie wygaszona.")}</p>
          <div>
            <button className="btn secondary" disabled={saving} onClick={() => setCancelConfirm(false)}>{t("NIE, ZOSTAW")}</button>
            <button className="btn company-cancel-confirm-btn" disabled={saving} onClick={cancelBooking}>{saving ? "ANULOWANIE..." : "TAK, ANULUJ"}</button>
          </div>
        </div>
      )}

      <button className="btn secondary" style={{ width: "100%", marginTop: 10 }} onClick={() => setRepeatOpen(!repeatOpen)}>
         {t("POWTÓRZ REZERWACJĘ")} </button>

      {repeatOpen && (
        <div className="repeat-box">
          <p className="muted">{t("Nowy kurs zostanie wyceniony według warunków handlowych obowiązujących w dniu utworzenia.")}</p>
          <label>{t("Nowa data")}<input type="date" value={repeatDate} onChange={(e) => setRepeatDate(e.target.value)} /></label>
          <label>{booking.service_type === "from_airport" ? t("Nowa godzina przylotu") : t("Nowa godzina wyjazdu na lotnisko")}<input type="time" value={repeatTime} onChange={(e) => setRepeatTime(e.target.value)} /></label>
          {booking.service_type === "roundtrip" && <>
            <label>{t("Data powrotu")}<input type="date" value={repeatReturnDate} onChange={e=>setRepeatReturnDate(e.target.value)} /></label>
            <label>{t("Godzina powrotu")}<input type="time" value={repeatReturnTime} onChange={e=>setRepeatReturnTime(e.target.value)} /></label>
          </>}
          <button className="btn" onClick={repeat} disabled={saving}>{t("UTWÓRZ NOWY KURS")}</button>
        </div>
      )}

      {editing && (
        <div className="company-edit-form">
          <label>
             {t("Adres")} <input value={form.address} onChange={(e) => addressChanged(e.target.value)} />
            {suggestions.length > 0 && (
              <div className="address-suggestions">
                {suggestions.slice(0, 5).map((s: any, i: number) => (
                  <button key={s.placeId ?? i} type="button" onClick={() => chooseAddress(s.text ?? "")}>{s.text}</button>
                ))}
              </div>
            )}
          </label>
          <label>
             {t("Lotnisko")} <select value={form.airport} onChange={(e) => setForm({ ...form, airport: e.target.value })}>
              {!airports[form.airport] && <option value={form.airport}>{booking.airport_label || form.airport}  {t("· nieaktywne")}</option>}
              {Object.entries(airports).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <div className="grid">
            <label>{t("Data")}<input type="date" value={form.travelDate} onChange={(e) => setForm({ ...form, travelDate: e.target.value })} /></label>
            <label>{booking.service_type === "from_airport" ? t("Godzina przylotu") : t("Godzina wyjazdu na lotnisko")}<input type="time" value={form.travelTime} onChange={(e) => setForm({ ...form, travelTime: e.target.value })} /></label>
            <label>{t("Lot")}<input value={form.flightNumber} onChange={(e) => setForm({ ...form, flightNumber: e.target.value })} /></label>
            <label>
               {t("Pasażerowie")} <select value={form.passengers} onChange={(e) => {
                const count = Number(e.target.value);
                setForm({ ...form, passengers: count, vehicleType: count > 3 ? "bus" : form.vehicleType });
              }}>
                {[1,2,3,4,5,6,7,8].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
            <label>
               {t("Pojazd")} <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                <option value="car" disabled={form.passengers > 3}>{t("Samochód osobowy")}</option>
                <option value="bus">{t("Bus do 8 osób")}</option>
              </select>
            </label>
          </div>

          {quoteBusy && <p className="muted">{t("Przeliczanie ceny...")}</p>}
          {editQuote && (
            <div style={{ marginTop: 12, padding: 12, border: "1px solid #4f4733", borderRadius: 10 }}>
              <strong>{t("Nowa wycena:")} {editQuote.net.toFixed(2)}  {t("zł netto + VAT")} {editQuote.vatRate.toFixed(0)}% = {editQuote.gross.toFixed(2)}  {t("zł brutto")}</strong>
              <div className="muted">{editQuote.distanceKm.toFixed(1)}  {t("km od siedziby ·")} {editQuote.billableKm.toFixed(1)}  {t("km płatne")}</div>
            </div>
          )}

          <label>{t("Uwagi")}<textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <button className="btn" style={{ width: "100%", marginTop: 12 }} disabled={saving || quoteBusy} onClick={save}>
            {saving ? t("ZAPISYWANIE...") : "ZAPISZ ZMIANY"}
          </button>
        </div>
      )}

      {message && <div className="admin-save-message">{message}</div>}
    </div>
  );
}
