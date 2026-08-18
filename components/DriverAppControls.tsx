"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

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

export default function DriverAppControls() {
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [pushState, setPushState] =
    useState<"unsupported"|"loading"|"off"|"on"|"denied">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setInstalled(true);
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    initPush();

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

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
      const subscription =
        await registration?.pushManager.getSubscription();

      setPushState(subscription ? "on" : "off");
    } catch {
      setPushState("off");
    }
  }

  async function install() {
    if (!installPrompt) {
      setMessage(
        "Jeżeli nie widzisz instalacji, użyj menu przeglądarki → Dodaj do ekranu głównego / Zainstaluj aplikację."
      );
      return;
    }

    await installPrompt.prompt();
    const result = await installPrompt.userChoice;

    if (result.outcome === "accepted") {
      setInstalled(true);
    }

    setInstallPrompt(null);
  }

  async function enablePush() {
    setMessage("");

    if (!("Notification" in window)) {
      setPushState("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      setPushState(
        permission === "denied" ? "denied" : "off"
      );
      return;
    }

    try {
      const registration = await getRegistration();

      if (!registration) {
        throw new Error("Brak service workera.");
      }

      const keyResponse = await fetch("/api/driver/push/public-key");
      const keyData = await keyResponse.json();

      if (!keyResponse.ok || !keyData.publicKey) {
        throw new Error(
          keyData.error ||
          "Brak publicznego klucza powiadomień."
        );
      }

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(keyData.publicKey)
        });
      }

      const response = await fetch("/api/driver/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(subscription)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Nie udało się zapisać telefonu."
        );
      }

      setPushState("on");
      setMessage("✓ Powiadomienia są aktywne na tym telefonie.");
    } catch (error) {
      setPushState("off");
      setMessage(
        error instanceof Error
          ? error.message
          : "Nie udało się włączyć powiadomień."
      );
    }
  }


  async function testPush() {
    setMessage("Wysyłanie testu...");

    try {
      const response = await fetch(
        "/api/driver/push/test",
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Test nie został wysłany."
        );
      }

      setMessage(
        data.sent > 0
          ? "✓ Test wysłany. Za chwilę powinno pojawić się powiadomienie."
          : "Nie znaleziono aktywnej subskrypcji dla tego telefonu."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Nie udało się wysłać testu."
      );
    }
  }

  async function disablePush() {
    try {
      const registration =
        await navigator.serviceWorker.getRegistration("/");
      const subscription =
        await registration?.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/driver/push/unsubscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        });

        await subscription.unsubscribe();
      }

      setPushState("off");
      setMessage("Powiadomienia wyłączone na tym telefonie.");
    } catch {
      setMessage("Nie udało się wyłączyć powiadomień.");
    }
  }

  return (
    <div className="driver-app-controls card">
      <div>
        <span className="badge">MATT DRIVER APP</span>
        <strong>Aplikacja na telefon</strong>
        <small>
          Instalacja + powiadomienia o kursach i lotach.
        </small>
      </div>

      <div className="driver-app-control-actions">
        {!installed && (
          <button
            type="button"
            className="btn secondary"
            onClick={install}
          >
            📲 ZAINSTALUJ
          </button>
        )}

        {installed && (
          <span className="pwa-installed-badge">
            ✓ ZAINSTALOWANA
          </span>
        )}

        {pushState === "off" && (
          <button
            type="button"
            className="btn"
            onClick={enablePush}
          >
            🔔 WŁĄCZ POWIADOMIENIA
          </button>
        )}

        {pushState === "on" && (
          <button
            type="button"
            className="btn secondary push-on"
            onClick={disablePush}
          >
            🔔 POWIADOMIENIA: ON
          </button>
        )}
        {pushState === "on" && (
          <button
            type="button"
            className="btn secondary"
            onClick={testPush}
          >
            🧪 TEST POWIADOMIENIA
          </button>
        )}

        {pushState === "denied" && (
          <span className="push-warning">
            🔕 Powiadomienia zablokowane w ustawieniach przeglądarki.
          </span>
        )}

        {pushState === "unsupported" && (
          <span className="push-warning">
            Ta przeglądarka nie obsługuje Web Push.
          </span>
        )}
      </div>

      {message && (
        <small className="driver-app-control-message">
          {message}
        </small>
      )}
    </div>
  );
}
