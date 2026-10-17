"use client";

import { useEffect, useState } from "react";
import { isBookingLocale, resolveCustomerLocale, type BookingLocale } from "@/lib/bookingLocale";

export const CUSTOMER_LOCALE_EVENT = "matt:customer-locale";

export function useCustomerLocale(bookingLocale?: unknown): BookingLocale {
  const [locale, setLocale] = useState<BookingLocale>(resolveCustomerLocale(bookingLocale));
  useEffect(() => {
    function sync() {
      const requested = new URLSearchParams(window.location.search).get("lang");
      let saved: unknown;
      try { saved = window.localStorage.getItem("matt-booking-locale"); } catch { /* Storage can be disabled. */ }
      const next = isBookingLocale(requested) ? requested
        : isBookingLocale(bookingLocale) ? bookingLocale
        : isBookingLocale(saved) ? saved : "pl";
      setLocale(next);
      document.documentElement.lang = next;
    }
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(CUSTOMER_LOCALE_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(CUSTOMER_LOCALE_EVENT, sync);
    };
  }, [bookingLocale]);
  return locale;
}
