"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DriverLogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;

    setBusy(true);

    try {
      const supabase = createClient();

      await supabase.auth.signOut();

      // Hard redirect clears the driver UI state and starts a fresh login flow.
      window.location.href = "/kierowca/login";
    } catch {
      setBusy(false);
      alert("Nie udało się wylogować. Spróbuj ponownie.");
    }
  }

  return (
    <button
      type="button"
      className="btn secondary driver-logout-btn"
      onClick={logout}
      disabled={busy}
    >
      {busy ? "WYLOGOWYWANIE..." : "WYLOGUJ SIĘ"}
    </button>
  );
}
