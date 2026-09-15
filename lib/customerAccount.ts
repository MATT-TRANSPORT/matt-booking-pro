import { createHash, randomBytes } from "node:crypto";

export const CUSTOMER_SESSION_COOKIE = "matt_customer_session";
export const CUSTOMER_LOGIN_TTL_MINUTES = 15;
export const CUSTOMER_SESSION_TTL_DAYS = 30;

export function normalizeCustomerEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function validCustomerEmail(value: string) {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function newCustomerToken() {
  return randomBytes(32).toString("base64url");
}

export function hashCustomerToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function customerLoginExpiry() {
  return new Date(Date.now() + CUSTOMER_LOGIN_TTL_MINUTES * 60_000);
}

export function customerSessionExpiry() {
  return new Date(Date.now() + CUSTOMER_SESSION_TTL_DAYS * 24 * 60 * 60_000);
}

export function customerBookingBaseUrl() {
  return String(
    process.env.NEXT_PUBLIC_BOOKING_URL || "https://booking.matt-transport.pl"
  ).replace(/\/$/, "");
}

export function escapeCustomerHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function customerHasPrivateBookings(admin: any, email: string) {
  const [{ data: booking }, { data: wedding }] = await Promise.all([
    admin
      .from("bookings")
      .select("id")
      .eq("customer_email_normalized", email)
      .is("company_id", null)
      .limit(1)
      .maybeSingle(),
    admin
      .from("wedding_bookings")
      .select("id")
      .eq("customer_email_normalized", email)
      .limit(1)
      .maybeSingle()
  ]);

  return Boolean(booking || wedding);
}

export async function customerSessionByRawToken(admin: any, rawToken: string | null | undefined) {
  if (!rawToken) return null;

  const sessionHash = hashCustomerToken(rawToken);
  const now = new Date().toISOString();
  const { data } = await admin
    .from("customer_portal_sessions")
    .select("id,email,expires_at,last_seen_at")
    .eq("session_hash", sessionHash)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .maybeSingle();

  return data || null;
}
