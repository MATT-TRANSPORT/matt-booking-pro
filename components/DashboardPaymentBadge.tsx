type PaymentBadge = {
  label: string;
  className: string;
  title: string;
};

function paymentBadge(booking: any): PaymentBadge {
  const status = String(booking?.payment_status || "pending").toLowerCase();
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
  const badge = paymentBadge(booking);

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
