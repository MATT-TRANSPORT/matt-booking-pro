"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GoogleCalendarSyncCard({ booking }: { booking: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const primaryAssigned = Boolean(booking.driver_id && booking.vehicle_id);
  const returnRequired = booking.service_type === "roundtrip" && booking.return_date && booking.return_time;
  const returnAssigned = !returnRequired || Boolean(booking.return_driver_id && booking.return_vehicle_id);
  const anyAssigned = primaryAssigned || (returnRequired && returnAssigned);
  const fullyAssigned = primaryAssigned && returnAssigned;

  async function syncNow() {
    if (busy) return;
    setBusy(true);
    setMessage("Synchronizacja z Google Calendar...");
    try {
      const response = await fetch(`/api/admin/calendar/${booking.id}/sync`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nie udało się zsynchronizować kalendarza.");

      if (!data.configured) {
        setMessage("Google Calendar nie jest jeszcze skonfigurowany.");
      } else if (data.waitingForAssignment) {
        setMessage("✓ Zsynchronizowano kompletne nogi. Pozostałe wydarzenie czeka na własnego kierowcę i pojazd.");
      } else if (data.deleted) {
        setMessage("✓ Usunięto nieaktualne wydarzenia z kalendarza.");
      } else {
        setMessage("✓ WYJAZD / POWRÓT są zsynchronizowane z Google Calendar.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się połączyć z usługą kalendarza.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card google-calendar-sync-card" style={{ marginTop: 16 }}>
      <div className="google-calendar-title">
        <div><span className="badge">GOOGLE CALENDAR</span><h2>Kalendarz MATT</h2></div>
        {booking.google_calendar_sync_error ? (
          <span className="calendar-sync-state error">⚠ BŁĄD</span>
        ) : booking.google_calendar_event_id || booking.google_calendar_return_event_id ? (
          <span className={`calendar-sync-state ${fullyAssigned ? "ok" : "waiting"}`}>{fullyAssigned ? "✓ ZSYNCHRONIZOWANO" : "CZĘŚCIOWO"}</span>
        ) : (
          <span className="calendar-sync-state waiting">OCZEKUJE</span>
        )}
      </div>

      <div className="calendar-leg-state-grid">
        <div className={primaryAssigned ? "ok" : "waiting"}><strong>→ WYJAZD</strong><span>{primaryAssigned ? "pełna obsada" : "czeka na obsadę"}</span></div>
        {returnRequired && <div className={returnAssigned ? "ok" : "waiting"}><strong>↩ POWRÓT</strong><span>{returnAssigned ? "pełna obsada" : "czeka na obsadę"}</span></div>}
      </div>

      <p className="muted">
        Na lotnisko: blok kalendarza zaczyna się 3 h 30 min wcześniej i trwa 4 h. Odbiór z lotniska: od 30 min przed terminem przez 3 h 30 min.
      </p>

      {booking.google_calendar_synced_at && <p className="calendar-last-sync">Ostatnia synchronizacja: <strong>{new Date(booking.google_calendar_synced_at).toLocaleString("pl-PL")}</strong></p>}
      {booking.google_calendar_sync_error && <div className="calendar-sync-error">{booking.google_calendar_sync_error}</div>}

      <button type="button" className="btn secondary" disabled={busy || !anyAssigned} onClick={syncNow} style={{ width: "100%" }}>
        {busy ? "SYNCHRONIZACJA..." : !anyAssigned ? "OCZEKUJE NA OBSADĘ" : "🔄 SYNCHRONIZUJ TERAZ"}
      </button>
      {message && <div className="admin-save-message">{message}</div>}
    </div>
  );
}
