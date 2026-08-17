import PanelNav from "@/components/PanelNav";
import DispatcherClient from "@/components/DispatcherClient";
import { panelClient } from "@/lib/panel";
import FlightRefreshAllButton from "@/components/FlightRefreshAllButton";

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

  const bookingsWithFlights = bookingRows.map((b: any) => ({
    ...b,
    flight: flightByBooking.get(b.id) ?? null
  }));

  return (
    <main className="container">
      <span className="badge">MATT DISPATCHER</span>
      <h1>Plan kursów</h1>
      <p className="muted">
        Dzień, tydzień, kursy bez obsady i zaległe — w jednym miejscu.
      </p>
      <PanelNav />
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
