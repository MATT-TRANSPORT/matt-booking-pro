import { companyLanguage, type CompanySearchParams } from "@/lib/companyLanguage";
import CompanyNav from "@/components/CompanyNav";
import { companyClient } from "@/lib/company";

const sections = {
  pl: [
    ["Logowanie", "Otwórz adres panelu przekazany przez MATT TRANSPORT. Zaloguj się służbowym adresem e-mail i hasłem. Jeśli konto nie ma dostępu, skontaktuj się z opiekunem — musi być przypisane do właściwej firmy."],
    ["Pulpit i nawigacja", "Na pulpicie najbliższe aktywne przejazdy są u góry, a zakończone, anulowane i minione w historii. Menu prowadzi do nowej rezerwacji, szablonów, kalendarza, cennika, pracowników, rozliczeń i danych firmy."],
    ["Pracownicy", "W sekcji Pracownicy dodaj imię i nazwisko. Telefon, e-mail, domyślny adres i dział są dodatkowymi danymi. Przełącznikiem statusu możesz dezaktywować osobę, której nie należy wybierać do nowych kursów."],
    ["Nowa rezerwacja", "Wybierz pracownika lub dodaj nowego pasażera. Wskaż kierunek (do lotniska, z lotniska lub w obie strony), adres, lotnisko, datę i godzinę. Uzupełnij powrót, jeśli dotyczy, liczbę pasażerów, pojazd, numer lotu, uwagi i przystanki. Wybierz płatność, poczekaj na wycenę i sprawdź netto, VAT oraz brutto przed wysłaniem. Serwer ponownie przelicza cenę przy zapisie."],
    ["Ważne po wysłaniu", "Jeżeli pojawi się informacja, że odpowiedź nie dotarła i rezerwacja mogła zostać zapisana, najpierw sprawdź listę rezerwacji. Nie wysyłaj drugi raz tego samego zamówienia bez sprawdzenia."],
    ["Cennik i kilometrówka", "Cennik pokazuje warunki przypisane do firmy. Kwoty B2B są netto + VAT 8%. Cena bazowa dotyczy jednego kierunku; w obie strony każdy kierunek jest wyceniany osobno. Ogólna reguła w panelu: 30 km dojazdu od centrum Rybnika w cenie, do 10 km rzeczywistego objazdu w cenie, odbiór po trasie bez dopłaty, nadwyżka 2,40 zł netto/km naliczana raz dla całej trasy z przystankami. Zawsze sprawdź indywidualną wycenę."],
    ["Edycja i anulowanie", "Edycja jest dostępna dla wybranych rezerwacji oczekujących, potwierdzonych lub przypisanych, jeśli płatność nie jest opłacona ani weryfikowana. Zmiana danych może ponownie przeliczyć cenę i wymagać potwierdzenia MATT TRANSPORT. Zmiana sposobu płatności zawsze wymaga ponownego potwierdzenia. Rezerwacji w realizacji lub zakończonej nie można edytować w portalu. Anulowanie dostępne jest dla oczekujących, potwierdzonych i przypisanych. Opłacona rezerwacja nie oznacza automatycznego zwrotu — zwrot weryfikuje MATT."],
    ["Powtarzanie i szablony", "W szczegółach użyj Powtórz rezerwację, aby utworzyć nowy kurs z nową datą i godziną. Nowy kurs jest wyceniany według aktualnych warunków. W sekcji Szablony i cykliczne zapisz istniejący kurs jako szablon, a następnie utwórz pojedynczy kurs lub serię cotygodniową do 12 wystąpień. Każda rezerwacja jest wyceniana według aktualnych warunków."],
    ["Kalendarz", "Przechodź między miesiącami i wybierz dzień, aby zobaczyć kursy. Kalendarz pokazuje również kursy zakończone i anulowane."],
    ["Płatności", "Przelew firmowy jest widoczny w szczegółach. Płatność online firmy może być dostępna dla użytkowników z odpowiednimi uprawnieniami i rezerwacji, których status pozwala na płatność. Po powrocie ze Stripe sprawdź status. Nie płać ponownie, jeśli widnieje Opłacona lub Do weryfikacji."],
    ["Rozliczenia i dokumenty", "W Rozliczeniach zobaczysz podsumowanie bieżącego miesiąca oraz dokumenty przypisane do rezerwacji i udostępnione dokumenty miesięczne. Wybierz Otwórz lub Pobierz. E-mail z dokumentem może zawierać bezpośredni link do pobrania."],
    ["Dane firmy i bezpieczeństwo", "W Dane firmy sprawdzisz dane kontrahenta, warunki i zapisane adresy. Nie udostępniaj hasła ani linków dostępowych. Przed wysłaniem sprawdź wszystkie dane kursu; po zmianie lub anulowaniu zweryfikuj status."],
  ],
  en: [
    ["Sign in", "Open the portal address supplied by MATT TRANSPORT and sign in with your business email and password. If your account has no access, contact your representative — it must be assigned to the correct company."],
    ["Dashboard and navigation", "Upcoming active journeys appear first; completed, cancelled and past journeys are in the history. The menu links to new bookings, templates, calendar, pricing, employees, billing and company details."],
    ["Employees", "In Employees, enter the first and last name. Phone, email, default address and department are optional. Use the status control to deactivate someone who should not be selected for new journeys."],
    ["New booking", "Choose an employee or add a new passenger. Select the direction (to airport, from airport or return), address, airport, date and time. Add return details if applicable, passenger count, vehicle, flight number, notes and stops. Select a payment method, wait for the quote and review net, VAT and gross before submitting. The server recalculates the price when saving."],
    ["After submitting", "If the portal says the response was not received and the booking may have been saved, check the bookings list first. Do not submit the same request again before checking."],
    ["Pricing and mileage", "Pricing shows the terms assigned to your company. B2B amounts are net plus 8% VAT. The base fare is one way; each direction of a return journey is priced separately. General portal rule: 30 km pickup from Rybnik centre included, up to 10 km actual detour included, pickup along the route has no surcharge, excess costs PLN 2.40 net/km once for the complete route including stops. Always check the individual quote."],
    ["Editing and cancellation", "Editing is available for eligible pending, confirmed or assigned bookings if payment is not paid or under review. Changes may trigger a new quote and require MATT TRANSPORT confirmation. A payment-method change always requires reconfirmation. Journeys in progress or completed cannot be edited in the portal. Cancellation is available for pending, confirmed and assigned bookings. A paid booking is not automatically refunded — MATT reviews refunds."],
    ["Repeat bookings and templates", "Use Repeat booking in the details to create a new journey with a new date and time. It is priced using current terms. In Templates and recurring, save an existing journey as a template, then create a single booking or a weekly series of up to 12 occurrences. Each booking uses current terms."],
    ["Calendar", "Move between months and select a day to view journeys. The calendar also shows completed and cancelled journeys."],
    ["Payments", "Company bank transfer is shown in the booking details. Company online payment may be available to users with the required permissions and bookings whose status permits payment. After returning from Stripe, check the status. Do not pay again if it shows Paid or Under review."],
    ["Billing and documents", "Billing shows the current-month summary, booking documents and available monthly documents. Select Open or Download. An email containing a document may include a direct download link."],
    ["Company details and security", "Company details shows customer information, terms and saved addresses. Do not share your password or access links. Check all journey details before submitting and verify the status after changes or cancellation."],
  ]
};

