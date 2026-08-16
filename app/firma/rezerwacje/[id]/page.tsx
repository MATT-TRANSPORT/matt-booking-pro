import { notFound } from "next/navigation";
import CompanyNav from "@/components/CompanyNav";
import CompanyBookingActions from "@/components/CompanyBookingActions";
import { companyClient } from "@/lib/company";
import { statusPl } from "@/lib/status";

export default async function Page({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { s, company } = await companyClient();

  const { data: booking } = await s
    .from("bookings")
    .select("*,drivers(full_name,phone),vehicles(name,registration,color)")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();

  if (!booking) notFound();

  const driver = Array.isArray(booking.drivers)
    ? booking.drivers[0]
    : booking.drivers;
  const vehicle = Array.isArray(booking.vehicles)
    ? booking.vehicles[0]
    : booking.vehicles;

  return (
    <main className="container">
      <a className="back-link" href="/firma/rezerwacje">
        ← Wróć do rezerwacji
      </a>

      <h1>{booking.booking_number}</h1>
      <CompanyNav />

      <div className="reservation-detail-grid">
        <div className="card">
          <h2>Szczegóły przejazdu</h2>
          <div className="detail-list">
            <div><span>Status</span><strong><span className={`status ${String(booking.status).toLowerCase()}`}>{statusPl(booking.status)}</span></strong></div>
            <div><span>Pasażer</span><strong>{booking.customer_name}</strong></div>
            <div><span>Data</span><strong>{booking.travel_date}</strong></div>
            <div><span>Godzina</span><strong>{booking.travel_time}</strong></div>
            <div><span>Adres</span><strong>{booking.pickup_address}</strong></div>
            <div><span>Lotnisko</span><strong>{booking.airport_label}</strong></div>
            <div><span>Numer lotu</span><strong>{booking.flight_number || "—"}</strong></div>
            <div><span>Kwota</span><strong>{Number(booking.total_price).toFixed(2)} zł</strong></div>
          </div>

          <h2>Obsada</h2>
          <div className="detail-list">
            <div><span>Kierowca</span><strong>{driver?.full_name || "Jeszcze nie przypisano"}</strong></div>
            <div><span>Telefon kierowcy</span><strong>{driver?.phone || "—"}</strong></div>
            <div><span>Pojazd</span><strong>{vehicle?.name || "Jeszcze nie przypisano"}</strong></div>
            <div><span>Rejestracja</span><strong>{vehicle?.registration || "—"}</strong></div>
          </div>
        </div>

        <CompanyBookingActions booking={booking} />
      </div>
    </main>
  );
}
