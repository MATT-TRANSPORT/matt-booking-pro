"use client";

import { useEffect, useState } from "react";
import { PRICES } from "@/lib/pricing";

export type ClientAirportPrice = {
  label: string;
  car: number;
  bus: number;
  routeAddress?: string;
};

export function useAirportPricing() {
  const [airports, setAirports] = useState<Record<string, ClientAirportPrice>>(PRICES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/airports", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data?.airports || typeof data.airports !== "object") return;
        if (Object.keys(data.airports).length) setAirports(data.airports);
      })
      .catch(() => {
        // Awaryjnie zostaje statyczny cennik z aplikacji.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { airports, loaded };
}
