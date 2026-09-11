import { PRICES } from "./pricing";

export type BookingEntry = {
  airport: string;
  vehicle: "car" | "bus";
  chooseService: boolean;
};

// Linki z cennika mogą nadal otworzyć od razu formularz lotniskowy.
// Zwykłe wejście na /booking pokazuje wybór 3 głównych usług.
export function parseBookingEntry(params: Record<string, string | string[] | undefined>): BookingEntry {
  const hasAirportParam = typeof params.airport === "string" && Object.prototype.hasOwnProperty.call(PRICES, params.airport);
  const airport = hasAirportParam ? String(params.airport) : "balice";
  const directAirport = hasAirportParam || params.entry === "transport_choice_airport";

  return {
    airport,
    vehicle: params.vehicle === "bus" ? "bus" : "car",
    chooseService: !directAirport
  };
}
