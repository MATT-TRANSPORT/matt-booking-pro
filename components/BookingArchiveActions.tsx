"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function reasonLabel(reason: string | null | undefined) {
  if (reason === "overdue") return "po terminie";
  if (reason === "quote_rejected") return "klient zrezygnował z wyceny";
  if (reason === "quote_expired") return "wycena wygasła";
  if (reason === "manual") return "ręcznie przez MATT";
  return "archiwum";
}

export default function BookingArchiveActions({
  booking,
  overdue = false,
  quoteExpired = false,
  quoteRejected = false,
  compact = false
}: {
  booking: any;
  overdue?: boolean;
  quoteExpired?: boolean;
  quoteRejected?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const archived = Boolean(booking?.archived_at);
  const canArchive = !archived && (overdue || quoteRejected || quoteExpired);
  const canDelete = !["completed", "cancelled"].includes(String(booking?.status || "")) &&
    (archived || overdue || quoteRejected || quoteExpired || booking?.quote_status === "priced");
  const reason = quoteRejected
    ? "quote_rejected"
    : quoteExpired
      ? "quote_expired"
      : overdue
        ? "overdue"
        : "manual";

  async function deleteBooking() {
    if (busy || !canDelete) return;

    const confirmed = window.confirm(
      "USUNĄĆ REZERWACJĘ NA STAŁE? Tej operacji nie można cofnąć. Zostanie usunięta także jej historia."
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const response = await fetch("/api/admin/bookings/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, action: "delete" })
      });
      const data = await response.json();
      if (!response.ok) {
        window.alert(data.error || "Nie udało się usunąć rezerwacji.");
        return;
      }
      window.location.replace(
        `/panel/rezerwacje?view=active&deleted=${Date.now()}`
      );
      return;
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Nie udało się usunąć rezerwacji."
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeArchive(nextArchived: boolean) {
    if (busy || (nextArchived && !canArchive)) return;

    const confirmed = window.confirm(
      nextArchived
        ? "Zarchiwizować tę rezerwację? Zniknie z widoku AKTYWNE i pozostanie dostępna w ARCHIWUM."
        : "Przywrócić tę rezerwację z archiwum do aktywnych?"
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const response = await fetch("/api/admin/bookings/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, archived: nextArchived, reason })
      });
      const data = await response.json();
      if (!response.ok) {
        window.alert(data.error || "Nie udało się zmienić archiwizacji.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    if (!canArchive) return null;
    return (
      <button
        type="button"
        className="btn secondary booking-archive-compact-btn"
        disabled={busy}
        onClick={() => changeArchive(true)}
      >
        {busy ? "..." : "📦 ARCHIWIZUJ"}
      </button>
    );
  }

  if (archived) {
    return (
      <section className="card" style={{ marginTop: 16, borderColor: "#64748b" }}>
        <strong>📦 ZARCHIWIZOWANA REZERWACJA</strong>
        <p className="muted" style={{ margin: "8px 0" }}>
          Powód: {reasonLabel(booking.archived_reason)}
          {booking.archived_at ? ` · ${new Date(booking.archived_at).toLocaleString("pl-PL")}` : ""}
        </p>
        <button className="btn secondary" disabled={busy} onClick={() => changeArchive(false)}>
          {busy ? "PRZETWARZANIE..." : "PRZYWRÓĆ DO AKTYWNYCH"}
        </button>
        <button
          className="btn secondary"
          style={{ marginTop: 10, borderColor: "#b91c1c", color: "#fca5a5" }}
          disabled={busy}
          onClick={deleteBooking}
        >
          🗑 USUŃ REZERWACJĘ
        </button>
      </section>
    );
  }

  if (!canArchive && !canDelete) return null;

  return (
    <section className="card" style={{ marginTop: 16, borderColor: "#8f7137" }}>
      <strong>📦 PORZĄDKOWANIE REZERWACJI</strong>
      <p className="muted" style={{ margin: "8px 0" }}>
        Możesz schować tę rezerwację z aktywnych. Powód: <strong>{reasonLabel(reason)}</strong>.
      </p>
      {canArchive && (
        <button className="btn secondary" disabled={busy} onClick={() => changeArchive(true)}>
          {busy ? "ARCHIWIZOWANIE..." : "ARCHIWIZUJ PRZEJAZD"}
        </button>
      )}
      <button
        className="btn secondary"
        style={{ marginTop: 10, borderColor: "#b91c1c", color: "#fca5a5" }}
        disabled={busy}
        onClick={deleteBooking}
      >
        🗑 USUŃ REZERWACJĘ
      </button>
    </section>
  );
}
