function text(value: unknown, fallback = "—") {
  const out = String(value ?? "").trim();
  return out || fallback;
}

function isPointToPoint(booking: any) {
  return String(booking?.service_type || "").startsWith("point_to_point");
}

export function additionalStopLegLabel(booking: any) {
  if (!booking?.additional_stop_address) return "";
  const primary = Boolean(booking.additional_stop_primary);
  const returnLeg = Boolean(booking.additional_stop_return);
  if (primary && returnLeg) return "wyjazd i powrót";
  if (returnLeg) return "powrót";
  return booking?.service_type === "from_airport" ? "odbiór z lotniska" : "wyjazd";
}

export function bookingRouteText(booking: any, leg?: "primary" | "return") {
  const pickup = text(booking?.pickup_address);
  const destination = isPointToPoint(booking)
    ? text(booking?.destination_address || booking?.airport_label, "Punkt B")
    : text(booking?.airport_label, "Lotnisko");
  const stop = text(booking?.additional_stop_address, "");
  const usePrimary = Boolean(stop && booking?.additional_stop_primary);
  const useReturn = Boolean(stop && booking?.additional_stop_return);

  if (leg === "return") {
    return useReturn ? `${destination} → ${stop} → ${pickup}` : `${destination} → ${pickup}`;
  }

  if (leg === "primary") {
    if (booking?.service_type === "from_airport") {
      return usePrimary ? `${destination} → ${stop} → ${pickup}` : `${destination} → ${pickup}`;
    }
    return usePrimary ? `${pickup} → ${stop} → ${destination}` : `${pickup} → ${destination}`;
  }

  if (booking?.service_type === "from_airport") {
    return usePrimary ? `${destination} → ${stop} → ${pickup}` : `${destination} → ${pickup}`;
  }

  if (booking?.service_type === "roundtrip" || booking?.service_type === "point_to_point_roundtrip") {
    const base = `${pickup} ↔ ${destination}`;
    if (!stop) return base;
    return `${base} · przystanek: ${stop} (${additionalStopLegLabel(booking)})`;
  }

  return usePrimary ? `${pickup} → ${stop} → ${destination}` : `${pickup} → ${destination}`;
}
