"use client";

import { useState } from "react";

export default function PortalAccessButton({
  type,
  id,
  active
}: {
  type: "driver" | "company";
  id: string;
  active?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  async function run(action: "send_link" | "temporary_password") {
    if (
      action === "temporary_password" &&
      !window.confirm(
        "Wygenerować i od razu ustawić nowe hasło tymczasowe dla tego konta B2B? Poprzednie hasło przestanie działać."
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage("");
    setPassword("");
    setCopied(false);

    const response = await fetch("/api/admin/portal-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, action })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error || "Błąd.");
      return;
    }

    if (action === "temporary_password") {
      setPassword(data.temporary_password || "");
      setMessage("✓ Hasło tymczasowe zostało ustawione. Przekaż je klientowi bezpiecznym kanałem.");
      return;
    }

    setMessage("✓ Link do ustawienia hasła wysłany.");
  }

  async function copyPassword() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="portal-access-box">
      <div className="portal-access-actions">
        <button className="btn secondary" disabled={loading} onClick={() => run("send_link")}>
          {loading ? "PRZETWARZANIE..." : active ? "WYŚLIJ LINK / RESET HASŁA" : "UTWÓRZ KONTO"}
        </button>

        {type === "company" && (
          <button className="btn secondary" disabled={loading} onClick={() => run("temporary_password")}>
            GENERUJ HASŁO TYMCZASOWE
          </button>
        )}
      </div>

      {password && (
        <div className="temporary-password-box">
          <span>HASŁO TYMCZASOWE</span>
          <strong>{password}</strong>
          <button className="btn secondary company-small-btn" type="button" onClick={copyPassword}>
            {copied ? "SKOPIOWANO ✓" : "KOPIUJ HASŁO"}
          </button>
          <small>Hasło jest pokazywane w panelu tylko w tej odpowiedzi. Nie zapisujemy go w bazie jako tekst.</small>
        </div>
      )}

      {message && <small className={message.startsWith("✓") ? "portal-access-success" : "portal-access-error"}>{message}</small>}
    </div>
  );
}
