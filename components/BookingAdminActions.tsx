"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Driver = {
  id: string;
  full_name: string;
};

type Vehicle = {
  id: string;
  name: string;
  registration: string;
};

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

  async function sendUpdate(mode: "status" | "resources") {
    if (saving) return;

    setSaving(true);
    setMessage(
      mode === "status"
        ? "Zapisywanie statusu..."
        : "Zapisywanie kierowcy i pojazdu..."
    );

    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bookingId,
          status,
          driverId: driverId || null,
          vehicleId: vehicleId || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Nie udało się zapisać zmian.");
        setSaving(false);
        return;
      }

      if (data.status) {
        setStatus(data.status);
      }

      const emailText = data.email_sent
        ? " E-mail do klienta został wysłany."
        : data.email_error
        ? ` Zmiana zapisana, ale e-mail: ${data.email_error}`
        : "";

      setMessage(
        mode === "status"
          ? `✓ Status został zapisany.${emailText}`
          : `✓ Kierowca i pojazd zostały zapisane.${emailText}`
      );

      setSaving(false);
      router.refresh();
    } catch {
      setMessage("Nie udało się połączyć z panelem.");
      setSaving(false);
    }
  }

  async function resendConfirmation() {
    if (saving) return;
    setSaving(true);
    setMessage("Wysyłanie potwierdzenia...");

    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bookingId,
          action: "resend_confirmation"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Nie udało się wysłać wiadomości.");
        setSaving(false);
        return;
      }

      setMessage("✓ Potwierdzenie zostało wysłane ponownie.");
      setSaving(false);
    } catch {
      setMessage("Nie udało się połączyć z usługą e-mail.");
      setSaving(false);
    }
  }


  async function duplicateBooking() {
    if (saving) return;

    const confirmed = window.confirm(
      "Utworzyć kopię tej rezerwacji? Nowa rezerwacja będzie miała status Oczekuje i bez przypisanego kierowcy/pojazdu."
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("Tworzenie kopii rezerwacji...");

    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bookingId,
          action: "duplicate"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Nie udało się utworzyć kopii.");
        setSaving(false);
        return;
      }

      router.push(`/panel/rezerwacje/${data.id}`);
      router.refresh();
    } catch {
      setMessage("Nie udało się połączyć z panelem.");
      setSaving(false);
    }
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
            <option value="in_progress">W drodze / w realizacji</option>
            <option value="arrived">Kierowca na miejscu</option>
            <option value="picked_up">Klient odebrany</option>
            <option value="completed">Zakończona</option>
            <option value="cancelled">Anulowana</option>
          </select>
        </label>

        <div className="admin-action-button">
          <button
            className="btn"
            onClick={() => sendUpdate("status")}
            disabled={saving}
          >
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
        style={{ marginTop: 14, width: "100%" }}
        onClick={() => sendUpdate("resources")}
        disabled={saving}
      >
        ZAPISZ KIEROWCĘ I POJAZD
      </button>

      <button
        className="btn secondary"
        style={{ marginTop: 10, width: "100%" }}
        onClick={resendConfirmation}
        disabled={saving}
      >
        WYŚLIJ POTWIERDZENIE PONOWNIE
      </button>

      <button
        className="btn secondary admin-duplicate-btn"
        style={{ marginTop: 10, width: "100%" }}
        onClick={duplicateBooking}
        disabled={saving}
      >
        DUPLIKUJ REZERWACJĘ
      </button>

      {message && (
        <div className="admin-save-message">
          {message}
        </div>
      )}
    </div>
  );
}
