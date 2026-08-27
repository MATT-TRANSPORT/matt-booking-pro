"use client";

import { useMemo, useState } from "react";
import { addDays, statusStageClass, warsawToday } from "@/lib/bookingOps";
import { statusPl } from "@/lib/status";
import {
  UNASSIGNED_CRITICAL_MINUTES,
  UNASSIGNED_WARNING_MINUTES,
  bookingInNextMinutes,
  bookingHasMissingAssignment,
  bookingLegs,
  bookingMatchesDate,
  bookingMatchesRange,
  conflictsForBooking,
  dispatcherSortKey,
  findResourceConflicts,
  isDispatcherOverdue,
  minutesFromNow,
  nextDispatcherAction,
  nextOperationalLeg,
  warsawNowKey
} from "@/lib/dispatcherOps";
import FlightStatusBadge from "@/components/FlightStatusBadge";
import FlightAlertBadge from "@/components/FlightAlertBadge";

type Scope = "next3h" | "today" | "tomorrow" | "7d" | "overdue";
type Filter = "all" | "unassigned" | "b2b" | "private";
type AttentionTone = "critical" | "warning";

type AttentionItem = {
  booking: any;
  tone: AttentionTone;
  reasons: string[];
};

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
  const [scope, setScope] = useState<Scope>("today");
  const [filter, setFilter] = useState<Filter>("all");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");

  const today = warsawToday();
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 6);
  const nowKey = warsawNowKey();

  const activeRows = useMemo(
    () => rows.filter((x) => !["completed", "cancelled"].includes(String(x.status || ""))),
    [rows]
  );

  const resourceConflicts = useMemo(() => findResourceConflicts(activeRows), [activeRows]);

  const conflictBookingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const conflict of resourceConflicts) {
      ids.add(conflict.bookingId);
      ids.add(conflict.otherBookingId);
    }
    return ids;
  }, [resourceConflicts]);

  const attention = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    for (const booking of activeRows) {
      const reasons: string[] = [];
      let tone: AttentionTone = "warning";
      const bookingConflicts = conflictsForBooking(String(booking.id), resourceConflicts);
      const nextLeg = nextOperationalLeg(booking, nowKey);
      const delta = nextLeg ? minutesFromNow(nextLeg.operationalStartKey, nowKey) : Number.POSITIVE_INFINITY;
      const missingDriver = !nextLeg?.driverId;
      const missingVehicle = !nextLeg?.vehicleId;
      const missingResources = missingDriver || missingVehicle;

      if (isDispatcherOverdue(booking, nowKey)) {
        reasons.push("Termin minął, a kurs nadal ma otwarty status");
        tone = "critical";
      }

      if (bookingConflicts.length) {
        const driver = bookingConflicts.some((x) => x.resource === "driver");
        const vehicle = bookingConflicts.some((x) => x.resource === "vehicle");
        reasons.push(
          driver && vehicle
            ? "Konflikt kierowcy i pojazdu"
            : driver
            ? "Konflikt kierowcy"
            : "Konflikt pojazdu"
        );
        tone = "critical";
      }

      const alerts = [booking.flightAlert, booking.returnFlightAlert].filter(
        (alert) => alert?.active
      );
      if (alerts.length) {
        const criticalFlight = alerts.some((alert) => alert.severity === "critical");
        reasons.push(criticalFlight ? "Krytyczny alert lotniczy" : "Alert lotniczy wymaga sprawdzenia");
        if (criticalFlight) tone = "critical";
      }

      if (missingResources && delta >= 0 && delta <= UNASSIGNED_WARNING_MINUTES) {
        const what = missingDriver && missingVehicle
          ? "brak kierowcy i pojazdu"
          : missingDriver
          ? "brak kierowcy"
          : "brak pojazdu";
        reasons.push(`${nextLeg?.label || "KURS"}: ${what}`);
        if (delta <= UNASSIGNED_CRITICAL_MINUTES) tone = "critical";
      }

      if (booking.status === "pending" && delta >= 0 && delta <= UNASSIGNED_CRITICAL_MINUTES) {
        reasons.push("Kurs w ciągu 3 h nadal oczekuje na potwierdzenie");
        tone = "critical";
      }

      if (reasons.length) items.push({ booking, tone, reasons });
    }

    return items.sort((a, b) => {
      if (a.tone !== b.tone) return a.tone === "critical" ? -1 : 1;
      return dispatcherSortKey(a.booking, nowKey).localeCompare(dispatcherSortKey(b.booking, nowKey));
    });
  }, [activeRows, resourceConflicts, nowKey]);

  const visible = useMemo(() => {
    let result = [...activeRows];

    if (scope === "next3h") {
      result = result.filter((x) => bookingInNextMinutes(x, 180, nowKey));
    }
    if (scope === "today") result = result.filter((x) => bookingMatchesDate(x, today));
    if (scope === "tomorrow") result = result.filter((x) => bookingMatchesDate(x, tomorrow));
    if (scope === "7d") result = result.filter((x) => bookingMatchesRange(x, today, weekEnd));
    if (scope === "overdue") result = result.filter((x) => isDispatcherOverdue(x, nowKey));

    if (filter === "b2b") result = result.filter((x) => x.company_id);
    if (filter === "private") result = result.filter((x) => !x.company_id);
    if (filter === "unassigned") result = result.filter((x) => bookingHasMissingAssignment(x));

    return result.sort((a, b) =>
      dispatcherSortKey(a, nowKey).localeCompare(dispatcherSortKey(b, nowKey))
    );
  }, [activeRows, scope, filter, today, tomorrow, weekEnd, nowKey]);

  async function update(
    id: string,
    driverId: string,
    vehicleId: string,
    status?: string,
    returnDriverId?: string,
    returnVehicleId?: string,
    leg?: "primary" | "return"
  ) {
    setMessage("");

    if (["in_progress", "arrived", "picked_up"].includes(String(status || "")) && (!driverId || !vehicleId)) {
      setMessage("⚠ Najpierw przypisz kierowcę i pojazd do tego kursu.");
      return false;
    }

    setSavingId(id);

    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          driverId: driverId || null,
          vehicleId: vehicleId || null,
          ...(returnDriverId !== undefined ? { returnDriverId: returnDriverId || null } : {}),
          ...(returnVehicleId !== undefined ? { returnVehicleId: returnVehicleId || null } : {}),
          ...(leg ? { leg } : {}),
          status
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`⚠ ${data.error ?? "Nie udało się zapisać zmian."}`);
        return false;
      }

      setRows((old) =>
        old.map((x) =>
          x.id === id
            ? {
                ...x,
                driver_id: data.driver_id ?? driverId ?? null,
                vehicle_id: data.vehicle_id ?? vehicleId ?? null,
                return_driver_id: data.return_driver_id ?? x.return_driver_id ?? null,
                return_vehicle_id: data.return_vehicle_id ?? x.return_vehicle_id ?? null,
                status: data.status ?? x.status,
                updated_at: data.updated_at ?? x.updated_at
              }
            : x
        )
      );

      setMessage("✓ Zmiana została zapisana.");
      return true;
    } finally {
      setSavingId("");
    }
  }

  const overdueCount = activeRows.filter((x) => isDispatcherOverdue(x, nowKey)).length;
  const next3hCount = activeRows.filter((x) => bookingInNextMinutes(x, 180, nowKey)).length;
  const unassignedCount = activeRows.filter((x) => bookingHasMissingAssignment(x)).length;

  return (
    <>
      <section className={`dispatcher-command-center card ${attention.length ? "has-attention" : "is-clear"}`}>
        <div className="dispatcher-command-head">
          <div>
            <span className="badge">OPERATIONS 2.0</span>
            <h2>Wymaga uwagi</h2>
            <p className="muted">
              Konflikty, brak obsady, zaległe statusy i ważne alerty lotnicze w jednym miejscu.
            </p>
          </div>
          <strong className="dispatcher-attention-count">{attention.length}</strong>
        </div>

        <div className="dispatcher-kpi-grid">
          <button type="button" onClick={() => setScope("next3h")}>
            <strong>{next3hCount}</strong><span>Następne 3 godziny</span>
          </button>
          <button type="button" onClick={() => setFilter("unassigned")}>
            <strong>{unassignedCount}</strong><span>Bez pełnej obsady</span>
          </button>
          <div className={conflictBookingIds.size ? "danger" : ""}>
            <strong>{conflictBookingIds.size}</strong><span>Konflikty zasobów</span>
          </div>
          <button type="button" className={overdueCount ? "danger" : ""} onClick={() => setScope("overdue")}>
            <strong>{overdueCount}</strong><span>Termin minął</span>
          </button>
        </div>

        {attention.length ? (
          <div className="dispatcher-attention-list">
            {attention.map(({ booking, tone, reasons }) => (
              <a
                href={`/panel/rezerwacje/${booking.id}`}
                key={booking.id}
                className={`dispatcher-attention-item ${tone}`}
              >
                <div>
                  <strong>{booking.booking_number} · {booking.customer_name}</strong>
                  <span>{formatOperationalTerm(booking, nowKey)}</span>
                </div>
                <div className="dispatcher-attention-reasons">
                  {reasons.map((reason) => <span key={reason}>{reason}</span>)}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="dispatcher-all-clear">✓ Brak pilnych problemów operacyjnych.</div>
        )}
      </section>

      <div className="dispatcher-scope">
        <button className={scope === "next3h" ? "active" : ""} onClick={() => setScope("next3h")}>
          ⏱ NASTĘPNE 3 H ({next3hCount})
        </button>
        <button className={scope === "today" ? "active" : ""} onClick={() => setScope("today")}>
          DZISIAJ
        </button>
        <button className={scope === "tomorrow" ? "active" : ""} onClick={() => setScope("tomorrow")}>
          JUTRO
        </button>
        <button className={scope === "7d" ? "active" : ""} onClick={() => setScope("7d")}>
          7 DNI
        </button>
        <button
          className={scope === "overdue" ? "active danger" : overdueCount ? "danger" : ""}
          onClick={() => setScope("overdue")}
        >
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
                  <th>Status / alerty</th>
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
                    saving={savingId === b.id}
                    conflicts={conflictsForBooking(String(b.id), resourceConflicts)}
                    nowKey={nowKey}
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
                saving={savingId === b.id}
                conflicts={conflictsForBooking(String(b.id), resourceConflicts)}
                nowKey={nowKey}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function formatOperationalTerm(booking: any, nowKey: string) {
  const leg = nextOperationalLeg(booking, nowKey);
  if (!leg) return "Brak terminu";
  return `${leg.label}: start ${leg.operationalStartDate} · ${leg.operationalStartTime} (lot ${leg.date} · ${leg.time})`;
}

function DriverBadge({ b, drivers, leg = "primary" }: { b: any; drivers: any[]; leg?: "primary" | "return" }) {
  const driverId = leg === "return" ? b.return_driver_id : b.driver_id;
  const driver = drivers.find((d: any) => d.id === driverId);
  if (!driver) return <span className="dispatcher-unassigned">Bez kierowcy</span>;
  return (
    <span className="driver-color-badge" style={{ borderColor: driver.color || "#D6AD55" }}>
      <i style={{ background: driver.color || "#D6AD55" }} />
      {driver.full_name}
    </span>
  );
}

function QuickLinks({ b }: { b: any }) {
  const nav = b.service_type === "from_airport" ? b.airport_label : b.pickup_address;

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

function OperationalLegs({ b, nowKey }: { b: any; nowKey: string }) {
  const next = nextOperationalLeg(b, nowKey);
  return (
    <div className="dispatcher-leg-list">
      {bookingLegs(b).map((leg) => (
        <div key={leg.kind} className={next?.kind === leg.kind ? "next" : ""}>
          <span>{leg.label}</span>
          <strong>{leg.operationalStartDate}</strong>
          <b>START {leg.operationalStartTime}</b>
          <small>lot {leg.date} · {leg.time}</small>
          {(!leg.driverId || !leg.vehicleId) && <small className="dispatcher-leg-unassigned">brak pełnej obsady</small>}
        </div>
      ))}
    </div>
  );
}

function ConflictBadges({ conflicts }: { conflicts: any[] }) {
  if (!conflicts.length) return null;
  const driver = conflicts.some((x) => x.resource === "driver");
  const vehicle = conflicts.some((x) => x.resource === "vehicle");

  return (
    <div className="dispatcher-conflict-box">
      {driver && <span>⚠ KONFLIKT KIEROWCY</span>}
      {vehicle && <span>⚠ KONFLIKT POJAZDU</span>}
      <small>
        {conflicts.slice(0, 2).map((x) => `${x.otherBookingNumber} · nakłada się ${x.overlapMinutes ?? "?"} min`).join(" · ")}
      </small>
    </div>
  );
}

function FlightOps({ b, compact = false }: { b: any; compact?: boolean }) {
  return (
    <div className="dispatcher-flight-stack">
      {b.flight_number && (
        <FlightStatusBadge flight={b.flight} flightNumber={b.flight_number} compact={false} />
      )}
      {b.flightAlert && <FlightAlertBadge alert={b.flightAlert} compact={compact} />}
      {b.return_flight_number && (
        <div className="dispatcher-return-flight">
          <small>POWRÓT</small>
          <FlightStatusBadge
            flight={b.returnFlight}
            flightNumber={b.return_flight_number}
            compact={false}
          />
          {b.returnFlightAlert && <FlightAlertBadge alert={b.returnFlightAlert} compact={compact} />}
        </div>
      )}
    </div>
  );
}

function QuickStatusAction({
  b,
  driverId,
  vehicleId,
  update,
  saving,
  leg
}: {
  b: any;
  driverId: string;
  vehicleId: string;
  update: any;
  saving: boolean;
  leg?: "primary" | "return";
}) {
  const action = nextDispatcherAction(b.status);
  if (!action) return null;

  const needsResources = ["in_progress", "arrived", "picked_up"].includes(action.status);
  const blocked = needsResources && (!driverId || !vehicleId);

  return (
    <button
      type="button"
      className={`dispatcher-status-next ${blocked ? "blocked" : ""}`}
      disabled={saving}
      title={blocked ? "Najpierw przypisz kierowcę i pojazd" : undefined}
      onClick={() => update(b.id, driverId, vehicleId, action.status, leg)}
    >
      {saving ? "ZAPIS..." : action.label}
    </button>
  );
}

function DispatchRow({
  b, drivers, vehicles, update, saving, conflicts, nowKey
}: {
  b: any; drivers: any[]; vehicles: any[]; update: any; saving: boolean; conflicts: any[]; nowKey: string;
}) {
  const [driverId, setDriverId] = useState(b.driver_id ?? "");
  const [vehicleId, setVehicleId] = useState(b.vehicle_id ?? "");
  const [returnDriverId, setReturnDriverId] = useState(b.return_driver_id ?? "");
  const [returnVehicleId, setReturnVehicleId] = useState(b.return_vehicle_id ?? "");
  const company = Array.isArray(b.companies) ? b.companies[0] : b.companies;
  const overdue = isDispatcherOverdue(b, nowKey);
  const activeLeg = nextOperationalLeg({ ...b, driver_id: driverId || null, vehicle_id: vehicleId || null, return_driver_id: returnDriverId || null, return_vehicle_id: returnVehicleId || null }, nowKey);
  const activeDriver = activeLeg?.kind === "return" ? returnDriverId : driverId;
  const activeVehicle = activeLeg?.kind === "return" ? returnVehicleId : vehicleId;

  async function save(status = b.status, leg?: "primary" | "return") {
    await update(b.id, driverId, vehicleId, status, returnDriverId, returnVehicleId, leg);
  }

  const route = b.service_type === "from_airport"
    ? `${b.airport_label} → ${b.pickup_address}`
    : b.service_type === "roundtrip"
    ? `${b.pickup_address} ↔ ${b.airport_label}`
    : `${b.pickup_address} → ${b.airport_label}`;

  return (
    <tr className={`${statusStageClass(b.status)} ${overdue ? "booking-overdue" : ""} ${conflicts.length ? "dispatcher-has-conflict" : ""}`}>
      <td><OperationalLegs b={b} nowKey={nowKey} />{overdue && <div className="overdue-badge">⚠ TERMIN MINĄŁ</div>}</td>
      <td>
        <div className="booking-origin">{b.company_id ? <span className="origin-badge b2b">🏢 B2B · {company?.name ?? "Firma"}</span> : <span className="origin-badge private">👤 INDYWIDUALNY</span>}</div>
        <a href={`/panel/rezerwacje/${b.id}`}><strong>{b.booking_number}</strong></a>
        <div className="dispatcher-route">{route}</div><FlightOps b={b} compact /><small>{b.customer_name}{b.phone ? ` · ${b.phone}` : ""}</small>
      </td>
      <td>
        <span className={`status ${b.status}`}>{statusPl(b.status)}</span>
        <ConflictBadges conflicts={conflicts} />
        {bookingHasMissingAssignment({ ...b, driver_id: driverId || null, vehicle_id: vehicleId || null, return_driver_id: returnDriverId || null, return_vehicle_id: returnVehicleId || null }) && <div className="dispatcher-missing-badge">⚠ NIEPEŁNA OBSADA</div>}
        <QuickStatusAction b={b} driverId={activeDriver} vehicleId={activeVehicle} leg={activeLeg?.kind} update={(_id:any,_d:any,_v:any,status:any,leg:any)=>save(status, leg)} saving={saving} />
      </td>
      <td colSpan={2}>
        <LegAssignmentControls b={b} drivers={drivers} vehicles={vehicles} driverId={driverId} vehicleId={vehicleId} returnDriverId={returnDriverId} returnVehicleId={returnVehicleId} setDriverId={setDriverId} setVehicleId={setVehicleId} setReturnDriverId={setReturnDriverId} setReturnVehicleId={setReturnVehicleId} />
      </td>
      <td><button className="btn dispatcher-save" disabled={saving} onClick={() => save()}>{saving ? "ZAPIS..." : "ZAPISZ OBSADĘ"}</button><QuickLinks b={b} /></td>
    </tr>
  );
}

function LegAssignmentControls({ b, drivers, vehicles, driverId, vehicleId, returnDriverId, returnVehicleId, setDriverId, setVehicleId, setReturnDriverId, setReturnVehicleId }: any) {
  const selects = (leg: "primary" | "return", d: string, v: string, setD: any, setV: any) => (
    <div className={`dispatcher-leg-assignment ${leg}`}>
      <strong>{leg === "return" ? "↩ POWRÓT" : "→ WYJAZD"}</strong>
      <select value={d} onChange={(e) => setD(e.target.value)}><option value="">— Kierowca —</option>{drivers.map((x:any)=><option key={x.id} value={x.id}>{x.full_name}</option>)}</select>
      <select value={v} onChange={(e) => setV(e.target.value)}><option value="">— Pojazd —</option>{vehicles.map((x:any)=><option key={x.id} value={x.id}>{x.name} · {x.registration}</option>)}</select>
    </div>
  );
  return <div className="dispatcher-leg-assignments">{selects("primary",driverId,vehicleId,setDriverId,setVehicleId)}{b.service_type === "roundtrip" && selects("return",returnDriverId,returnVehicleId,setReturnDriverId,setReturnVehicleId)}</div>;
}

function DispatchCard({ b, drivers, vehicles, update, saving, conflicts, nowKey }: any) {
  const [driverId, setDriverId] = useState(b.driver_id ?? "");
  const [vehicleId, setVehicleId] = useState(b.vehicle_id ?? "");
  const [returnDriverId, setReturnDriverId] = useState(b.return_driver_id ?? "");
  const [returnVehicleId, setReturnVehicleId] = useState(b.return_vehicle_id ?? "");
  const overdue = isDispatcherOverdue(b, nowKey);
  const company = Array.isArray(b.companies) ? b.companies[0] : b.companies;
  const activeLeg = nextOperationalLeg({ ...b, driver_id: driverId || null, vehicle_id: vehicleId || null, return_driver_id: returnDriverId || null, return_vehicle_id: returnVehicleId || null }, nowKey);
  const activeDriver = activeLeg?.kind === "return" ? returnDriverId : driverId;
  const activeVehicle = activeLeg?.kind === "return" ? returnVehicleId : vehicleId;
  async function save(status = b.status, leg?: "primary" | "return") { await update(b.id, driverId, vehicleId, status, returnDriverId, returnVehicleId, leg); }
  const route = b.service_type === "from_airport" ? `${b.airport_label} → ${b.pickup_address}` : b.service_type === "roundtrip" ? `${b.pickup_address} ↔ ${b.airport_label}` : `${b.pickup_address} → ${b.airport_label}`;
  return (
    <article className={`dispatcher-card ${statusStageClass(b.status)} ${overdue ? "booking-overdue" : ""} ${conflicts.length ? "dispatcher-has-conflict" : ""}`}>
      <div className="dispatcher-card-head"><div><a href={`/panel/rezerwacje/${b.id}`}>{b.booking_number}</a><OperationalLegs b={b} nowKey={nowKey}/></div><span className={`status ${b.status}`}>{statusPl(b.status)}</span></div>
      {overdue && <div className="overdue-badge">⚠ TERMIN MINĄŁ — status niezamknięty</div>}<ConflictBadges conflicts={conflicts} />
      {bookingHasMissingAssignment({ ...b, driver_id: driverId || null, vehicle_id: vehicleId || null, return_driver_id: returnDriverId || null, return_vehicle_id: returnVehicleId || null }) && <div className="dispatcher-missing-badge">⚠ NIEPEŁNA OBSADA</div>}
      <div className="booking-origin">{b.company_id ? <span className="origin-badge b2b">🏢 {company?.name ?? "B2B"}</span> : <span className="origin-badge private">👤 INDYWIDUALNY</span>}</div>
      <div className="dispatcher-card-route"><strong>{b.customer_name}</strong><span>{route}</span></div><FlightOps b={b}/>
      <LegAssignmentControls b={b} drivers={drivers} vehicles={vehicles} driverId={driverId} vehicleId={vehicleId} returnDriverId={returnDriverId} returnVehicleId={returnVehicleId} setDriverId={setDriverId} setVehicleId={setVehicleId} setReturnDriverId={setReturnDriverId} setReturnVehicleId={setReturnVehicleId}/>
      <div className="dispatcher-mobile-actions"><button className="btn secondary" disabled={saving} onClick={() => save()}>{saving ? "ZAPIS..." : "ZAPISZ OBSADĘ"}</button><QuickStatusAction b={b} driverId={activeDriver} vehicleId={activeVehicle} leg={activeLeg?.kind} update={(_id:any,_d:any,_v:any,status:any,leg:any)=>save(status, leg)} saving={saving}/></div>
      <QuickLinks b={b}/>
    </article>
  );
}

