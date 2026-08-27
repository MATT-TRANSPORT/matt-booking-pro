"use client";

import { useEffect, useState } from "react";
import {
  onlinePaymentEligible,
  paymentStatusLabel
} from "@/lib/payment";

export default function OnlinePaymentCard({
  booking
}: {
  booking: any;
}) {
  const [status, setStatus] = useState(
    String(booking.payment_status || "pending")
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const eligible = onlinePaymentEligible(booking);
  const bookingStatus = String(booking.status || "");
  const available =
    ["confirmed", "assigned"].includes(bookingStatus) &&
    !["paid", "refunded", "review"].includes(status);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const paymentResult = query.get("payment");
    const shouldFocus = query.get("pay") === "1";

    if (shouldFocus || paymentResult) {
      setTimeout(() => {
        document
          .getElementById("online-payment")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
      }, 250);
    }

    if (paymentResult === "cancelled") {
      setMessage(
        "Płatność została przerwana. Możesz spróbować ponownie."
      );
    }

    if (paymentResult === "success") {
      setMessage(
        "Płatność została przyjęta. Potwierdzamy jej status…"
      );
      refreshPaymentStatus();
    }
  }, []);

  async function refreshPaymentStatus() {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const response = await fetch(
          `/api/client-booking/${booking.customer_access_token}`,
          { cache: "no-store" }
        );
        const data = await response.json();
        const next = String(
          data?.booking?.payment_status || "pending"
        );

        setStatus(next);

        if (next === "paid") {
          setMessage("✓ Płatność została zaksięgowana. Dziękujemy.");
          return;
        }

        if (next === "review") {
          setMessage(
            "Płatność dotarła, ale wymaga weryfikacji przez MATT TRANSPORT."
          );
          return;
        }
      } catch {
        // Kolejna próba poniżej.
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1500)
      );
    }

    setMessage(
      "Płatność została wysłana do operatora. Status może zaktualizować się za chwilę."
    );
  }

  async function pay() {
    if (busy) return;

    setBusy(true);
    setMessage("");

    if (
      booking.company_id &&
      booking.payment_method === "employee_payment" &&
      booking.payment_link &&
      String(booking.payment_link).startsWith("http")
    ) {
      window.location.href = booking.payment_link;
      return;
    }

    try {
      const response = await fetch(
        `/api/payments/checkout/${booking.customer_access_token}`,
        { method: "POST" }
      );

      const contentType =
        response.headers.get("content-type") || "";

      const raw = await response.text();

      let data: any = {};

      if (contentType.includes("application/json")) {
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = {};
        }
      }

      if (!response.ok || !data.url) {
        const fallback =
          response.status === 404
            ? "Endpoint płatności nie jest dostępny w aktualnym wdrożeniu. Wymagany jest backend Stripe Checkout."
            : `Nie udało się rozpocząć płatności (HTTP ${response.status}).`;

        throw new Error(
          data.error || fallback
        );
      }

      window.location.href = data.url;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Nie udało się rozpocząć płatności."
      );
      setBusy(false);
    }
  }

  if (!eligible || booking.company_id) return null;

  return (
    <div
      id="online-payment"
      className={`online-payment-card payment-${status}`}
    >
      <div className="online-payment-head">
        <div>
          <span className="badge">PŁATNOŚĆ ONLINE</span>
          <h3>{paymentStatusLabel(status)}</h3>
        </div>
        <strong>
          {Number(booking.company_id ? (booking.price_gross ?? booking.total_price) : booking.total_price).toFixed(2)} zł
        </strong>
      </div>

      {status === "paid" ? (
        <div className="online-payment-success">
          ✓ Płatność została zaksięgowana.
        </div>
      ) : status === "refunded" ? (
        <div className="online-payment-info">
          ↩ Dla tej płatności zarejestrowano zwrot.
        </div>
      ) : status === "review" ? (
        <div className="online-payment-warning">
          ⚠ Płatność wymaga weryfikacji przez MATT TRANSPORT.
          Nie wykonuj kolejnej płatności.
        </div>
      ) : !["confirmed", "assigned"].includes(bookingStatus) ? (
        <div className="online-payment-info">
          Płatność online zostanie udostępniona po potwierdzeniu rezerwacji przez MATT TRANSPORT.
        </div>
      ) : (
        <>
          <p>
            Zapłać bezpiecznie online za potwierdzoną rezerwację{booking.company_id ? " — kwotę brutto z VAT 8%." : "."}
          </p>
          <button
            type="button"
            className="btn online-pay-button"
            onClick={pay}
            disabled={busy || !available}
          >
            {busy
              ? "PRZECHODZĘ DO PŁATNOŚCI..."
              : "💳 OPŁAĆ REZERWACJĘ ONLINE"}
          </button>
          <small>
            Dostępne metody zależą od konfiguracji operatora płatności.
          </small>
        </>
      )}

      {message && (
        <div className="online-payment-message">
          {message}
        </div>
      )}
    </div>
  );
}
