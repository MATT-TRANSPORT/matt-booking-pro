function text(value: unknown, fallback = "—") {
  const out = String(value ?? "").trim();
  return out || fallback;
}

export function additionalStopLegLabel(booking: any) {
  if (!booking?.additional_stop_address) return "";
  const primary = Boolean(booking.additional_stop_primary);
  const returnLeg = Boolean(booking.additional_stop_return);
  if (primary && returnLeg) return "wyjazd i powrót";
  if (returnLeg) return "powrót";
  return booking?.service_type === "from_airport" ? "odbiór z lotniska" : "wyjazd na lotnisko";
}

export function bookingRouteText(booking: any, leg?: "primary" | "return") {
  const pickup = text(booking?.pickup_address);
  const pointToPoint = booking?.booking_category === "point_to_point";
  const destination = text(booking?.destination_address || booking?.airport_label, pointToPoint ? "Punkt B" : "Lotnisko");

  if (pointToPoint) {
    if (leg === "return") return `${destination} → ${pickup}`;
    if (leg === "primary") return `${pickup} → ${destination}`;
    return booking?.service_type === "roundtrip"
      ? `${pickup} ↔ ${destination}`
      : `${pickup} → ${destination}`;
  }

  const airport = destination;
  const stop = text(booking?.additional_stop_address, "");
  const usePrimary = Boolean(stop && booking?.additional_stop_primary);
  const useReturn = Boolean(stop && booking?.additional_stop_return);

  if (leg === "return") {
    return useReturn ? `${airport} → ${stop} → ${pickup}` : `${airport} → ${pickup}`;
  }

  if (leg === "primary") {
    if (booking?.service_type === "from_airport") {
      return usePrimary ? `${airport} → ${stop} → ${pickup}` : `${airport} → ${pickup}`;
    }
    return usePrimary ? `${pickup} → ${stop} → ${airport}` : `${pickup} → ${airport}`;
  }

  if (booking?.service_type === "from_airport") {
    return usePrimary ? `${airport} → ${stop} → ${pickup}` : `${airport} → ${pickup}`;
  }

  if (booking?.service_type === "roundtrip") {
    const base = `${pickup} ↔ ${airport}`;
    if (!stop) return base;
    return `${base} · przystanek: ${stop} (${additionalStopLegLabel(booking)})`;
  }

  return usePrimary ? `${pickup} → ${stop} → ${airport}` : `${pickup} → ${airport}`;
}
