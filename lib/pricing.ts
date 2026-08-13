export const PRICES: Record<string, { label: string; car: number; bus: number }> = {
  pyrzowice: { label: "Katowice-Pyrzowice", car: 260, bus: 360 },
  balice: { label: "Kraków-Balice", car: 370, bus: 430 },
  ostrawa: { label: "Ostrawa", car: 260, bus: 360 },
  wroclaw: { label: "Wrocław", car: 660, bus: 790 },
  warszawa: { label: "Warszawa", car: 990, bus: 1300 },
  prague: { label: "Praga", car: 1300, bus: 1650 },
  vienna: { label: "Wiedeń", car: 1300, bus: 1650 }
};

export function calculateQuote(input: {
  serviceType: string;
  airport: string;
  vehicleType: string;
  distanceKm: number;
  invoiceRequired: boolean;
}) {
  const row = PRICES[input.airport];
  if (!row) throw new Error("Nieprawidłowe lotnisko.");
  const vehicle = input.vehicleType === "bus" ? "bus" : "car";
  const multiplier = input.serviceType === "roundtrip" ? 2 : 1;
  const basePrice = row[vehicle] * multiplier;
  const billableKm = Math.max(0, Number(input.distanceKm) - 40);
  const extraPrice = billableKm * 2.4 * multiplier;
  const subtotal = basePrice + extraPrice;
  const vatPrice = input.invoiceRequired ? subtotal * 0.08 : 0;
  return {
    basePrice: Math.round(basePrice * 100) / 100,
    billableKm: Math.round(billableKm * 10) / 10,
    extraPrice: Math.round(extraPrice * 100) / 100,
    vatPrice: Math.round(vatPrice * 100) / 100,
    totalPrice: Math.round((subtotal + vatPrice) * 100) / 100
  };
}
