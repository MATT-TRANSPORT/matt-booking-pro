"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DriverIssuesAdmin({ issues }: { issues: any[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function resolve(id: string) {
    setBusy(id);
    const r = await fetch("/api/admin/driver-issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", id })
    });
    const d = await r.json();
    setBusy("");
    if (!r.ok) { setMessage(d.error || "Nie udało się zamknąć zgłoszenia."); return; }
    setMessage("✓ Zgłoszenie oznaczone jako rozwiązane.");
    router.refresh();
  }

  if (!issues.length) return <div className="card empty-state"><strong>✓ Brak otwartych zgłoszeń kierowców</strong><span>Wszystkie zgłoszenia są zamknięte.</span></div>;

  return <>
    {message && <div className="admin-save-message" style={{ marginBottom: 14 }}>{message}</div>}
    <div style={{ display: "grid", gap: 14 }}>
      {issues.map((x) => <article className="card" key={x.id}>
        <div className="company-section-head">
          <div>
            <span className="badge">{x.issue_type === "mileage" ? "PRZEBIEG" : "ZGŁOSZENIE KIEROWCY"}</span>
            <h2 style={{ marginTop: 8 }}>{x.drivers?.full_name || "Kierowca"} · {x.bookings?.booking_number || "bez rezerwacji"}</h2>
            <p className="muted">{new Date(x.created_at).toLocaleString("pl-PL")} · {x.vehicles ? `${x.vehicles.name} ${x.vehicles.registration}` : "brak pojazdu"}</p>
          </div>
          <button className="btn secondary" disabled={busy === x.id} onClick={() => resolve(x.id)}>{busy === x.id ? "ZAPIS..." : "✓ ROZWIĄZANE"}</button>
        </div>
        <p style={{ whiteSpace: "pre-wrap" }}>{x.description}</p>
        {x.mileage !== null && x.mileage !== undefined && <p><strong>Przebieg: {Number(x.mileage).toLocaleString("pl-PL")} km</strong></p>}
        {x.photo_url && <a className="btn secondary" href={x.photo_url} target="_blank" rel="noreferrer">📷 ZOBACZ ZDJĘCIE</a>}
      </article>)}
    </div>
  </>;
}
