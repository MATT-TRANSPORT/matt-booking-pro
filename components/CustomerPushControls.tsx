"use client";
import { customerText } from "@/lib/customerCopy";
import { useCustomerLocale } from "@/lib/useCustomerLocale";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(
    [...rawData].map((char) => char.charCodeAt(0))
  );
}

export default function CustomerPushControls({
  token,
  compact = false,
  customerLocale
}: {
  token: string;
  compact?: boolean;
  customerLocale?: unknown;
}) {
  const locale = useCustomerLocale(customerLocale);
  const t = (key: string) => customerText(key, locale);
  const [state, setState] = useState<"loading"|"off"|"on"|"denied"|"unsupported">("loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function registration() {
    if (!("serviceWorker" in navigator)) return null;
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
  }

  async function currentSubscription() {
    const reg = await registration();
    return reg?.pushManager.getSubscription() || null;
  }

  useEffect(() => {
    (async () => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      try {
        const sub = await currentSubscription();
        if (!sub) {
          setState("off");
          return;
        }
        const r = await fetch(
          `/api/client-booking/${token}/push/status?endpoint=${encodeURIComponent(sub.endpoint)}`
        );
        const d = await r.json();
        setState(r.ok && d.active ? "on" : "off");
      } catch {
        setState("off");
      }
    })();
  }, [token]);

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        setBusy(false);
        return;
      }

      const reg = await registration();
      if (!reg) throw new Error(t("Ta przeglądarka nie obsługuje powiadomień."));

      const keyResponse = await fetch(`/api/client-booking/${token}/push/public-key`);
      const keyData = await keyResponse.json();
      if (!keyResponse.ok || !keyData.publicKey) {
        throw new Error(keyData.error || t("Brak klucza powiadomień."));
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
        });
      }

      const response = await fetch(`/api/client-booking/${token}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("Nie udało się zapisać powiadomień."));

      setState("on");
      setMessage(t("✓ Bezpłatne powiadomienia są aktywne na tym urządzeniu."));
    } catch (error) {
      setState("off");
      setMessage(error instanceof Error ? error.message : t("Nie udało się włączyć powiadomień."));
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    setMessage("");
    try {
      const sub = await currentSubscription();
      if (sub) {
        const response = await fetch(`/api/client-booking/${token}/push/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || t("Nie udało się wyłączyć powiadomień."));
      }
      // Nie kasujemy przeglądarkowej subskrypcji PushManager — ten sam telefon
      // może równocześnie używać MATT DRIVER lub innej rezerwacji.
      setState("off");
      setMessage(t("Powiadomienia tej rezerwacji zostały wyłączone."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("Nie udało się wyłączyć powiadomień."));
    }
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    setMessage(t("Wysyłanie testu..."));
    try {
      const response = await fetch(`/api/client-booking/${token}/push/test`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("Test nie został wysłany."));
      setMessage(data.sent ? t("✓ Test wysłany — sprawdź powiadomienie na telefonie.") : t("Brak aktywnej subskrypcji na tym urządzeniu."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("Nie udało się wysłać testu."));
    }
    setBusy(false);
  }

  return (
    <div className={compact ? "customer-push-controls compact" : "customer-push-controls"}>
      {!compact && <>
        <h3>{t("🔔 Bezpłatne powiadomienia")}</h3>
        <p className="muted">{t("Włącz na tym telefonie aktualizacje o kierowcy, statusie przejazdu i ważnych zmianach lotu. E-mail nadal działa niezależnie.")}</p>
      </>}

      <div className="customer-push-actions">
        {state === "off" && (
          <button type="button" className="btn" disabled={busy} onClick={enable}>
            {t("🔔 WŁĄCZ POWIADOMIENIA")}</button>
        )}
        {state === "on" && <>
          <button type="button" className="btn secondary push-on" disabled={busy} onClick={disable}>
            {t("🔔 POWIADOMIENIA: ON")}</button>
          <button type="button" className="btn secondary" disabled={busy} onClick={test}>
            🧪 TEST
          </button>
        </>}
        {state === "denied" && <span className="push-warning">{t("🔕 Powiadomienia są zablokowane w ustawieniach przeglądarki.")}</span>}
        {state === "unsupported" && <span className="push-warning">{t("Ta przeglądarka nie obsługuje Web Push.")}</span>}
      </div>
      {message && <small className="driver-app-control-message">{message}</small>}
    </div>
  );
}
