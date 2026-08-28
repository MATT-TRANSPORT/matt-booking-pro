"use client";

import { useEffect } from "react";
import { captureGrowthTracking } from "@/lib/growthTracking";

export default function GrowthTracker() {
  useEffect(() => {
    captureGrowthTracking();
  }, []);
  return null;
}
