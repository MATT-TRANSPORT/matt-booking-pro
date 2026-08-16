"use client";

import { useMemo, useState } from "react";

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
  const [filter, setFilter] = useState("all");

  const visible = useMemo(() => {
    if (filter === "b2b") return rows.filter((x) => x.company_id);
    if (filter === "private") return rows.filter((x) => !x.company_id);
    if (filter === "unassigned")
      return rows.filter((x) => !x.driver_id || !x.vehicle_id);
    return rows;
  }, [rows, filter]);

  async function assign(id: string, driverId: string, vehicleId: string) {
    const response = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        driverId,
        vehicleId,
        status: driverId && vehicleId ? "assigned" : undefined
      })
    });

    const data = await response.json();

    if (response.ok) {
      setRows(
        rows.map((x) =>
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
    } else {
      alert(data.error ?? "Nie udało się zapisać przydziału.");
    }
  }

  return (
    <>
      <div className="ops-filters">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
          Wszystkie
        </button>
        <button className={filter === "b2b" ? "active" : ""} onClick={() => setFilter("b2b")}>
          B2B
        </button>
        <button className={filter === "private" ? "active" : ""} onClick={() => setFilter("private")}>
          Indywidualne
        </button>
        <button className={filter === "unassigned" ? "active" : ""} onClick={() => setFilter("unassigned")}>
          Bez obsady
        </button>
      </div>

      <div className="card">
        {!visible.length ? (
          <div className="empty-state">
            <strong>Brak kursów spełniających filtr.</strong>
            <span>Plan pokazuje rezerwacje od dziś na najbliższe 7 dni.</span>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Termin</th>
                <th>Klient / trasa</th>
                <th>Kierowca</th>
                <th>Pojazd</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((b: any) => (
                <DispatchRow
                  key={b.id}
                  b={b}
                  drivers={drivers}
                  vehicles={vehicles}
                  assign={assign}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function DispatchRow({
  b,
  drivers,
  vehicles,
  assign
}: {
  b: any;
  drivers: any[];
  vehicles: any[];
  assign: any;
}) {
  const [driverId, setDriverId] = useState(b.driver_id ?? "");
  const [vehicleId, setVehicleId] = useState(b.vehicle_id ?? "");
  const company = Array.isArray(b.companies) ? b.companies[0] : b.companies;

  return (
    <tr style={{borderLeft:`5px solid ${drivers.find((d:any)=>d.id===driverId)?.color||"transparent"}`}}>
      <td>
        <strong>{b.travel_date}</strong>
        <br />
        {b.travel_time}
      </td>
      <td>
        <div className="booking-origin">
          {b.company_id ? (
            <span className="origin-badge b2b">🏢 B2B · {company?.name ?? "Firma"}</span>
          ) : (
            <span className="origin-badge private">👤 INDYWIDUALNY</span>
          )}
        </div>
        <a href={`/panel/rezerwacje/${b.id}`}>
          <strong>
            {b.service_type === "from_airport"
              ? `${b.airport_label} → ${b.pickup_address}`
              : `${b.pickup_address} → ${b.airport_label}`}
          </strong>
        </a>
        <br />
        {b.customer_name} · {b.phone}
      </td>
      <td>
        <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
          <option value="">— Nieprzypisany —</option>
          {drivers.map((x: any) => (
            <option key={x.id} value={x.id}>
              {x.full_name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          <option value="">— Nieprzypisany —</option>
          {vehicles.map((x: any) => (
            <option key={x.id} value={x.id}>
              {x.name} · {x.registration}
            </option>
          ))}
        </select>
      </td>
      <td>
        <button
          className="btn"
          onClick={() => assign(b.id, driverId, vehicleId)}
        >
          Zapisz
        </button>
      </td>
    </tr>
  );
}
