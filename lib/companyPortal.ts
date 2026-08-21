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
  if (booking?.service_type === "from_airport") return `${airport} → ${address}`;
  if (booking?.service_type === "roundtrip") return `${address} ↔ ${airport}`;
  return `${address} → ${airport}`;
}

function finite(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function companyBookingMoney(booking: any) {
  const vatRate = finite(booking?.vat_rate, 8);
  const source = String(booking?.pricing_source || "");
  const snapshot = booking?.pricing_snapshot || {};
  const basePrice = finite(snapshot?.base_price_net ?? booking?.base_price, 0);
  const extraPrice = finite(snapshot?.extra_price_net ?? booking?.extra_price, 0);
  const componentNet = money(basePrice + extraPrice);
  const storedTotal = finite(booking?.total_price, 0);

  if (source === "custom" || source === "standard" || snapshot?.version === 1) {
    const net = money(finite(snapshot?.price_net ?? booking?.price_net, componentNet));
    const vat = money(finite(snapshot?.vat_amount ?? booking?.vat_price, net * (vatRate / 100)));
    const gross = money(net + vat);
    return { net, vatRate, vat, gross };
  }

  if (source === "legacy_b2b" && componentNet > 0) {
    const expectedGross = money(componentNet * (1 + vatRate / 100));
    if (storedTotal > 0 && Math.abs(storedTotal - expectedGross) <= 0.10) {
      const net = componentNet;
      const gross = storedTotal;
      const vat = money(gross - net);
      return { net, vatRate, vat, gross };
    }
    const net = money(finite(booking?.price_net, storedTotal || componentNet));
    const vat = money(net * (vatRate / 100));
    const gross = money(net + vat);
    return { net, vatRate, vat, gross };
  }

  const net = money(finite(booking?.price_net, componentNet || storedTotal));
  const vat = money(finite(booking?.vat_price, net * (vatRate / 100)));
  const gross = money(net + vat);
  return { net, vatRate, vat, gross };
}
