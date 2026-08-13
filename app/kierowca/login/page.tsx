"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (loading) return;
    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage("Nieprawidłowy e-mail lub hasło.");
      setLoading(false);
      return;
    }

    router.push("/kierowca");
    router.refresh();
  }

  return (
    <main className="container driver-login-shell">
      <div className="card driver-login-card">
        <span className="badge">MATT DRIVER</span>
        <h1>Panel kierowcy</h1>
        <p className="muted">
          Twoje kursy, nawigacja i status przejazdu w jednym miejscu.
        </p>

        <label>
          E-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label>
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
          style={{ width: "100%", marginTop: 18 }}
          onClick={login}
          disabled={loading}
        >
          {loading ? "LOGOWANIE..." : "ZALOGUJ"}
        </button>

        {message && <div className="booking-error">{message}</div>}
      </div>
    </main>
  );
}
