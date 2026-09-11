"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function addDays(dateKey: string, days: number) {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function CompanyBookingTemplates({
  templates,
  employees,
  recentBookings,
  airports
}: {
  templates: any[];
  employees: any[];
  recentBookings: any[];
  airports: Record<string, { label: string }>;
}) {
  const router = useRouter();
  const [sourceBookingId, setSourceBookingId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [selectedId, setSelectedId] = useState(templates[0]?.id || "");
  const [firstDate, setFirstDate] = useState("");
  const [time, setTime] = useState("");
  const [recurrence, setRecurrence] = useState<"once" | "weekly">("once");
  const [occurrences, setOccurrences] = useState(4);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const selected = useMemo(() => templates.find((x) => x.id === selectedId) || null, [templates, selectedId]);
  const employee = selected ? employees.find((x) => x.id === selected.employee_id) : null;

  async function saveFromBooking() {
    if (!sourceBookingId || busy) return;
    setBusy(true);
    setMessage("Zapisywanie szablonu...");
    const r = await fetch("/api/company/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "from_booking", bookingId: sourceBookingId, name: templateName })
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setMessage(d.error || "Nie udało się zapisać szablonu."); return; }
    setMessage("✓ Szablon zapisany.");
    setSourceBookingId("");
    setTemplateName("");
    router.refresh();
  }

  async function removeTemplate(id: string) {
    if (!window.confirm("Usunąć ten szablon?")) return;
    setBusy(true);
    const r = await fetch("/api/company/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id })
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setMessage(d.error || "Nie udało się usunąć szablonu."); return; }
    setMessage("✓ Szablon usunięty.");
    router.refresh();
  }

  async function createSeries() {
    if (!selected || !firstDate || !time || busy) {
      setMessage("Wybierz szablon, datę i godzinę pierwszego kursu.");
      return;
    }
    const count = recurrence === "weekly" ? Math.max(1, Math.min(12, Number(occurrences || 1))) : 1;
    if (!employee) {
      setMessage("Pracownik zapisany w szablonie nie jest już dostępny.");
      return;
    }
    if (count > 1 && !window.confirm(`Utworzyć ${count} rezerwacji co tydzień? Każda zostanie przeliczona wg aktualnych warunków B2B.`)) return;

    setBusy(true);
    setMessage(`Tworzenie ${count} ${count === 1 ? "rezerwacji" : "rezerwacji"}...`);
    const created: any[] = [];

    for (let i = 0; i < count; i++) {
      const travelDate = addDays(firstDate, recurrence === "weekly" ? i * 7 : 0);
      const returnDate = selected.service_type === "roundtrip"
        ? addDays(travelDate, Number(selected.return_offset_days || 0))
        : null;
      const payload = {
        employeeId: selected.employee_id,
        address: selected.pickup_address,
        airport: selected.airport_key,
        vehicleType: selected.vehicle_type,
        passengers: selected.passengers,
        serviceType: selected.service_type,
        travelDate,
        travelTime: time,
        returnDate,
        returnTime: selected.return_time || null,
        flightNumber: selected.flight_number || null,
        returnFlightNumber: selected.return_flight_number || null,
        notes: selected.notes || null,
        paymentMethod: selected.payment_method || "company_transfer",
        additionalStopAddress: selected.additional_stop_address || null,
        additionalStopPrimary: Boolean(selected.additional_stop_primary),
        additionalStopReturn: Boolean(selected.additional_stop_return)
      };
      const r = await fetch("/api/company/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const d = await r.json();
      if (!r.ok) {
        setBusy(false);
        setMessage(`Utworzono ${created.length}/${count}. Błąd dla ${travelDate}: ${d.error || "nie udało się zapisać"}`);
        router.refresh();
        return;
      }
      created.push(d);
    }

    setBusy(false);
    setMessage(`✓ Utworzono ${created.length} ${created.length === 1 ? "rezerwację" : "rezerwacje"}.`);
    router.refresh();
  }

  return (
    <>
      <section className="card" style={{ marginBottom: 18 }}>
        <span className="badge">B2B PRO</span>
        <h2 style={{ marginTop: 8 }}>Zapisz jako szablon</h2>
        <p className="muted">Wybierz istniejącą rezerwację. Trasa, pracownik, pojazd, płatność i dodatkowy przystanek zostaną zapamiętane.</p>
        <div className="grid">
          <label>Rezerwacja
            <select value={sourceBookingId} onChange={(e) => setSourceBookingId(e.target.value)}>
              <option value="">— wybierz —</option>
              {recentBookings.map((b) => <option key={b.id} value={b.id}>{b.booking_number} · {b.customer_name} · {b.airport_label}</option>)}
            </select>
          </label>
          <label>Nazwa szablonu (opcjonalnie)
            <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="np. Zarząd → Pyrzowice" />
          </label>
        </div>
        <button className="btn" style={{ marginTop: 12 }} disabled={!sourceBookingId || busy} onClick={saveFromBooking}>ZAPISZ SZABLON</button>
      </section>

      <section className="card">
        <div className="company-section-head">
          <div>
            <span className="badge">CYKLICZNE REZERWACJE</span>
            <h2 style={{ marginTop: 8 }}>Utwórz kursy z szablonu</h2>
            <p className="muted">Jednorazowo albo co tydzień, maksymalnie 12 wystąpień. Każdy kurs jest ponownie wyceniany na backendzie.</p>
          </div>
        </div>

        {!templates.length ? <div className="empty-state"><strong>Brak szablonów.</strong><span>Utwórz pierwszy z istniejącej rezerwacji.</span></div> : <>
          <div className="grid">
            <label>Szablon
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label>Data pierwszego kursu<input type="date" value={firstDate} onChange={(e) => setFirstDate(e.target.value)} /></label>
            <label>{selected?.service_type === "from_airport" ? "Godzina przylotu" : "Godzina wyjazdu"}<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            <label>Powtarzanie
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as any)}>
                <option value="once">Jednorazowo</option>
                <option value="weekly">Co tydzień</option>
              </select>
            </label>
            {recurrence === "weekly" && <label>Liczba kursów<input type="number" min={1} max={12} value={occurrences} onChange={(e) => setOccurrences(Number(e.target.value))} /></label>}
          </div>

          {selected && <div style={{ marginTop: 14, padding: 14, border: "1px solid #343b49", borderRadius: 12 }}>
            <strong>{selected.name}</strong>
            <div className="muted">{employee ? `${employee.first_name} ${employee.last_name}` : "Pracownik niedostępny"} · {selected.pickup_address} · {airports[selected.airport_key]?.label || selected.airport_key} · {selected.vehicle_type === "bus" ? "Bus" : "Samochód"}</div>
            {selected.service_type === "roundtrip" && <div className="muted">Powrót: +{selected.return_offset_days || 0} dni · {selected.return_time || "—"}</div>}
          </div>}

          <button className="btn" style={{ marginTop: 14 }} disabled={busy || !selected || !firstDate || !time} onClick={createSeries}>{busy ? "TWORZENIE..." : recurrence === "weekly" ? "UTWÓRZ SERIĘ" : "UTWÓRZ REZERWACJĘ"}</button>
        </>}

        {message && <div className="admin-save-message" style={{ marginTop: 14 }}>{message}</div>}
      </section>

      {templates.length > 0 && <section className="card" style={{ marginTop: 18 }}>
        <h2>Zapisane szablony</h2>
        {templates.map((t) => <div className="row" key={t.id} style={{ alignItems: "center", gap: 12 }}>
          <span><strong>{t.name}</strong><br/><small className="muted">{t.pickup_address} → {airports[t.airport_key]?.label || t.airport_key}</small></span>
          <button className="btn secondary company-small-btn" disabled={busy} onClick={() => removeTemplate(t.id)}>USUŃ</button>
        </div>)}
      </section>}
    </>
  );
}
