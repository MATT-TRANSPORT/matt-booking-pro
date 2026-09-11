"use client";

import { useMemo, useState } from "react";

export default function DriverIssueReporter({ bookings }: { bookings: any[] }) {
  const [open, setOpen] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [issueType, setIssueType] = useState("other");
  const [description, setDescription] = useState("");
  const [mileage, setMileage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const options = useMemo(() => bookings.map((b) => ({
    id: b.id,
    label: `${b.booking_number} · ${b.customer_name} · ${b.travel_date}`
  })), [bookings]);

  async function submit() {
    if (!bookingId || (!description.trim() && !mileage) || busy) {
      setMessage("Wybierz kurs i dodaj opis lub przebieg.");
      return;
    }
    setBusy(true);
    setMessage("Wysyłanie zgłoszenia...");
    const data = new FormData();
    data.append("bookingId", bookingId);
    data.append("issueType", issueType);
    data.append("description", description);
    if (mileage) data.append("mileage", mileage);
    if (photo) data.append("photo", photo);

    const r = await fetch("/api/driver/issues", { method: "POST", body: data });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setMessage(d.error || "Nie udało się wysłać zgłoszenia."); return; }
    setMessage("✓ Zgłoszenie zapisane i przekazane do MATT Administrator.");
    setDescription("");
    setMileage("");
    setPhoto(null);
  }

  return <section className="card" style={{ marginBottom: 18 }}>
    <div className="company-section-head">
      <div>
        <span className="badge">DRIVER PRO+</span>
        <h2 style={{ marginTop: 8 }}>Przebieg / zgłoszenie</h2>
        <p className="muted" style={{ marginBottom: 0 }}>Zaktualizuj przebieg albo zgłoś problem z pojazdem lub kursem. Możesz dodać zdjęcie.</p>
      </div>
      <button className="btn secondary" type="button" onClick={() => setOpen(!open)}>{open ? "ZAMKNIJ" : "DODAJ ZGŁOSZENIE"}</button>
    </div>

    {open && <div style={{ marginTop: 14 }}>
      <div className="grid">
        <label>Kurs
          <select value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
            <option value="">— wybierz kurs —</option>
            {options.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
        <label>Rodzaj
          <select value={issueType} onChange={(e) => setIssueType(e.target.value)}>
            <option value="mileage">Przebieg pojazdu</option>
            <option value="vehicle">Problem z pojazdem</option>
            <option value="passenger">Problem przy realizacji</option>
            <option value="other">Inne</option>
          </select>
        </label>
        <label>Przebieg (km)
          <input type="number" min={0} value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="np. 182450" />
        </label>
        <label>Zdjęcie (opcjonalnie, max 5 MB)
          <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
        </label>
      </div>
      <label style={{ marginTop: 12 }}>Opis
        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Co się wydarzyło / co wymaga sprawdzenia?" />
      </label>
      <button className="btn" type="button" style={{ marginTop: 12 }} disabled={busy} onClick={submit}>{busy ? "WYSYŁANIE..." : "WYŚLIJ DO MATT"}</button>
      {message && <div className="admin-save-message" style={{ marginTop: 12 }}>{message}</div>}
    </div>}
  </section>;
}
