"use client";

import { useState } from "react";
import { paymentStatusLabel } from "@/lib/payment";

export default function CompanyPaymentCell({
  booking
}: {
  booking: any;
}) {
  const [copied, setCopied] = useState(false);

  if (booking.payment_method !== "employee_payment") {
    return <span>Przelew firmowy</span>;
  }

  const status = String(
    booking.payment_status || "pending"
  ).toLowerCase();

  if (status === "paid") {
    return (
      <span className="payment-paid">
        ✓ Opłacono przez pracownika
      </span>
    );
  }

  if (status === "refunded") {
    return (
      <span className="payment-refunded">
        ↩ Zwrot płatności
      </span>
    );
  }

  if (status === "review") {
    return (
      <span className="payment-review">
        ⚠ Płatność do weryfikacji
      </span>
    );
  }

  const link =
    booking.payment_link ||
    (booking.customer_access_token
      ? `/rezerwacja/${booking.customer_access_token}?pay=1`
      : "");

  if (!link || !["confirmed", "assigned"].includes(booking.status)) {
    return (
      <span className="payment-waiting">
        Płatność dostępna po potwierdzeniu
      </span>
    );
  }

  async function copy() {
    const value = link.startsWith("http")
      ? link
      : `${window.location.origin}${link}`;

    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="company-payment-actions">
      <span className="payment-waiting">
        {status === "failed"
          ? "Płatność nieudana · można ponowić"
          : paymentStatusLabel(status)}
      </span>

      <a
        href={link}
        target="_blank"
        rel="noreferrer"
      >
        OPŁAĆ
      </a>

      <button type="button" onClick={copy}>
        {copied ? "SKOPIOWANO ✓" : "KOPIUJ"}
      </button>
    </div>
  );
}
