"use client";

import { useEffect, useState } from "react";
import { paymentStatusLabel } from "@/lib/payment";

export default function CompanyPaymentCell({ booking, canPay = true }: { booking: any; canPay?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(String(booking.payment_status || "pending").toLowerCase());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const result = new URLSearchParams(window.location.search).get("payment");
    if (result !== "success" || booking.payment_method !== "employee_payment") return;

    let cancelled = false;
    (async () => {
      for (let i = 0; i < 6 && !cancelled; i += 1) {
        try {
          const response = await fetch(`/api/company/bookings/${booking.id}/payment-status`, { cache: "no-store" });
          const data = await response.json();
          const next = String(data?.booking?.payment_status || "pending").toLowerCase();
          setStatus(next);
          if (["paid", "review", "failed", "refunded"].includes(next)) return;
        } catch {
          // spróbuj ponownie
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    })();
    return () => { cancelled = true; };
  }, [booking.id, booking.payment_method]);

  if (booking.payment_method !== "employee_payment") {
    return <span>Przelew firmowy</span>;
  }

  if (status === "paid") return <span className="payment-paid">✓ Opłacono online</span>;
  if (status === "refunded") return <span className="payment-refunded">↩ Zwrot płatności</span>;
  if (status === "review") return <span className="payment-review">⚠ Płatność do weryfikacji</span>;

  const paymentAvailable = ["confirmed", "assigned"].includes(String(booking.status || ""));

  async function pay() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/company/bookings/${booking.id}/checkout`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Nie udało się uruchomić płatności.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się uruchomić płatności.");
      setBusy(false);
    }
  }

  if (!paymentAvailable) return <span className="payment-waiting">Płatność dostępna po potwierdzeniu</span>;
  if (!canPay) return <span className="payment-waiting">{paymentStatusLabel(status)} · płatność dostępna dla administratora firmy</span>;

  return (
    <div className="company-payment-actions company-online-payment-actions">
      <span className="payment-waiting">{status === "failed" ? "Płatność nieudana · można ponowić" : paymentStatusLabel(status)}</span>
      <button type="button" onClick={pay} disabled={busy}>{busy ? "OTWIERANIE..." : "💳 ZAPŁAĆ ONLINE"}</button>
      {error && <small className="payment-error-inline">{error}</small>}
    </div>
  );
}
