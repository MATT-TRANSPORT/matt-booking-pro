"use client";

import { useEffect, useState } from "react";

export default function BookingReviewForm({ token }: { token: string }) {
  const [booking, setBooking] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/review/${token}`)
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        if (!ok) {
          setMessage(data.error || "Nie udało się otworzyć formularza oceny.");
          return;
        }
        setBooking(data.booking);
        if (data.review) {
          setRating(Number(data.review.rating || 0));
          setFeedback(data.review.feedback || "");
          setGoogleUrl(data.google_url || "");
          setMessage("Dziękujemy — Twoja ocena jest już zapisana.");
        }
      });
  }, [token]);

  async function submit() {
    if (!rating || busy) return;
    setBusy(true);
    setMessage("");
    const r = await fetch(`/api/review/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, feedback })
    });
    const data = await r.json();
    setBusy(false);
    if (!r.ok) {
      setMessage(data.error || "Nie udało się zapisać oceny.");
      return;
    }
    setGoogleUrl(data.google_url || "");
    setMessage(rating === 5
      ? "Dziękujemy za 5/5! Jeśli chcesz, możesz teraz dodać opinię również w Google."
      : "Dziękujemy za opinię. Twoje uwagi trafiły bezpośrednio do MATT TRANSPORT.");
  }

  async function openGoogle() {
    if (!googleUrl) return;
    await fetch(`/api/review/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "google_click" })
    }).catch(() => null);
    window.location.href = googleUrl;
  }

  return (
    <main className="container" style={{ maxWidth: 720 }}>
      <div className="card" style={{ marginTop: 28 }}>
        <span className="badge">MATT TRANSPORT</span>
        <h1 style={{ marginTop: 10 }}>Jak minęła podróż?</h1>
        {booking && <p className="muted">Rezerwacja {booking.booking_number} · {booking.customer_name}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", margin: "28px 0" }}>
          {[1,2,3,4,5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Ocena ${n} na 5`}
              onClick={() => setRating(n)}
              style={{
                fontSize: 34,
                width: 58,
                height: 58,
                borderRadius: 12,
                border: rating >= n ? "1px solid #d5ae5d" : "1px solid #343b49",
                background: rating >= n ? "#3a321f" : "#10141b",
                cursor: "pointer"
              }}
            >⭐</button>
          ))}
        </div>

        <label>
          {rating && rating < 5 ? "Co możemy poprawić?" : "Dodatkowa uwaga (opcjonalnie)"}
          <textarea
            rows={5}
            maxLength={2000}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={rating && rating < 5 ? "Napisz krótko, co wymagało poprawy…" : "Możesz zostawić kilka słów…"}
          />
        </label>

        <button className="btn" style={{ width: "100%", marginTop: 16 }} disabled={!rating || busy} onClick={submit}>
          {busy ? "ZAPISYWANIE..." : "ZAPISZ OCENĘ"}
        </button>

        {message && <div className="admin-save-message" style={{ marginTop: 14 }}>{message}</div>}

        {googleUrl && rating === 5 && (
          <button className="btn secondary" style={{ width: "100%", marginTop: 14 }} onClick={openGoogle}>
            ⭐ DODAJ OPINIĘ W GOOGLE
          </button>
        )}
      </div>
    </main>
  );
}
