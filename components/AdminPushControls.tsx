"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

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

type PushState = "unsupported" | "loading" | "off" | "on" | "denied";

export default function AdminPushControls() {
  const pathname = usePathname();
  const [pushState, setPushState] = useState<PushState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (pathname !== "/panel") return;
    void initPush();
  }, [pathname]);

  async function getRegistration() {
    if (!("serviceWorker" in navigator)) return null;

    const registration = await navigator.serviceWorker.register(
      "/sw.js",
      { scope: "/" }
    );

    await navigator.serviceWorker.ready;
    return registration;
  }

  async function initPush() {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setPushState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }

    try {
      const registration = await getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (!subscription) {
        setPushState("off");
        return;
      }

      const response = await fetch("/api/admin/push/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      const data = await response.json();

      setPushState(response.ok && data.active ? "on" : "off");
    } catch {
      setPushState("off");
    }
  }

  async function enablePush() {
    setMessage("");

    if (!("Notification" in window)) {
      setPushState("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPushState(permission === "denied" ? "denied" : "off");
      return;
    }

    try {
      const registration = await getRegistration();
      if (!registration) throw new Error("Brak service workera.");

      const keyResponse = await fetch("/api/admin/push/public-key");
      const keyData = await keyResponse.json();
      if (!keyResponse.ok || !keyData.publicKey) {
        throw new Error(keyData.error || "Brak publicznego klucza powiadomień.");
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
        });
      }

      const response = await fetch("/api/admin/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się zapisać telefonu.");
      }

      setPushState("on");
      setMessage("✓ Powiadomienia MATT Administrator są aktywne na tym telefonie.");
    } catch (error) {
      setPushState("off");
      setMessage(
        error instanceof Error ? error.message : "Nie udało się włączyć powiadomień."
      );
    }
  }

  async function disablePush() {
    setMessage("");

    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        const response = await fetch("/api/admin/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Nie udało się wyłączyć powiadomień.");
        }
      }

      // Nie wyrejestrowujemy subskrypcji w przeglądarce, bo ten sam telefon
      // może równolegle korzystać z MATT Driver.
      setPushState("off");
      setMessage("Powiadomienia administratora wyłączone na tym telefonie.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nie udało się wyłączyć powiadomień."
      );
    }
  }

  async function testPush() {
    setMessage("Wysyłanie testu...");

    try {
      const response = await fetch("/api/admin/push/test", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Test nie został wysłany.");
      }

      setMessage(
        data.sent > 0
          ? "✓ Test wysłany. Za chwilę powinno pojawić się powiadomienie."
          : "Nie znaleziono aktywnej subskrypcji administratora dla tego konta."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nie udało się wysłać testu."
      );
    }
  }

  if (pathname !== "/panel") return null;

  return (
    <div className="container" style={{ paddingBottom: 0 }}>
      <div className="card" style={{ marginTop: 14, marginBottom: 0 }}>
        <div className="company-section-head">
          <div>
            <span className="badge">MATT ADMINISTRATOR</span>
            <h2 style={{ marginTop: 8 }}>Powiadomienia na telefon</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              Natychmiastowe alerty o nowych rezerwacjach B2C, B2B i weselnych — niezależnie od e-maila.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {pushState === "loading" && <span className="muted">Sprawdzanie…</span>}

            {pushState === "off" && (
              <button type="button" className="btn" onClick={enablePush}>
                🔔 WŁĄCZ POWIADOMIENIA
              </button>
            )}

            {pushState === "on" && (
              <>
                <button type="button" className="btn secondary" onClick={disablePush}>
                  🔔 POWIADOMIENIA: ON
                </button>
                <button type="button" className="btn secondary" onClick={testPush}>
                  🧪 WYŚLIJ TEST
                </button>
              </>
            )}

            {pushState === "denied" && (
              <span className="muted">🔕 Powiadomienia są zablokowane w ustawieniach telefonu/przeglądarki.</span>
            )}

            {pushState === "unsupported" && (
              <span className="muted">Ta przeglądarka nie obsługuje Web Push.</span>
            )}
          </div>
        </div>

        {message && (
          <small style={{ display: "block", marginTop: 10 }}>{message}</small>
        )}
      </div>
    </div>
  );
}
