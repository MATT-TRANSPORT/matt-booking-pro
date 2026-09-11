import { PRICES } from "./pricing";

export type BookingEntry = {
  airport: string;
  vehicle: "car" | "bus";
  chooseService: boolean;
};

// Bez parametrów /booking pokazuje hub trzech usług. Linki z cennika i reklam
// mogą nadal otworzyć bezpośrednio istniejący formularz lotniskowy.
export function parseBookingEntry(params: Record<string, string | string[] | undefined>): BookingEntry {
  const airport = typeof params.airport === "string" && Object.prototype.hasOwnProperty.call(PRICES, params.airport)
    ? params.airport : "balice";
  const directAirport =
    params.service === "airport" ||
    params.entry === "transport_choice_airport" ||
    (typeof params.airport === "string" && Boolean(params.airport)) ||
    (typeof params.vehicle === "string" && Boolean(params.vehicle));

  return {
    airport,
    vehicle: params.vehicle === "bus" ? "bus" : "car",
    chooseService: !directAirport
  };
}
