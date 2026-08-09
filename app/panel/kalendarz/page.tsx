import PanelNav from "@/components/PanelNav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("bookings")
    .select("*")
    .order("travel_date")
    .order("travel_time")
    .limit(150);

  const grouped = (data ?? []).reduce((acc: Record<string, any[]>, row: any) => {
    (acc[row.travel_date] ??= []).push(row);
    return acc;
  }, {});

  return <main className="container">
    <h1>Kalendarz kursów</h1>
    <PanelNav />
    {Object.entries(grouped).map(([date, rows]) =>
      <div className="card" style={{marginBottom:14}} key={date}>
        <h2>{date}</h2>
        {rows.map((r:any)=><div className="row" key={r.id}>
          <strong>{r.travel_time}</strong>
          <span>{r.pickup_address} → {r.airport_label} · {r.customer_name}</span>
        </div>)}
      </div>
    )}
  </main>;
}
