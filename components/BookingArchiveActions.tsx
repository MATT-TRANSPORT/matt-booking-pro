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
  booking
}: {
  booking: any;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const archived = Boolean(booking?.archived_at);
  const reason = quoteRejected
    ? "quote_rejected"
    : quoteExpired
      ? "quote_expired"
      : overdue
        ? "overdue"
        : "manual";

  async function changeArchive(nextArchived: boolean) {
    if (busy) return;
    if (nextArchived && !canArchive) return;

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
        body: JSON.stringify({
          bookingId: booking.id,
          archived: nextArchived,
          reason
        })
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

  if (archived) {
    return (
      <section className="card" style={{ marginTop: 16, borderColor: "#64748b" }}>
        <strong>📦 ZARCHIWIZOWANA REZERWACJA</strong>
        <p className="muted" style={{ margin: "8px 0" }}>
          Powód: {reasonLabel(booking.archived_reason)}
          {booking.archived_at
            ? ` · ${new Date(booking.archived_at).toLocaleString("pl-PL")}`
            : ""}
        </p>
        <button className="btn secondary" disabled={busy} onClick={() => changeArchive(false)}>
          {busy ? "PRZETWARZANIE..." : "PRZYWRÓĆ DO AKTYWNYCH"}
        </button>
      </section>
    );
  }

  if (!canArchive) return null;

  return (
    <section className="card" style={{ marginTop: 16, borderColor: "#8f7137" }}>
      <strong>📦 PORZĄDKOWANIE REZERWACJI</strong>
      <p className="muted" style={{ margin: "8px 0" }}>
        Możesz schować tę rezerwację z aktywnych. Powód: <strong>{reasonLabel(reason)}</strong>.
      </p>
      <button className="btn secondary" disabled={busy} onClick={() => changeArchive(true)}>
        {busy ? "ARCHIWIZOWANIE..." : "ARCHIWIZUJ PRZEJAZD"}
      </button>
    </section>
  );
}
