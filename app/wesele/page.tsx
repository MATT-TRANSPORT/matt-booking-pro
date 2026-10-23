import { resolveCustomerLocale } from "@/lib/localizedBookingEmails";
import WeddingBookingForm from "@/components/WeddingBookingForm";
import CustomerRepeatBooking from "@/components/CustomerRepeatBooking";

export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const lang = resolveCustomerLocale(Array.isArray(params.lang) ? params.lang[0] : params.lang);
  const back = {pl:"← Wróć",en:"← Back",de:"← Zurück",cs:"← Zpět"}[lang];
  const trips = {pl:"← Moje przejazdy",en:"← My rides",de:"← Meine Fahrten",cs:"← Moje jízdy"}[lang];
  const repeatValue = Array.isArray(params.repeat) ? params.repeat[0] : params.repeat;

  return <main className="container wedding-page">
    <a className="back-link" href={`${repeatValue === "1" ? "/moje-przejazdy" : "/booking"}?lang=${lang}`}>{repeatValue === "1" ? trips : back}</a>
    {repeatValue === "1" ? <CustomerRepeatBooking expectedKind="wedding" /> : <WeddingBookingForm/>}
  </main>;
}
