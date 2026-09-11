import PointToPointBookingForm from "@/components/PointToPointBookingForm";

const MAIN_SITE_URL = "https://www.matt-transport.pl/";

export default function TransportPage(){
  return <main className="container">
    <div className="booking-brand-head">
      <a className="booking-brand-main-link" href={MAIN_SITE_URL} aria-label="Przejdź na stronę MATT TRANSPORT">
        <img src="/MATT_TRANSPORT_gold_black.gif" alt="MATT TRANSPORT"/>
        <div><strong>MATT TRANSPORT</strong><span>Transport zawsze na czas</span></div>
      </a>
      <a className="booking-site-back" href="/booking">← WYBÓR USŁUG</a>
    </div>
    <PointToPointBookingForm/>
  </main>;
}
