import type { Metadata } from "next";
import AirportDeparturePlanner from "@/components/AirportDeparturePlanner";
import "./planner.css";

export const metadata: Metadata = {
  title: "Czas wyjazdu na lotnisko — MATT TRANSPORT",
  description: "Podaj adres odbioru, lotnisko i godzinę lotu. Sprawdź orientacyjny czas przejazdu i sugerowaną godzinę wyjazdu.",
  robots: { index: false, follow: true },
};

export default function AirportPlannerPage() {
  return <AirportDeparturePlanner />;
}
