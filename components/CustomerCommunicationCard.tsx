"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CustomerCommunicationCard({
  booking,
  pushLogs,
  activeSubscriptions,
  whatsappUrl
}: {
  booking: any;
  pushLogs: any[];
  activeSubscriptions: number;
  whatsappUrl: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sendNow() {
    if (busy) return;
    setBusy(true);
    setMessage("Wysyłanie...");
    try {
      const response = await fetch("/api/admin/customer-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id })
      });
      const data = await response.json();
      if (!response.ok) setMessage(data.error || "Nie udało się wysłać powiadomienia.");
      else if (data.sent) setMessage(`✓ Push wysłany na ${data.sent_count || 1} urządzenie/a.`);
      else setMessage(data.reason === "no_push_subscription" ? "Klient nie włączył jeszcze Web Push dla tej rezerwacji." : data.error || data.reason || "Powiadomienie pominięte.");
    } catch {
      setMessage("Nie udało się połączyć z modułem komunikacji.");
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card customer-communication-card" style={{ marginTop: 16 }}>
      <div className="customer-communication-title">
        <div>
          <span className="badge">COMMUNICATIONS LITE</span>
          <h2>Komunikacja z klientem</h2>
        </div>
        <span className={`communication-channel ${activeSubscriptions > 0 ? "push" : "email"}`}>
          {activeSubscriptions > 0 ? `🔔 PUSH ON · ${activeSubscriptions}` : "✉️ E-MAIL"}
        </span>
      </div>

      <p className="muted">E-mail pozostaje podstawowym kanałem. Web Push jest bezpłatny i działa po zgodzie klienta na jego urządzeniu.</p>

      <div className="communication-lite-actions">
        <button className="btn secondary" disabled={busy || activeSubscriptions === 0} onClick={sendNow}>
          {busy ? "WYSYŁANIE..." : "🔔 WYŚLIJ PUSH TERAZ"}
        </button>
        {whatsappUrl ? (
          <a className="btn whatsapp-quick-btn" href={whatsappUrl} target="_blank" rel="noreferrer">
            🟢 OTWÓRZ WHATSAPP Z GOTOWĄ WIADOMOŚCIĄ
          </a>
        ) : (
          <button className="btn secondary" disabled>🟢 BRAK NUMERU WHATSAPP</button>
        )}
      </div>

      <small className="communication-lite-note">WhatsApp otwiera gotową wiadomość, ale wysyłasz ją ręcznie. Nie korzystamy z płatnego API.</small>
      {message && <div className="admin-save-message">{message}</div>}

      <div className="customer-message-log">
        <h3>Ostatnie powiadomienia Push</h3>
        {!pushLogs?.length ? (
          <p className="muted">Brak wysłanych powiadomień Push.</p>
        ) : pushLogs.map((item: any) => (
          <div className="customer-message-log-row" key={item.id}>
            <div>
              <strong>🔔 Web Push</strong>
              <span>{item.body || item.event_key}</span>
            </div>
            <div>
              <span className={`message-delivery-status ${Number(item.sent_count) > 0 ? "delivered" : "failed"}`}>
                {Number(item.sent_count) > 0 ? `Wysłano: ${item.sent_count}` : "Nie wysłano"}
              </span>
              <small>{new Date(item.created_at).toLocaleString("pl-PL")}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
