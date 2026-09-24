import PaymentLinkBox from "@/components/PaymentLinkBox";
import { notFound } from "next/navigation";
import PanelNav from "@/components/PanelNav";
import BookingAdminActions from "@/components/BookingAdminActions";
import GeneralQuoteAdminCard from "@/components/GeneralQuoteAdminCard";
import { panelClient } from "@/lib/panel";
import { statusPl } from "@/lib/status";
import { isOverdueBooking, statusStageClass } from "@/lib/bookingOps";
import { bookingRouteText } from "@/lib/bookingRoute";
import FlightMonitorCard from "@/components/FlightMonitorCard";
import FlightAlertList from "@/components/FlightAlertList";
import GoogleCalendarSyncCard from "@/components/GoogleCalendarSyncCard";
import CustomerCommunicationCard from "@/components/CustomerCommunicationCard";
import { quickSmsUrl, quickWhatsAppUrl } from "@/lib/customerNotifications";
import B2BPricingSnapshotCard from "@/components/B2BPricingSnapshotCard";
import BookingDocumentsCard from "@/components/BookingDocumentsCard";
import GrowthSourceCard from "@/components/GrowthSourceCard";

function vehicleLabel(value: unknown) {
  if (value === "bus") return "Bus do 8 osób";
  if (value === "coach") return "Autokar do 30 osób";
  if (value === "auto") return "Do doboru przez MATT";
  return "Samochód osobowy";
}

function paymentStatusShort(booking: any) {
  const status = String(booking.payment_status || "pending").toLowerCase();
  if (status === "paid") return "✓ OPŁACONO";
  if (status === "failed") return "NIEUDANA";
  if (status === "refunded") return "ZWROT";
  if (status === "review") return "DO WERYFIKACJI";
  return "DO ZAPŁATY";
}

