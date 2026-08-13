import DriverTrips from "@/components/DriverTrips";
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

  return (
    <main className="container driver-app-shell">
      <DriverTrips
        driver={driver}
        bookings={bookings ?? []}
      />
    </main>
  );
}
