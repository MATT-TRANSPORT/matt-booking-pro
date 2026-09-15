"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function CustomerAppInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setInstalled(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setMessage("✓ Aplikacja MATT TRANSPORT została zainstalowana.");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    setMessage("");

    if (installed) return;

    if (installPrompt) {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      setInstallPrompt(null);

      if (result.outcome === "accepted") {
        setInstalled(true);
        setMessage("✓ Aplikacja MATT TRANSPORT została zainstalowana.");
      }
      return;
    }

    if (isIos) {
      setMessage("Na iPhone/iPad: otwórz tę stronę w Safari → Udostępnij → Do ekranu początkowego.");
      return;
    }

    setMessage("Otwórz menu przeglądarki i wybierz „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.");
  }

  return (
    <aside className="customer-app-card" aria-label="Aplikacja MATT TRANSPORT na telefon">
      <div className="customer-app-copy">
        <span className="customer-app-icon" aria-hidden="true">📲</span>
        <div>
          <strong>MATT TRANSPORT na Twoim telefonie</strong>
          <span>Zainstaluj aplikację i przy kolejnym zamówieniu otwieraj rezerwacje jednym kliknięciem.</span>
        </div>
      </div>

      <div className="customer-app-actions">
        {!installed ? (
          <button type="button" className="customer-app-install" onClick={install}>
            ZAINSTALUJ APLIKACJĘ
          </button>
        ) : (
          <span className="customer-app-installed">✓ APLIKACJA ZAINSTALOWANA</span>
        )}
      </div>

      {message && <small className="customer-app-message">{message}</small>}
    </aside>
  );
}
