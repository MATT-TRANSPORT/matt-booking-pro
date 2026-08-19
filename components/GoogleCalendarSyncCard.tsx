"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GoogleCalendarSyncCard({
  booking
}: {
  booking: any;
}) {
  const router = useRouter();

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const hasAssignment =
    Boolean(
      booking.driver_id &&
      booking.vehicle_id
    );

  async function syncNow() {
    if (busy) return;

    setBusy(true);
    setMessage(
      "Synchronizacja z Google Calendar..."
    );

    try {
      const response =
        await fetch(
          `/api/admin/calendar/${booking.id}/sync`,
          {
            method: "POST"
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.error ||
            "Nie udało się zsynchronizować kalendarza."
        );
        setBusy(false);
        return;
      }

      if (!data.configured) {
        setMessage(
          "Google Calendar nie jest jeszcze skonfigurowany."
        );
      } else if (data.deleted) {
        setMessage(
          "✓ Usunięto nieaktualne wydarzenie z kalendarza."
        );
      } else {
        setMessage(
          "✓ Rezerwacja jest zsynchronizowana z Google Calendar."
        );
      }

      setBusy(false);
      router.refresh();
    } catch {
      setMessage(
        "Nie udało się połączyć z usługą kalendarza."
      );
      setBusy(false);
    }
  }

  return (
    <div
      className="card google-calendar-sync-card"
      style={{ marginTop: 16 }}
    >
      <div className="google-calendar-title">
        <div>
          <span className="badge">
            GOOGLE CALENDAR
          </span>
          <h2>Kalendarz MATT</h2>
        </div>

        {booking.google_calendar_sync_error ? (
          <span className="calendar-sync-state error">
            ⚠ BŁĄD
          </span>
        ) : booking.google_calendar_event_id ? (
          <span className="calendar-sync-state ok">
            ✓ ZSYNCHRONIZOWANO
          </span>
        ) : (
          <span className="calendar-sync-state waiting">
            OCZEKUJE
          </span>
        )}
      </div>

      {!hasAssignment ? (
        <p className="muted">
          Wydarzenie powstanie automatycznie po
          przypisaniu kierowcy i pojazdu.
        </p>
      ) : (
        <p className="muted">
          Kurs jest automatycznie tworzony lub
          aktualizowany w Google Calendar.
        </p>
      )}

      {booking.google_calendar_synced_at && (
        <p className="calendar-last-sync">
          Ostatnia synchronizacja:{" "}
          <strong>
            {new Date(
              booking.google_calendar_synced_at
            ).toLocaleString("pl-PL")}
          </strong>
        </p>
      )}

      {booking.google_calendar_sync_error && (
        <div className="calendar-sync-error">
          {booking.google_calendar_sync_error}
        </div>
      )}

      <button
        type="button"
        className="btn secondary"
        disabled={busy}
        onClick={syncNow}
        style={{ width: "100%" }}
      >
        {busy
          ? "SYNCHRONIZACJA..."
          : "🔄 SYNCHRONIZUJ TERAZ"}
      </button>

      {message && (
        <div className="admin-save-message">
          {message}
        </div>
      )}
    </div>
  );
}
