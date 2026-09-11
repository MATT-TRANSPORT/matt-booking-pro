"use client";

import { useEffect, useMemo, useState } from "react";

const stages = [
  ["confirmed", "Potwierdzona"],
  ["assigned", "Kierowca i pojazd"],
  ["in_progress", "Kierowca w drodze"],
  ["arrived", "Kierowca na miejscu"],
  ["picked_up", "Pasażer odebrany"],
  ["completed", "Zakończona"]
] as const;

function one(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function stageIndex(status: string) {
  if (status === "pending") return -1;
  return stages.findIndex(([key]) => key === status);
}

function shortDate(value: unknown) {
  if (!value) return "—";
  try { return new Date(String(value)).toLocaleString("pl-PL"); } catch { return String(value); }
}

export default function ClientOperationalStatus({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await fetch(`/api/client-booking/${token}/status`, { cache: "no-store" });
        const d = await r.json();
        if (!active) return;
        if (!r.ok) { setError(d.error || "Nie udało się pobrać statusu."); return; }
        setData(d);
        setError("");
      } catch {
        if (active) setError("Nie udało się odświeżyć statusu.");
      }
    }
    void load();
    const timer = window.setInterval(load, 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [token]);

  const booking = data?.booking;
  const driver = one(booking?.drivers);
  const vehicle = one(booking?.vehicles);
  const returnDriver = one(booking?.return_driver);
  const returnVehicle = one(booking?.return_vehicle);
  const current = useMemo(() => stageIndex(String(booking?.status || "pending")), [booking?.status]);

  if (!booking && !error) return null;

  return <section className="card" style={{ margin: "18px auto", maxWidth: 960 }}>
    <div className="company-section-head">
      <div>
        <span className="badge">STATUS PRZEJAZDU · LIVE</span>
        <h2 style={{ marginTop: 8 }}>Przebieg realizacji</h2>
        <p className="muted" style={{ marginBottom: 0 }}>Status odświeża się automatycznie co minutę.</p>
      </div>
      {booking?.status === "cancelled" && <span className="status cancelled">ANULOWANA</span>}
      {booking?.status === "pending" && <span className="status pending">OCZEKUJE</span>}
    </div>

    {error && <div className="admin-save-message">{error}</div>}

    {booking && booking.status !== "cancelled" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginTop: 16 }}>
      {stages.map(([key, label], index) => <div key={key} style={{ padding: 12, borderRadius: 10, border: index <= current ? "1px solid #d5ae5d" : "1px solid #343b49", background: index <= current ? "#2d291c" : "#10141b" }}>
        <strong>{index <= current ? "✓ " : "○ "}{label}</strong>
      </div>)}
    </div>}

    {booking && <div className="grid" style={{ marginTop: 16 }}>
      <div style={{ padding: 14, border: "1px solid #343b49", borderRadius: 12 }}>
        <small className="muted">KIEROWCA</small><br/>
        <strong>{driver?.full_name || "Jeszcze nie przypisano"}</strong><br/>
        {driver?.phone && <a href={`tel:${driver.phone}`}>{driver.phone}</a>}
      </div>
      <div style={{ padding: 14, border: "1px solid #343b49", borderRadius: 12 }}>
        <small className="muted">POJAZD</small><br/>
        <strong>{vehicle ? `${vehicle.name}${vehicle.registration ? ` · ${vehicle.registration}` : ""}` : "Jeszcze nie przypisano"}</strong>
      </div>
      {booking.service_type === "roundtrip" && <>
        <div style={{ padding: 14, border: "1px solid #343b49", borderRadius: 12 }}>
          <small className="muted">KIEROWCA POWROTU</small><br/>
          <strong>{returnDriver?.full_name || driver?.full_name || "Jeszcze nie przypisano"}</strong><br/>
          {(returnDriver?.phone || driver?.phone) && <a href={`tel:${returnDriver?.phone || driver?.phone}`}>{returnDriver?.phone || driver?.phone}</a>}
        </div>
        <div style={{ padding: 14, border: "1px solid #343b49", borderRadius: 12 }}>
          <small className="muted">POJAZD POWROTU</small><br/>
          <strong>{returnVehicle ? `${returnVehicle.name}${returnVehicle.registration ? ` · ${returnVehicle.registration}` : ""}` : vehicle ? `${vehicle.name}${vehicle.registration ? ` · ${vehicle.registration}` : ""}` : "Jeszcze nie przypisano"}</strong>
        </div>
      </>}
    </div>}

    {!!data?.flights?.length && <div style={{ marginTop: 18 }}>
      <h3>Monitor lotu</h3>
      {data.flights.map((f: any) => <div className="row" key={`${f.leg}-${f.flight_number}`}>
        <span><strong>{f.leg === "return" ? "POWRÓT · " : ""}{f.flight_number}</strong><br/><small className="muted">Aktualizacja: {shortDate(f.updated_at)}</small></span>
        <span><strong>{String(f.status || "brak statusu").toUpperCase()}</strong><br/><small className="muted">ETA: {shortDate(f.estimated_arrival || f.scheduled_arrival)}</small></span>
      </div>)}
    </div>}

    {!!data?.alerts?.length && <div style={{ marginTop: 14 }}>
      {data.alerts.slice(0,3).map((a: any, i: number) => <div key={i} style={{ marginTop: 8, padding: 12, borderRadius: 10, border: a.severity === "critical" ? "1px solid #dc2626" : "1px solid #d5ae5d" }}>
        <strong>{a.title}</strong><div className="muted">{a.message}</div>
      </div>)}
    </div>}
  </section>;
}
