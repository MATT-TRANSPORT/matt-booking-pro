import Script from "next/script";
import BookingLanding from "@/components/BookingLanding";
import { parseBookingEntry } from "@/lib/bookingEntry";

const GA_MEASUREMENT_ID = "G-BKDS7PH54K";

export default async function BookingPage({searchParams}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}){
  const initialEntry = parseBookingEntry(await searchParams);
  return <>
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
    <main className="container"><BookingLanding initialEntry={initialEntry}/></main>
  </>;
}
