"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardQuickActions({ booking, leg, activeLeg = true }: { booking: any; leg?: "primary" | "return"; activeLeg?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function setStatus(status: string) {
    if (busy) return;
    setBusy(true);
    setMessage("");

    const response = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: booking.id,
        status,
        driverId: booking.driver_id || null,
        vehicleId: booking.vehicle_id || null,
        ...(leg ? { leg } : {})
      })
    });

    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || "Nie udało się zapisać.");
      return;
    }

    router.refresh();
  }

  const navigationTarget =
    booking.service_type === "from_airport"
      ? booking.airport_label
      : booking.pickup_address;

  return (
    <div className="dashboard-quick-actions">
      <a href={`/panel/rezerwacje/${booking.id}`}>OTWÓRZ</a>

      {booking.phone && (
        <a href={`tel:${booking.phone}`}>ZADZWOŃ</a>
      )}

      {navigationTarget && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(navigationTarget)}`}
          target="_blank"
          rel="noreferrer"
        >
          NAWIGUJ
        </a>
      )}

      {booking.status === "pending" && (
        <button disabled={busy} onClick={() => setStatus("confirmed")}>
          POTWIERDŹ
        </button>
      )}

      {["in_progress", "arrived", "picked_up"].includes(booking.status) &&
        (booking.service_type !== "roundtrip" || activeLeg) && (
        <button disabled={busy} onClick={() => setStatus("completed")}>
          ZAKOŃCZ
        </button>
      )}

      {message && <small>{message}</small>}
    </div>
  );
}
