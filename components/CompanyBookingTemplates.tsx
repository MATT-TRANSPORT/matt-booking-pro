"use client";
import { customerFetch } from "@/lib/customerFetch";
import { useCustomerLocale } from "@/lib/useCustomerLocale";
import { companyText } from "@/lib/companyCopy";
import { withCustomerLocale } from "@/lib/bookingLocale";

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
 const fetchCustomer=(input:RequestInfo|URL,init?:RequestInit)=>customerFetch(locale,input,init);
  const locale=useCustomerLocale();
  const t=(key:string)=>companyText(key,locale);
  const href=(path:string)=>withCustomerLocale(path,locale);
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
    setMessage(t("Zapisywanie szablonu..."));
    const r = await fetchCustomer("/api/company/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, action: "from_booking", bookingId: sourceBookingId, name: templateName })
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setMessage(d.error || t("Nie udało się zapisać szablonu.")); return; }
    setMessage(t("✓ Szablon zapisany."));
    setSourceBookingId("");
    setTemplateName("");
    router.refresh();
  }

  async function removeTemplate(id: string) {
    if (!window.confirm(t("Usunąć ten szablon?"))) return;
    setBusy(true);
    const r = await fetchCustomer("/api/company/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, action: "delete", id })
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setMessage(d.error || t("Nie udało się usunąć szablonu.")); return; }
    setMessage(t("✓ Szablon usunięty."));
    router.refresh();
  }

  async function createSeries() {
    if (!selected || !firstDate || !time || busy) {
      setMessage(t("Wybierz szablon, datę i godzinę pierwszego kursu."));
      return;
    }
    const count = recurrence === "weekly" ? Math.max(1, Math.min(12, Number(occurrences || 1))) : 1;
    if (!employee) {
      setMessage(t("Pracownik zapisany w szablonie nie jest już dostępny."));
      return;
    }
    if (count > 1 && !window.confirm(t("Utworzyć {count} rezerwacji co tydzień? Każda zostanie przeliczona wg aktualnych warunków B2B.").replace("{count}",String(count)))) return;

    setBusy(true);
    setMessage(t("Tworzenie {count} rezerwacji...").replace("{count}",String(count)));
    const created: any[] = [];

    for (let i = 0; i < count; i++) {
      const travelDate = addDays(firstDate, recurrence === "weekly" ? i * 7 : 0);
      const returnDate = selected.service_type === "roundtrip"
        ? addDays(travelDate, Number(selected.return_offset_days || 0))
        : null;
      const payload = { locale,
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
      const r = await fetchCustomer("/api/company/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const d = await r.json();
      if (!r.ok) {
        setBusy(false);
        setMessage(t("Utworzono {created}/{count}. Błąd dla {date}: {error}").replace("{created}",String(created.length)).replace("{count}",String(count)).replace("{date}",travelDate).replace("{error}",t(d.error||"nie udało się zapisać")));
        router.refresh();
        return;
      }
      created.push(d);
    }

    setBusy(false);
    setMessage(t("✓ Utworzono {count} rezerwacji.").replace("{count}",String(created.length)));
    router.refresh();
  }

  return (
    <>
      <section className="card" style={{ marginBottom: 18 }}>
        <span className="badge">B2B PRO</span>
        <h2 style={{ marginTop: 8 }}>{t("Zapisz jako szablon")}</h2>
        <p className="muted">{t("Wybierz istniejącą rezerwację. Trasa, pracownik, pojazd, płatność i dodatkowy przystanek zostaną zapamiętane.")}</p>
        <div className="grid">
          <label>{t("Rezerwacja")} <select value={sourceBookingId} onChange={(e) => setSourceBookingId(e.target.value)}>
              <option value="">{t("— wybierz —")}</option>
              {recentBookings.map((b) => <option key={b.id} value={b.id}>{b.booking_number} · {b.customer_name} · {b.airport_label}</option>)}
            </select>
          </label>
          <label>{t("Nazwa szablonu (opcjonalnie)")} <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="np. Zarząd → Pyrzowice" />
          </label>
        </div>
        <button className="btn" style={{ marginTop: 12 }} disabled={!sourceBookingId || busy} onClick={saveFromBooking}>{t("ZAPISZ SZABLON")}</button>
      </section>

      <section className="card">
        <div className="company-section-head">
          <div>
            <span className="badge">{t("CYKLICZNE REZERWACJE")}</span>
            <h2 style={{ marginTop: 8 }}>{t("Utwórz kursy z szablonu")}</h2>
            <p className="muted">{t("Jednorazowo albo co tydzień, maksymalnie 12 wystąpień. Każdy kurs jest ponownie wyceniany na backendzie.")}</p>
          </div>
        </div>

        {!templates.length ? <div className="empty-state"><strong>{t("Brak szablonów.")}</strong><span>{t("Utwórz pierwszy z istniejącej rezerwacji.")}</span></div> : <>
          <div className="grid">
            <label>{t("Szablon")} <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label>{t("Data pierwszego kursu")}<input type="date" value={firstDate} onChange={(e) => setFirstDate(e.target.value)} /></label>
            <label>{selected?.service_type === "from_airport" ? t("Godzina przylotu") : t("Godzina wyjazdu")}<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            <label>{t("Powtarzanie")} <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as any)}>
                <option value="once">{t("Jednorazowo")}</option>
                <option value="weekly">{t("Co tydzień")}</option>
              </select>
            </label>
            {recurrence === "weekly" && <label>{t("Liczba kursów")}<input type="number" min={1} max={12} value={occurrences} onChange={(e) => setOccurrences(Number(e.target.value))} /></label>}
          </div>

          {selected && <div style={{ marginTop: 14, padding: 14, border: "1px solid #343b49", borderRadius: 12 }}>
            <strong>{selected.name}</strong>
            <div className="muted">{employee ? `${employee.first_name} ${employee.last_name}` : t("Pracownik niedostępny")} · {selected.pickup_address} · {airports[selected.airport_key]?.label || selected.airport_key} · {selected.vehicle_type === "bus" ? t("Bus") : t("Samochód")}</div>
            {selected.service_type === "roundtrip" && <div className="muted">{t("Powrót: +")}{selected.return_offset_days || 0}  {t("dni ·")} {selected.return_time || "—"}</div>}
          </div>}

          <button className="btn" style={{ marginTop: 14 }} disabled={busy || !selected || !firstDate || !time} onClick={createSeries}>{busy ? "TWORZENIE..." : recurrence === "weekly" ? t("UTWÓRZ SERIĘ") : t("UTWÓRZ REZERWACJĘ")}</button>
        </>}

        {message && <div className="admin-save-message" style={{ marginTop: 14 }}>{message}</div>}
      </section>

      {templates.length > 0 && <section className="card" style={{ marginTop: 18 }}>
        <h2>{t("Zapisane szablony")}</h2>
        {templates.map((t) => <div className="row" key={t.id} style={{ alignItems: "center", gap: 12 }}>
          <span><strong>{t.name}</strong><br/><small className="muted">{t.pickup_address} → {airports[t.airport_key]?.label || t.airport_key}</small></span>
          <button className="btn secondary company-small-btn" disabled={busy} onClick={() => removeTemplate(t.id)}>{t("USUŃ")}</button>
        </div>)}
      </section>}
    </>
  );
}
