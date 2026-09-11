import DriverTrips from "@/components/DriverTrips";
import DriverAppControls from "@/components/DriverAppControls";
import DriverIssueReporter from "@/components/DriverIssueReporter";
import { driverClient } from "@/lib/driver";
import { driverProgressFromHistory } from "@/lib/driverOps";
import { bookingHasReturnLeg, sortBookingsChronologically } from "@/lib/bookingOps";

export default async function Page() {
  const { admin, driver } = await driverClient();

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const from = fromDate.toISOString().slice(0, 10);
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 30);
  const to = toDate.toISOString().slice(0, 10);

  const selection = "*,companies(name),vehicles:vehicles!bookings_vehicle_id_fkey(name,registration,color),return_vehicle:vehicles!bookings_return_vehicle_id_fkey(name,registration,color)";
  const [primaryResult, returnResult] = await Promise.all([
    admin.from("bookings").select(selection).eq("driver_id", driver.id).gte("travel_date", from).lte("travel_date", to),
    admin.from("bookings").select(selection).eq("return_driver_id", driver.id).not("return_date", "is", null).gte("return_date", from).lte("return_date", to)
  ]);

  const bookingMap = new Map<string, any>();
  for (const row of [...(primaryResult.data ?? []), ...(returnResult.data ?? [])]) bookingMap.set(row.id, row);
  const bookingRows = Array.from(bookingMap.values());
  const bookingIds = bookingRows.map((b: any) => b.id);
  let flightRows: any[] = [], alertRows: any[] = [], historyRows: any[] = [];

  if (bookingIds.length) {
    const [flightsResult, alertsResult, historyResult] = await Promise.all([
      admin.from("booking_flights").select("*").in("booking_id", bookingIds),
      admin.from("booking_flight_alerts").select("*").in("booking_id", bookingIds).eq("active", true).order("updated_at", { ascending: false }),
      admin.from("booking_history").select("booking_id,event,created_at").in("booking_id", bookingIds).order("created_at", { ascending: true })
    ]);
    flightRows = flightsResult.data ?? []; alertRows = alertsResult.data ?? []; historyRows = historyResult.data ?? [];
  }

  const flightsByBooking = new Map<string, Record<string, any>>();
  for (const flight of flightRows) { const current = flightsByBooking.get(flight.booking_id) ?? {}; current[flight.leg || "primary"] = flight; flightsByBooking.set(flight.booking_id, current); }
  const alertsByBooking = new Map<string, any[]>();
  for (const alert of alertRows) { const list = alertsByBooking.get(alert.booking_id) ?? []; list.push(alert); alertsByBooking.set(alert.booking_id, list); }
  const historyByBooking = new Map<string, any[]>();
  for (const history of historyRows) { const list = historyByBooking.get(history.booking_id) ?? []; list.push(history); historyByBooking.set(history.booking_id, list); }

  const bookingsForDriver = sortBookingsChronologically(bookingRows.map((booking: any) => {
    const progress = driverProgressFromHistory(historyByBooking.get(booking.id) ?? []);
    const primaryAssigned = String(booking.driver_id || "") === String(driver.id);
    const returnAssigned = bookingHasReturnLeg(booking) && String(booking.return_driver_id || "") === String(driver.id);
    const closed = ["completed", "cancelled"].includes(String(booking.status || ""));
    const primaryCompleted = progress.primary?.status === "completed";
    let driverLeg: "primary" | "return" = "primary";
    let driverLegLocked = false;
    let assignedToCurrentDriver = primaryAssigned || returnAssigned;

    if (closed) {
      driverLeg = !primaryAssigned && returnAssigned ? "return" : "primary";
    } else if (bookingHasReturnLeg(booking)) {
      if (primaryCompleted) { driverLeg = "return"; assignedToCurrentDriver = returnAssigned; }
      else if (primaryAssigned) { driverLeg = "primary"; assignedToCurrentDriver = true; }
      else if (returnAssigned) { driverLeg = "return"; driverLegLocked = true; assignedToCurrentDriver = true; }
      else assignedToCurrentDriver = false;
    }

    return { ...booking, flights: flightsByBooking.get(booking.id) ?? {}, flightAlerts: alertsByBooking.get(booking.id) ?? [], driverProgress: progress, _driverLeg: driverLeg, _driverLegLocked: driverLegLocked, _assignedToCurrentDriver: assignedToCurrentDriver };
  }).filter((booking: any) => booking._assignedToCurrentDriver));

  return <main className="container driver-app-shell driver-pro-shell">
    <DriverAppControls />
    <DriverTrips driver={driver} bookings={bookingsForDriver} />
    <DriverIssueReporter bookings={bookingsForDriver.filter((b:any)=>!["completed","cancelled"].includes(String(b.status||"")))} />
  </main>;
}
