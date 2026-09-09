import { PRICES } from "./pricing";

export type BookingEntry = {
  airport: string;
  vehicle: "car" | "bus";
  chooseService: boolean;
};

// Only these public choices may be preselected by a price-table link.
// Prices, dates, passenger details and payment settings never come from the URL.
export function parseBookingEntry(params: Record<string, string | string[] | undefined>): BookingEntry {
  const airport = typeof params.airport === "string" && Object.prototype.hasOwnProperty.call(PRICES, params.airport)
    ? params.airport : "balice";
  return {
    airport,
    vehicle: params.vehicle === "bus" ? "bus" : "car",
    chooseService: params.service === "transport" || params.entry === "home_transport_link"
  };
}
