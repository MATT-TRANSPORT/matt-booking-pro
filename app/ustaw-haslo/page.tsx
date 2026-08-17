"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Page() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [message, setMessage] = useState(
    searchParams.get("error") || ""
  );
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        if (!searchParams.get("error")) {
          setMessage(
            "Sesja z linku aktywacyjnego nie została utworzona. Poproś administratora o wysłanie nowego linku."
          );
        }
        setReady(false);
        return;
      }

      setReady(true);
    });
  }, [searchParams]);

  async function save() {
    if (!ready) return;

    if (password.length < 8) {
      setMessage("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }

    if (password !== repeat) {
      setMessage("Hasła nie są takie same.");
      return;
    }

    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("✓ Hasło zostało ustawione. Możesz się teraz zalogować.");
  }

  return (
    <main className="container password-setup-shell">
      <div className="card">
        <span className="badge">MATT TRANSPORT</span>
        <h1>Ustaw hasło</h1>

        {ready && (
          <>
            <label>
              Nowe hasło
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <label>
              Powtórz hasło
              <input
                type="password"
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              />
            </label>

            <button
              className="btn"
              disabled={saving}
              onClick={save}
            >
              {saving ? "ZAPISYWANIE..." : "USTAW HASŁO"}
            </button>
          </>
        )}

        {message && (
          <div
            className={
              message.startsWith("✓")
                ? "admin-save-message"
                : "booking-error"
            }
          >
            {message}
          </div>
        )}

        <div className="access-login-links">
          <a href="/kierowca/login">Panel kierowcy</a>
          <a href="/firma/login">Panel firmy</a>
        </div>
      </div>
    </main>
  );
}
