import Script from "next/script";
import BookingLanding from "@/components/BookingLanding";

const GA_MEASUREMENT_ID = "G-BKDS7PH54K";

export default function BookingPage(){
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
    <main className="container"><BookingLanding/></main>
  </>;
}
