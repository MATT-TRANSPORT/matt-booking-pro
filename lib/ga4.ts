export const GA_MEASUREMENT_ID = "G-BKDS7PH54K";

type Gtag = (...args: any[]) => void;

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: Gtag;
  }
}

const PURCHASE_KEY_PREFIX = "matt_ga4_purchase_v1:";
const inMemorySent = new Set<string>();

function safeKey(transactionId: string) {
  return `${PURCHASE_KEY_PREFIX}${transactionId.trim()}`;
}

function alreadySent(transactionId: string) {
  const key = safeKey(transactionId);
  if (inMemorySent.has(key)) return true;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markSent(transactionId: string) {
  const key = safeKey(transactionId);
  inMemorySent.add(key);
  try { window.localStorage.setItem(key, "1"); } catch {}
}

function ensureGtag(): Gtag {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function (..._args: any[]) {
      window.dataLayer?.push(arguments);
    } as Gtag;
  }
  return window.gtag;
}

export function trackBookingPurchase(input: {
  bookingNumber: string;
  value: number;
  serviceType: "to_airport" | "from_airport" | "roundtrip";
  airportLabel: string;
}) {
  if (typeof window === "undefined") return false;

  const transactionId = String(input.bookingNumber || "").trim();
  const value = Number(input.value);
  if (!transactionId || !Number.isFinite(value) || value <= 0) return false;
  if (alreadySent(transactionId)) return false;

  // Mark before queueing the event so React rerenders / page refreshes cannot double-count it.
  markSent(transactionId);

  const gtag = ensureGtag();
  gtag("event", "purchase", {
    transaction_id: transactionId,
    value: Number(value.toFixed(2)),
    currency: "PLN",
    items: [
      {
        item_id: `airport_transfer_${input.serviceType}`,
        item_name: input.serviceType === "roundtrip"
          ? "Transfer lotniskowy w obie strony"
          : input.serviceType === "from_airport"
          ? "Odbiór z lotniska"
          : "Transfer na lotnisko",
        item_category: "transfer_lotniskowy",
        item_variant: String(input.airportLabel || "Lotnisko").slice(0, 120),
        price: Number(value.toFixed(2)),
        quantity: 1
      }
    ]
  });

  return true;
}
