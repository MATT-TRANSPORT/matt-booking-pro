import PanelNav from "@/components/PanelNav";
import DispatcherClient from "@/components/DispatcherClient";
import { panelClient } from "@/lib/panel";
import FlightRefreshAllButton from "@/components/FlightRefreshAllButton";
import FlightAutomationStatus from "@/components/FlightAutomationStatus";

export default async function Page() {
  const { s } = await panelClient();

  const [
    { data: bookings },
    { data: drivers },
    { data: vehicles }
  ] = await Promise.all([
    s.from("bookings")
      .select("*,companies(name),drivers(full_name,color)")
      .not("status", "in", "(completed,cancelled)")
      .order("travel_date")
      .order("travel_time")
      .limit(500),
    s.from("drivers").select("*").eq("active", true).order("full_name"),
    s.from("vehicles").select("*").eq("active", true).order("name")
  ]);

  const bookingRows = bookings ?? [];
  const bookingIds = bookingRows.map((b: any) => b.id);
  let flightRows: any[] = [];

  if (bookingIds.length) {
    const { data } = await s
      .from("booking_flights")
      .select("*")
      .in("booking_id", bookingIds);

    flightRows = data ?? [];
  }

  const flightByBookingLeg = new Map(
    flightRows.map((f: any) => [`${f.booking_id}:${f.leg || "primary"}`, f])
  );

  let alertRows: any[] = [];

  if (bookingIds.length) {
    const { data } = await s
      .from("booking_flight_alerts")
      .select("*")
      .in("booking_id", bookingIds)
      .eq("active", true)
      .order("updated_at", { ascending: false });

    alertRows = data ?? [];
  }

  const alertByBookingLeg = new Map<string, any>();

  for (const alert of alertRows) {
    const key = `${alert.booking_id}:${alert.leg || "primary"}`;
    const current = alertByBookingLeg.get(key);
    const rank = alert.severity === "critical" ? 3 : alert.severity === "warning" ? 2 : 1;
    const currentRank = current?.severity === "critical" ? 3 : current?.severity === "warning" ? 2 : current ? 1 : 0;

    if (!current || rank > currentRank) {
      alertByBookingLeg.set(key, alert);
    }
  }

  const { data: lastRun } = await s
    .from("flight_monitor_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const bookingsWithFlights = bookingRows.map((b: any) => ({
    ...b,
    flight: flightByBookingLeg.get(`${b.id}:primary`) ?? null,
    returnFlight: flightByBookingLeg.get(`${b.id}:return`) ?? null,
    flightAlert: alertByBookingLeg.get(`${b.id}:primary`) ?? null,
    returnFlightAlert: alertByBookingLeg.get(`${b.id}:return`) ?? null
  }));

  return (
    <main className="container">
      <span className="badge">MATT DISPATCHER PRO</span>
      <h1>Dyspozytornia</h1>
      <p className="muted">
        Priorytety operacyjne, najbliższe kursy, obsada, konflikty i loty — w jednym miejscu.
      </p>
      <PanelNav />
      <FlightAutomationStatus lastRun={lastRun} />
      <div className="dispatcher-flight-toolbar">
        <FlightRefreshAllButton />
        <span className="muted">
          AirLabs · cache 20 min · maks. 8 zapytań na jedno zbiorcze odświeżenie
        </span>
      </div>
      <DispatcherClient
        bookings={bookingsWithFlights}
        drivers={drivers ?? []}
        vehicles={vehicles ?? []}
      />
    </main>
  );
}
