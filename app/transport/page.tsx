import { resolveCustomerLocale } from "@/lib/localizedBookingEmails";
import GeneralTransportForm from "@/components/GeneralTransportForm";
import CustomerRepeatBooking from "@/components/CustomerRepeatBooking";

export default async function GeneralTransportPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const lang = resolveCustomerLocale(Array.isArray(params.lang) ? params.lang[0] : params.lang);
  const t = {pl:{tagline:"Transport zawsze na czas",trips:"← MOJE PRZEJAZDY",back:"← WYBÓR USŁUGI"},en:{tagline:"Always on time",trips:"← MY RIDES",back:"← CHOOSE SERVICE"},de:{tagline:"Immer pünktlich",trips:"← MEINE FAHRTEN",back:"← LEISTUNG WÄHLEN"},cs:{tagline:"Doprava vždy včas",trips:"← MOJE JÍZDY",back:"← VÝBĚR SLUŽBY"}}[lang];
  const repeatValue = Array.isArray(params.repeat) ? params.repeat[0] : params.repeat;

  return <main className="container">
    <div className="booking-brand-head">
      <a className="booking-brand-main-link" href="https://www.matt-transport.pl/" aria-label="MATT TRANSPORT">
        <img src="/MATT_TRANSPORT_gold_black.gif" alt="MATT TRANSPORT" />
        <div><strong>MATT TRANSPORT</strong><span>{t.tagline}</span></div>
      </a>
      <a className="booking-site-back" href={`${repeatValue === "1" ? "/moje-przejazdy" : "/booking"}?lang=${lang}`}>{repeatValue === "1" ? t.trips : t.back}</a>
    </div>
    {repeatValue === "1" ? <CustomerRepeatBooking expectedKind="general" /> : <GeneralTransportForm />}
  </main>;
}
