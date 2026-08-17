"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FlightAlertBadge from "@/components/FlightAlertBadge";

export default function FlightAlertList({
  alerts
}: {
  alerts: any[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");

  async function acknowledge(id: string) {
    setBusy(id);

    const response = await fetch(
      `/api/admin/flight-alerts/${id}/ack`,
      { method: "POST" }
    );

    setBusy("");

    if (response.ok) {
      router.refresh();
    }
  }

  if (!alerts?.length) return null;

  return (
    <div className="flight-alert-list">
      {alerts.map((alert: any) => (
        <div key={alert.id} className="flight-alert-row">
          <FlightAlertBadge alert={alert} />
          {!alert.acknowledged_at && alert.severity !== "info" && (
            <button
              className="flight-alert-ack"
              disabled={busy === alert.id}
              onClick={() => acknowledge(alert.id)}
            >
              {busy === alert.id ? "..." : "OK / PRZYJĄŁEM"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
