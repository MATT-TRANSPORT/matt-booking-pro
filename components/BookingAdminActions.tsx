"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Driver = { id: string; full_name: string };
type Vehicle = { id: string; name: string; registration: string };

export default function BookingAdminActions({
  bookingId,
  initialStatus,
  initialDriverId,
  initialVehicleId,
  initialReturnDriverId,
  initialReturnVehicleId,
  isRoundtrip = false,
  drivers,
  vehicles
}: {
  bookingId: string;
  initialStatus: string;
  initialDriverId?: string | null;
  initialVehicleId?: string | null;
  initialReturnDriverId?: string | null;
  initialReturnVehicleId?: string | null;
  isRoundtrip?: boolean;
  drivers: Driver[];
  vehicles: Vehicle[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [driverId, setDriverId] = useState(initialDriverId ?? "");
  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? "");
  const [returnDriverId, setReturnDriverId] = useState(initialReturnDriverId ?? "");
  const [returnVehicleId, setReturnVehicleId] = useState(initialReturnVehicleId ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function sendUpdate(mode: "status" | "resources") {
    if (saving) return;
    setSaving(true);
    setMessage(mode === "status" ? "Zapisywanie statusu..." : "Zapisywanie obsady...");

    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bookingId,
          status,
          driverId: driverId || null,
          vehicleId: vehicleId || null,
          ...(isRoundtrip ? {
            returnDriverId: returnDriverId || null,
            returnVehicleId: returnVehicleId || null
          } : {})
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nie udało się zapisać zmian.");
      if (data.status) setStatus(data.status);
      setMessage(mode === "status" ? "✓ Status został zapisany." : "✓ Obsada WYJAZD / POWRÓT została zapisana.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się połączyć z panelem.");
    } finally {
      setSaving(false);
    }
  }

  async function action(name: "resend_confirmation" | "duplicate") {
    if (saving) return;
    if (name === "duplicate" && !window.confirm("Utworzyć kopię tej rezerwacji? Nowa rezerwacja będzie bez obsady.")) return;
    setSaving(true);
    setMessage(name === "duplicate" ? "Tworzenie kopii..." : "Wysyłanie potwierdzenia...");
    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bookingId, action: name })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Operacja nie powiodła się.");
      if (name === "duplicate") {
        router.push(`/panel/rezerwacje/${data.id}`);
      } else {
        setMessage("✓ Potwierdzenie wysłane ponownie.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operacja nie powiodła się.");
    } finally {
      setSaving(false);
    }
  }

  const driverSelect = (value: string, setter: (v: string) => void) => (
    <select value={value} onChange={(e) => setter(e.target.value)}>
      <option value="">— Nieprzypisany —</option>
      {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
    </select>
  );
  const vehicleSelect = (value: string, setter: (v: string) => void) => (
    <select value={value} onChange={(e) => setter(e.target.value)}>
      <option value="">— Nieprzypisany —</option>
      {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.registration}</option>)}
    </select>
  );

  return (
    <div className="card admin-actions-card">
      <h2>Zarządzanie rezerwacją</h2>
      <div className="admin-action-grid">
        <label>Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Oczekuje na potwierdzenie</option>
            <option value="confirmed">Potwierdzona</option>
            <option value="assigned">Kierowca przypisany</option>
            <option value="in_progress">W drodze / w realizacji</option>
            <option value="arrived">Kierowca na miejscu</option>
            <option value="picked_up">Klient odebrany</option>
            <option value="completed">Zakończona</option>
            <option value="cancelled">Anulowana</option>
          </select>
        </label>
        <div className="admin-action-button"><button className="btn" onClick={() => sendUpdate("status")} disabled={saving}>ZAPISZ STATUS</button></div>
      </div>

      <hr className="admin-divider" />
      <div className="booking-leg-assignment primary">
        <div className="booking-leg-assignment-head"><strong>→ WYJAZD</strong><span>Osobna obsada</span></div>
        <div className="admin-action-grid">
          <label>Kierowca{driverSelect(driverId, setDriverId)}</label>
          <label>Pojazd{vehicleSelect(vehicleId, setVehicleId)}</label>
        </div>
      </div>

      {isRoundtrip && (
        <div className="booking-leg-assignment return">
          <div className="booking-leg-assignment-head"><strong>↩ POWRÓT</strong><span>Może być inny kierowca i pojazd</span></div>
          <div className="admin-action-grid">
            <label>Kierowca powrotny{driverSelect(returnDriverId, setReturnDriverId)}</label>
            <label>Pojazd powrotny{vehicleSelect(returnVehicleId, setReturnVehicleId)}</label>
          </div>
        </div>
      )}

      <button className="btn secondary" style={{ marginTop: 14, width: "100%" }} onClick={() => sendUpdate("resources")} disabled={saving}>
        {saving ? "ZAPISYWANIE..." : "ZAPISZ OBSADĘ"}
      </button>
      <button className="btn secondary" style={{ marginTop: 10, width: "100%" }} onClick={() => action("resend_confirmation")} disabled={saving}>WYŚLIJ POTWIERDZENIE PONOWNIE</button>
      <button className="btn secondary admin-duplicate-btn" style={{ marginTop: 10, width: "100%" }} onClick={() => action("duplicate")} disabled={saving}>DUPLIKUJ REZERWACJĘ</button>
      {message && <div className="admin-save-message">{message}</div>}
    </div>
  );
}
