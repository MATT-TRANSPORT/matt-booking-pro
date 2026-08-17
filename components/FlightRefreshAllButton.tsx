"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FlightRefreshAllButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    if (busy) return;
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/flights/refresh-active", {
        method: "POST"
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Nie udało się odświeżyć lotów.");
        setBusy(false);
        return;
      }

      const refreshed = Number(data.refreshed || 0);
      const skipped = Number(data.skipped || 0);

      setMessage(
        `✓ Odświeżono ${refreshed} lotów` +
        (skipped ? ` · pominięto świeże: ${skipped}` : "")
      );

      setBusy(false);
      router.refresh();
    } catch {
      setMessage("Nie udało się połączyć z Flight Monitor.");
      setBusy(false);
    }
  }

  return (
    <div className="flight-refresh-all">
      <button className="btn secondary" disabled={busy} onClick={refresh}>
        {busy ? "SPRAWDZANIE LOTÓW..." : "✈ ODŚWIEŻ AKTYWNE LOTY"}
      </button>
      {message && <small>{message}</small>}
    </div>
  );
}
