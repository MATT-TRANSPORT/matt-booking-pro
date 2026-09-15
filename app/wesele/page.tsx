import WeddingBookingForm from "@/components/WeddingBookingForm";
import CustomerRepeatBooking from "@/components/CustomerRepeatBooking";

export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const repeatValue = Array.isArray(params.repeat) ? params.repeat[0] : params.repeat;

  return <main className="container wedding-page">
    <a className="back-link" href={repeatValue === "1" ? "/moje-przejazdy" : "/booking"}>{repeatValue === "1" ? "← Moje przejazdy" : "← Wróć"}</a>
    {repeatValue === "1" ? <CustomerRepeatBooking expectedKind="wedding" /> : <WeddingBookingForm/>}
  </main>;
}
