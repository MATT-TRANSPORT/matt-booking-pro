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

export function finiteMoney(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function hasFiniteValue(value: unknown) {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
  );
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Jedno źródło prawdy dla wyświetlania pieniędzy B2B.
 *
 * Obsługuje:
 * 1. nowe rezerwacje B2B PRO (price_net / price_gross / snapshot),
 * 2. rezerwacje historyczne, w których total_price było ceną NETTO,
 * 3. zapisy przejściowe, gdzie total_price jest już BRUTTO i vat_price > 0.
 */
export function companyBookingMoney(booking: any) {
  const snapshot =
    booking?.pricing_snapshot &&
    typeof booking.pricing_snapshot === "object"
      ? booking.pricing_snapshot
      : {};

  const vatRate = finiteMoney(
    booking?.vat_rate ?? snapshot?.vat_rate,
    8
  );

  if (hasFiniteValue(snapshot?.price_net)) {
    const net = finiteMoney(snapshot.price_net);
    const vat = hasFiniteValue(snapshot?.vat_amount)
      ? finiteMoney(snapshot.vat_amount)
      : roundMoney(net * (vatRate / 100));
    const gross = hasFiniteValue(snapshot?.price_gross)
      ? finiteMoney(snapshot.price_gross)
      : roundMoney(net + vat);

    return {
      net,
      vatRate,
      vat,
      gross,
      source: "snapshot" as const
    };
  }

  if (hasFiniteValue(booking?.price_net)) {
    const net = finiteMoney(booking.price_net);
    const vat = hasFiniteValue(booking?.vat_price)
      ? finiteMoney(booking.vat_price)
      : roundMoney(net * (vatRate / 100));
    const gross = hasFiniteValue(booking?.price_gross)
      ? finiteMoney(booking.price_gross)
      : roundMoney(net + vat);

    return {
      net,
      vatRate,
      vat,
      gross,
      source: "b2b_pro" as const
    };
  }

  const base = finiteMoney(booking?.base_price);
  const extra = finiteMoney(booking?.extra_price);
  const baseAndExtra = roundMoney(base + extra);
  const total = finiteMoney(booking?.total_price);
  const storedVat = finiteMoney(booking?.vat_price);

  // Najbezpieczniejszy fallback dla zapisu przejściowego:
  // base_price + extra_price są składowymi NETTO.
  if (baseAndExtra > 0) {
    const net = baseAndExtra;
    const vat =
      storedVat > 0
        ? storedVat
        : roundMoney(net * (vatRate / 100));

    const expectedGross = roundMoney(net + vat);
    const gross =
      total > net &&
      Math.abs(total - expectedGross) <= 0.02
        ? total
        : expectedGross;

    return {
      net,
      vatRate,
      vat,
      gross,
      source: "components" as const
    };
  }

  // Jeżeli istnieje VAT, a brak price_net, total_price traktujemy jako BRUTTO.
  if (storedVat > 0 && total > storedVat) {
    const net = roundMoney(total - storedVat);
    return {
      net,
      vatRate,
      vat: storedVat,
      gross: total,
      source: "gross_total" as const
    };
  }

  // Stary B2B przed v3.3: total_price było NETTO.
  const net = total;
  const vat = roundMoney(net * (vatRate / 100));
  const gross = roundMoney(net + vat);

  return {
    net,
    vatRate,
    vat,
    gross,
    source: "legacy_net" as const
  };
}
