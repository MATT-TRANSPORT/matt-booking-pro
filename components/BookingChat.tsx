"use client";

import { useState } from "react";
import type { BookingLocale } from "@/lib/bookingLocale";
import { classify, copy, indexByAction } from "@/lib/mattAssistant";

export default function BookingChat({ locale }: { locale: BookingLocale }) {
  const [turns, setTurns] = useState<{ question: string; answer: string }[]>([]);
  const [draft, setDraft] = useState("");
  const labels = copy[locale];
  return <details style={{ maxWidth: 420, margin: "1rem auto", padding: 14, background: "#181818", color: "#fff", border: "1px solid #c9a657", borderRadius: 12 }}>
    <summary style={{ cursor: "pointer", color: "#f1ce83" }}>{labels[0]}</summary>
    <p>{labels[3]}</p>
    <div role="log" aria-live="polite">
      {turns.map((turn, i) => <div key={i}><strong>{turn.question}</strong><p>{turn.answer}</p></div>)}
    </div>
    <form onSubmit={event => {
      event.preventDefault();
      const question = draft.trim();
      if (!question) return;
      setTurns(previous => [...previous, { question, answer: labels[indexByAction[classify(question)]] }]);
      setDraft("");
    }}>
      <label>{labels[1]}<input value={draft} maxLength={500} onChange={e => setDraft(e.target.value)} /></label>
      <button type="submit" disabled={!draft.trim()}>{labels[2]}</button>
    </form>
  </details>;
}
