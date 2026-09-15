import GeneralTransportForm from "@/components/GeneralTransportForm";
import CustomerRepeatBooking from "@/components/CustomerRepeatBooking";

export default async function GeneralTransportPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const repeatValue = Array.isArray(params.repeat) ? params.repeat[0] : params.repeat;

  return <main className="container">
    <div className="booking-brand-head">
      <a className="booking-brand-main-link" href="https://www.matt-transport.pl/" aria-label="MATT TRANSPORT">
        <img src="/MATT_TRANSPORT_gold_black.gif" alt="MATT TRANSPORT" />
        <div><strong>MATT TRANSPORT</strong><span>Transport zawsze na czas</span></div>
      </a>
      <a className="booking-site-back" href={repeatValue === "1" ? "/moje-przejazdy" : "/booking"}>{repeatValue === "1" ? "← MOJE PRZEJAZDY" : "← WYBÓR USŁUGI"}</a>
    </div>
    {repeatValue === "1" ? <CustomerRepeatBooking expectedKind="general" /> : <GeneralTransportForm />}
  </main>;
}
