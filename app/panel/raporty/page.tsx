import PanelNav from "@/components/PanelNav";
import ReportsExport from "@/components/ReportsExport";
import { panelClient } from "@/lib/panel";

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function ReportsPage() {
  const { s } = await panelClient();
  const [{ data }, { data: reviews }] = await Promise.all([
    s.from("bookings")
      .select("id,airport_label,total_price,price_gross,status,distance_km,service_type,additional_stop_primary_extra_km,additional_stop_return_extra_km,vehicles:vehicles!bookings_vehicle_id_fkey(name,operating_cost_per_km),return_vehicle:vehicles!bookings_return_vehicle_id_fkey(name,operating_cost_per_km),drivers:drivers!bookings_driver_id_fkey(full_name,cost_per_trip),return_driver:drivers!bookings_return_driver_id_fkey(full_name,cost_per_trip)")
      .neq("status","cancelled"),
    s.from("booking_reviews").select("rating,created_at")
  ]);

  const rows = data ?? [];
  const total = rows.reduce((sum:number,row:any)=>sum+Number(row.price_gross ?? row.total_price ?? 0),0);
  const byAirport = rows.reduce((acc:Record<string,number>,row:any)=>{
    acc[row.airport_label]=(acc[row.airport_label]||0)+1; return acc;
  },{});

  const completed = rows.filter((row:any)=>row.status === "completed");
  const profitRows = completed.map((row:any) => {
    const vehicle = one<any>(row.vehicles);
    const returnVehicle = one<any>(row.return_vehicle) || vehicle;
    const driver = one<any>(row.drivers);
    const returnDriver = one<any>(row.return_driver) || driver;
    const baseKm = Math.max(0, Number(row.distance_km || 0));
    const primaryKm = baseKm + Math.max(0, Number(row.additional_stop_primary_extra_km || 0));
    const returnKm = row.service_type === "roundtrip"
      ? baseKm + Math.max(0, Number(row.additional_stop_return_extra_km || 0))
      : 0;
    const vehicleRate = vehicle?.operating_cost_per_km;
    const returnVehicleRate = returnVehicle?.operating_cost_per_km;
    const driverCost = driver?.cost_per_trip;
    const returnDriverCost = returnDriver?.cost_per_trip;
    const fullCostConfigured =
      vehicleRate !== null && vehicleRate !== undefined &&
      driverCost !== null && driverCost !== undefined &&
      (row.service_type !== "roundtrip" || (
        returnVehicleRate !== null && returnVehicleRate !== undefined &&
        returnDriverCost !== null && returnDriverCost !== undefined
      ));
    const operatingCost = fullCostConfigured
      ? primaryKm * Number(vehicleRate) + returnKm * Number(returnVehicleRate || 0) + Number(driverCost || 0) + (row.service_type === "roundtrip" ? Number(returnDriverCost || 0) : 0)
      : null;
    const revenue = Number(row.price_gross ?? row.total_price ?? 0);
    return { ...row, revenue, primaryKm, returnKm, operatingCost };
  });

  const covered = profitRows.filter((row:any)=>row.operatingCost !== null);
  const coveredRevenue = covered.reduce((s:number,row:any)=>s+row.revenue,0);
  const coveredCost = covered.reduce((s:number,row:any)=>s+Number(row.operatingCost||0),0);
  const contribution = coveredRevenue-coveredCost;
  const margin = coveredRevenue>0 ? contribution/coveredRevenue*100 : 0;

  const reviewRows = reviews ?? [];
  const avgRating = reviewRows.length ? reviewRows.reduce((s:number,r:any)=>s+Number(r.rating||0),0)/reviewRows.length : 0;
  const fiveStars = reviewRows.filter((r:any)=>Number(r.rating)===5).length;

  return <main className="container">
    <h1>Raporty</h1><PanelNav />
    <ReportsExport />

    <div className="stats" style={{ marginTop: 18 }}>
      <div className="stat"><strong>{rows.length}</strong><span>Rezerwacje</span></div>
      <div className="stat"><strong>{total.toFixed(0)} zł</strong><span>Łączna wartość</span></div>
      <div className="stat"><strong>{reviewRows.length ? avgRating.toFixed(2) : "—"}</strong><span>Średnia ocena 1–5</span></div>
      <div className="stat"><strong>{fiveStars}</strong><span>Oceny 5/5</span></div>
    </div>

    <div className="card" style={{ marginTop: 18 }}>
      <span className="badge">RENTOWNOŚĆ · SZACUNEK</span>
      <h2 style={{ marginTop: 8 }}>Rentowność wykonanych kursów</h2>
      <p className="muted">Kalkulacja działa tylko dla kursów, dla których ustawiono koszt/km pojazdu i koszt/kurs kierowcy. Kilometry bazują na zapisanym dystansie systemowym i dodatkowych objazdach. To wskaźnik operacyjny, nie wynik księgowy.</p>
      <div className="stats">
        <div className="stat"><strong>{covered.length}/{completed.length}</strong><span>Kursy z pełnym kosztem</span></div>
        <div className="stat"><strong>{coveredRevenue.toFixed(0)} zł</strong><span>Przychód objęty kalkulacją</span></div>
        <div className="stat"><strong>{coveredCost.toFixed(0)} zł</strong><span>Szac. koszty operacyjne</span></div>
        <div className="stat"><strong>{contribution.toFixed(0)} zł</strong><span>Szac. nadwyżka</span></div>
        <div className="stat"><strong>{margin.toFixed(1)}%</strong><span>Szac. marża</span></div>
      </div>
      {!covered.length && <p className="muted">Aby uruchomić wyliczenia, ustaw stawki w Panel → Pojazdy i Panel → Kierowcy.</p>}
    </div>

    <div className="card"><h2>Najpopularniejsze kierunki</h2>
      {Object.entries(byAirport).sort((a,b)=>b[1]-a[1]).map(([key,value])=><div className="row" key={key}><span>{key}</span><strong>{value}</strong></div>)}
    </div>
  </main>;
}
