import { assertSafeStripeKey } from "@/lib/testEnvironment";
import Stripe from "stripe";

let instance: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "Płatności online nie są jeszcze skonfigurowane: brak STRIPE_SECRET_KEY."
    );
  }

  assertSafeStripeKey(secretKey);

  if (!instance) {
    instance = new Stripe(secretKey);
  }

  return instance;
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      "Brak STRIPE_WEBHOOK_SECRET."
    );
  }

  return secret;
}

export async function expireCheckoutSession(
  sessionId?: string | null
) {
  if (!sessionId || !process.env.STRIPE_SECRET_KEY) {
    return false;
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status === "open") {
      await stripe.checkout.sessions.expire(sessionId);
      return true;
    }
  } catch (error) {
    console.error("Stripe expire session:", error);
  }

  return false;
}

// Fail closed: a completed or unverifiable session must never be detached from a booking.
export async function expireCheckoutSessionForChange(sessionId?: string | null) {
  if (!sessionId) return;
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.status === "expired" && session.payment_status === "unpaid") return;
  if (session.status !== "open" || session.payment_status !== "unpaid") {
    throw new Error("Payment requires review before changing its method");
  }
  const expired = await stripe.checkout.sessions.expire(sessionId);
  if (expired.status !== "expired") throw new Error("Checkout expiration failed");
}
