"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_LABELS: Record<string,string> = {
  preparing: "Przygotowanie",
  accepted: "Przyjęto",
  queued: "W kolejce",
  sending: "Wysyłanie",
  sent: "Wysłano",
  delivered: "Dostarczono",
  read: "Odczytano",
  failed: "Błąd",
  undelivered: "Niedostarczono"
};

function channelLabel(channel: string) {
  if (channel === "whatsapp") return "WhatsApp + SMS fallback";
  if (channel === "sms") return "SMS";
  return "E-mail";
}

export default function CustomerCommunicationCard({
  booking,
  messages
}: {
  booking: any;
  messages: any[];
}) {
  const router = useRouter();
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const channel = booking.customer_notification_channel || "email";

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

      if (!response.ok) {
        setMessage(data.error || "Nie udało się wysłać wiadomości.");
      } else if (data.sent) {
        setMessage(`✓ Wysłano przez ${data.channel === "whatsapp" ? "WhatsApp" : "SMS"}.`);
      } else {
        setMessage(data.error || data.reason || "Powiadomienie pominięte.");
      }
    } catch {
      setMessage("Nie udało się połączyć z modułem komunikacji.");
    }

    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card customer-communication-card" style={{marginTop:16}}>
      <div className="customer-communication-title">
        <div>
          <span className="badge">SMS / WHATSAPP</span>
          <h2>Komunikacja z klientem</h2>
        </div>
        <span className={`communication-channel ${channel}`}>
          {channelLabel(channel)}
        </span>
      </div>

      {channel === "email" ? (
        <p className="muted">Klient wybrał tylko e-mail. SMS i WhatsApp nie są wysyłane automatycznie.</p>
      ) : (
        <>
          <p className="muted">Automatycznie: przyjęcie/potwierdzenie, przypisanie kierowcy, przypomnienie ok. 2h przed kursem, wyjazd kierowcy, przyjazd na miejsce i ważne alerty lotnicze.</p>
          {channel === "whatsapp" && (
            <p className="communication-fallback-note">WhatsApp korzysta z zatwierdzonego szablonu. Jeśli wysyłka WhatsApp się nie powiedzie, system próbuje wysłać SMS.</p>
          )}
          <button className="btn secondary" style={{width:"100%"}} disabled={busy} onClick={sendNow}>
            {busy ? "WYSYŁANIE..." : "📨 WYŚLIJ AKTUALIZACJĘ TERAZ"}
          </button>
        </>
      )}

      {message && <div className="admin-save-message">{message}</div>}

      <div className="customer-message-log">
        <h3>Ostatnie wiadomości</h3>
        {!messages?.length ? (
          <p className="muted">Brak wysłanych SMS/WhatsApp.</p>
        ) : messages.map((item:any)=>(
          <div className="customer-message-log-row" key={item.id}>
            <div>
              <strong>{item.channel === "whatsapp" ? "🟢 WhatsApp" : "💬 SMS"}</strong>
              <span>{item.body || item.event_key}</span>
            </div>
            <div>
              <span className={`message-delivery-status ${item.status}`}>
                {STATUS_LABELS[item.status] || item.status}
              </span>
              <small>{new Date(item.created_at).toLocaleString("pl-PL")}</small>
            </div>
            {item.error_message && <small className="message-delivery-error">{item.error_message}</small>}
          </div>
        ))}
      </div>
    </div>
  );
}
