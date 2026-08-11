"use client";
import { useState } from "react";

export default function EmailTestButton() {
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);

  async function test() {
    setLoading(true);
    setMessage("Wysyłanie testu...");
    const r=await fetch("/api/admin/email-test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:"kontakt@matt-transport.pl"})});
    const d=await r.json();
    setMessage(r.ok?"✓ E-mail testowy został wysłany.":`Błąd e-mail: ${d.error??"nieznany"}`);
    setLoading(false);
  }

  return <div className="email-test">
    <button className="btn secondary" disabled={loading} onClick={test}>
      {loading?"WYSYŁANIE...":"TEST E-MAIL"}
    </button>
    {message&&<span>{message}</span>}
  </div>;
}
