export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Oczekuje na płatność",
  paid: "Opłacono",
  failed: "Płatność nieudana",
  refunded: "Zwrot",
  review: "Do weryfikacji"
};

export function paymentStatusLabel(status: unknown) {
  const key = String(status || "pending").toLowerCase();
  return PAYMENT_STATUS_LABELS[key] || key;
}

export function onlinePaymentEligible(booking: any) {
  if (!booking) return false;

  // Klient indywidualny: tylko jeśli zaznaczył płatność online w formularzu.
  if (!booking.company_id) {
    return (
      booking.payment_method === "online" ||
      Boolean(booking.online_payment_requested)
    );
  }

  // B2B: wartość legacy employee_payment od v4.1 oznacza płatność online firmy.
  return booking.payment_method === "employee_payment";
}

export function paymentCanStart(booking: any) {
  if (!onlinePaymentEligible(booking)) return false;

  const status = String(booking.status || "").toLowerCase();
  const payment = String(booking.payment_status || "pending").toLowerCase();

  return (
    ["confirmed", "assigned"].includes(status) &&
    !["paid", "refunded", "review"].includes(payment) &&
    Number(booking.company_id ? (booking.price_gross ?? booking.total_price ?? 0) : (booking.total_price ?? 0)) > 0
  );
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://panel.matt-transport.pl"
  ).replace(/\/$/, "");
}

export function stablePaymentUrl(booking: any) {
  if (!booking?.customer_access_token) return null;

  return `${appBaseUrl()}/rezerwacja/${booking.customer_access_token}?pay=1`;
}

export function visiblePaymentUrl(booking: any) {
  return booking?.payment_link || stablePaymentUrl(booking);
}
