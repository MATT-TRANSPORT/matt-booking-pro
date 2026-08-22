import PanelNav from "@/components/PanelNav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReportsExport from "@/components/ReportsExport";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("bookings")
    .select("airport_label,total_price,status")
    .neq("status","cancelled");
  const rows = data ?? [];
  const total = rows.reduce((s:number,r:any)=>s+Number(r.total_price||0),0);
  const byAirport = rows.reduce((a:Record<string,number>,r:any)=>{
    a[r.airport_label]=(a[r.airport_label]||0)+1; return a;
  },{});

  return <main className="container">
    <h1>Raporty</h1><PanelNav />
    <ReportsExport />
    <div className="stats" style={{ marginTop: 18 }}>
      <div className="stat"><strong>{rows.length}</strong><span>Rezerwacje</span></div>
      <div className="stat"><strong>{total.toFixed(0)} zł</strong><span>Łączna wartość</span></div>
    </div>
    <div className="card"><h2>Najpopularniejsze kierunki</h2>
      {Object.entries(byAirport).sort((a,b)=>b[1]-a[1]).map(([k,v])=><div className="row" key={k}><span>{k}</span><strong>{v}</strong></div>)}
    </div>
  </main>;
}
