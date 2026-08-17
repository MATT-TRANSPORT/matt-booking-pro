import PanelNav from "@/components/PanelNav";
import DispatcherClient from "@/components/DispatcherClient";
import { panelClient } from "@/lib/panel";

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

  return (
    <main className="container">
      <span className="badge">MATT DISPATCHER</span>
      <h1>Plan kursów</h1>
      <p className="muted">
        Dzień, tydzień, kursy bez obsady i zaległe — w jednym miejscu.
      </p>
      <PanelNav />
      <DispatcherClient
        bookings={bookings ?? []}
        drivers={drivers ?? []}
        vehicles={vehicles ?? []}
      />
    </main>
  );
}
