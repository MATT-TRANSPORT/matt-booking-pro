"use client";

import { useMemo, useState } from "react";
import { addDays, isOverdueBooking, statusStageClass, warsawToday } from "@/lib/bookingOps";
import { statusPl } from "@/lib/status";

export default function DispatcherClient({
  bookings,
  drivers,
  vehicles
}: {
  bookings: any[];
  drivers: any[];
  vehicles: any[];
}) {
  const [rows, setRows] = useState(bookings);
  const [scope, setScope] = useState<"today"|"tomorrow"|"7d"|"overdue">("today");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");

  const today = warsawToday();
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 6);

  const visible = useMemo(() => {
    let result = rows.filter((x) => !["completed", "cancelled"].includes(x.status));

    if (scope === "today") result = result.filter((x) => x.travel_date === today);
    if (scope === "tomorrow") result = result.filter((x) => x.travel_date === tomorrow);
    if (scope === "7d") result = result.filter((x) => x.travel_date >= today && x.travel_date <= weekEnd);
    if (scope === "overdue") result = result.filter(isOverdueBooking);

    if (filter === "b2b") result = result.filter((x) => x.company_id);
    if (filter === "private") result = result.filter((x) => !x.company_id);
    if (filter === "unassigned") result = result.filter((x) => !x.driver_id || !x.vehicle_id);

    return result.sort((a, b) =>
      `${a.travel_date} ${a.travel_time}`.localeCompare(`${b.travel_date} ${b.travel_time}`)
    );
  }, [rows, scope, filter, today, tomorrow, weekEnd]);

  async function update(
    id: string,
    driverId: string,
    vehicleId: string,
    status?: string
  ) {
    setMessage("");

    const response = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        driverId: driverId || null,
        vehicleId: vehicleId || null,
        status
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się zapisać zmian.");
      return false;
    }

    setRows((old) =>
      old.map((x) =>
        x.id === id
          ? {
              ...x,
              driver_id: driverId || null,
              vehicle_id: vehicleId || null,
              status: data.status ?? x.status
            }
          : x
      )
    );

    setMessage("✓ Zmiana została zapisana.");
    return true;
  }

  const overdueCount = rows.filter(isOverdueBooking).length;

  return (
    <>
      <div className="dispatcher-scope">
        <button className={scope === "today" ? "active" : ""} onClick={() => setScope("today")}>
          DZISIAJ
        </button>
        <button className={scope === "tomorrow" ? "active" : ""} onClick={() => setScope("tomorrow")}>
          JUTRO
        </button>
        <button className={scope === "7d" ? "active" : ""} onClick={() => setScope("7d")}>
          7 DNI
        </button>
        <button className={scope === "overdue" ? "active danger" : overdueCount ? "danger" : ""} onClick={() => setScope("overdue")}>
          ⚠ TERMIN MINĄŁ ({overdueCount})
        </button>
      </div>

      <div className="ops-filters">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
          Wszystkie
        </button>
        <button className={filter === "unassigned" ? "active" : ""} onClick={() => setFilter("unassigned")}>
          Bez obsady
        </button>
        <button className={filter === "b2b" ? "active" : ""} onClick={() => setFilter("b2b")}>
          B2B
        </button>
        <button className={filter === "private" ? "active" : ""} onClick={() => setFilter("private")}>
          Indywidualne
        </button>
      </div>

      {message && <div className="admin-save-message dispatcher-message">{message}</div>}

      {!visible.length ? (
        <div className="card empty-state">
          <strong>Brak kursów w tym widoku.</strong>
          <span>Zmień zakres dat lub filtr.</span>
        </div>
      ) : (
        <>
          <div className="dispatcher-desktop card">
            <table className="table dispatcher-table">
              <thead>
                <tr>
                  <th>Termin</th>
                  <th>Klient / trasa</th>
                  <th>Status</th>
                  <th>Kierowca</th>
                  <th>Pojazd</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((b: any) => (
                  <DispatchRow
                    key={b.id}
                    b={b}
                    drivers={drivers}
                    vehicles={vehicles}
                    update={update}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="dispatcher-mobile-list">
            {visible.map((b: any) => (
              <DispatchCard
                key={b.id}
                b={b}
                drivers={drivers}
                vehicles={vehicles}
                update={update}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function DriverBadge({ b, drivers }: { b: any; drivers: any[] }) {
  const driver = drivers.find((d: any) => d.id === b.driver_id);
  if (!driver) return <span className="dispatcher-unassigned">Bez kierowcy</span>;

  return (
    <span className="driver-color-badge" style={{ borderColor: driver.color || "#D6AD55" }}>
      <i style={{ background: driver.color || "#D6AD55" }} />
      {driver.full_name}
    </span>
  );
}

function QuickLinks({ b }: { b: any }) {
  const nav =
    b.service_type === "from_airport"
      ? b.airport_label
      : b.pickup_address;

  return (
    <div className="dispatcher-quick-links">
      <a href={`/panel/rezerwacje/${b.id}`}>OTWÓRZ</a>
      {b.phone && <a href={`tel:${b.phone}`}>TEL.</a>}
      {nav && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nav)}`}
          target="_blank"
          rel="noreferrer"
        >
          MAPA
        </a>
      )}
    </div>
  );
}

function DispatchRow({
  b,
  drivers,
  vehicles,
  update
}: {
  b: any;
  drivers: any[];
  vehicles: any[];
  update: any;
}) {
  const [driverId, setDriverId] = useState(b.driver_id ?? "");
  const [vehicleId, setVehicleId] = useState(b.vehicle_id ?? "");
  const company = Array.isArray(b.companies) ? b.companies[0] : b.companies;
  const overdue = isOverdueBooking(b);

  async function save() {
    await update(
      b.id,
      driverId,
      vehicleId,
      driverId && vehicleId ? "assigned" : b.status
    );
  }

  return (
    <tr className={`${statusStageClass(b.status)} ${overdue ? "booking-overdue" : ""}`}>
      <td>
        <strong>{b.travel_date}</strong><br />
        <span className="dispatcher-time">{String(b.travel_time).slice(0,5)}</span>
        {overdue && <div className="overdue-badge">⚠ TERMIN MINĄŁ</div>}
      </td>

      <td>
        <div className="booking-origin">
          {b.company_id ? (
            <span className="origin-badge b2b">🏢 B2B · {company?.name ?? "Firma"}</span>
          ) : (
            <span className="origin-badge private">👤 INDYWIDUALNY</span>
          )}
        </div>
        <a href={`/panel/rezerwacje/${b.id}`}><strong>{b.booking_number}</strong></a>
        <div className="dispatcher-route">
          {b.service_type === "from_airport"
            ? `${b.airport_label} → ${b.pickup_address}`
            : `${b.pickup_address} → ${b.airport_label}`}
        </div>
        <small>{b.customer_name}{b.phone ? ` · ${b.phone}` : ""}</small>
      </td>

      <td>
        <span className={`status ${b.status}`}>{statusPl(b.status)}</span>
        <div><DriverBadge b={b} drivers={drivers} /></div>
      </td>

      <td>
        <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
          <option value="">— Nieprzypisany —</option>
          {drivers.map((x: any) => (
            <option key={x.id} value={x.id}>{x.full_name}</option>
          ))}
        </select>
      </td>

      <td>
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          <option value="">— Nieprzypisany —</option>
          {vehicles.map((x: any) => (
            <option key={x.id} value={x.id}>{x.name} · {x.registration}</option>
          ))}
        </select>
      </td>

      <td>
        <button className="btn dispatcher-save" onClick={save}>ZAPISZ</button>
        <QuickLinks b={b} />
      </td>
    </tr>
  );
}

function DispatchCard({
  b,
  drivers,
  vehicles,
  update
}: {
  b: any;
  drivers: any[];
  vehicles: any[];
  update: any;
}) {
  const [driverId, setDriverId] = useState(b.driver_id ?? "");
  const [vehicleId, setVehicleId] = useState(b.vehicle_id ?? "");
  const overdue = isOverdueBooking(b);
  const company = Array.isArray(b.companies) ? b.companies[0] : b.companies;

  return (
    <article className={`dispatcher-card ${statusStageClass(b.status)} ${overdue ? "booking-overdue" : ""}`}>
      <div className="dispatcher-card-head">
        <div>
          <strong>{b.travel_date} · {String(b.travel_time).slice(0,5)}</strong>
          <a href={`/panel/rezerwacje/${b.id}`}>{b.booking_number}</a>
        </div>
        <span className={`status ${b.status}`}>{statusPl(b.status)}</span>
      </div>

      {overdue && <div className="overdue-badge">⚠ TERMIN MINĄŁ — status niezamknięty</div>}

      <div className="booking-origin">
        {b.company_id
          ? <span className="origin-badge b2b">🏢 {company?.name ?? "B2B"}</span>
          : <span className="origin-badge private">👤 INDYWIDUALNY</span>}
      </div>

      <div className="dispatcher-card-route">
        <strong>{b.customer_name}</strong>
        <span>
          {b.service_type === "from_airport"
            ? `${b.airport_label} → ${b.pickup_address}`
            : `${b.pickup_address} → ${b.airport_label}`}
        </span>
      </div>

      <DriverBadge b={b} drivers={drivers} />

      <div className="dispatcher-card-selects">
        <label>Kierowca
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">— Nieprzypisany —</option>
            {drivers.map((x: any) => <option key={x.id} value={x.id}>{x.full_name}</option>)}
          </select>
        </label>
        <label>Pojazd
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">— Nieprzypisany —</option>
            {vehicles.map((x: any) => <option key={x.id} value={x.id}>{x.name} · {x.registration}</option>)}
          </select>
        </label>
      </div>

      <button
        className="btn"
        onClick={() => update(
          b.id,
          driverId,
          vehicleId,
          driverId && vehicleId ? "assigned" : b.status
        )}
      >
        ZAPISZ OBSADĘ
      </button>

      <QuickLinks b={b} />
    </article>
  );
}