function quoteStatusShort(status: unknown) {
  if (status === "accepted") return "✓ ZAAKCEPTOWANA";
  if (status === "rejected") return "✕ REZYGNACJA";
  if (status === "priced") return "OCZEKUJE NA KLIENTA";
  return "WYMAGA WYCENY";
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { s } = await panelClient();

  const [
    { data: booking }, { data: drivers }, { data: vehicles }, { data: history }
  ] = await Promise.all([
    s.from("bookings").select("*").eq("id", id).single(),
    s.from("drivers").select("id,full_name,phone").order("full_name"),
    s.from("vehicles").select("id,name,registration").order("name"),
    s.from("booking_history").select("*").eq("booking_id", id).order("created_at", { ascending: false }).limit(30)
  ]);

  if (!booking) notFound();
  const general = Boolean(booking.destination_address) || booking.booking_source === "public_general";

  const { data: bookingDocuments } = booking.company_id
    ? await s.from("company_booking_documents").select("*").eq("booking_id", id).order("created_at", { ascending: false })
    : { data: [] as any[] };

  const [{ data: customerPushLogs }, { count: activeCustomerPush }] = await Promise.all([
    s.from("customer_push_notification_log").select("*").eq("booking_id", id).order("created_at", { ascending: false }).limit(10),
    s.from("customer_push_subscriptions").select("id", { count: "exact", head: true }).eq("booking_id", id).eq("active", true)
  ]);

  const [{ data: flights }, { data: flightHistory }, { data: flightAlerts }] = await Promise.all([
    s.from("booking_flights").select("*").eq("booking_id", id).order("leg"),
    s.from("booking_flight_history").select("*").eq("booking_id", id).order("created_at", { ascending: false }).limit(20),
    s.from("booking_flight_alerts").select("*").eq("booking_id", id).eq("active", true).order("severity", { ascending: true }).order("updated_at", { ascending: false })
  ]);

  const primaryFlight = (flights ?? []).find((f: any) => f.leg === "primary") ?? null;
  const returnFlight = (flights ?? []).find((f: any) => f.leg === "return") ?? null;
  const route = bookingRouteText(booking);
  const overdue = isOverdueBooking(booking);
  const quotePriced = !general || ["priced", "accepted", "rejected"].includes(String(booking.quote_status || ""));
  const quoteAccepted = !general || booking.quote_status === "accepted";
  const displayAmount = Number(booking.company_id ? (booking.price_gross ?? booking.total_price) : booking.total_price || 0);

  return <main className="container">
    <a href="/panel/dyspozytor" className="back-link">← Wróć do Planu kursów</a>
    <h1>{booking.booking_number}</h1>
    <PanelNav />

    {!general && flightAlerts?.length ? <div className="card flight-alert-detail-card"><h2>⚠ Alerty lotnicze</h2><FlightAlertList alerts={flightAlerts} /></div> : null}
    {!general && booking.flight_number && <FlightMonitorCard bookingId={booking.id} leg="primary" flightNumber={booking.flight_number} flight={primaryFlight} pickupFromAirport={booking.service_type === "from_airport"} />}
    {!general && booking.return_flight_number && <div style={{ marginTop: 14 }}><FlightMonitorCard bookingId={booking.id} leg="return" flightNumber={booking.return_flight_number} flight={returnFlight} pickupFromAirport /></div>}

    <div className="reservation-detail-grid" style={{ marginTop: 18 }}>
      <div>
        <div className={`card booking-detail-main booking-stage-card ${statusStageClass(booking.status)} ${overdue ? "booking-overdue" : ""}`}>
          <div className="reservation-title-row">
            <div><span className="muted">Status</span><div><span className={`status ${booking.status}`}>{statusPl(booking.status)}</span></div></div>
            <div className="reservation-price">
              <span className="muted">{general ? "Wycena" : booking.company_id ? "Brutto" : "Kwota"}</span>
              <strong>{general && !quotePriced ? "DO WYCENY" : `${displayAmount.toFixed(2)} zł`}</strong>
            </div>
          </div>

          {general && <div style={{marginTop:12}}><span className="quote-required-badge">🚐 TRANSPORT A → B · {quoteStatusShort(booking.quote_status)}</span></div>}
          {overdue && <div className="overdue-badge overdue-detail">⚠ TERMIN MINĄŁ — rezerwacja nie ma statusu Zakończona/Anulowana</div>}

          <h2>Przejazd</h2>
          <div className="detail-list">
            <div><span>Trasa</span><strong>{route}</strong></div>
            {general && <div><span>Punkt B</span><strong>{booking.destination_address || booking.airport_label}</strong></div>}
            <div><span>Data</span><strong>{booking.travel_date}</strong></div>
            <div><span>Godzina</span><strong>{booking.travel_time}</strong></div>
            <div><span>Pasażerowie</span><strong>{booking.passengers}</strong></div>
            <div><span>Pojazd</span><strong>{vehicleLabel(booking.vehicle_type)}</strong></div>
            <div><span>Odległość {general ? "A → B" : ""}</span><strong>{booking.distance_km} km</strong></div>
            {!general && <div><span>Numer lotu</span><strong>{booking.flight_number || "—"}</strong></div>}
            {booking.return_date && <><div><span>Powrót</span><strong>{booking.return_date || "—"} {booking.return_time || ""}</strong></div>{!general && <div><span>Lot powrotny</span><strong>{booking.return_flight_number || "—"}</strong></div>}</>}
            {general && booking.transport_category && <div><span>Rodzaj przewozu</span><strong>{booking.transport_category}</strong></div>}
          </div>

          <h2>Klient</h2>
          <div className="detail-list">
            <div><span>Imię i nazwisko</span><strong>{booking.customer_name}</strong></div>
            <div><span>Telefon</span><strong><a href={`tel:${booking.phone}`}>{booking.phone}</a></strong></div>
            <div><span>E-mail</span><strong><a href={`mailto:${booking.email}`}>{booking.email}</a></strong></div>
            <div><span>Faktura VAT</span><strong>{booking.invoice_required ? "Tak" : "Nie"}</strong></div>
          </div>

          <h2>Rozliczenie</h2>
          {general && !quotePriced ? (
            <div className="detail-list">
              <div className="detail-total"><span>Cena</span><strong>Wymaga indywidualnej wyceny</strong></div>
              <div><span>Status wyceny</span><strong>OCZEKUJE</strong></div>
            </div>
          ) : booking.company_id ? (
            <div className="detail-list">
              <div><span>Cena bazowa netto</span><strong>{Number(booking.base_price).toFixed(2)} zł</strong></div>
              {!general && <div><span>Dopłata za km netto</span><strong>{Number(booking.extra_price).toFixed(2)} zł</strong></div>}
              {!general && <div><span>VAT {Number(booking.vat_rate ?? 8).toFixed(0)}%</span><strong>{Number(booking.vat_price).toFixed(2)} zł</strong></div>}
              <div><span>Sposób płatności</span><strong>{booking.payment_method === "employee_payment" ? "Płatność online firmy" : "Przelew firmowy"}</strong></div>
              <div><span>Status płatności</span><strong>{paymentStatusShort(booking)}</strong></div>
              <div className="detail-total"><span>Razem brutto</span><strong>{displayAmount.toFixed(2)} zł</strong></div>
            </div>
          ) : (
            <div className="detail-list payment-summary-compact">
              <div className="detail-total"><span>{general ? "Cena wyceny" : "Do zapłaty"}</span><strong>{displayAmount.toFixed(2)} zł</strong></div>
              {general && <div><span>Decyzja klienta</span><strong>{quoteStatusShort(booking.quote_status)}</strong></div>}
              {general && booking.quote_expires_at && booking.quote_status === "priced" && <div><span>Wycena ważna do</span><strong>{new Date(booking.quote_expires_at).toLocaleString("pl-PL")}</strong></div>}
              <div><span>Status płatności</span><strong className={`payment-summary-status ${String(booking.payment_status || "pending").toLowerCase()}`}>{paymentStatusShort(booking)}</strong></div>
            </div>
          )}

          {booking.notes && <><h2>Uwagi</h2><p style={{whiteSpace:"pre-wrap"}}>{booking.notes}</p></>}
        </div>

        {booking.company_id && <B2BPricingSnapshotCard booking={booking} />}
        {booking.company_id && <BookingDocumentsCard bookingId={booking.id} documents={bookingDocuments ?? []} canManage />}
      </div>

      <div>
        {general && !["completed","cancelled"].includes(String(booking.status || "")) && <GeneralQuoteAdminCard booking={booking} />}
        <BookingAdminActions
          bookingId={booking.id}
          initialStatus={booking.status}
          initialDriverId={booking.driver_id}
          initialVehicleId={booking.vehicle_id}
          initialReturnDriverId={booking.return_driver_id}
          initialReturnVehicleId={booking.return_vehicle_id}
          isRoundtrip={Boolean(booking.return_date)}
          drivers={drivers ?? []}
          vehicles={vehicles ?? []}
        />

        <GoogleCalendarSyncCard booking={booking} />
        <CustomerCommunicationCard
          booking={booking}
          pushLogs={customerPushLogs ?? []}
          activeSubscriptions={activeCustomerPush ?? 0}
          whatsappUrl={quickWhatsAppUrl({ ...booking, _driver: (drivers ?? []).find((d: any) => d.id === booking.driver_id) ?? null, _vehicle: (vehicles ?? []).find((v: any) => v.id === booking.vehicle_id) ?? null })}
          smsUrl={quickSmsUrl({ ...booking, _driver: (drivers ?? []).find((d: any) => d.id === booking.driver_id) ?? null, _vehicle: (vehicles ?? []).find((v: any) => v.id === booking.vehicle_id) ?? null })}
        />

        <details className="card panel-collapsible-card history-collapsible" style={{ marginTop: 16 }}>
          <summary className="panel-collapsible-summary">
            <span><strong>Historia zmian</strong></span>
            <b>{history?.length ?? 0}</b>
          </summary>
          <div className="panel-collapsible-content">
            {!history?.length ? <p className="muted">Brak zapisanej historii zmian.</p> : <div className="history-list history-timeline">{history.map((item: any) => <div key={item.id}><strong>{item.event}</strong><span>{new Date(item.created_at).toLocaleString("pl-PL")}</span></div>)}</div>}
          </div>
        </details>
        {!general && <div className="card" style={{ marginTop: 16 }}><h2>Historia lotu</h2>{!flightHistory?.length ? <p className="muted">Brak zapisanych zmian statusu lotu.</p> : <div className="history-list history-timeline flight-history">{flightHistory.map((item: any) => <div key={item.id}><strong>{item.event}</strong><span>{new Date(item.created_at).toLocaleString("pl-PL")}</span></div>)}</div>}</div>}
      </div>
    </div>
    {(!general || quoteAccepted) && <PaymentLinkBox booking={booking} />}
    <GrowthSourceCard booking={booking} />
  </main>;
}
