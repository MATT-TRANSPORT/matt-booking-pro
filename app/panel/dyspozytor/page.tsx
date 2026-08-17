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
      .in("booking_id", bookingIds)
      .eq("leg", "primary");

    flightRows = data ?? [];
  }

  const flightByBooking = new Map(
    flightRows.map((f: any) => [f.booking_id, f])
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

  const alertByBooking = new Map<string, any>();

  for (const alert of alertRows) {
    const current = alertByBooking.get(alert.booking_id);
    const rank = alert.severity === "critical" ? 3 : alert.severity === "warning" ? 2 : 1;
    const currentRank = current?.severity === "critical" ? 3 : current?.severity === "warning" ? 2 : current ? 1 : 0;

    if (!current || rank > currentRank) {
      alertByBooking.set(alert.booking_id, alert);
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
    flight: flightByBooking.get(b.id) ?? null,
    flightAlert: alertByBooking.get(b.id) ?? null
  }));

  return (
    <main className="container">
      <span className="badge">MATT DISPATCHER</span>
      <h1>Plan kursów</h1>
      <p className="muted">
        Dzień, tydzień, kursy bez obsady i zaległe — w jednym miejscu.
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
