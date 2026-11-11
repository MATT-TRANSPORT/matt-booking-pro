import { bookingOrigin } from "@/lib/bookingOrigin";
import { isTestEnvironment } from "@/lib/testEnvironment";
import { withCustomerLocale } from "@/lib/bookingLocale";
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

/** A completed journey that was explicitly configured for online payment but is still unpaid. */
export function isCompletedOnlineUnpaid(booking: any) {
  if (!booking || String(booking.status || "").toLowerCase() !== "completed") return false;
  if (!onlinePaymentEligible(booking)) return false;
  return ["pending", "failed", "review"].includes(String(booking.payment_status || "pending").toLowerCase());
}

export const PAYMENT_ALLOWED_BOOKING_STATUSES = [
  "confirmed",
  "assigned",
  "in_progress",
  "arrived",
  "picked_up",
  "completed"
] as const;

export function paymentBookingStatusAllowed(status: unknown) {
  return PAYMENT_ALLOWED_BOOKING_STATUSES.includes(
    String(status || "").toLowerCase() as (typeof PAYMENT_ALLOWED_BOOKING_STATUSES)[number]
  );
}

export function paymentCanStart(booking: any) {
  if (!onlinePaymentEligible(booking)) return false;

  const payment = String(booking.payment_status || "pending").toLowerCase();

  return (
    paymentBookingStatusAllowed(booking.status) &&
    !["paid", "refunded", "review"].includes(payment) &&
    Number(booking.company_id ? (booking.price_gross ?? booking.total_price ?? 0) : (booking.total_price ?? 0)) > 0
  );
}

export function appBaseUrl() {
  if (isTestEnvironment()) return bookingOrigin();
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://panel.matt-transport.pl"
  ).replace(/\/$/, "");
}

export function stablePaymentUrl(booking: any) {
  if (!booking?.customer_access_token) return null;
  const company = Boolean(booking.company_id && booking.payment_method === "employee_payment");
  const route = company ? "platnosc" : "rezerwacja";
  const suffix = company ? "" : "?pay=1";
  return withCustomerLocale(
    `${appBaseUrl()}/${route}/${encodeURIComponent(booking.customer_access_token)}${suffix}`,
    booking.customer_locale
  );
}

export function visiblePaymentUrl(booking: any) {
  const link = String(booking?.payment_link || "").trim();
  // Direct Stripe Checkout links expire; only MATT links are durable.
  if (link && !/^https?:\/\/checkout\.stripe\.com\//i.test(link)) return link;
  return stablePaymentUrl(booking);
}
