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

function dateTimeKey(dateValue?: string | null, timeValue?: string | null) {
  const date = String(dateValue || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const rawTime = String(timeValue || "00:00");
  const match = rawTime.match(/^(\d{1,2}):(\d{2})/);
  const hour = match ? match[1].padStart(2, "0") : "00";
  const minute = match ? match[2] : "00";
  return `${date}T${hour}:${minute}`;
}

export function companyWarsawNowKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function companyCurrentMonthRange(now = new Date()) {
  const today = companyWarsawNowKey(now).slice(0, 10);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    start: `${year}-${String(month).padStart(2, "0")}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
  };
}

export function companyBookingScheduleInfo(booking: any, nowKey = companyWarsawNowKey()) {
  const status = String(booking?.status || "").trim().toLowerCase();
  const primary = dateTimeKey(booking?.travel_date, booking?.travel_time);
  const returnLeg = booking?.service_type === "roundtrip"
    ? dateTimeKey(booking?.return_date, booking?.return_time)
    : "";
  const legs = [primary, returnLeg].filter(Boolean).sort();
  const liveStatuses = new Set(["in_progress", "arrived", "picked_up"]);

  if (status === "completed") {
    return { archived: true, reason: "completed" as const, group: 2, sortKey: legs.at(-1) || "" };
  }
  if (status === "cancelled") {
    return { archived: true, reason: "cancelled" as const, group: 2, sortKey: legs.at(-1) || "" };
  }
  if (liveStatuses.has(status)) {
    return { archived: false, reason: "active" as const, group: 0, sortKey: legs[0] || nowKey };
  }

  const upcomingLeg = legs.find((key) => key >= nowKey);
  if (upcomingLeg) {
    return { archived: false, reason: "upcoming" as const, group: 1, sortKey: upcomingLeg };
  }
  if (!legs.length) {
    return { archived: false, reason: "upcoming" as const, group: 1, sortKey: "9999-12-31T23:59" };
  }
  return { archived: true, reason: "expired" as const, group: 2, sortKey: legs.at(-1) || "" };
}

export function sortCompanyBookings<T = any>(bookings: T[], nowKey = companyWarsawNowKey()) {
  return [...bookings].sort((a: any, b: any) => {
    const left = companyBookingScheduleInfo(a, nowKey);
    const right = companyBookingScheduleInfo(b, nowKey);
    if (left.group !== right.group) return left.group - right.group;
    if (left.sortKey !== right.sortKey) {
      return left.group === 2
        ? right.sortKey.localeCompare(left.sortKey)
        : left.sortKey.localeCompare(right.sortKey);
    }
    return String(b?.created_at || "").localeCompare(String(a?.created_at || ""));
  });
}

