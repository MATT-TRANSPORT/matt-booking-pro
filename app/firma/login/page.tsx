"use client";
import { customerText } from "@/lib/customerCopy";
import { useCustomerLocale } from "@/lib/useCustomerLocale";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Page() {
  const locale=useCustomerLocale();
  const t=(key:string)=>customerText(key,locale);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [message,setMessage] = useState("");
  const [loading,setLoading] = useState(false);

  async function login() {
    if (loading) return;
    setLoading(true); setMessage("");
    try {
    const s = createClient();
    const { error } = await s.auth.signInWithPassword({ email, password });
    if (error) { setMessage(t("Nieprawidłowy e-mail lub hasło.")); setLoading(false); return; }
    window.location.replace(`/firma?lang=${locale}`);
    } catch { setMessage(t("Nie udało się zalogować. Spróbuj ponownie.")); }
    finally { setLoading(false); }
  }

  return <main className="container" style={{maxWidth:520}}>
    <div className="card company-login-card">
      <span className="badge">MATT BOOKING PRO ENTERPRISE</span>
      <h1>{t("Panel klienta biznesowego")}</h1>
      <p className="muted">{t("Zamawiaj transfery i kontroluj rezerwacje swojej firmy.")}</p>
      <label>{t("E-mail służbowy")}<input type="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label>{t("Hasło")}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
      <button className="btn" style={{width:"100%",marginTop:18}} disabled={loading} onClick={login}>
        {loading ? t("LOGOWANIE...") : t("ZALOGUJ DO PANELU FIRMY")}
      </button>
      {message && <div className="booking-error">{message}</div>}
    </div>
  </main>;
}
