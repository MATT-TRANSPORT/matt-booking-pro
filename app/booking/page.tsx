import Script from "next/script";
import BookingLanding from "@/components/BookingLanding";
import CustomerRepeatBooking from "@/components/CustomerRepeatBooking";
import { parseBookingEntry } from "@/lib/bookingEntry";

const GA_MEASUREMENT_ID = "G-BKDS7PH54K";

export default async function BookingPage({searchParams}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}){
  const params = await searchParams;
  const repeatValue = Array.isArray(params.repeat) ? params.repeat[0] : params.repeat;
  const initialEntry = parseBookingEntry(params);

  const tracking = <>
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
    <Script id="matt-ga4-init" strategy="afterInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
        window.gtag('js', new Date());
        window.gtag('config', '${GA_MEASUREMENT_ID}');
      `}
    </Script>
  </>;

  if (repeatValue === "1") {
    return <>
      {tracking}
      <main className="container">
        <a className="back-link" href="/moje-przejazdy">← Moje przejazdy</a>
        <CustomerRepeatBooking expectedKind="airport" />
      </main>
    </>;
  }

  return <>
    {tracking}
    <main className="container"><BookingLanding initialEntry={initialEntry}/></main>
  </>;
}