export default async function CompanyHelpPage({searchParams}:{searchParams:Promise<CompanySearchParams>}) {
  const {locale,t}=await companyLanguage(searchParams);
  await companyClient(locale);
  const english=locale==="en";
  const items=english?sections.en:sections.pl;
  return <main className="container">
    <span className="badge">MATT BOOKING PRO · B2B</span>
    <h1>{english?"B2B customer help":"Pomoc i instrukcja B2B"}</h1>
    <CompanyNav customerLocale={locale}/>
    <section className="card" style={{marginTop:16}}>
      <p className="muted">{english?"A practical guide to using your company transport portal.":"Praktyczny przewodnik po obsłudze firmowego panelu transportowego."}</p>
      <p><a className="btn secondary" href="/docs/INSTRUKCJA-B2B-PL-EN.md" target="_blank" rel="noreferrer">{english?"Open full PL + EN manual":"Otwórz pełną instrukcję PL + EN"}</a></p>
      <div className="company-help-sections">
        {items.map(([heading,body],i)=><details key={heading} style={{padding:"14px 0",borderTop:"1px solid var(--border,#ddd)"}}>
          <summary style={{cursor:"pointer",fontWeight:700}}>{i+1}. {heading}</summary>
          <p style={{lineHeight:1.65,marginTop:10}}>{body}</p>
        </details>)}
      </div>
      <p className="muted" style={{marginTop:18}}>{english?"Need assistance? Call +48 691 242 691 or email kontakt@matt-transport.pl.":"Potrzebujesz pomocy? Zadzwoń +48 691 242 691 lub napisz na kontakt@matt-transport.pl."}</p>
    </section>
  </main>;
}
