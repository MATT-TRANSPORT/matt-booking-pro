import PanelNav from "@/components/PanelNav";
import DispatcherClient from "@/components/DispatcherClient";
import { panelClient } from "@/lib/panel";

export default async function Page() {
  const { s } = await panelClient();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const dateFrom = start.toISOString().slice(0, 10);
  const dateTo = end.toISOString().slice(0, 10);

  const [
    { data: bookings },
    { data: drivers },
    { data: vehicles }
  ] = await Promise.all([
    s.from("bookings")
      .select("*,companies(name)")
      .gte("travel_date", dateFrom)
      .lte("travel_date", dateTo)
      .neq("status", "cancelled")
      .order("travel_date")
      .order("travel_time"),
    s.from("drivers").select("*").eq("status", "available").order("full_name"),
    s.from("vehicles").select("*").eq("status", "available").order("name")
  ]);

  return (
    <main className="container">
      <span className="badge">OPERATIONS</span>
      <h1>Plan kursów · 7 dni</h1>
      <PanelNav />
      <DispatcherClient
        bookings={bookings ?? []}
        drivers={drivers ?? []}
        vehicles={vehicles ?? []}
      />
    </main>
  );
}
