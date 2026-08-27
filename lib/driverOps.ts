import { bookingLegOperationalWindow } from "@/lib/bookingOperationalWindow";

export type DriverLeg = "primary" | "return";

export type DriverStep =
  | "assigned"
  | "in_progress"
  | "arrived"
  | "picked_up"
  | "completed";

export type DriverProgressEntry = {
  status: DriverStep;
  at?: string | null;
};

export type DriverProgress = {
  primary?: DriverProgressEntry | null;
  return?: DriverProgressEntry | null;
};

const STEP_LABELS: Record<DriverStep, string> = {
  assigned: "PRZYPISANY",
  in_progress: "W DRODZE",
  arrived: "NA MIEJSCU",
  picked_up: "PASAŻER ODEBRANY",
  completed: "ZAKOŃCZONY"
};

const LABEL_TO_STEP = Object.fromEntries(
  Object.entries(STEP_LABELS).map(([status, label]) => [label, status])
) as Record<string, DriverStep>;

export const DRIVER_FLOW: DriverStep[] = [
  "assigned",
  "in_progress",
  "arrived",
  "picked_up",
  "completed"
];

export function normalizedDriverStatus(status: unknown): DriverStep | null {
  const value = String(status || "");
  if (value === "confirmed") return "assigned";
  return DRIVER_FLOW.includes(value as DriverStep)
    ? (value as DriverStep)
    : null;
}

export function nextDriverStatus(status: unknown): DriverStep | null {
  const normalized = normalizedDriverStatus(status);
  if (!normalized) return null;
  const index = DRIVER_FLOW.indexOf(normalized);
  if (index < 0 || index >= DRIVER_FLOW.length - 1) return null;
  return DRIVER_FLOW[index + 1];
}

export function driverTransitionAllowed(
  current: unknown,
  target: unknown
) {
  const expected = nextDriverStatus(current);
  return expected === String(target || "");
}

export function driverEventText(
  leg: DriverLeg,
  status: DriverStep,
  driverName: string
) {
  return `MATT DRIVER · ${leg === "return" ? "POWRÓT" : "WYJAZD"} · ${STEP_LABELS[status]} · ${driverName}`;
}

export function driverProgressFromHistory(
  events: Array<{ event?: string | null; created_at?: string | null }> = []
): DriverProgress {
  const progress: DriverProgress = {};

  for (const row of events) {
    const text = String(row?.event || "");
    const match = text.match(
      /^MATT DRIVER · (WYJAZD|POWRÓT) · (PRZYPISANY|W DRODZE|NA MIEJSCU|PASAŻER ODEBRANY|ZAKOŃCZONY) · /
    );

    if (!match) continue;

    const leg: DriverLeg = match[1] === "POWRÓT" ? "return" : "primary";
    const status = LABEL_TO_STEP[match[2]];
    if (!status) continue;

    progress[leg] = {
      status,
      at: row.created_at || null
    };
  }

  return progress;
}

export function currentDriverLeg(
  booking: any,
  progress: DriverProgress = {}
): DriverLeg {
  if (booking?.service_type !== "roundtrip") return "primary";
  return progress.primary?.status === "completed" ? "return" : "primary";
}

export function driverLegLabel(leg: DriverLeg) {
  return leg === "return" ? "Powrót" : "Wyjazd";
}

export function driverLegDate(booking: any, leg: DriverLeg) {
  return String(
    leg === "return" ? booking?.return_date || "" : booking?.travel_date || ""
  ).slice(0, 10);
}

export function driverLegTime(booking: any, leg: DriverLeg) {
  return String(
    leg === "return" ? booking?.return_time || "" : booking?.travel_time || ""
  ).slice(0, 5);
}

export function driverLegOperationalStartDate(booking: any, leg: DriverLeg) {
  return bookingLegOperationalWindow(booking, leg).startDate;
}

export function driverLegOperationalStartTime(booking: any, leg: DriverLeg) {
  return bookingLegOperationalWindow(booking, leg).startTime;
}

export function driverLegOperationalEndTime(booking: any, leg: DriverLeg) {
  return bookingLegOperationalWindow(booking, leg).endTime;
}

export function driverLegKey(booking: any, leg: DriverLeg) {
  return bookingLegOperationalWindow(booking, leg).startKey || "9999-12-31T23:59";
}

export function driverLegFlightNumber(booking: any, leg: DriverLeg) {
  return String(
    leg === "return"
      ? booking?.return_flight_number || ""
      : booking?.flight_number || ""
  ).trim();
}

export function driverPickupTarget(booking: any, leg: DriverLeg) {
  if (leg === "return") {
    return booking?.airport_label || booking?.airport_key || "";
  }

  if (booking?.service_type === "from_airport") {
    return booking?.airport_label || booking?.airport_key || "";
  }

  return booking?.pickup_address || "";
}

export function driverDestinationTarget(booking: any, leg: DriverLeg) {
  if (leg === "return") {
    return booking?.pickup_address || "";
  }

  if (booking?.service_type === "from_airport") {
    return booking?.pickup_address || "";
  }

  return booking?.airport_label || booking?.airport_key || "";
}

export function driverRouteText(booking: any, leg: DriverLeg) {
  return `${driverPickupTarget(booking, leg)} → ${driverDestinationTarget(
    booking,
    leg
  )}`;
}

export function isDriverLegCompleted(
  progress: DriverProgress,
  leg: DriverLeg
) {
  return progress?.[leg]?.status === "completed";
}
