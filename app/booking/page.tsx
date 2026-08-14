import BookingForm from "@/components/BookingForm";
export default function BookingPage(){
  return <main className="container">
    <BookingForm/>
    <section className="wedding-service-tile">
      <div className="wedding-rings">💍</div>
      <div>
        <span className="badge wedding-badge">TRANSPORT WESELNY</span>
        <h2>Rozwożenie gości weselnych</h2>
        <p>Potrzebujesz transportu dla gości po przyjęciu? Prześlij dane potrzebne do przygotowania umowy.</p>
      </div>
      <a className="btn wedding-cta" href="/wesele">PRZEJDŹ DO FORMULARZA</a>
    </section>
  </main>
}
