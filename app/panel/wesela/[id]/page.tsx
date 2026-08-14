import {notFound} from "next/navigation";
import PanelNav from "@/components/PanelNav";
import {panelClient} from "@/lib/panel";
export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const {s}=await panelClient();
  const {data:b}=await s.from("wedding_bookings").select("*").eq("id",id).single();
  if(!b)notFound();
  return <main className="container">
    <a className="back-link" href="/panel">← Dashboard</a>
    <h1>💍 {b.booking_number}</h1><PanelNav/>
    <div className="reservation-detail-grid">
      <div className="card">
        <h2>Transport weselny</h2>
        <div className="detail-list">
          <div><span>Klient</span><strong>{b.customer_name}</strong></div>
          <div><span>Termin</span><strong>{b.start_date} {b.start_time}</strong></div>
          <div><span>Restauracja</span><strong>{b.restaurant_name}</strong></div>
          <div><span>Adres</span><strong>{b.restaurant_address}</strong></div>
          <div><span>Ilość samochodów</span><strong>{b.vehicles_count}</strong></div>
          <div><span>Telefon</span><strong>{b.phone}</strong></div>
          <div><span>E-mail</span><strong>{b.email}</strong></div>
          <div><span>Status</span><strong>{b.status==="pending"?"Oczekuje":b.status}</strong></div>
        </div>
        {b.notes&&<div className="driver-notes"><strong>Uwagi</strong><span>{b.notes}</span></div>}
      </div>
      <div className="card"><h2>Następny krok</h2><p>Przygotuj umowę na podstawie danych i prześlij ją klientowi na adres e-mail.</p>
      <a className="btn" href={`mailto:${b.email}`}>NAPISZ DO KLIENTA</a></div>
    </div>
  </main>
}
