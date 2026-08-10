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
  drivers,
  vehicles
}: {
  bookingId: string;
  initialStatus: string;
  initialDriverId?: string | null;
  initialVehicleId?: string | null;
  drivers: Driver[];
  vehicles: Vehicle[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [driverId, setDriverId] = useState(initialDriverId ?? "");
  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveStatus() {
    if (saving) return;
    setSaving(true);
    setMessage("Zapisywanie statusu...");

    const response = await fetch(`/api/bookings/${bookingId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się zmienić statusu.");
      setSaving(false);
      return;
    }

    setMessage("✓ Status został zapisany.");
    setSaving(false);
    router.refresh();
  }

  async function saveDispatch() {
    if (saving) return;
    setSaving(true);
    setMessage("Zapisywanie kierowcy i pojazdu...");

    const response = await fetch("/api/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId,
        driverId: driverId || null,
        vehicleId: vehicleId || null
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się zapisać przydziału.");
      setSaving(false);
      return;
    }

    setMessage("✓ Kierowca i pojazd zostały zapisane.");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="card admin-actions-card">
      <h2>Zarządzanie rezerwacją</h2>

      <div className="admin-action-grid">
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Oczekuje na potwierdzenie</option>
            <option value="confirmed">Potwierdzona</option>
            <option value="assigned">Kierowca przypisany</option>
            <option value="in_progress">W trakcie</option>
            <option value="picked_up">Klient odebrany</option>
            <option value="completed">Zakończona</option>
            <option value="cancelled">Anulowana</option>
          </select>
        </label>

        <div className="admin-action-button">
          <button className="btn" onClick={saveStatus} disabled={saving}>
            {saving ? "ZAPISYWANIE..." : "ZAPISZ STATUS"}
          </button>
        </div>
      </div>

      <hr className="admin-divider" />

      <div className="admin-action-grid">
        <label>
          Kierowca
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">— Nieprzypisany —</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.full_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Pojazd
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">— Nieprzypisany —</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} · {vehicle.registration}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        className="btn secondary"
        style={{ marginTop: 14 }}
        onClick={saveDispatch}
        disabled={saving}
      >
        ZAPISZ KIEROWCĘ I POJAZD
      </button>

      {message && <div className="admin-save-message">{message}</div>}
    </div>
  );
}
