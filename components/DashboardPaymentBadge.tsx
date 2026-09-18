"use client";

import { useEffect, useState } from "react";

type PaymentBadge = {
  label: string;
  className: string;
  title: string;
};

function paymentBadge(booking: any, paymentStatus?: string): PaymentBadge {
  const status = String(paymentStatus || booking?.payment_status || "pending").toLowerCase();
  const method = String(booking?.payment_method || "").toLowerCase();

  if (status === "paid") {
    return {
      label: "✅ OPŁACONO",
      className: "paid",
      title: "Płatność zaksięgowana"
    };
  }

  if (status === "refunded") {
    return {
      label: "↩ ZWROT",
      className: "refunded",
      title: "Płatność zwrócona"
    };
  }

  if (status === "review") {
    return {
      label: "⚠ WERYFIKACJA",
      className: "review",
      title: "Płatność wymaga weryfikacji"
    };
  }

  if (status === "failed") {
    return {
      label: "❌ NIEUDANA",
      className: "failed",
      title: "Płatność online nie powiodła się"
    };
  }

  if (booking?.company_id) {
    if (method === "employee_payment") {
      return {
        label: "💳 ONLINE",
        className: "online",
        title: "Płatność online firmy — oczekuje"
      };
    }

    return {
      label: "🏦 PRZELEW",
      className: "transfer",
      title: "Rozliczenie przelewem firmowym"
    };
  }

  if (method === "online" || Boolean(booking?.online_payment_requested)) {
    return {
      label: "💳 ONLINE",
      className: "online",
      title: "Płatność online — oczekuje"
    };
  }

  if (method === "bank_transfer") {
    return {
      label: "🏦 PRZELEW",
      className: "transfer",
      title: "Płatność przelewem tradycyjnym"
    };
  }

  return {
    label: "💵 GOTÓWKA",
    className: "cash",
    title: "Płatność gotówką u kierowcy"
  };
}

export default function DashboardPaymentBadge({ booking }: { booking: any }) {
  const [status, setStatus] = useState(String(booking?.payment_status || "pending").toLowerCase());

  useEffect(() => {
    setStatus(String(booking?.payment_status || "pending").toLowerCase());
  }, [booking?.payment_status]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!booking?.company_id || booking?.payment_method !== "employee_payment") return;

    const result = new URLSearchParams(window.location.search).get("payment");
    if (result !== "success") return;

    let cancelled = false;

    (async () => {
      for (let i = 0; i < 6 && !cancelled; i += 1) {
        try {
          const response = await fetch(
            `/api/company/bookings/${booking.id}/payment-status`,
            { cache: "no-store" }
          );
          const data = await response.json();
          const next = String(data?.booking?.payment_status || "pending").toLowerCase();
          setStatus(next);
          if (["paid", "review", "failed", "refunded"].includes(next)) return;
        } catch {
          // Krótki polling tylko po powrocie ze Stripe.
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [booking?.company_id, booking?.id, booking?.payment_method]);

  const badge = paymentBadge(booking, status);

  return (
    <span
      className={`dashboard-payment-status ${badge.className}`}
      title={badge.title}
      aria-label={badge.title}
    >
      {badge.label}
    </span>
  );
}
