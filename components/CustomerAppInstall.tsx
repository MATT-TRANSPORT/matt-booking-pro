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
      setMessage("✓ Zainstalowano");
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
        setMessage("✓ Zainstalowano");
      }
      return;
    }

    if (isIos) {
      setMessage("Safari → Udostępnij → Do ekranu początkowego");
      return;
    }

    setMessage("Menu przeglądarki → Zainstaluj aplikację");
  }

  return (
    <button
      type="button"
      className="customer-quick-card customer-quick-app"
      onClick={install}
      aria-label="Zainstaluj aplikację MATT TRANSPORT"
    >
      <span className="customer-quick-icon" aria-hidden="true">📲</span>
      <strong>{installed ? "Aplikacja gotowa" : "Aplikacja"}</strong>
      <small>{installed ? "MATT TRANSPORT jest na telefonie." : "MATT TRANSPORT na telefonie."}</small>
      <b>{installed ? "ZAINSTALOWANA ✓" : "INSTALUJ →"}</b>
      {message && <em className="customer-quick-message">{message}</em>}
    </button>
  );
}
