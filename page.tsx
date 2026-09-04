import BookingLanding from "@/components/BookingLanding";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export default function BookingPage(){
  return <>
    <GoogleAnalytics />
    <main className="container"><BookingLanding/></main>
  </>;
}
