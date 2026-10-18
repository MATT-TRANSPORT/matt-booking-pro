import { isTestEnvironment } from "@/lib/testEnvironment";

function baseUrl(configured: string | undefined, production: string): string {
  const value = String(configured || "").trim().replace(/\/$/, "");
  if (isTestEnvironment()) {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".vercel.app")) {
      throw new Error("Test links must use the isolated Vercel preview.");
    }
    return url.origin;
  }
  return value && !value.includes("vercel.app") ? value : production;
}

export function bookingOrigin(): string {
  return baseUrl(process.env.NEXT_PUBLIC_BOOKING_URL, "https://booking.matt-transport.pl");
}

export function panelOrigin(): string {
  return baseUrl(process.env.NEXT_PUBLIC_PANEL_URL, "https://panel.matt-transport.pl");
}
