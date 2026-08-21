"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  onlinePaymentEligible,
  paymentStatusLabel
} from "@/lib/payment";

export default function PaymentLinkBox({
  booking
}: {
  booking: any;
}) {
  const router = useRouter();
  const isEmployeePayment =
    booking.payment_method === "employee_payment";

  const [link, setLink] = useState(
    booking.payment_link ?? ""
  );
  const [paymentStatus, setPaymentStatus] =
    useState(booking.payment_status || "pending");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!onlinePaymentEligible(booking)) {
    return null;
  }

  const stableLink = booking.customer_access_token
    ? `/rezerwacja/${booking.customer_access_token}?pay=1`
    : "";
  const effectiveLink = link || stableLink;
  const paymentAvailable =
    ["confirmed", "assigned"].includes(booking.status) &&
    paymentStatus !== "paid";

  async function copyLink() {
    const value = effectiveLink.startsWith("http")
      ? effectiveLink
      : `${window.location.origin}${effectiveLink}`;

    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function saveLink() {
    if (busy || !isEmployeePayment) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/payment-link",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            bookingId: booking.id,
            link
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Błąd zapisu.");
      }

      setMessage(
        link
          ? "✓ Link zapisany i wysłany."
          : "✓ Własny link został usunięty — system użyje płatności online."
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać linku."
      );
    } finally {
      setBusy(false);
    }
  }

  async function changePaymentStatus(
    action: "mark_paid" | "mark_pending"
  ) {
    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/payment-link",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            bookingId: booking.id,
            action
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Nie udało się zmienić statusu płatności."
        );
      }

      setPaymentStatus(data.payment_status);
      setMessage(
        data.payment_status === "paid"
          ? "✓ Płatność oznaczona ręcznie jako opłacona."
          : "Status cofnięty do oczekującej."
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Nie udało się zmienić statusu."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card payment-link-box">
      <h2>
        {isEmployeePayment
          ? "Płatność pracownika"
          : "Płatność klienta"}
      </h2>

      <div
        className={`admin-payment-status ${paymentStatus}`}
      >
        <span>Status płatności</span>
        <strong>
          {paymentStatus === "paid" ? "✓ " : ""}
          {paymentStatusLabel(paymentStatus).toUpperCase()}
        </strong>
      </div>

      {booking.payment_provider && (
        <p className="muted">
          Źródło statusu: <strong>{booking.payment_provider}</strong>
          {booking.payment_paid_at
            ? ` · ${new Date(booking.payment_paid_at).toLocaleString("pl-PL")}`
            : ""}
        </p>
      )}

      {paymentStatus === "review" &&
        booking.payment_review_reason && (
          <div className="payment-review-admin">
            ⚠ {booking.payment_review_reason}
          </div>
        )}

      {paymentAvailable && effectiveLink && (
        <div className="admin-payment-online-link">
          <a
            className="btn"
            href={effectiveLink}
            target="_blank"
            rel="noreferrer"
          >
            💳 OTWÓRZ LINK PŁATNOŚCI
          </a>
          <button
            type="button"
            className="btn secondary"
            onClick={copyLink}
          >
            {copied ? "SKOPIOWANO ✓" : "KOPIUJ LINK"}
          </button>
        </div>
      )}

      {isEmployeePayment && (
        <details className="manual-payment-link-details">
          <summary>Awaryjny / własny link płatności</summary>
          <p className="muted">
            Opcjonalne. Pozostaw puste, aby korzystać z płatności online systemu.
          </p>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
          />
          <button
            className="btn secondary"
            onClick={saveLink}
            disabled={busy}
          >
            ZAPISZ WŁASNY LINK
          </button>
        </details>
      )}

      {paymentStatus !== "paid" && (
        <button
          className="btn secondary payment-mark-paid"
          onClick={() => changePaymentStatus("mark_paid")}
          disabled={busy}
        >
          ✓ OZNACZ RĘCZNIE JAKO OPŁACONE
        </button>
      )}

      {paymentStatus === "paid" &&
        booking.payment_provider === "manual" && (
          <button
            className="btn secondary payment-mark-pending"
            onClick={() => changePaymentStatus("mark_pending")}
            disabled={busy}
          >
            COFNIJ RĘCZNY STATUS „OPŁACONO”
          </button>
        )}

      {paymentStatus === "paid" &&
        booking.payment_provider === "stripe" && (
          <p className="muted">
            Status pochodzi ze Stripe. Ewentualny zwrot wykonaj po stronie operatora — webhook zaktualizuje system automatycznie.
          </p>
        )}

      {message && (
        <div className="admin-save-message">
          {message}
        </div>
      )}
    </div>
  );
}
