import WeddingBookingForm from "@/components/WeddingBookingForm";
export default function Page(){
  return <main className="container wedding-page">
    <a className="back-link" href="/booking">← Wróć</a>
    <WeddingBookingForm/>
  </main>;
}
