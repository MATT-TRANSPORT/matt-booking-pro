"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GeneralQuoteAdminCard({ booking }: { booking: any }) {
  const router = useRouter();
  const [amount, setAmount] = useState(booking.quote_status === "priced" ? String(Number(booking.total_price || 0).toFixed(2)) : "");
  const [paymentMethod, setPaymentMethod] = useState(["cash","bank_transfer","online"].includes(String(booking.payment_method)) ? String(booking.payment_method) : "cash");
  const [quoteNote, setQuoteNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    if (busy) return;
    const value = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) { setMessage("Podaj poprawną cenę końcową."); return; }
    setBusy(true); setMessage("Zapisywanie wyceny...");
    const r = await fetch("/api/admin/general-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id, amount: value, paymentMethod, quoteNote })
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setMessage(d.error || "Nie udało się zapisać wyceny."); return; }
    setMessage(d.email_sent ? "✓ Wycena zapisana i wysłana klientowi e-mailem." : "✓ Wycena zapisana. E-mail nie został wysłany — sprawdź adres klienta lub logi poczty.");
    router.refresh();
  }

  return <section className="card" style={{ marginTop: 16, borderColor: "#8f7137" }}>
    <span className="badge">WYCENA INDYWIDUALNA A → B</span>
    <h2 style={{ marginTop: 10 }}>{booking.quote_status === "priced" ? "Wycena zapisana" : "Przygotuj cenę"}</h2>
    <p className="muted">Podaj końcową kwotę dla klienta. System zapisze ją w rezerwacji i wyśle klientowi wiadomość z wyceną.</p>
    <div className="grid">
      <label>Cena końcowa (zł)
        <input inputMode="decimal" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="np. 850,00" />
      </label>
      <label>Sposób płatności
        <select value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)}>
          <option value="cash">Gotówka u kierowcy</option>
          <option value="bank_transfer">Przelew tradycyjny</option>
          <option value="online">Płatność online</option>
        </select>
      </label>
    </div>
    <label style={{ marginTop: 12 }}>Wiadomość do klienta (opcjonalnie)
      <textarea rows={3} value={quoteNote} onChange={(e)=>setQuoteNote(e.target.value)} placeholder="Np. cena obejmuje przejazd tam i z powrotem oraz postój..." />
    </label>
    <button className="btn" style={{ width: "100%", marginTop: 14 }} disabled={busy} onClick={save}>{busy ? "ZAPISYWANIE..." : booking.quote_status === "priced" ? "ZAKTUALIZUJ WYCENĘ I WYŚLIJ" : "ZAPISZ WYCENĘ I WYŚLIJ"}</button>
    {message && <div className="admin-save-message" style={{ marginTop: 12 }}>{message}</div>}
  </section>;
}
