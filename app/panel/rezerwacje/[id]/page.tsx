import PaymentLinkBox from "@/components/PaymentLinkBox";
import { notFound } from "next/navigation";
import PanelNav from "@/components/PanelNav";
import BookingAdminActions from "@/components/BookingAdminActions";
import { panelClient } from "@/lib/panel";
import { statusPl } from "@/lib/status";
import { isOverdueBooking, statusStageClass } from "@/lib/bookingOps";
import FlightMonitorCard from "@/components/FlightMonitorCard";
import FlightAlertList from "@/components/FlightAlertList";
import GoogleCalendarSyncCard from "@/components/GoogleCalendarSyncCard";


export default async function Page({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { s } = await panelClient();

  const [
    { data: booking },
    { data: drivers },
    { data: vehicles },
    { data: history }
  ] = await Promise.all([
    s.from("bookings").select("*").eq("id", id).single(),
    s.from("drivers").select("id,full_name").order("full_name"),
    s.from("vehicles").select("id,name,registration").order("name"),
    s.from("booking_history")
      .select("*")
      .eq("booking_id", id)
      .order("created_at", { ascending: false })
      .limit(30)
  ]);

  if (!booking) notFound();

  const [
    { data: flights },
    { data: flightHistory },
    { data: flightAlerts }
  ] = await Promise.all([
    s.from("booking_flights")
      .select("*")
      .eq("booking_id", id)
      .order("leg"),
    s.from("booking_flight_history")
      .select("*")
      .eq("booking_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    s.from("booking_flight_alerts")
      .select("*")
      .eq("booking_id", id)
      .eq("active", true)
      .order("severity", { ascending: true })
      .order("updated_at", { ascending: false })
  ]);

  const primaryFlight =
    (flights ?? []).find((f: any) => f.leg === "primary") ?? null;

  const returnFlight =
    (flights ?? []).find((f: any) => f.leg === "return") ?? null;

  const route =
    booking.service_type === "from_airport"
      ? `${booking.airport_label} → ${booking.pickup_address}`
      : booking.service_type === "roundtrip"
      ? `${booking.pickup_address} ↔ ${booking.airport_label}`
      : `${booking.pickup_address} → ${booking.airport_label}`;

  const overdue = isOverdueBooking(booking);

  return (
    <main className="container">
      <a href="/panel/rezerwacje" className="back-link">
        ← Wróć do rezerwacji
      </a>

      <h1>{booking.booking_number}</h1>
      <PanelNav />

      {flightAlerts?.length ? (
        <div className="card flight-alert-detail-card">
          <h2>⚠ Alerty lotnicze</h2>
          <FlightAlertList alerts={flightAlerts} />
        </div>
      ) : null}

      {booking.flight_number && (
        <FlightMonitorCard
          bookingId={booking.id}
          leg="primary"
          flightNumber={booking.flight_number}
          flight={primaryFlight}
          pickupFromAirport={booking.service_type === "from_airport"}
        />
      )}

      {booking.return_flight_number && (
        <div style={{ marginTop: 14 }}>
          <FlightMonitorCard
            bookingId={booking.id}
            leg="return"
            flightNumber={booking.return_flight_number}
            flight={returnFlight}
            pickupFromAirport
          />
        </div>
      )}

      <div className="reservation-detail-grid" style={{ marginTop: 18 }}>
        <div className={`card booking-detail-main booking-stage-card ${statusStageClass(booking.status)} ${overdue ? "booking-overdue" : ""}`}>
          <div className="reservation-title-row">
            <div>
              <span className="muted">Status</span>
              <div>
                <span className={`status ${booking.status}`}>
                  {statusPl(booking.status)}
                </span>
              </div>
            </div>

            <div className="reservation-price">
              <span className="muted">Kwota</span>
              <strong>{Number(booking.total_price).toFixed(2)} zł</strong>
            </div>
          </div>

          {overdue && (
            <div className="overdue-badge overdue-detail">
              ⚠ TERMIN MINĄŁ — rezerwacja nie ma statusu Zakończona/Anulowana
            </div>
          )}

          <h2>Przejazd</h2>
          <div className="detail-list">
            <div><span>Trasa</span><strong>{route}</strong></div>
            <div><span>Data</span><strong>{booking.travel_date}</strong></div>
            <div><span>Godzina</span><strong>{booking.travel_time}</strong></div>
            <div><span>Pasażerowie</span><strong>{booking.passengers}</strong></div>
            <div><span>Pojazd</span><strong>{booking.vehicle_type === "bus" ? "Bus do 8 osób" : "Samochód osobowy"}</strong></div>
            <div><span>Odległość</span><strong>{booking.distance_km} km</strong></div>
            <div><span>Numer lotu</span><strong>{booking.flight_number || "—"}</strong></div>
            {booking.service_type === "roundtrip" && (
              <>
                <div><span>Powrót</span><strong>{booking.return_date || "—"} {booking.return_time || ""}</strong></div>
                <div><span>Lot powrotny</span><strong>{booking.return_flight_number || "—"}</strong></div>
              </>
            )}
          </div>

          <h2>Klient</h2>
          <div className="detail-list">
            <div><span>Imię i nazwisko</span><strong>{booking.customer_name}</strong></div>
            <div><span>Telefon</span><strong><a href={`tel:${booking.phone}`}>{booking.phone}</a></strong></div>
            <div><span>E-mail</span><strong><a href={`mailto:${booking.email}`}>{booking.email}</a></strong></div>
            <div><span>Faktura VAT</span><strong>{booking.invoice_required ? "Tak" : "Nie"}</strong></div>
          </div>

          <h2>Rozliczenie</h2>
          <div className="detail-list">
            <div><span>Cena bazowa</span><strong>{Number(booking.base_price).toFixed(2)} zł</strong></div>
            <div><span>Dopłata za km</span><strong>{Number(booking.extra_price).toFixed(2)} zł</strong></div>
            <div><span>VAT</span><strong>{Number(booking.vat_price).toFixed(2)} zł</strong></div>
            <div>
              <span>Sposób płatności</span>
              <strong>
                {booking.company_id
                  ? (booking.payment_method === "employee_payment" ? "Płatność pracownika online" : "Przelew firmowy")
                  : (booking.payment_method === "online" || booking.online_payment_requested)
                  ? "Płatność online"
                  : booking.payment_method === "bank_transfer"
                  ? "Przelew tradycyjny"
                  : "Gotówka u kierowcy"}
              </strong>
            </div>
            <div><span>Status płatności</span><strong>{booking.payment_status === "paid" ? "✓ Opłacono" : booking.payment_status === "failed" ? "Nieudana" : booking.payment_status === "refunded" ? "Zwrot" : booking.payment_status === "review" ? "Do weryfikacji" : "Oczekuje"}</strong></div>
            <div className="detail-total"><span>Razem</span><strong>{Number(booking.total_price).toFixed(2)} zł</strong></div>
          </div>

          {booking.notes && (
            <>
              <h2>Uwagi</h2>
              <p>{booking.notes}</p>
            </>
          )}
        </div>

        <div>
          <BookingAdminActions
            bookingId={booking.id}
            initialStatus={booking.status}
            initialDriverId={booking.driver_id}
            initialVehicleId={booking.vehicle_id}
            drivers={drivers ?? []}
            vehicles={vehicles ?? []}
          />

          <GoogleCalendarSyncCard booking={booking} />

          <div className="card" style={{ marginTop: 16 }}>
            <h2>Historia zmian</h2>
            {!history?.length ? (
              <p className="muted">Brak zapisanej historii zmian.</p>
            ) : (
              <div className="history-list history-timeline">
                {history.map((item: any) => (
                  <div key={item.id}>
                    <strong>{item.event}</strong>
                    <span>
                      {new Date(item.created_at).toLocaleString("pl-PL")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h2>Historia lotu</h2>
            {!flightHistory?.length ? (
              <p className="muted">Brak zapisanych zmian statusu lotu.</p>
            ) : (
              <div className="history-list history-timeline flight-history">
                {flightHistory.map((item: any) => (
                  <div key={item.id}>
                    <strong>{item.event}</strong>
                    <span>
                      {new Date(item.created_at).toLocaleString("pl-PL")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    <PaymentLinkBox booking={booking} /></main>
  );
}
