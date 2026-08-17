import DriverTrips from "@/components/DriverTrips";
import DriverLogoutButton from "@/components/DriverLogoutButton";
import { driverClient } from "@/lib/driver";

export default async function Page() {
  const { admin, driver } = await driverClient();

  const today = new Date();
  today.setDate(today.getDate() - 1);
  const from = today.toISOString().slice(0, 10);

  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 30);
  const to = toDate.toISOString().slice(0, 10);

  const { data: bookings } = await admin
    .from("bookings")
    .select("*,companies(name),vehicles(name,registration,color)")
    .eq("driver_id", driver.id)
    .gte("travel_date", from)
    .lte("travel_date", to)
    .neq("status", "cancelled")
    .order("travel_date")
    .order("travel_time");

  const bookingRows = bookings ?? [];
  const bookingIds = bookingRows.map((b: any) => b.id);
  let flightRows: any[] = [];

  if (bookingIds.length) {
    const { data } = await admin
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
    const { data } = await admin
      .from("booking_flight_alerts")
      .select("*")
      .in("booking_id", bookingIds)
      .eq("active", true)
      .order("updated_at", { ascending: false });

    alertRows = data ?? [];
  }

  const alertsByBooking = new Map<string, any[]>();

  for (const alert of alertRows) {
    const list = alertsByBooking.get(alert.booking_id) ?? [];
    list.push(alert);
    alertsByBooking.set(alert.booking_id, list);
  }

  const bookingsWithFlights = bookingRows.map((b: any) => ({
    ...b,
    flight: flightByBooking.get(b.id) ?? null,
    flightAlerts: alertsByBooking.get(b.id) ?? []
  }));

  return (
    <main className="container driver-app-shell">
      <div className="driver-top-actions">
        <DriverLogoutButton />
      </div>

      <DriverTrips
        driver={driver}
        bookings={bookingsWithFlights}
      />
    </main>
  );
}
