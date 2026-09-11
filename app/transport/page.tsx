import GeneralTransportForm from "@/components/GeneralTransportForm";

export default function GeneralTransportPage() {
  return <main className="container">
    <div className="booking-brand-head">
      <a className="booking-brand-main-link" href="https://www.matt-transport.pl/" aria-label="MATT TRANSPORT">
        <img src="/MATT_TRANSPORT_gold_black.gif" alt="MATT TRANSPORT" />
        <div><strong>MATT TRANSPORT</strong><span>Transport zawsze na czas</span></div>
      </a>
      <a className="booking-site-back" href="/booking">← WYBÓR USŁUGI</a>
    </div>
    <GeneralTransportForm />
  </main>;
}
