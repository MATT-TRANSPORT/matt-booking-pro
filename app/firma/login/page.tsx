"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Page() {
  const router = useRouter();
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [message,setMessage] = useState("");
  const [loading,setLoading] = useState(false);

  async function login() {
    if (loading) return;
    setLoading(true); setMessage("");
    const s = createClient();
    const { error } = await s.auth.signInWithPassword({ email, password });
    if (error) { setMessage("Nieprawidłowy e-mail lub hasło."); setLoading(false); return; }
    router.push("/firma"); router.refresh();
  }

  return <main className="container" style={{maxWidth:520}}>
    <div className="card company-login-card">
      <span className="badge">MATT BOOKING PRO ENTERPRISE</span>
      <h1>Panel klienta biznesowego</h1>
      <p className="muted">Zamawiaj transfery i kontroluj rezerwacje swojej firmy.</p>
      <label>E-mail służbowy<input type="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label>Hasło<input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
      <button className="btn" style={{width:"100%",marginTop:18}} disabled={loading} onClick={login}>
        {loading ? "LOGOWANIE..." : "ZALOGUJ DO PANELU FIRMY"}
      </button>
      {message && <div className="booking-error">{message}</div>}
    </div>
  </main>;
}
