export function companyServiceLabel(value?: string | null) {
  const map: Record<string, string> = {
    to_airport: "Na lotnisko",
    from_airport: "Z lotniska",
    roundtrip: "W obie strony"
  };

  return map[String(value || "").toLowerCase()] || "Transfer lotniskowy";
}

export function companyVehicleLabel(value?: string | null) {
  return value === "bus" ? "Bus do 8 osób" : "Samochód osobowy";
}

export function companyRouteLabel(booking: any) {
  const address = String(booking?.pickup_address || "—");
  const airport = String(booking?.airport_label || "Lotnisko");

  if (booking?.service_type === "from_airport") {
    return `${airport} → ${address}`;
  }

  if (booking?.service_type === "roundtrip") {
    return `${address} ↔ ${airport}`;
  }

  return `${address} → ${airport}`;
}

export function companyBookingMoney(booking: any) {
  const net = Number(booking?.price_net ?? booking?.total_price ?? 0);
  const vatRate = Number(booking?.vat_rate ?? 8);
  const vat = Number(
    booking?.vat_price ??
      Math.round(net * (vatRate / 100) * 100) / 100
  );
  const gross = Number(booking?.price_gross ?? net + vat);

  return { net, vatRate, vat, gross };
}
