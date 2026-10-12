"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WeddingBookingActions({
  booking
}: {
  booking: any;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "confirm" | "delete">("");
  const [message, setMessage] = useState("");
  const pending = String(booking.status || "pending") === "pending";

  async function run(action: "confirm" | "delete") {
    if (busy) return;

    if (action === "confirm") {
      if (!window.confirm("Oznaczyć ten transport weselny jako zaakceptowany?")) return;
    }

    if (action === "delete") {
      if (
        !window.confirm(
          "USUNĄĆ TEN TRANSPORT WESELNY NA STAŁE?\n\nOperacji nie można cofnąć. Usunięta zostanie również przypisana obsada."
        )
      ) {
        return;
      }
    }

    setBusy(action);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/wedding-bookings/${booking.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się wykonać operacji.");
      }

      if (action === "delete") {
        window.location.replace("/panel/dyspozytor?weddingDeleted=1");
        return;
      }

      setMessage("✓ Transport weselny oznaczony jako zaakceptowany.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nie udało się wykonać operacji."
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="card wedding-admin-actions">
      <h2>Status zlecenia weselnego</h2>

      <div className={`wedding-admin-status ${pending ? "pending" : "confirmed"}`}>
        <span>Status</span>
        <strong>{pending ? "OCZEKUJE NA AKCEPTACJĘ" : "✓ ZAAKCEPTOWANE"}</strong>
      </div>

      {pending ? (
        <>
          <p className="muted">
            Po akceptacji zlecenie jest chronione przed przypadkowym trwałym usunięciem.
          </p>
          <div className="wedding-admin-actions-row">
            <button
              type="button"
              className="btn"
              disabled={Boolean(busy)}
              onClick={() => run("confirm")}
            >
              {busy === "confirm" ? "ZAPISYWANIE..." : "✓ OZNACZ JAKO ZAAKCEPTOWANE"}
            </button>
            <button
              type="button"
              className="btn secondary wedding-delete-btn"
              disabled={Boolean(busy)}
              onClick={() => run("delete")}
            >
              {busy === "delete" ? "USUWANIE..." : "USUŃ NIEZAAKCEPTOWANE"}
            </button>
          </div>
        </>
      ) : (
        <p className="muted">
          Zaakceptowanego transportu nie można trwale usunąć tym przyciskiem.
        </p>
      )}

      {message && <div className="admin-save-message">{message}</div>}
    </div>
  );
}
