import { notFound } from "next/navigation";
import CompanyNav from "@/components/CompanyNav";
import CompanyBookingActions from "@/components/CompanyBookingActions";
import CompanyPaymentCell from "@/components/CompanyPaymentCell";
import B2BPricingSnapshotCard from "@/components/B2BPricingSnapshotCard";
import BookingDocumentsCard from "@/components/BookingDocumentsCard";
import { companyClient } from "@/lib/company";
import { companyBookingMoney, companyRouteLabel, companyServiceLabel, companyVehicleLabel } from "@/lib/companyPortal";
import { statusPl } from "@/lib/status";

export default async function Page({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { s, company, membership } = await companyClient();
  const canPayOnline = ["admin", "manager", "accounting"].includes(String(membership.role || ""));

  const [{ data: booking }, { data: documents }] = await Promise.all([
    s
      .from("bookings")
      .select("*,drivers(full_name,phone),vehicles(name,registration,color),return_driver:drivers!bookings_return_driver_id_fkey(full_name,phone),return_vehicle:vehicles!bookings_return_vehicle_id_fkey(name,registration,color)")
      .eq("id", id)
      .eq("company_id", company.id)
      .single(),
    s
      .from("company_booking_documents")
      .select("*")
      .eq("booking_id", id)
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
  ]);

  if (!booking) notFound();

  const driver = Array.isArray(booking.drivers) ? booking.drivers[0] : booking.drivers;
  const vehicle = Array.isArray(booking.vehicles) ? booking.vehicles[0] : booking.vehicles;
  const returnDriver = Array.isArray(booking.return_driver) ? booking.return_driver[0] : booking.return_driver;
  const returnVehicle = Array.isArray(booking.return_vehicle) ? booking.return_vehicle[0] : booking.return_vehicle;
  const money = companyBookingMoney(booking);

  return (
    <main className="container">
      <a className="back-link" href="/firma/rezerwacje">← Wróć do rezerwacji</a>
      <span className="badge">B2B PRO · NETTO + VAT 8%</span>
      <h1>{booking.booking_number}</h1>
      <CompanyNav />

      <div className="reservation-detail-grid">
        <div>
          <div className="card">
            <div className="company-detail-title">
              <div>
                <h2>Szczegóły przejazdu</h2>
                <p className="muted">{companyRouteLabel(booking)}</p>
              </div>
              <span className={`status ${String(booking.status).toLowerCase()}`}>{statusPl(booking.status)}</span>
            </div>

            <div className="detail-list">
              <div><span>Rodzaj przejazdu</span><strong>{companyServiceLabel(booking.service_type)}</strong></div>
              <div><span>Pasażer</span><strong>{booking.customer_name}</strong></div>
              <div><span>Data</span><strong>{booking.travel_date}</strong></div>
              <div><span>Godzina</span><strong>{String(booking.travel_time || "").slice(0, 5)}</strong></div>
              {booking.service_type === "roundtrip" && <div><span>Powrót</span><strong>{booking.return_date || "—"} {String(booking.return_time || "").slice(0, 5)}</strong></div>}
              <div><span>Adres pasażera</span><strong>{booking.pickup_address}</strong></div>
              <div><span>Lotnisko</span><strong>{booking.airport_label}</strong></div>
              <div><span>Numer lotu</span><strong>{booking.flight_number || "—"}</strong></div>
              {booking.return_flight_number && <div><span>Lot powrotny</span><strong>{booking.return_flight_number}</strong></div>}
              <div><span>Pojazd zamówiony</span><strong>{companyVehicleLabel(booking.vehicle_type)}</strong></div>
              <div><span>Pasażerowie</span><strong>{booking.passengers}</strong></div>
            </div>

            <div className="b2b-detail-financials">
              <div><span>NETTO</span><strong>{money.net.toFixed(2)} zł</strong></div>
              <div><span>VAT {money.vatRate.toFixed(0)}%</span><strong>{money.vat.toFixed(2)} zł</strong></div>
              <div className="gross"><span>BRUTTO</span><strong>{money.gross.toFixed(2)} zł</strong></div>
            </div>
            <div className="detail-list" style={{ marginTop: 12 }}>
              <div><span>Płatność</span><CompanyPaymentCell booking={booking} canPay={canPayOnline} /></div>
              <div><span>Dokumenty</span><strong>{documents?.length ? `${documents.length} dostępne` : "Brak"}</strong></div>
            </div>
            <p className="muted">Wszystkie ceny B2B są cenami netto. Do ceny doliczany jest VAT 8%.</p>

            <h2>Obsada</h2>
            <div className="company-leg-crew-grid">
              <div className="company-leg-crew">
                <strong>→ WYJAZD</strong>
                <span>Kierowca: {driver?.full_name || "Jeszcze nie przypisano"}</span>
                <span>Telefon: {driver?.phone || "—"}</span>
                <span>Pojazd: {vehicle ? `${vehicle.name} · ${vehicle.registration}` : "Jeszcze nie przypisano"}</span>
              </div>
              {booking.service_type === "roundtrip" && (
                <div className="company-leg-crew return">
                  <strong>↩ POWRÓT</strong>
                  <span>Kierowca: {returnDriver?.full_name || "Jeszcze nie przypisano"}</span>
                  <span>Telefon: {returnDriver?.phone || "—"}</span>
                  <span>Pojazd: {returnVehicle ? `${returnVehicle.name} · ${returnVehicle.registration}` : "Jeszcze nie przypisano"}</span>
                </div>
              )}
            </div>
          </div>

          <B2BPricingSnapshotCard booking={booking} />
          <BookingDocumentsCard bookingId={booking.id} documents={documents ?? []} />
        </div>

        <CompanyBookingActions booking={booking} />
      </div>
    </main>
  );
}
