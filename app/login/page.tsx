"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("kontakt@matt-transport.pl");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (loading) return;
    setLoading(true);
    setMessage("Logowanie...");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      // Pełna nawigacja jest celowa: po udanym logowaniu przeglądarka
      // wysyła świeże cookies Supabase już w nowym żądaniu do /panel.
      window.location.replace("/panel");
    } catch (error) {
      console.error("Błąd logowania do Panelu MATT:", error);
      setMessage("Nie udało się otworzyć panelu. Spróbuj ponownie.");
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ maxWidth: 520 }}>
      <div className="card">
        <span className="badge">MATT BOOKING PRO</span>
        <h1>Panel MATT</h1>
        <label>
          E-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label style={{ marginTop: 12 }}>
          Hasło
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button
          className="btn"
          style={{ width: "100%", marginTop: 16 }}
          onClick={login}
          disabled={loading}
        >
          {loading ? "LOGOWANIE..." : "ZALOGUJ"}
        </button>
        {message && <p>{message}</p>}
      </div>
    </main>
  );
}
