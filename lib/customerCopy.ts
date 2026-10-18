import { resolveCustomerLocale } from "@/lib/bookingLocale";

export const customerCopy: Record<string, [string, string, string]> = {
  "Numer rezerwacji": [
    "Booking reference",
    "Buchungsnummer",
    "Číslo rezervace"
  ],
  "Powrót": [
    "Return",
    "Rückfahrt",
    "Návrat"
  ],
  "Kwota": [
    "Amount",
    "Betrag",
    "Částka"
  ],
  "Płatność": [
    "Payment",
    "Zahlung",
    "Platba"
  ],
  "Lotnisko": [
    "Airport",
    "Flughafen",
    "Letiště"
  ],
  "Inne lotnisko": [
    "Other airport",
    "Anderer Flughafen",
    "Jiné letiště"
  ],
  "Wycena indywidualna": [
    "Custom quote",
    "Individuelles Angebot",
    "Individuální nabídka"
  ],
  "Dla tego lotniska cenę ustalamy indywidualnie telefonicznie.": [
    "Please call us for a quote for this airport.",
    "Bitte rufen Sie uns für ein Angebot für diesen Flughafen an.",
    "Pro cenu dopravy na toto letiště nám prosím zavolejte."
  ],
  "Dla tego lotniska wycena jest indywidualna telefonicznie.": [
    "Please call us for a quote for this airport.",
    "Bitte rufen Sie uns für ein Angebot für diesen Flughafen an.",
    "Pro cenu dopravy na toto letiště nám prosím zavolejte."
  ],
  "Dojazd z bazy w Książenicach:": [
    "Distance from our base in Książenice:",
    "Entfernung von unserem Standort in Książenice:",
    "Vzdálenost od naší základny v Książenicích:"
  ],
  "km · 40 km w cenie.": [
    "km · 40 km included.",
    "km · 40 km inklusive.",
    "km · 40 km v ceně."
  ],
  "Dodatkowy adres / przystanek": [
    "Additional address / stop",
    "Zusätzliche Adresse / Zwischenstopp",
    "Další adresa / zastávka"
  ],
  "+20,00 zł za każdy użyty kierunek. Dopłata kilometrowa tylko za faktyczny objazd poza normalną trasę.": [
    "+20.00 PLN per selected direction. A distance surcharge applies only to the actual detour.",
    "+20,00 PLN pro gewählter Richtung. Kilometerzuschlag nur für den tatsächlichen Umweg.",
    "+20,00 PLN za každý zvolený směr. Příplatek za kilometry pouze za skutečnou objížďku."
  ],
  "Przystanek dotyczy tego przejazdu · +20,00 zł.": [
    "Stop for this journey · +20.00 PLN.",
    "Zwischenstopp für diese Fahrt · +20,00 PLN.",
    "Zastávka pro tuto jízdu · +20,00 PLN."
  ],
  "✓ Przystanek jest na trasie — bez dopłaty kilometrowej.": [
    "✓ Stop is on the route — no distance surcharge.",
    "✓ Zwischenstopp liegt auf der Strecke — kein Kilometerzuschlag.",
    "✓ Zastávka je na trase — bez příplatku za kilometry."
  ],
  "★★★★★ 5.0 w Google": [
    "★★★★★ 5.0 on Google",
    "★★★★★ 5,0 bei Google",
    "★★★★★ 5,0 na Googlu"
  ],
  "Krok": [
    "Step",
    "Schritt",
    "Krok"
  ],
  "z 6": [
    "of 6",
    "von 6",
    "z 6"
  ],
  "🛫 Transfer na lotnisko": [
    "🛫 Transfer to airport",
    "🛫 Fahrt zum Flughafen",
    "🛫 Transfer na letiště"
  ],
  "Z adresu na wybrane lotnisko": [
    "From your address to the airport",
    "Von Ihrer Adresse zum Flughafen",
    "Z vaší adresy na letiště"
  ],
  "🛬 Odbiór z lotniska": [
    "🛬 Airport pickup",
    "🛬 Abholung am Flughafen",
    "🛬 Vyzvednutí na letišti"
  ],
  "Z lotniska pod wskazany adres": [
    "From the airport to your address",
    "Vom Flughafen zu Ihrer Adresse",
    "Z letiště na vaši adresu"
  ],
  "🔁 W obie strony": [
    "🔁 Round trip",
    "🔁 Hin- und Rückfahrt",
    "🔁 Tam a zpět"
  ],
  "Wyjazd i powrót": [
    "Outbound and return",
    "Hin- und Rückfahrt",
    "Odjezd a návrat"
  ],
  "Dla wyjazdu na lotnisko podaj godzinę, o której chcesz wyjechać spod wskazanego adresu. Przy odbiorze z lotniska podaj godzinę przylotu z rozkładu lotu.": [
    "For airport transfers enter your pickup time. For airport pickups enter the scheduled flight arrival time.",
    "Für Fahrten zum Flughafen geben Sie Ihre Abholzeit an. Bei Abholung am Flughafen geben Sie die planmäßige Ankunftszeit des Fluges an.",
    "Pro cestu na letiště zadejte čas vyzvednutí. Pro vyzvednutí na letišti zadejte plánovaný čas příletu."
  ],
  "Dla wyjazdu na lotnisko podaj godzinę wyjazdu spod wskazanego adresu. Przy odbiorze z lotniska podaj godzinę przylotu z rozkładu lotu.": [
    "For airport transfers enter your pickup time. For airport pickups enter the scheduled flight arrival time.",
    "Für Fahrten zum Flughafen geben Sie Ihre Abholzeit an. Bei Abholung am Flughafen geben Sie die planmäßige Ankunftszeit des Fluges an.",
    "Pro cestu na letiště zadejte čas vyzvednutí. Pro vyzvednutí na letišti zadejte plánovaný čas příletu."
  ],
  "🚘 Samochód osobowy": [
    "🚘 Passenger car",
    "🚘 Pkw",
    "🚘 Osobní vůz"
  ],
  "Do 3 pasażerów z bagażami": [
    "Up to 3 passengers with luggage",
    "Bis zu 3 Fahrgäste mit Gepäck",
    "Až 3 cestující se zavazadly"
  ],
  "🚐 Bus do 8 osób": [
    "🚐 Minibus up to 8 passengers",
    "🚐 Kleinbus bis 8 Personen",
    "🚐 Minibus až pro 8 osob"
  ],
  "Dla grup i większego bagażu": [
    "For groups and extra luggage",
    "Für Gruppen und mehr Gepäck",
    "Pro skupiny a větší zavazadla"
  ],
  "💵 Gotówka": [
    "💵 Cash",
    "💵 Barzahlung",
    "💵 Hotově"
  ],
  "Płatność kierowcy przy realizacji przejazdu.": [
    "Pay your driver on the day.",
    "Zahlung beim Fahrer am Reisetag.",
    "Platba řidiči v den jízdy."
  ],
  "🏦 Przelew tradycyjny": [
    "🏦 Bank transfer",
    "🏦 Banküberweisung",
    "🏦 Bankovní převod"
  ],
  "Dane do przelewu ustalimy / przekażemy po potwierdzeniu rezerwacji.": [
    "We will provide bank details after confirming your booking.",
    "Die Bankverbindung erhalten Sie nach der Buchungsbestätigung.",
    "Platební údaje vám sdělíme po potvrzení rezervace."
  ],
  "💳 Płatność online": [
    "💳 Online payment",
    "💳 Online-Zahlung",
    "💳 Online platba"
  ],
  "Po potwierdzeniu rezerwacji pojawi się bezpieczny przycisk płatności online.": [
    "A secure payment button will appear after your booking is confirmed.",
    "Nach der Buchungsbestätigung erscheint eine Schaltfläche für die sichere Online-Zahlung.",
    "Po potvrzení rezervace se zobrazí tlačítko pro bezpečnou online platbu."
  ],
  "Dojazd do adresu": [
    "Distance to pickup address",
    "Entfernung zur Abholadresse",
    "Vzdálenost k adrese vyzvednutí"
  ],
  "Samochód osobowy": [
    "Passenger car",
    "Pkw",
    "Osobní vůz"
  ],
  "Bus do 8 osób": [
    "Minibus up to 8 passengers",
    "Kleinbus bis 8 Personen",
    "Minibus až pro 8 osob"
  ],
  "Dodatkowy przystanek": [
    "Additional stop",
    "Zwischenstopp",
    "Další zastávka"
  ],
  "Opłata za przystanek": [
    "Stop charge",
    "Gebühr für Zwischenstopp",
    "Poplatek za zastávku"
  ],
  "Objazd poza trasą": [
    "Detour",
    "Umweg",
    "Objížďka"
  ],
  "Razem": [
    "Total",
    "Gesamt",
    "Celkem"
  ],
  "Cena bazowa": [
    "Base fare",
    "Grundpreis",
    "Základní cena"
  ],
  "Dopłata": [
    "Surcharge",
    "Zuschlag",
    "Příplatek"
  ],
  "Płatność online po potwierdzeniu": [
    "Online payment after confirmation",
    "Online-Zahlung nach Bestätigung",
    "Online platba po potvrzení"
  ],
  "Przelew tradycyjny": [
    "Bank transfer",
    "Banküberweisung",
    "Bankovní převod"
  ],
  "Gotówka u kierowcy": [
    "Cash to driver",
    "Barzahlung beim Fahrer",
    "Hotově řidiči"
  ],
  "wyjazd i powrót": [
    "outbound and return",
    "Hin- und Rückfahrt",
    "odjezd a návrat"
  ],
  "wyjazd": [
    "outbound",
    "Hinfahrt",
    "odjezd"
  ],
  "powrót": [
    "return",
    "Rückfahrt",
    "návrat"
  ],
  "przystanek": [
    "stop",
    "Zwischenstopp",
    "zastávka"
  ],
  "Nie udało się obliczyć dojazdu.": [
    "Could not calculate the route.",
    "Die Route konnte nicht berechnet werden.",
    "Trasu se nepodařilo vypočítat."
  ],
  "Nie udało się obliczyć dojazdu. Sprawdź adres (miejscowość, ulica i numer) i spróbuj ponownie.": [
    "Could not calculate the route. Check the town, street and building number and try again.",
    "Die Route konnte nicht berechnet werden. Prüfen Sie Ort, Straße und Hausnummer und versuchen Sie es erneut.",
    "Trasu se nepodařilo vypočítat. Zkontrolujte obec, ulici a číslo domu a zkuste to znovu."
  ],
  "Nie udało się obliczyć przystanku.": [
    "Could not calculate the stop.",
    "Der Zwischenstopp konnte nicht berechnet werden.",
    "Zastávku se nepodařilo vypočítat."
  ],
  "Nie udało się obliczyć dodatkowego przystanku.": [
    "Could not calculate the additional stop.",
    "Der zusätzliche Zwischenstopp konnte nicht berechnet werden.",
    "Další zastávku se nepodařilo vypočítat."
  ],
  "Poczekaj na obliczenie dojazdu dla podanego adresu.": [
    "Please wait for the route calculation.",
    "Bitte warten Sie auf die Routenberechnung.",
    "Počkejte na výpočet trasy."
  ],
  "Dla przejazdu w obie strony podaj datę i godzinę powrotu.": [
    "Enter the return date and time for a round trip.",
    "Geben Sie für Hin- und Rückfahrten das Rückfahrtdatum und die Uhrzeit an.",
    "Pro cestu tam a zpět zadejte datum a čas návratu."
  ],
  "Termin powrotu musi być późniejszy niż wyjazd.": [
    "Return must be after departure.",
    "Die Rückfahrt muss nach der Hinfahrt liegen.",
    "Návrat musí být později než odjezd."
  ],
  "Podaj poprawny 10-cyfrowy NIP.": [
    "Enter a valid 10-digit Polish tax ID (NIP).",
    "Geben Sie eine gültige 10-stellige polnische Steuernummer (NIP) an.",
    "Zadejte platné 10místné polské daňové číslo (NIP)."
  ],
  "Poczekaj na poprawne obliczenie dodatkowego przystanku.": [
    "Please wait for the additional stop calculation.",
    "Bitte warten Sie auf die Berechnung des Zwischenstopps.",
    "Počkejte na výpočet další zastávky."
  ],
  "Błąd rezerwacji.": [
    "Booking failed.",
    "Buchung fehlgeschlagen.",
    "Rezervace se nezdařila."
  ],
  "Uzupełnij wymagane pola.": [
    "Please complete all required fields.",
    "Bitte füllen Sie alle Pflichtfelder aus.",
    "Vyplňte povinná pole."
  ],
  "Nie udało się połączyć z systemem rezerwacji.": [
    "Could not connect to the booking system.",
    "Verbindung zum Buchungssystem fehlgeschlagen.",
    "Nepodařilo se připojit k rezervačnímu systému."
  ],
  "adres": [
    "address",
    "Adresse",
    "adresa"
  ],
  "data wyjazdu": [
    "departure date",
    "Abfahrtsdatum",
    "datum odjezdu"
  ],
  "godzina przejazdu": [
    "travel time",
    "Uhrzeit der Fahrt",
    "čas jízdy"
  ],
  "imię i nazwisko": [
    "full name",
    "Vor- und Nachname",
    "jméno a příjmení"
  ],
  "telefon": [
    "phone",
    "Telefon",
    "telefon"
  ],
  "e-mail": [
    "email",
    "E-Mail",
    "e-mail"
  ],
  "Uzupełnij": [
    "Please complete",
    "Bitte ergänzen",
    "Vyplňte"
  ],
  "Obliczanie...": [
    "Calculating...",
    "Wird berechnet...",
    "Výpočet..."
  ],
  "Nieobliczony": [
    "Not calculated",
    "Nicht berechnet",
    "Nevypočítáno"
  ],
  "Rodzaj przejazdu": [
    "Journey type",
    "Art der Fahrt",
    "Druh jízdy"
  ],
  "🛫 Na lotnisko": [
    "🛫 To airport",
    "🛫 Zum Flughafen",
    "🛫 Na letiště"
  ],
  "🛬 Z lotniska": [
    "🛬 From airport",
    "🛬 Vom Flughafen",
    "🛬 Z letiště"
  ],
  "Przejdź na stronę MATT TRANSPORT": [
    "Visit MATT TRANSPORT",
    "MATT TRANSPORT besuchen",
    "Navštívit MATT TRANSPORT"
  ],
  "Pełna oferta MATT TRANSPORT": [
    "Full MATT TRANSPORT offer",
    "Gesamtes Angebot von MATT TRANSPORT",
    "Celá nabídka MATT TRANSPORT"
  ],
  "Zobacz opinie MATT TRANSPORT w Google": [
    "Read MATT TRANSPORT reviews on Google",
    "MATT TRANSPORT Bewertungen auf Google lesen",
    "Přečtěte si recenze MATT TRANSPORT na Googlu"
  ],
  "Ocena MATT TRANSPORT w Google: 5.0 na 5": [
    "MATT TRANSPORT Google rating: 5.0 out of 5",
    "MATT TRANSPORT Google-Bewertung: 5,0 von 5",
    "Hodnocení MATT TRANSPORT na Googlu: 5,0 z 5"
  ],
  "np. FR8214": [
    "e.g. FR8214",
    "z. B. FR8214",
    "např. FR8214"
  ],
  "Oczekuje na płatność": [
    "Awaiting payment",
    "Zahlung ausstehend",
    "Čeká na platbu"
  ],
  "Opłacono": [
    "Paid",
    "Bezahlt",
    "Zaplaceno"
  ],
  "Płatność nieudana": [
    "Payment failed",
    "Zahlung fehlgeschlagen",
    "Platba se nezdařila"
  ],
  "Zwrot": [
    "Refunded",
    "Erstattet",
    "Vráceno"
  ],
  "Do weryfikacji": [
    "Under review",
    "In Prüfung",
    "K ověření"
  ],
  "Nieprawidłowe lub nieaktywne lotnisko.": [
    "Invalid or unavailable airport.",
    "Ungültiger oder nicht verfügbarer Flughafen.",
    "Neplatné nebo nedostupné letiště."
  ],
  "Dla więcej niż 3 pasażerów wybierz bus.": [
    "Choose a minibus for more than 3 passengers.",
    "Wählen Sie für mehr als 3 Fahrgäste einen Kleinbus.",
    "Pro více než 3 cestující zvolte minibus."
  ],
  "Podaj prawidłowy termin wyjazdu.": [
    "Enter a valid departure date and time.",
    "Geben Sie ein gültiges Abfahrtsdatum und eine Uhrzeit an.",
    "Zadejte platné datum a čas odjezdu."
  ],
  "Rezerwacja online wymaga minimum 24 godzin wyprzedzenia. W pilnej sprawie zadzwoń: +48 691 242 691": [
    "Online bookings require at least 24 hours' notice. For urgent bookings call +48 691 242 691.",
    "Online-Buchungen erfordern mindestens 24 Stunden Vorlauf. Für dringende Buchungen: +48 691 242 691.",
    "Online rezervace vyžadují alespoň 24 hodin předem. Naléhavé objednávky: +48 691 242 691."
  ],
  "Nie znaleziono rezerwacji.": [
    "Booking not found.",
    "Buchung nicht gefunden.",
    "Rezervace nenalezena."
  ],
  "Płatność B2B uruchamia administrator firmy bezpośrednio w portalu firmowym.": [
    "The company administrator starts B2B payments in the company portal.",
    "B2B-Zahlungen werden vom Firmenadministrator im Firmenportal gestartet.",
    "Firemní platby spouští správce firmy ve firemním portálu."
  ],
  "Ta rezerwacja jest rozliczana przelewem firmowym.": [
    "This booking is settled by company bank transfer.",
    "Diese Buchung wird per Firmenüberweisung abgerechnet.",
    "Tato rezervace se hradí firemním bankovním převodem."
  ],
  "Płatność online nie została wybrana przy składaniu tej rezerwacji.": [
    "Online payment was not selected for this booking.",
    "Für diese Buchung wurde keine Online-Zahlung gewählt.",
    "Pro tuto rezervaci nebyla vybrána online platba."
  ],
  "Ta rezerwacja jest już opłacona.": [
    "This booking has already been paid.",
    "Diese Buchung ist bereits bezahlt.",
    "Tato rezervace je již zaplacena."
  ],
  "Dla tej rezerwacji wykonano zwrot. Skontaktuj się z MATT TRANSPORT.": [
    "This booking has been refunded. Contact MATT TRANSPORT.",
    "Diese Buchung wurde erstattet. Kontaktieren Sie MATT TRANSPORT.",
    "Platba za tuto rezervaci byla vrácena. Kontaktujte MATT TRANSPORT."
  ],
  "Płatność wymaga weryfikacji przez MATT TRANSPORT.": [
    "Payment requires review by MATT TRANSPORT.",
    "Die Zahlung muss von MATT TRANSPORT geprüft werden.",
    "Platbu musí ověřit MATT TRANSPORT."
  ],
  "Płatność online będzie dostępna po potwierdzeniu rezerwacji przez MATT TRANSPORT.": [
    "Online payment will be available after MATT TRANSPORT confirms your booking.",
    "Die Online-Zahlung ist nach der Buchungsbestätigung durch MATT TRANSPORT verfügbar.",
    "Online platba bude dostupná po potvrzení rezervace MATT TRANSPORT."
  ],
  "Nieprawidłowa kwota płatności.": [
    "Invalid payment amount.",
    "Ungültiger Zahlungsbetrag.",
    "Neplatná částka platby."
  ],
  "Nie udało się utworzyć płatności.": [
    "Could not create payment.",
    "Zahlung konnte nicht erstellt werden.",
    "Platbu se nepodařilo vytvořit."
  ],
  "Zapłać bezpiecznie online za rezerwację": [
    "Pay securely online for your booking",
    "Bezahlen Sie Ihre Buchung sicher online",
    "Zaplaťte bezpečně online za rezervaci"
  ],
  " — płatność jest nadal dostępna po wykonaniu transportu": [
    " — payment remains available after your journey",
    " — Zahlung ist auch nach der Fahrt möglich",
    " — platba je dostupná i po jízdě"
  ],
  " — kwotę brutto z VAT 8%.": [
    " — the total includes 8% VAT.",
    " — Gesamtbetrag einschließlich 8% MwSt.",
    " — celková částka zahrnuje 8 % DPH."
  ],
  "PRZECHODZĘ DO PŁATNOŚCI...": [
    "OPENING PAYMENT...",
    "ZAHLUNG WIRD GEÖFFNET...",
    "OTEVÍRÁNÍ PLATBY..."
  ],
  "💳 OPŁAĆ REZERWACJĘ ONLINE": [
    "💳 PAY FOR BOOKING ONLINE",
    "💳 BUCHUNG ONLINE BEZAHLEN",
    "💳 ZAPLATIT REZERVACI ONLINE"
  ],
  "Dostępne metody zależą od konfiguracji operatora płatności.": [
    "Available methods depend on the payment provider's settings.",
    "Verfügbare Zahlungsarten hängen von den Einstellungen des Zahlungsanbieters ab.",
    "Dostupné metody závisí na nastavení poskytovatele plateb."
  ],
  "Rezerwacja": [
    "Booking",
    "Buchung",
    "Rezervace"
  ],
  "Oczekuje na potwierdzenie": [
    "Awaiting confirmation",
    "Bestätigung ausstehend",
    "Čeká na potvrzení"
  ],
  "Potwierdzona": [
    "Confirmed",
    "Bestätigt",
    "Potvrzena"
  ],
  "Kierowca przypisany": [
    "Driver assigned",
    "Fahrer zugewiesen",
    "Řidič přiřazen"
  ],
  "Kierowca w drodze": [
    "Driver on the way",
    "Fahrer unterwegs",
    "Řidič na cestě"
  ],
  "Kierowca na miejscu": [
    "Driver has arrived",
    "Fahrer vor Ort",
    "Řidič na místě"
  ],
  "Pasażer odebrany": [
    "Passenger picked up",
    "Fahrgast abgeholt",
    "Cestující vyzvednut"
  ],
  "Zakończona": [
    "Completed",
    "Abgeschlossen",
    "Dokončena"
  ],
  "Anulowana": [
    "Cancelled",
    "Storniert",
    "Zrušena"
  ],
  "Zrezygnowano z wyceny": [
    "Quote declined",
    "Angebot abgelehnt",
    "Nabídka odmítnuta"
  ],
  "Wycena wygasła": [
    "Quote expired",
    "Angebot abgelaufen",
    "Nabídka vypršela"
  ],
  "Wycena gotowa — czeka na decyzję": [
    "Quote ready — awaiting your decision",
    "Angebot bereit — Ihre Entscheidung steht aus",
    "Nabídka připravena — čeká na rozhodnutí"
  ],
  "Wycena w przygotowaniu": [
    "Quote being prepared",
    "Angebot wird erstellt",
    "Nabídka se připravuje"
  ],
  "✎ EDYTUJ DANE": [
    "✎ EDIT DETAILS",
    "✎ ANGABEN BEARBEITEN",
    "✎ UPRAVIT ÚDAJE"
  ],
  "NR REZERWACJI": [
    "BOOKING REFERENCE",
    "BUCHUNGSNUMMER",
    "ČÍSLO REZERVACE"
  ],
  "PUNKT A": [
    "PICKUP",
    "ABHOLORT",
    "VÝCHOZÍ MÍSTO"
  ],
  "PUNKT B": [
    "DESTINATION",
    "ZIELORT",
    "CÍLOVÉ MÍSTO"
  ],
  "WYJAZD": [
    "OUTBOUND",
    "HINFAHRT",
    "ODJEZD"
  ],
  "DYSTANS A→B": [
    "DISTANCE A→B",
    "ENTFERNUNG A→B",
    "VZDÁLENOST A→B"
  ],
  "Adres": [
    "Address",
    "Adresse",
    "Adresa"
  ],
  "Data": [
    "Date",
    "Datum",
    "Datum"
  ],
  "Numer lotu": [
    "Flight number",
    "Flugnummer",
    "Číslo letu"
  ],
  "Data powrotu": [
    "Return date",
    "Rückfahrtdatum",
    "Datum návratu"
  ],
  "Godzina przylotu powrotnego": [
    "Return flight arrival time",
    "Ankunftszeit des Rückflugs",
    "Čas příletu zpátečního letu"
  ],
  "Lot powrotny": [
    "Return flight",
    "Rückflug",
    "Zpáteční let"
  ],
  "Uwagi": [
    "Notes",
    "Anmerkungen",
    "Poznámky"
  ],
  "Rozliczenie firmowe B2B": [
    "B2B company billing",
    "B2B-Firmenabrechnung",
    "Firemní vyúčtování B2B"
  ],
  "Ceny netto + VAT 8%. Ustawień faktury nie zmienia się z linku pasażera.": [
    "Net prices + 8% VAT. Invoice settings cannot be changed using the passenger link.",
    "Nettopreise + 8% MwSt. Rechnungseinstellungen können nicht über den Fahrgastlink geändert werden.",
    "Ceny bez DPH + 8 % DPH. Nastavení faktury nelze změnit přes odkaz cestujícího."
  ],
  "Faktura VAT": [
    "VAT invoice",
    "MwSt.-Rechnung",
    "Faktura s DPH"
  ],
  "Nie": [
    "No",
    "Nein",
    "Ne"
  ],
  "Tak": [
    "Yes",
    "Ja",
    "Ano"
  ],
  "UWAGI": [
    "NOTES",
    "ANMERKUNGEN",
    "POZNÁMKY"
  ],
  "WYCENA": [
    "QUOTE",
    "ANGEBOT",
    "NABÍDKA"
  ],
  "Przygotowujemy cenę": [
    "We are preparing your quote",
    "Wir erstellen Ihr Angebot",
    "Připravujeme cenu"
  ],
  "To zapytanie nie jest jeszcze wiążącym zamówieniem. Wyślemy wycenę e-mailem.": [
    "This request is not yet a binding order. We will email your quote.",
    "Diese Anfrage ist noch keine verbindliche Bestellung. Wir senden Ihr Angebot per E-Mail.",
    "Tato poptávka zatím není závaznou objednávkou. Nabídku zašleme e-mailem."
  ],
  "Wycena wymaga ponownego wysłania": [
    "Quote needs to be resent",
    "Angebot muss erneut gesendet werden",
    "Nabídku je třeba znovu odeslat"
  ],
  "Ta wycena powstała przed uruchomieniem akceptacji online. Skontaktuj się z MATT TRANSPORT, aby otrzymać aktualny link.": [
    "This quote predates online acceptance. Contact MATT TRANSPORT for an updated link.",
    "Dieses Angebot wurde vor Einführung der Online-Annahme erstellt. Kontaktieren Sie MATT TRANSPORT für einen aktuellen Link.",
    "Tato nabídka vznikla před zavedením online přijetí. Pro aktuální odkaz kontaktujte MATT TRANSPORT."
  ],
  "Termin ważności wyceny minął": [
    "This quote has expired",
    "Dieses Angebot ist abgelaufen",
    "Platnost nabídky vypršela"
  ],
  "Ostatnia cena:": [
    "Previous price:",
    "Letzter Preis:",
    "Poslední cena:"
  ],
  "Poproś o ponowną kalkulację przed zamówieniem transportu.": [
    "Request an updated quote before ordering transport.",
    "Bitten Sie vor der Bestellung um ein aktualisiertes Angebot.",
    "Před objednáním dopravy požádejte o novou kalkulaci."
  ],
  "📞 ZADZWOŃ DO MATT": [
    "📞 CALL MATT",
    "📞 MATT ANRUFEN",
    "📞 ZAVOLAT MATT"
  ],
  "WYCENA GOTOWA": [
    "QUOTE READY",
    "ANGEBOT BEREIT",
    "NABÍDKA PŘIPRAVENA"
  ],
  "Sposób płatności:": [
    "Payment method:",
    "Zahlungsart:",
    "Způsob platby:"
  ],
  "Akceptacja oznacza odpłatne zamówienie transportu na wskazaną kwotę.": [
    "Accepting places a paid transport order for the amount shown.",
    "Mit der Annahme bestellen Sie die Fahrt kostenpflichtig zum angegebenen Betrag.",
    "Přijetím závazně objednáváte dopravu za uvedenou částku."
  ],
  "Potwierdzić rezygnację?": [
    "Confirm you wish to decline?",
    "Möchten Sie das Angebot ablehnen?",
    "Potvrdit odmítnutí?"
  ],
  "Zlecenie zostanie anulowane i nie będzie realizowane.": [
    "The order will be cancelled and will not be carried out.",
    "Der Auftrag wird storniert und nicht ausgeführt.",
    "Objednávka bude zrušena a nebude uskutečněna."
  ],
  "TAK, REZYGNUJĘ": [
    "YES, DECLINE",
    "JA, ABLEHNEN",
    "ANO, ODMÍTNOUT"
  ],
  "✓ WYCENA ZAAKCEPTOWANA": [
    "✓ QUOTE ACCEPTED",
    "✓ ANGEBOT ANGENOMMEN",
    "✓ NABÍDKA PŘIJATA"
  ],
  "Zamówienie potwierdzone": [
    "Order confirmed",
    "Bestellung bestätigt",
    "Objednávka potvrzena"
  ],
  "Cena:": [
    "Price:",
    "Preis:",
    "Cena:"
  ],
  "WYCENA ODRZUCONA": [
    "QUOTE DECLINED",
    "ANGEBOT ABGELEHNT",
    "NABÍDKA ODMÍTNUTA"
  ],
  "Zrezygnowano z transportu": [
    "Transport declined",
    "Fahrt abgelehnt",
    "Doprava odmítnuta"
  ],
  "Zlecenie nie będzie realizowane. Jeśli zmienisz zdanie, skontaktuj się z nami.": [
    "The order will not be carried out. Contact us if you change your mind.",
    "Der Auftrag wird nicht ausgeführt. Kontaktieren Sie uns, falls Sie es sich anders überlegen.",
    "Objednávka nebude uskutečněna. Pokud si to rozmyslíte, kontaktujte nás."
  ],
  "Wycena została zaakceptowana. Zmiany trasy lub terminu ustal z MATT TRANSPORT telefonicznie.": [
    "The quote has been accepted. Call MATT TRANSPORT to change the route or date.",
    "Das Angebot wurde angenommen. Änderungen von Strecke oder Termin vereinbaren Sie telefonisch mit MATT TRANSPORT.",
    "Nabídka byla přijata. Změnu trasy či termínu domluvte telefonicky s MATT TRANSPORT."
  ],
  "Rezerwacja jest już opłacona. Możesz ją edytować, ale zmiana adresu, daty, godziny lub ceny wymaga ponownego sprawdzenia przez MATT TRANSPORT. Jeśli zmieni się kwota, płatność zostanie oznaczona jako DO WERYFIKACJI — nie płać ponownie.": [
    "This booking is already paid. You can edit it, but changes to the address, date, time or price require review by MATT TRANSPORT. If the amount changes, payment will be marked UNDER REVIEW — do not pay again.",
    "Diese Buchung ist bereits bezahlt. Änderungen von Adresse, Datum, Uhrzeit oder Preis müssen von MATT TRANSPORT geprüft werden. Bei einer Preisänderung wird die Zahlung als IN PRÜFUNG markiert — bezahlen Sie nicht erneut.",
    "Tato rezervace je již zaplacena. Změny adresy, data, času či ceny musí ověřit MATT TRANSPORT. Pokud se částka změní, platba bude označena K OVĚŘENÍ — neplaťte znovu."
  ],
  "Czy na pewno chcesz całkowicie anulować tę rezerwację?": [
    "Are you sure you want to cancel this booking?",
    "Möchten Sie diese Buchung wirklich stornieren?",
    "Opravdu chcete tuto rezervaci zrušit?"
  ],
  "Kurs zostanie oznaczony jako anulowany i usunięty z planu realizacji.": [
    "The journey will be marked cancelled and removed from the schedule.",
    "Die Fahrt wird als storniert markiert und aus dem Fahrplan entfernt.",
    "Jízda bude označena jako zrušená a odstraněna z plánu."
  ],
  "NIE, ZOSTAW": [
    "NO, KEEP BOOKING",
    "NEIN, BUCHUNG BEHALTEN",
    "NE, PONECHAT"
  ],
  "Płatność online firmy": [
    "Company online payment",
    "Online-Firmenzahlung",
    "Firemní online platba"
  ],
  "📞 ZADZWOŃ DO KIEROWCY": [
    "📞 CALL DRIVER",
    "📞 FAHRER ANRUFEN",
    "📞 ZAVOLAT ŘIDIČI"
  ],
  "Transport zamówiony": [
    "Transport ordered",
    "Fahrt bestellt",
    "Doprava objednána"
  ],
  "Rezerwacja firmowa została przyjęta.": [
    "Company booking received.",
    "Firmenbuchung eingegangen.",
    "Firemní rezervace byla přijata."
  ],
  "Pasażer": [
    "Passenger",
    "Fahrgast",
    "Cestující"
  ],
  "Wszystkie ceny B2B są cenami netto. Do ceny doliczany jest VAT 8%.": [
    "All B2B prices are net. 8% VAT is added.",
    "Alle B2B-Preise sind Nettopreise zuzüglich 8% MwSt.",
    "Všechny ceny B2B jsou bez DPH. Připočítává se 8 % DPH."
  ],
  "MOJE REZERWACJE": [
    "MY BOOKINGS",
    "MEINE BUCHUNGEN",
    "MOJE REZERVACE"
  ],
  "Nowy transport": [
    "New transport",
    "Neue Fahrt",
    "Nová doprava"
  ],
  "WARUNKI": [
    "TERMS",
    "BEDINGUNGEN",
    "PODMÍNKY"
  ],
  "Warunki handlowe zostaną pobrane przy wycenie": [
    "Commercial terms will be loaded with your quote",
    "Geschäftsbedingungen werden mit dem Angebot geladen",
    "Obchodní podmínky se načtou s nabídkou"
  ],
  "ZOBACZ CENNIK →": [
    "VIEW PRICES →",
    "PREISE ANSEHEN →",
    "ZOBRAZIT CENÍK →"
  ],
  "Z listy pracowników": [
    "From employee list",
    "Aus der Mitarbeiterliste",
    "Ze seznamu zaměstnanců"
  ],
  "+ Nowy pracownik": [
    "+ New employee",
    "+ Neuer Mitarbeiter",
    "+ Nový zaměstnanec"
  ],
  "Pracownik": [
    "Employee",
    "Mitarbeiter",
    "Zaměstnanec"
  ],
  "— Wybierz pracownika —": [
    "— Select employee —",
    "— Mitarbeiter auswählen —",
    "— Vyberte zaměstnance —"
  ],
  "Imię": [
    "First name",
    "Vorname",
    "Jméno"
  ],
  "Nazwisko": [
    "Last name",
    "Nachname",
    "Příjmení"
  ],
  "Domyślny adres": [
    "Default address",
    "Standardadresse",
    "Výchozí adresa"
  ],
  "Dział": [
    "Department",
    "Abteilung",
    "Oddělení"
  ],
  "Skąd odbieramy pasażera?": [
    "Where shall we pick up the passenger?",
    "Wo sollen wir den Fahrgast abholen?",
    "Kde vyzvedneme cestujícího?"
  ],
  "Dokąd jedziemy?": [
    "Where are we going?",
    "Wohin geht die Fahrt?",
    "Kam pojedeme?"
  ],
  "Zapisane adresy firmy": [
    "Saved company addresses",
    "Gespeicherte Firmenadressen",
    "Uložené firemní adresy"
  ],
  "— Wybierz zapisane miejsce —": [
    "— Select saved location —",
    "— Gespeicherten Ort auswählen —",
    "— Vyberte uložené místo —"
  ],
  "+20,00 zł netto za każdy użyty kierunek. Kilometry doliczamy tylko za faktyczny objazd poza normalną trasę.": [
    "+20.00 PLN net per selected direction. Distance surcharge applies only to the actual detour.",
    "+20,00 PLN netto pro gewählter Richtung. Kilometerzuschlag nur für den tatsächlichen Umweg.",
    "+20,00 PLN bez DPH za každý zvolený směr. Kilometry účtujeme pouze za skutečnou objížďku."
  ],
  "Wyjazd na lotnisko (+20 zł netto)": [
    "Outbound to airport (+20 PLN net)",
    "Hinfahrt zum Flughafen (+20 PLN netto)",
    "Cesta na letiště (+20 PLN bez DPH)"
  ],
  "Powrót z lotniska (+20 zł netto)": [
    "Return from airport (+20 PLN net)",
    "Rückfahrt vom Flughafen (+20 PLN netto)",
    "Návrat z letiště (+20 PLN bez DPH)"
  ],
  "Przystanek dotyczy tego przejazdu · +20,00 zł netto.": [
    "Stop for this journey · +20.00 PLN net.",
    "Zwischenstopp für diese Fahrt · +20,00 PLN netto.",
    "Zastávka pro tuto jízdu · +20,00 PLN bez DPH."
  ],
  "Obliczanie odległości od siedziby kontrahenta i wyceny...": [
    "Calculating distance from company address and preparing quote...",
    "Entfernung vom Firmenstandort und Angebot werden berechnet...",
    "Výpočet vzdálenosti od sídla firmy a ceny..."
  ],
  "Wybierz dokładny adres, aby pobrać indywidualną wycenę.": [
    "Choose an exact address to get your quote.",
    "Wählen Sie eine genaue Adresse für Ihr Angebot.",
    "Vyberte přesnou adresu pro výpočet ceny."
  ],
  "Do 3 pasażerów": [
    "Up to 3 passengers",
    "Bis zu 3 Fahrgäste",
    "Až 3 cestující"
  ],
  "Grupy / większy bagaż": [
    "Groups / extra luggage",
    "Gruppen / mehr Gepäck",
    "Skupiny / větší zavazadla"
  ],
  "🏢 Przelew firmowy": [
    "🏢 Company bank transfer",
    "🏢 Firmenüberweisung",
    "🏢 Firemní bankovní převod"
  ],
  "Rozliczenie zgodnie z warunkami firmy": [
    "Billing under company terms",
    "Abrechnung gemäß Firmenkonditionen",
    "Vyúčtování dle firemních podmínek"
  ],
  "💳 Płatność online firmy": [
    "💳 Company online payment",
    "💳 Online-Firmenzahlung",
    "💳 Firemní online platba"
  ],
  "Administrator firmy płaci kartą / Stripe kwotę BRUTTO": [
    "Company administrator pays the GROSS amount by card / Stripe",
    "Firmenadministrator bezahlt den BRUTTOBETRAG per Karte / Stripe",
    "Správce firmy platí částku VČETNĚ DPH kartou / Stripe"
  ],
  "TWOJE WARUNKI": [
    "YOUR TERMS",
    "IHRE KONDITIONEN",
    "VAŠE PODMÍNKY"
  ],
  "Podsumowanie B2B": [
    "B2B summary",
    "B2B-Zusammenfassung",
    "Shrnutí B2B"
  ],
  "Warunki ważne od": [
    "Terms valid from",
    "Konditionen gültig ab",
    "Podmínky platné od"
  ],
  "Siedziba kontrahenta": [
    "Company address",
    "Firmenstandort",
    "Sídlo firmy"
  ],
  "Odległość od siedziby": [
    "Distance from company address",
    "Entfernung vom Firmenstandort",
    "Vzdálenost od sídla firmy"
  ],
  "Limit bez dopłaty": [
    "Included distance",
    "Inklusive Kilometer",
    "Vzdálenost bez příplatku"
  ],
  "Km płatne": [
    "Chargeable km",
    "Kostenpflichtige km",
    "Zpoplatněné km"
  ],
  "Stawka ponad limit": [
    "Rate above included distance",
    "Preis über Freigrenze",
    "Sazba nad limit"
  ],
  "zł netto/km": [
    "PLN net/km",
    "PLN netto/km",
    "PLN bez DPH/km"
  ],
  "Cena 1 strony": [
    "One-way price",
    "Preis einfache Fahrt",
    "Cena jedním směrem"
  ],
  "zł netto": [
    "PLN net",
    "PLN netto",
    "PLN bez DPH"
  ],
  "Mnożnik przejazdu": [
    "Journey multiplier",
    "Fahrtfaktor",
    "Násobek jízdy"
  ],
  "Dopłata km": [
    "Distance surcharge",
    "Kilometerzuschlag",
    "Příplatek za kilometry"
  ],
  "Objazd przystanku": [
    "Stop detour",
    "Umweg zum Zwischenstopp",
    "Objížďka k zastávce"
  ],
  "RAZEM NETTO": [
    "TOTAL NET",
    "GESAMT NETTO",
    "CELKEM BEZ DPH"
  ],
  "RAZEM BRUTTO": [
    "TOTAL GROSS",
    "GESAMT BRUTTO",
    "CELKEM VČETNĚ DPH"
  ],
  "Wszystkie ceny B2B są cenami NETTO + 8% VAT.": [
    "All B2B prices are NET + 8% VAT.",
    "Alle B2B-Preise sind NETTO zuzüglich 8% MwSt.",
    "Všechny ceny B2B jsou BEZ DPH + 8 % DPH."
  ],
  "Wycena pojawi się po wskazaniu dokładnego adresu pasażera.": [
    "Your quote will appear after entering the passenger's exact address.",
    "Ihr Angebot erscheint nach Eingabe der genauen Fahrgastadresse.",
    "Cena se zobrazí po zadání přesné adresy cestujícího."
  ],
  "ZAMÓW TRANSPORT": [
    "ORDER TRANSPORT",
    "FAHRT BESTELLEN",
    "OBJEDNAT DOPRAVU"
  ],
  "Nie udało się przygotować wyceny.": [
    "Could not prepare a quote.",
    "Angebot konnte nicht erstellt werden.",
    "Nabídku se nepodařilo připravit."
  ],
  "Nie udało się połączyć z kalkulatorem B2B.": [
    "Could not connect to the B2B quote calculator.",
    "Verbindung zur B2B-Preisberechnung fehlgeschlagen.",
    "Nepodařilo se připojit ke kalkulátoru B2B."
  ],
  "Podaj imię i nazwisko nowego pracownika.": [
    "Enter the new employee's first and last name.",
    "Geben Sie Vor- und Nachname des neuen Mitarbeiters an.",
    "Zadejte jméno a příjmení nového zaměstnance."
  ],
  "Uzupełnij adres oraz termin.": [
    "Enter the address, date and time.",
    "Geben Sie Adresse, Datum und Uhrzeit an.",
    "Zadejte adresu, datum a čas."
  ],
  "Uzupełnij dodatkowy adres i wybierz kierunek przystanku.": [
    "Enter the additional address and select the stop direction.",
    "Geben Sie die zusätzliche Adresse an und wählen Sie die Fahrtrichtung.",
    "Zadejte další adresu a vyberte směr zastávky."
  ],
  "Poczekaj na poprawną wycenę B2B.": [
    "Please wait for a valid B2B quote.",
    "Bitte warten Sie auf ein gültiges B2B-Angebot.",
    "Počkejte na platnou nabídku B2B."
  ],
  "Nie udało się zapisać rezerwacji.": [
    "Could not save your booking.",
    "Buchung konnte nicht gespeichert werden.",
    "Rezervaci se nepodařilo uložit."
  ],
  "🔔 Bezpłatne powiadomienia": [
    "🔔 Free notifications",
    "🔔 Kostenlose Benachrichtigungen",
    "🔔 Bezplatná oznámení"
  ],
  "Włącz na tym telefonie aktualizacje o kierowcy, statusie przejazdu i ważnych zmianach lotu. E-mail nadal działa niezależnie.": [
    "Enable updates about your driver, journey status and important flight changes on this phone. Email notifications work independently.",
    "Aktivieren Sie auf diesem Telefon Meldungen zum Fahrer, Fahrtstatus und wichtigen Flugänderungen. E-Mails werden unabhängig davon gesendet.",
    "Zapněte na tomto telefonu informace o řidiči, stavu jízdy a důležitých změnách letu. E-mailová oznámení fungují nezávisle."
  ],
  "🔔 WŁĄCZ POWIADOMIENIA": [
    "🔔 ENABLE NOTIFICATIONS",
    "🔔 BENACHRICHTIGUNGEN AKTIVIEREN",
    "🔔 ZAPNOUT OZNÁMENÍ"
  ],
  "🔔 POWIADOMIENIA: ON": [
    "🔔 NOTIFICATIONS: ON",
    "🔔 BENACHRICHTIGUNGEN: AN",
    "🔔 OZNÁMENÍ: ZAPNUTO"
  ],
  "🔕 Powiadomienia są zablokowane w ustawieniach przeglądarki.": [
    "🔕 Notifications are blocked in browser settings.",
    "🔕 Benachrichtigungen sind in den Browsereinstellungen blockiert.",
    "🔕 Oznámení jsou blokována v nastavení prohlížeče."
  ],
  "Ta przeglądarka nie obsługuje Web Push.": [
    "This browser does not support Web Push.",
    "Dieser Browser unterstützt Web Push nicht.",
    "Tento prohlížeč nepodporuje Web Push."
  ],
  "Ta przeglądarka nie obsługuje powiadomień.": [
    "This browser does not support notifications.",
    "Dieser Browser unterstützt keine Benachrichtigungen.",
    "Tento prohlížeč nepodporuje oznámení."
  ],
  "Brak klucza powiadomień.": [
    "Notification key is unavailable.",
    "Benachrichtigungsschlüssel nicht verfügbar.",
    "Klíč oznámení není dostupný."
  ],
  "Nie udało się zapisać powiadomień.": [
    "Could not save notification settings.",
    "Benachrichtigungen konnten nicht gespeichert werden.",
    "Nastavení oznámení se nepodařilo uložit."
  ],
  "✓ Bezpłatne powiadomienia są aktywne na tym urządzeniu.": [
    "✓ Free notifications are active on this device.",
    "✓ Kostenlose Benachrichtigungen sind auf diesem Gerät aktiv.",
    "✓ Bezplatná oznámení jsou na tomto zařízení aktivní."
  ],
  "Nie udało się włączyć powiadomień.": [
    "Could not enable notifications.",
    "Benachrichtigungen konnten nicht aktiviert werden.",
    "Oznámení se nepodařilo zapnout."
  ],
  "Nie udało się wyłączyć powiadomień.": [
    "Could not disable notifications.",
    "Benachrichtigungen konnten nicht deaktiviert werden.",
    "Oznámení se nepodařilo vypnout."
  ],
  "Powiadomienia tej rezerwacji zostały wyłączone.": [
    "Notifications for this booking have been disabled.",
    "Benachrichtigungen für diese Buchung wurden deaktiviert.",
    "Oznámení pro tuto rezervaci byla vypnuta."
  ],
  "Wysyłanie testu...": [
    "Sending test...",
    "Test wird gesendet...",
    "Odesílání testu..."
  ],
  "Test nie został wysłany.": [
    "Test was not sent.",
    "Test wurde nicht gesendet.",
    "Test nebyl odeslán."
  ],
  "✓ Test wysłany — sprawdź powiadomienie na telefonie.": [
    "✓ Test sent — check the notification on your phone.",
    "✓ Test gesendet — prüfen Sie die Benachrichtigung auf Ihrem Telefon.",
    "✓ Test odeslán — zkontrolujte oznámení na telefonu."
  ],
  "Brak aktywnej subskrypcji na tym urządzeniu.": [
    "No active subscription on this device.",
    "Kein aktives Abonnement auf diesem Gerät.",
    "Na tomto zařízení není aktivní odběr."
  ],
  "Nie udało się wysłać testu.": [
    "Could not send test.",
    "Test konnte nicht gesendet werden.",
    "Test se nepodařilo odeslat."
  ],
  "Dziękujemy! Rezerwacja przyjęta": [
    "Thank you! Booking received",
    "Vielen Dank! Buchung eingegangen",
    "Děkujeme! Rezervace přijata"
  ],
  "🕐 Oczekuje na potwierdzenie": [
    "🕐 Awaiting confirmation",
    "🕐 Bestätigung ausstehend",
    "🕐 Čeká na potvrzení"
  ],
  "Co dalej?": [
    "What happens next?",
    "Wie geht es weiter?",
    "Co bude dál?"
  ],
  "Twoje zgłoszenie zostało przyjęte. Potwierdzimy rezerwację najszybciej jak to możliwe.": [
    "Your request has been received. We will confirm your booking as soon as possible.",
    "Ihre Anfrage ist eingegangen. Wir bestätigen Ihre Buchung schnellstmöglich.",
    "Vaši poptávku jsme přijali. Rezervaci potvrdíme co nejdříve."
  ],
  "Oczekuj wiadomości e-mail lub kontaktu z MATT TRANSPORT.": [
    "Please look out for an email or contact from MATT TRANSPORT.",
    "Bitte achten Sie auf eine E-Mail oder Nachricht von MATT TRANSPORT.",
    "Očekávejte e-mail nebo kontakt od MATT TRANSPORT."
  ],
  "Jakiego przejazdu potrzebujesz?": [
    "What transfer do you need?",
    "Welche Fahrt benötigen Sie?",
    "Jakou přepravu potřebujete?"
  ],
  "Trasa i lotnisko": [
    "Route and airport",
    "Strecke und Flughafen",
    "Trasa a letiště"
  ],
  "Termin przejazdu": [
    "Travel date and time",
    "Reisetermin",
    "Termín jízdy"
  ],
  "Wybierz pojazd": [
    "Choose your vehicle",
    "Fahrzeug auswählen",
    "Vyberte vozidlo"
  ],
  "Twoje dane": [
    "Your details",
    "Ihre Angaben",
    "Vaše údaje"
  ],
  "Podsumowanie": [
    "Summary",
    "Zusammenfassung",
    "Shrnutí"
  ],
  "Zarezerwuj transfer lotniskowy": [
    "Book an airport transfer",
    "Flughafentransfer buchen",
    "Rezervovat letištní transfer"
  ],
  "Sposób płatności": [
    "Payment method",
    "Zahlungsart",
    "Způsob platby"
  ],
  "Trasa": [
    "Route",
    "Strecke",
    "Trasa"
  ],
  "Termin": [
    "Date and time",
    "Termin",
    "Termín"
  ],
  "Pojazd": [
    "Vehicle",
    "Fahrzeug",
    "Vozidlo"
  ],
  "Dane klienta": [
    "Customer details",
    "Kundendaten",
    "Údaje zákazníka"
  ],
  "Adres docelowy": [
    "Destination address",
    "Zieladresse",
    "Cílová adresa"
  ],
  "Adres odbioru": [
    "Pickup address",
    "Abholadresse",
    "Adresa vyzvednutí"
  ],
  "Wpisz adres": [
    "Enter address",
    "Adresse eingeben",
    "Zadejte adresu"
  ],
  "Godzina przylotu": [
    "Arrival time",
    "Ankunftszeit",
    "Čas příletu"
  ],
  "Godzina wyjazdu na lotnisko": [
    "Departure time to airport",
    "Abfahrtszeit zum Flughafen",
    "Čas odjezdu na letiště"
  ],
  "Lot wylotowy": [
    "Outbound flight",
    "Hinflug",
    "Odletový let"
  ],
  "Pasażerowie": [
    "Passengers",
    "Fahrgäste",
    "Cestující"
  ],
  "Imię i nazwisko": [
    "Full name",
    "Vor- und Nachname",
    "Jméno a příjmení"
  ],
  "Telefon": [
    "Phone",
    "Telefon",
    "Telefon"
  ],
  "E-mail": [
    "Email",
    "E-Mail",
    "E-mail"
  ],
  "Tak, +8%": [
    "Yes, +8%",
    "Ja, +8%",
    "Ano, +8 %"
  ],
  "Uwagi do rezerwacji": [
    "Booking notes",
    "Anmerkungen zur Buchung",
    "Poznámky k rezervaci"
  ],
  "Jakie lotnisko?": [
    "Which airport?",
    "Welcher Flughafen?",
    "Jaké letiště?"
  ],
  "np. Berlin Brandenburg": [
    "e.g. Berlin Brandenburg",
    "z. B. Berlin Brandenburg",
    "např. Berlín Brandenburg"
  ],
  "NOWA REZERWACJA": [
    "NEW BOOKING",
    "NEUE BUCHUNG",
    "NOVÁ REZERVACE"
  ],
  "WSTECZ": [
    "BACK",
    "ZURÜCK",
    "ZPĚT"
  ],
  "DALEJ": [
    "NEXT",
    "WEITER",
    "DALŠÍ"
  ],
  "PODSUMOWANIE": [
    "SUMMARY",
    "ZUSAMMENFASSUNG",
    "SHRNUTÍ"
  ],
  "ZAREZERWUJ": [
    "BOOK NOW",
    "JETZT BUCHEN",
    "REZERVOVAT"
  ],
  "ZAPISYWANIE...": [
    "SAVING...",
    "WIRD GESPEICHERT...",
    "UKLÁDÁNÍ..."
  ],
  "OBLICZANIE TRASY...": [
    "CALCULATING ROUTE...",
    "ROUTE WIRD BERECHNET...",
    "VÝPOČET TRASY..."
  ],
  "ZADZWOŃ": [
    "CALL US",
    "ANRUFEN",
    "ZAVOLEJTE"
  ],
  "OBLICZ PONOWNIE": [
    "RECALCULATE",
    "ERNEUT BERECHNEN",
    "PŘEPOČÍTAT"
  ],
  "ZADZWOŃ I ZAPYTAJ O CENĘ": [
    "CALL FOR A QUOTE",
    "PREIS TELEFONISCH ERFRAGEN",
    "ZAVOLEJTE PRO CENU"
  ],
  "Adres dodatkowego przystanku": [
    "Additional stop address",
    "Adresse des Zwischenstopps",
    "Adresa další zastávky"
  ],
  "Wpisz drugi adres": [
    "Enter another address",
    "Weitere Adresse eingeben",
    "Zadejte další adresu"
  ],
  "USUŃ": [
    "REMOVE",
    "ENTFERNEN",
    "ODSTRANIT"
  ],
  "Obliczanie dojazdu do adresu...": [
    "Calculating route to address...",
    "Route zur Adresse wird berechnet...",
    "Výpočet trasy k adrese..."
  ],
  "Obliczanie objazdu...": [
    "Calculating detour...",
    "Umweg wird berechnet...",
    "Výpočet objížďky..."
  ],
  "+ DODAJ DODATKOWY ADRES / PRZYSTANEK": [
    "+ ADD ANOTHER ADDRESS / STOP",
    "+ WEITERE ADRESSE / ZWISCHENSTOPP",
    "+ PŘIDAT DALŠÍ ADRESU / ZASTÁVKU"
  ],
  "Wyjazd na lotnisko (+20 zł)": [
    "Outbound to airport (+20 PLN)",
    "Hinfahrt zum Flughafen (+20 PLN)",
    "Cesta na letiště (+20 PLN)"
  ],
  "Powrót z lotniska (+20 zł)": [
    "Return from airport (+20 PLN)",
    "Rückfahrt vom Flughafen (+20 PLN)",
    "Návrat z letiště (+20 PLN)"
  ],
  "Zapytanie o transport przyjęte": [
    "Transport request received",
    "Transportanfrage eingegangen",
    "Poptávka dopravy přijata"
  ],
  "WYCENA INDYWIDUALNA": [
    "CUSTOM QUOTE",
    "INDIVIDUELLES ANGEBOT",
    "INDIVIDUÁLNÍ NABÍDKA"
  ],
  "Sprawdzimy dostępność pojazdu i przygotujemy cenę. Otrzymasz potwierdzenie od MATT TRANSPORT.": [
    "We will check availability and prepare your quote. MATT TRANSPORT will confirm your request.",
    "Wir prüfen die Verfügbarkeit und erstellen ein Angebot. MATT TRANSPORT bestätigt Ihre Anfrage.",
    "Ověříme dostupnost vozidla a připravíme cenu. MATT TRANSPORT vám zašle potvrzení."
  ],
  "Numer zgłoszenia": [
    "Request reference",
    "Anfragenummer",
    "Číslo poptávky"
  ],
  "Dystans w jedną stronę": [
    "One-way distance",
    "Entfernung einfache Fahrt",
    "Vzdálenost jedním směrem"
  ],
  "Cena": [
    "Price",
    "Preis",
    "Cena"
  ],
  "Do indywidualnej wyceny": [
    "Quote on request",
    "Preis auf Anfrage",
    "Cena na vyžádání"
  ],
  "OTWÓRZ REZERWACJĘ": [
    "VIEW BOOKING",
    "BUCHUNG ANSEHEN",
    "ZOBRAZIT REZERVACI"
  ],
  "TRANSPORT A → B": [
    "TRANSPORT A → B",
    "TRANSPORT A → B",
    "DOPRAVA A → B"
  ],
  "Transport pozostały": [
    "Other transport",
    "Weitere Fahrten",
    "Ostatní doprava"
  ],
  "Podaj trasę i termin. System obliczy dystans, a MATT TRANSPORT przygotuje indywidualną wycenę.": [
    "Enter your route and date. We will calculate the distance and prepare a custom quote.",
    "Geben Sie Strecke und Termin ein. Wir berechnen die Entfernung und erstellen ein individuelles Angebot.",
    "Zadejte trasu a termín. Spočítáme vzdálenost a připravíme individuální nabídku."
  ],
  "1. Trasa": [
    "1. Route",
    "1. Strecke",
    "1. Trasa"
  ],
  "Punkt A — skąd jedziemy": [
    "Point A — pickup location",
    "Punkt A — Abholort",
    "Bod A — místo vyzvednutí"
  ],
  "Wpisz adres odbioru": [
    "Enter pickup address",
    "Abholadresse eingeben",
    "Zadejte adresu vyzvednutí"
  ],
  "Punkt B — dokąd jedziemy": [
    "Point B — destination",
    "Punkt B — Zielort",
    "Bod B — cíl cesty"
  ],
  "Wpisz adres docelowy": [
    "Enter destination address",
    "Zieladresse eingeben",
    "Zadejte cílovou adresu"
  ],
  " Potrzebuję również transportu powrotnego": [
    " I also need a return transfer",
    " Ich benötige auch eine Rückfahrt",
    " Potřebuji také zpáteční dopravu"
  ],
  "2. Termin": [
    "2. Date and time",
    "2. Termin",
    "2. Termín"
  ],
  "Data wyjazdu": [
    "Departure date",
    "Abfahrtsdatum",
    "Datum odjezdu"
  ],
  "Godzina wyjazdu": [
    "Departure time",
    "Abfahrtszeit",
    "Čas odjezdu"
  ],
  "Godzina powrotu": [
    "Return time",
    "Rückfahrtszeit",
    "Čas návratu"
  ],
  "3. Pasażerowie i pojazd": [
    "3. Passengers and vehicle",
    "3. Fahrgäste und Fahrzeug",
    "3. Cestující a vozidlo"
  ],
  "Liczba pasażerów": [
    "Number of passengers",
    "Anzahl der Fahrgäste",
    "Počet cestujících"
  ],
  "Preferowany pojazd": [
    "Preferred vehicle",
    "Gewünschtes Fahrzeug",
    "Preferované vozidlo"
  ],
  "Dobierzcie pojazd": [
    "Choose a vehicle for me",
    "Fahrzeug auswählen lassen",
    "Vyberte mi vozidlo"
  ],
  "Bus do 8 pasażerów": [
    "Minibus up to 8 passengers",
    "Kleinbus bis 8 Fahrgäste",
    "Minibus až pro 8 cestujících"
  ],
  "Autokar do 30 pasażerów": [
    "Coach up to 30 passengers",
    "Reisebus bis 30 Fahrgäste",
    "Autobus až pro 30 cestujících"
  ],
  "Rodzaj przewozu": [
    "Transport category",
    "Art der Fahrt",
    "Druh přepravy"
  ],
  "Prywatny": [
    "Private",
    "Privat",
    "Soukromá"
  ],
  "Impreza / wydarzenie": [
    "Event",
    "Veranstaltung",
    "Akce"
  ],
  "Szkoła / klub / grupa": [
    "School / club / group",
    "Schule / Verein / Gruppe",
    "Škola / klub / skupina"
  ],
  "Pracowniczy / firmowy": [
    "Employee / business",
    "Mitarbeiter / Geschäftlich",
    "Zaměstnanecká / firemní"
  ],
  "Inny": [
    "Other",
    "Sonstige",
    "Jiná"
  ],
  "Dla tej liczby pasażerów rekomendujemy autokar.": [
    "We recommend a coach for this group size.",
    "Für diese Gruppengröße empfehlen wir einen Reisebus.",
    "Pro tento počet cestujících doporučujeme autobus."
  ],
  "Dla tej liczby pasażerów rekomendujemy bus.": [
    "We recommend a minibus for this group size.",
    "Für diese Gruppengröße empfehlen wir einen Kleinbus.",
    "Pro tento počet cestujících doporučujeme minibus."
  ],
  "Możesz pozostawić dobór pojazdu po stronie MATT TRANSPORT.": [
    "MATT TRANSPORT can select a suitable vehicle for you.",
    "MATT TRANSPORT kann das passende Fahrzeug für Sie auswählen.",
    "MATT TRANSPORT pro vás může vybrat vhodné vozidlo."
  ],
  "4. Dane kontaktowe": [
    "4. Contact details",
    "4. Kontaktdaten",
    "4. Kontaktní údaje"
  ],
  " Potrzebuję faktury VAT": [
    " I need a VAT invoice",
    " Ich benötige eine Rechnung mit MwSt.",
    " Potřebuji fakturu s DPH"
  ],
  "Uwagi / dodatkowe przystanki": [
    "Notes / additional stops",
    "Hinweise / zusätzliche Stopps",
    "Poznámky / další zastávky"
  ],
  "Np. dodatkowy adres, bagaż, fotelik, wymagania grupy...": [
    "E.g. extra address, luggage, child seat, group requirements...",
    "Z. B. zusätzliche Adresse, Gepäck, Kindersitz, Gruppenwünsche...",
    "Např. další adresa, zavazadla, dětská sedačka, požadavky skupiny..."
  ],
  "WYSYŁANIE...": [
    "SENDING...",
    "WIRD GESENDET...",
    "ODESÍLÁNÍ..."
  ],
  "WYŚLIJ ZAPYTANIE O WYCENĘ": [
    "REQUEST A QUOTE",
    "ANGEBOT ANFORDERN",
    "ODESLAT POPTÁVKU"
  ],
  "Rezerwacja online wymaga minimum 24 godzin wyprzedzenia. Pilne zlecenia: ": [
    "Online requests must be made at least 24 hours in advance. Urgent bookings: ",
    "Online-Anfragen müssen mindestens 24 Stunden im Voraus erfolgen. Dringende Buchungen: ",
    "Online poptávky je nutné podat alespoň 24 hodin předem. Naléhavé objednávky: "
  ],
  "Punkt A": [
    "Point A",
    "Punkt A",
    "Bod A"
  ],
  "Punkt B": [
    "Point B",
    "Punkt B",
    "Bod B"
  ],
  "+ transport powrotny": [
    "+ return transfer",
    "+ Rückfahrt",
    "+ zpáteční doprava"
  ],
  "Dystans": [
    "Distance",
    "Entfernung",
    "Vzdálenost"
  ],
  "liczę...": [
    "calculating...",
    "wird berechnet...",
    "počítám..."
  ],
  "Szac. czas jazdy": [
    "Estimated journey time",
    "Geschätzte Fahrzeit",
    "Odhadovaná doba jízdy"
  ],
  "Wycena": [
    "Quote",
    "Angebot",
    "Nabídka"
  ],
  "INDYWIDUALNA": [
    "CUSTOM",
    "INDIVIDUELL",
    "INDIVIDUÁLNÍ"
  ],
  "Po wysłaniu zapytania dyspozytor sprawdzi pojazd, dostępność i ostateczną cenę.": [
    "After submitting, our dispatcher will confirm vehicle availability and the final price.",
    "Nach dem Absenden prüft unsere Disposition Fahrzeug, Verfügbarkeit und Endpreis.",
    "Po odeslání dispečer ověří vozidlo, dostupnost a konečnou cenu."
  ],
  "Podaj liczbę pasażerów od 1 do 30.": [
    "Enter 1 to 30 passengers.",
    "Bitte geben Sie 1 bis 30 Fahrgäste ein.",
    "Zadejte 1 až 30 cestujících."
  ],
  "Uzupełnij termin powrotu.": [
    "Enter your return date and time.",
    "Bitte geben Sie den Rückfahrttermin ein.",
    "Zadejte datum a čas návratu."
  ],
  "Nie udało się wysłać zgłoszenia.": [
    "Unable to submit your request.",
    "Die Anfrage konnte nicht gesendet werden.",
    "Poptávku se nepodařilo odeslat."
  ],
  "TRANSPORT WESELNY": [
    "Wedding transport",
    "Hochzeitstransport",
    "Svatební doprava"
  ],
  "Dziękujemy za przesłanie danych!": [
    "Thank you for your details!",
    "Vielen Dank für Ihre Angaben!",
    "Děkujeme za zaslané údaje!"
  ],
  "Na podstawie przesłanych informacji przygotujemy umowę i prześlemy ją na podany adres e-mail.": [
    "We will prepare an agreement and send it to your email address.",
    "Wir erstellen den Vertrag und senden ihn an Ihre E-Mail-Adresse.",
    "Připravíme smlouvu a zašleme ji na váš e-mail."
  ],
  "Jeżeli będziemy potrzebowali dodatkowych informacji, skontaktujemy się telefonicznie.": [
    "If we need more information, we will call you.",
    "Falls wir weitere Informationen benötigen, rufen wir Sie an.",
    "Pokud budeme potřebovat další informace, zavoláme vám."
  ],
  "WRÓĆ DO REZERWACJI": [
    "BACK TO BOOKING",
    "ZURÜCK ZUR BUCHUNG",
    "ZPĚT K REZERVACI"
  ],
  "Dane do przygotowania umowy": [
    "Details for your agreement",
    "Angaben zur Vertragserstellung",
    "Údaje pro přípravu smlouvy"
  ],
  "Prześlij najważniejsze informacje. Po ich otrzymaniu przygotujemy umowę i prześlemy ją e-mailem.": [
    "Send us the key details. We will prepare an agreement and email it to you.",
    "Senden Sie uns die wichtigsten Angaben. Wir erstellen den Vertrag und senden ihn per E-Mail.",
    "Zašlete nám základní údaje. Připravíme smlouvu a pošleme ji e-mailem."
  ],
  "Imię i nazwisko *": [
    "Full name *",
    "Vor- und Nachname *",
    "Jméno a příjmení *"
  ],
  "Data rozpoczęcia rozwozów *": [
    "Transport start date *",
    "Beginn der Fahrten – Datum *",
    "Datum zahájení rozvozu *"
  ],
  "Godzina rozpoczęcia rozwozów *": [
    "Transport start time *",
    "Beginn der Fahrten – Uhrzeit *",
    "Čas zahájení rozvozu *"
  ],
  "Nazwa restauracji *": [
    "Venue name *",
    "Name der Gaststätte *",
    "Název restaurace *"
  ],
  "Adres restauracji *": [
    "Venue address *",
    "Adresse der Gaststätte *",
    "Adresa restaurace *"
  ],
  "Ilość pojazdów *": [
    "Number of vehicles *",
    "Anzahl der Fahrzeuge *",
    "Počet vozidel *"
  ],
  "Numer telefonu *": [
    "Phone number *",
    "Telefonnummer *",
    "Telefonní číslo *"
  ],
  "Adres e-mail *": [
    "Email address *",
    "E-Mail-Adresse *",
    "E-mailová adresa *"
  ],
  "Pojazdy": [
    "Vehicles",
    "Fahrzeuge",
    "Vozidla"
  ],
  "Pojazd ": [
    "Vehicle ",
    "Fahrzeug ",
    "Vozidlo "
  ],
  "Bus 9-osobowy": [
    "9-seat minibus",
    "9-Sitzer-Kleinbus",
    "Minibus pro 9 osob"
  ],
  "Dodatkowe informacje (opcjonalnie)": [
    "Additional information (optional)",
    "Weitere Angaben (optional)",
    "Další informace (nepovinné)"
  ],
  "WYŚLIJ DANE DO UMOWY": [
    "SEND AGREEMENT DETAILS",
    "VERTRAGSDATEN SENDEN",
    "ODESLAT ÚDAJE KE SMLOUVĚ"
  ],
  "Zgłoszenie ": [
    "Request ",
    "Anfrage ",
    "Žádost "
  ],
  " zostało zapisane.": [
    " has been saved.",
    " wurde gespeichert.",
    " byla uložena."
  ],
  "Twoja rezerwacja": [
    "Your booking",
    "Ihre Buchung",
    "Vaše rezervace"
  ],
  "Szczegóły przejazdu": [
    "Trip details",
    "Fahrtdetails",
    "Podrobnosti jízdy"
  ],
  "Decyzja": [
    "Decision",
    "Entscheidung",
    "Rozhodnutí"
  ],
  "Netto": [
    "Net",
    "Netto",
    "Bez DPH"
  ],
  "Brutto": [
    "Gross",
    "Brutto",
    "Včetně DPH"
  ],
  "Status": [
    "Status",
    "Status",
    "Stav"
  ],
  "Kierowca": [
    "Driver",
    "Fahrer",
    "Řidič"
  ],
  "Ładowanie rezerwacji…": [
    "Loading booking…",
    "Buchung wird geladen…",
    "Načítání rezervace…"
  ],
  "POWRÓT": [
    "RETURN",
    "RÜCKFAHRT",
    "NÁVRAT"
  ],
  "PASAŻEROWIE": [
    "PASSENGERS",
    "FAHRGÄSTE",
    "CESTUJÍCÍ"
  ],
  "WYCENA WYGASŁA": [
    "QUOTE EXPIRED",
    "ANGEBOT ABGELAUFEN",
    "NABÍDKA VYPRŠELA"
  ],
  "WRÓĆ": [
    "BACK",
    "ZURÜCK",
    "ZPĚT"
  ],
  "REZYGNUJĘ Z WYCENY": [
    "DECLINE QUOTE",
    "ANGEBOT ABLEHNEN",
    "ODMÍTNOUT NABÍDKU"
  ],
  "Potwierdzić": [
    "Confirm",
    "Bestätigen",
    "Potvrdit"
  ],
  "rezygnację?": [
    "decline?",
    "Ablehnung?",
    "odmítnutí?"
  ],
  "ANULUJ REZERWACJĘ": [
    "CANCEL BOOKING",
    "BUCHUNG STORNIEREN",
    "ZRUŠIT REZERVACI"
  ],
  "WYGASŁA": [
    "EXPIRED",
    "ABGELAUFEN",
    "VYPRŠELA"
  ],
  "CZEKA NA WYCENĘ": [
    "AWAITING QUOTE",
    "ANGEBOT AUSSTEHEND",
    "ČEKÁ NA NABÍDKU"
  ],
  "ZAMÓWIENIE": [
    "ORDER",
    "BESTELLUNG",
    "OBJEDNÁVKA"
  ],
  "Zamówienie": [
    "Order",
    "Bestellung",
    "Objednávka"
  ],
  "Termin ważności": [
    "Valid until",
    "Gültig bis",
    "Platnost do"
  ],
  "Płatność:": [
    "Payment:",
    "Zahlung:",
    "Platba:"
  ],
  "Wycena ważna do:": [
    "Quote valid until:",
    "Angebot gültig bis:",
    "Nabídka platí do:"
  ],
  "Nie udało się zapisać zmian.": [
    "Could not save changes.",
    "Änderungen konnten nicht gespeichert werden.",
    "Změny se nepodařilo uložit."
  ],
  "Zmiany zostały zapisane.": [
    "Changes saved.",
    "Änderungen gespeichert.",
    "Změny byly uloženy."
  ],
  "Nie udało się zapisać decyzji.": [
    "Could not save your decision.",
    "Entscheidung konnte nicht gespeichert werden.",
    "Rozhodnutí se nepodařilo uložit."
  ],
  "Nie udało się anulować rezerwacji.": [
    "Could not cancel booking.",
    "Buchung konnte nicht storniert werden.",
    "Rezervaci se nepodařilo zrušit."
  ],
  "Płatność online": [
    "Online payment",
    "Online-Zahlung",
    "Online platba"
  ],
  "PŁATNOŚĆ ONLINE": [
    "ONLINE PAYMENT",
    "ONLINE-ZAHLUNG",
    "ONLINE PLATBA"
  ],
  "✓ Płatność została zaksięgowana.": [
    "✓ Payment received.",
    "✓ Zahlung eingegangen.",
    "✓ Platba přijata."
  ],
  "↩ Dla tej płatności zarejestrowano zwrot.": [
    "↩ This payment has been refunded.",
    "↩ Diese Zahlung wurde erstattet.",
    "↩ Tato platba byla vrácena."
  ],
  "⚠ Płatność wymaga weryfikacji przez MATT TRANSPORT.": [
    "⚠ Payment requires review by MATT TRANSPORT.",
    "⚠ Die Zahlung muss von MATT TRANSPORT geprüft werden.",
    "⚠ Platbu musí ověřit MATT TRANSPORT."
  ],
  "Nie wykonuj kolejnej płatności.": [
    "Do not pay again.",
    "Bitte nicht erneut bezahlen.",
    "Neplaťte znovu."
  ],
  "Płatność online jest niedostępna dla aktualnego statusu rezerwacji.": [
    "Online payment is unavailable for the current booking status.",
    "Online-Zahlung ist für den aktuellen Buchungsstatus nicht verfügbar.",
    "Online platba není pro aktuální stav rezervace dostupná."
  ],
  "Płatność została przerwana. Możesz spróbować ponownie.": [
    "Payment was cancelled. You can try again.",
    "Die Zahlung wurde abgebrochen. Sie können es erneut versuchen.",
    "Platba byla zrušena. Můžete to zkusit znovu."
  ],
  "Płatność została przyjęta. Potwierdzamy jej status…": [
    "Payment submitted. Checking its status…",
    "Zahlung übermittelt. Status wird geprüft…",
    "Platba odeslána. Ověřujeme stav…"
  ],
  "✓ Płatność została zaksięgowana. Dziękujemy.": [
    "✓ Payment received. Thank you.",
    "✓ Zahlung eingegangen. Vielen Dank.",
    "✓ Platba přijata. Děkujeme."
  ],
  "Płatność dotarła, ale wymaga weryfikacji przez MATT TRANSPORT.": [
    "Payment received but requires review by MATT TRANSPORT.",
    "Zahlung eingegangen, muss aber von MATT TRANSPORT geprüft werden.",
    "Platba dorazila, ale musí ji ověřit MATT TRANSPORT."
  ],
  "Płatność została wysłana do operatora. Status może zaktualizować się za chwilę.": [
    "Payment submitted to the provider. Status may update shortly.",
    "Zahlung an den Anbieter gesendet. Der Status wird in Kürze aktualisiert.",
    "Platba byla odeslána poskytovateli. Stav se brzy aktualizuje."
  ],
  "Nie udało się rozpocząć płatności.": [
    "Unable to start payment.",
    "Zahlung konnte nicht gestartet werden.",
    "Platbu se nepodařilo zahájit."
  ],
  "✓ Wycena zaakceptowana. Rezerwacja została potwierdzona — możesz teraz opłacić ją online.": [
    "✓ Quote accepted. Your booking is confirmed — you can now pay online.",
    "✓ Angebot angenommen. Ihre Buchung ist bestätigt — Sie können jetzt online bezahlen.",
    "✓ Nabídka přijata. Rezervace je potvrzena — nyní můžete zaplatit online."
  ],
  "✓ Wycena zaakceptowana. Rezerwacja została potwierdzona.": [
    "✓ Quote accepted. Your booking is confirmed.",
    "✓ Angebot angenommen. Ihre Buchung ist bestätigt.",
    "✓ Nabídka přijata. Rezervace je potvrzena."
  ],
  "Rezygnacja została zapisana. Transport nie będzie realizowany.": [
    "Your decision to decline has been saved. The transport will not be carried out.",
    "Ihre Ablehnung wurde gespeichert. Die Fahrt wird nicht durchgeführt.",
    "Odmítnutí bylo uloženo. Doprava nebude uskutečněna."
  ],
  "Nie udało się zapisać decyzji. Spróbuj ponownie lub zadzwoń: +48 691 242 691.": [
    "Could not save your decision. Try again or call +48 691 242 691.",
    "Entscheidung konnte nicht gespeichert werden. Versuchen Sie es erneut oder rufen Sie +48 691 242 691 an.",
    "Rozhodnutí se nepodařilo uložit. Zkuste to znovu nebo volejte +48 691 242 691."
  ],
  "Rezerwacja została anulowana. Ponieważ była już opłacona, MATT TRANSPORT zweryfikuje ewentualny zwrot zgodnie z warunkami anulacji.": [
    "Your booking has been cancelled. As it was already paid, MATT TRANSPORT will review any refund under the cancellation terms.",
    "Ihre Buchung wurde storniert. Da sie bereits bezahlt war, prüft MATT TRANSPORT eine mögliche Erstattung gemäß den Stornierungsbedingungen.",
    "Rezervace byla zrušena. Protože již byla zaplacena, MATT TRANSPORT prověří případné vrácení platby podle storno podmínek."
  ],
  "Rezerwacja została anulowana. Potwierdzenie zostało wysłane e-mailem.": [
    "Your booking has been cancelled. Confirmation has been sent by email.",
    "Ihre Buchung wurde storniert. Eine Bestätigung wurde per E-Mail gesendet.",
    "Rezervace byla zrušena. Potvrzení bylo odesláno e-mailem."
  ],
  "Nie udało się anulować rezerwacji. Spróbuj ponownie lub zadzwoń: +48 691 242 691.": [
    "Could not cancel your booking. Try again or call +48 691 242 691.",
    "Buchung konnte nicht storniert werden. Versuchen Sie es erneut oder rufen Sie +48 691 242 691 an.",
    "Rezervaci se nepodařilo zrušit. Zkuste to znovu nebo volejte +48 691 242 691."
  ],
  "Transport A → B · wycena indywidualna": [
    "Transport A → B · custom quote",
    "Fahrt A → B · individuelles Angebot",
    "Doprava A → B · individuální nabídka"
  ],
  "Tutaj możesz sprawdzić szczegóły swojej rezerwacji": [
    "View your booking details here",
    "Hier können Sie Ihre Buchungsdetails ansehen",
    "Zde si můžete prohlédnout podrobnosti rezervace"
  ],
  " i wprowadzić dozwolone zmiany.": [
    " and make permitted changes.",
    " und zulässige Änderungen vornehmen.",
    " a provést povolené změny."
  ],
  "Rezygnacja została": [
    "Your decision has been saved",
    "Ihre Ablehnung wurde gespeichert",
    "Odmítnutí bylo uloženo"
  ],
  "KONTRAHENTA": [
    "COMPANY",
    "FIRMA",
    "FIRMY"
  ],
  "Wybierz pracownika.": [
    "Select an employee.",
    "Wählen Sie einen Mitarbeiter aus.",
    "Vyberte zaměstnance."
  ],
  "DODATKOWE INFORMACJE": [
    "ADDITIONAL INFORMATION",
    "ZUSÄTZLICHE INFORMATIONEN",
    "DALŠÍ INFORMACE"
  ],
  "Płatność firmowa online": [
    "Company online payment",
    "Online-Firmenzahlung",
    "Firemní online platba"
  ],
  "Ładowanie płatności…": [
    "Loading payment…",
    "Zahlung wird geladen…",
    "Načítání platby…"
  ],
  "Nie udało się odczytać płatności.": [
    "Unable to load payment.",
    "Zahlung konnte nicht geladen werden.",
    "Platbu se nepodařilo načíst."
  ],
  "Nie udało się połączyć z systemem płatności.": [
    "Unable to connect to the payment system.",
    "Verbindung zum Zahlungssystem fehlgeschlagen.",
    "Nepodařilo se připojit k platebnímu systému."
  ],
  "Płatność została przyjęta. Sprawdzamy status…": [
    "Payment received. Checking status…",
    "Zahlung eingegangen. Status wird geprüft…",
    "Platba přijata. Ověřujeme stav…"
  ],
  "PASAŻER": [
    "PASSENGER",
    "FAHRGAST",
    "CESTUJÍCÍ"
  ],
  "TERMIN": [
    "DATE & TIME",
    "DATUM UND UHRZEIT",
    "TERMÍN"
  ],
  "TRASA": [
    "ROUTE",
    "STRECKE",
    "TRASA"
  ],
  "↩ Zarejestrowano zwrot.": [
    "↩ This payment has been refunded.",
    "↩ Diese Zahlung wurde erstattet.",
    "↩ Platba byla vrácena."
  ],
  "Płatność jest niedostępna dla aktualnego statusu rezerwacji.": [
    "Payment is unavailable for the current booking status.",
    "Die Zahlung ist für den aktuellen Buchungsstatus nicht verfügbar.",
    "Platba není pro aktuální stav rezervace dostupná."
  ],
  "DO ZAPŁATY": [
    "AMOUNT DUE",
    "ZU ZAHLEN",
    "K ZAPLACENÍ"
  ],
  "PRZECHODZĘ DO PŁATNOŚCI…": [
    "OPENING PAYMENT…",
    "ZAHLUNG WIRD GEÖFFNET…",
    "OTEVÍRÁNÍ PLATBY…"
  ],
  "💳 OPŁAĆ ONLINE": [
    "💳 PAY ONLINE",
    "💳 ONLINE BEZAHLEN",
    "💳 ZAPLATIT ONLINE"
  ],
  "Płatność jest obsługiwana przez Stripe.": [
    "Payment is securely processed by Stripe.",
    "Die Zahlung wird sicher über Stripe abgewickelt.",
    "Platbu bezpečně zpracovává Stripe."
  ],
  "Kontakt": [
    "Contact",
    "Kontakt",
    "Kontakt"
  ],
  "W razie pytań dotyczących transportu lub płatności skontaktuj się z MATT TRANSPORT.": [
    "For transport or payment questions, contact MATT TRANSPORT.",
    "Bei Fragen zur Fahrt oder Zahlung kontaktieren Sie MATT TRANSPORT.",
    "V případě dotazů k dopravě či platbě kontaktujte MATT TRANSPORT."
  ],
  "Ten link nie dotyczy rezerwacji firmowej.": [
    "This link is not for a company booking.",
    "Dieser Link gehört nicht zu einer Firmenbuchung.",
    "Tento odkaz není pro firemní rezervaci."
  ],
  "Płatność będzie dostępna po potwierdzeniu rezerwacji.": [
    "Payment will be available after the booking is confirmed.",
    "Die Zahlung ist nach der Buchungsbestätigung verfügbar.",
    "Platba bude dostupná po potvrzení rezervace."
  ],
  "Nie udało się uruchomić płatności.": [
    "Unable to start payment.",
    "Zahlung konnte nicht gestartet werden.",
    "Platbu se nepodařilo spustit."
  ],
  "W realizacji": [
    "In progress",
    "In Durchführung",
    "Probíhá"
  ],
  "Odbiór z lotniska": [
    "Airport pickup",
    "Abholung am Flughafen",
    "Vyzvednutí na letišti"
  ],
  "Transfer w obie strony": [
    "Round-trip transfer",
    "Hin- und Rücktransfer",
    "Transfer tam a zpět"
  ],
  "Transfer na lotnisko": [
    "Transfer to airport",
    "Transfer zum Flughafen",
    "Transfer na letiště"
  ],
  "Płatność u kierowcy": [
    "Pay your driver",
    "Zahlung beim Fahrer",
    "Platba řidiči"
  ],
  "Nie udało się pobrać przejazdów.": [
    "Could not load your journeys.",
    "Fahrten konnten nicht geladen werden.",
    "Jízdy se nepodařilo načíst."
  ],
  "Link logowania jest nieprawidłowy, został już użyty albo wygasł. Poproś o nowy link.": [
    "This login link is invalid, already used or expired. Request a new link.",
    "Dieser Anmeldelink ist ungültig, bereits verwendet oder abgelaufen. Fordern Sie einen neuen Link an.",
    "Odkaz k přihlášení je neplatný, použitý nebo vypršel. Požádejte o nový odkaz."
  ],
  "Nie udało się utworzyć sesji. Poproś o nowy link logowania.": [
    "Could not create a session. Request a new login link.",
    "Sitzung konnte nicht erstellt werden. Fordern Sie einen neuen Anmeldelink an.",
    "Relaci se nepodařilo vytvořit. Požádejte o nový přihlašovací odkaz."
  ],
  "Sprawdź swoją skrzynkę e-mail.": [
    "Please check your email.",
    "Bitte prüfen Sie Ihr E-Mail-Postfach.",
    "Zkontrolujte svou e-mailovou schránku."
  ],
  "Nie udało się wysłać linku. Spróbuj ponownie za chwilę.": [
    "Could not send the link. Please try again shortly.",
    "Link konnte nicht gesendet werden. Versuchen Sie es in Kürze erneut.",
    "Odkaz se nepodařilo odeslat. Zkuste to za chvíli znovu."
  ],
  "Wylogowano z Moich przejazdów.": [
    "You have signed out of My rides.",
    "Sie wurden von Meine Fahrten abgemeldet.",
    "Byli jste odhlášeni z Moje jízdy."
  ],
  "Termin minął": [
    "Date passed",
    "Termin verstrichen",
    "Termín uplynul"
  ],
  "Nr:": [
    "Ref:",
    "Nr.:",
    "Č.:"
  ],
  "Pasażerowie:": [
    "Passengers:",
    "Fahrgäste:",
    "Cestující:"
  ],
  "SZCZEGÓŁY": [
    "DETAILS",
    "DETAILS",
    "PODROBNOSTI"
  ],
  "ZAMÓW PONOWNIE": [
    "BOOK AGAIN",
    "ERNEUT BUCHEN",
    "OBJEDNAT ZNOVU"
  ],
  "Moje przejazdy": [
    "My rides",
    "Meine Fahrten",
    "Moje jízdy"
  ],
  "MOJE PRZEJAZDY": [
    "MY RIDES",
    "MEINE FAHRTEN",
    "MOJE JÍZDY"
  ],
  "Ładowanie…": [
    "Loading…",
    "Wird geladen…",
    "Načítání…"
  ],
  "← Wróć do rezerwacji": [
    "← Back to booking",
    "← Zurück zur Buchung",
    "← Zpět na rezervaci"
  ],
  "Bez hasła. Podaj e-mail użyty przy prywatnej rezerwacji, a wyślemy jednorazowy link do Twoich przejazdów.": [
    "No password needed. Enter the email used for your private booking and we will send a one-time link to your rides.",
    "Ohne Passwort. Geben Sie die E-Mail-Adresse Ihrer privaten Buchung ein. Wir senden Ihnen einen einmaligen Link zu Ihren Fahrten.",
    "Bez hesla. Zadejte e-mail použitý pro soukromou rezervaci a zašleme vám jednorázový odkaz k jízdám."
  ],
  "Adres e-mail": [
    "Email address",
    "E-Mail-Adresse",
    "E-mailová adresa"
  ],
  "WYSYŁANIE…": [
    "SENDING…",
    "WIRD GESENDET…",
    "ODESÍLÁNÍ…"
  ],
  "WYŚLIJ LINK DO LOGOWANIA": [
    "SEND LOGIN LINK",
    "ANMELDELINK SENDEN",
    "ODESLAT ODKAZ K PŘIHLÁŠENÍ"
  ],
  "Dla bezpieczeństwa link działa tylko raz i wygasa po 15 minutach. Konto pokazuje wyłącznie prywatne rezerwacje B2C — rezerwacje firmowe B2B pozostają w panelu firmy.": [
    "For security, the link works once and expires after 15 minutes. This account shows private B2C bookings only. Company B2B bookings remain in the company portal.",
    "Aus Sicherheitsgründen gilt der Link nur einmal und läuft nach 15 Minuten ab. Dieses Konto zeigt nur private B2C-Buchungen. B2B-Firmenbuchungen bleiben im Firmenportal.",
    "Z bezpečnostních důvodů lze odkaz použít jen jednou a vyprší po 15 minutách. Účet zobrazuje pouze soukromé rezervace B2C. Firemní rezervace B2B zůstávají ve firemním portálu."
  ],
  "+ NOWA REZERWACJA": [
    "+ NEW BOOKING",
    "+ NEUE BUCHUNG",
    "+ NOVÁ REZERVACE"
  ],
  "NAJBLIŻSZY TRANSPORT": [
    "NEXT JOURNEY",
    "NÄCHSTE FAHRT",
    "NEJBLIŽŠÍ JÍZDA"
  ],
  "Twój następny przejazd": [
    "Your next journey",
    "Ihre nächste Fahrt",
    "Vaše další jízda"
  ],
  "aktywne": [
    "active",
    "aktiv",
    "aktivní"
  ],
  "Brak zaplanowanych przejazdów": [
    "No scheduled journeys",
    "Keine geplanten Fahrten",
    "Žádné naplánované jízdy"
  ],
  "Możesz od razu zamówić kolejny transport.": [
    "You can book your next journey now.",
    "Sie können jetzt Ihre nächste Fahrt buchen.",
    "Další jízdu si můžete objednat hned."
  ],
  "HISTORIA · ZAKOŃCZONE / ANULOWANE / TERMIN MINĄŁ": [
    "HISTORY · COMPLETED / CANCELLED / PAST",
    "VERLAUF · ABGESCHLOSSEN / STORNIERT / VERGANGEN",
    "HISTORIE · DOKONČENÉ / ZRUŠENÉ / MINULÉ"
  ],
  "Nie znaleziono danych poprzedniej rezerwacji. Wróć do „Moich przejazdów” i wybierz „Zamów ponownie”.": [
    "Previous booking details not found. Go back to My rides and select Book again.",
    "Vorherige Buchungsdaten nicht gefunden. Gehen Sie zu Meine Fahrten und wählen Sie Erneut buchen.",
    "Údaje předchozí rezervace nenalezeny. Vraťte se do Moje jízdy a zvolte Objednat znovu."
  ],
  "Nie udało się odczytać danych poprzedniej rezerwacji.": [
    "Could not read the previous booking details.",
    "Vorherige Buchungsdaten konnten nicht gelesen werden.",
    "Údaje předchozí rezervace se nepodařilo načíst."
  ],
  "Podaj nową datę i godzinę przejazdu.": [
    "Enter the new journey date and time.",
    "Geben Sie das neue Fahrtdatum und die Uhrzeit an.",
    "Zadejte nové datum a čas jízdy."
  ],
  "Podaj prawidłowy termin przejazdu.": [
    "Enter a valid journey date and time.",
    "Geben Sie ein gültiges Fahrtdatum und eine Uhrzeit an.",
    "Zadejte platné datum a čas jízdy."
  ],
  "Podaj datę i godzinę powrotu.": [
    "Enter the return date and time.",
    "Geben Sie das Rückfahrtdatum und die Uhrzeit an.",
    "Zadejte datum a čas návratu."
  ],
  "Nie udało się ponownie obliczyć trasy.": [
    "Could not recalculate the route.",
    "Die Route konnte nicht neu berechnet werden.",
    "Trasu se nepodařilo přepočítat."
  ],
  "Nie udało się utworzyć rezerwacji.": [
    "Could not create your booking.",
    "Buchung konnte nicht erstellt werden.",
    "Rezervaci se nepodařilo vytvořit."
  ],
  "Przygotowuję rezerwację…": [
    "Preparing your booking…",
    "Buchung wird vorbereitet…",
    "Příprava rezervace…"
  ],
  "Nowa rezerwacja została przyjęta": [
    "Your new booking has been received",
    "Ihre neue Buchung ist eingegangen",
    "Nová rezervace byla přijata"
  ],
  "Skopiowaliśmy dane poprzedniego przejazdu i zapisaliśmy nowy termin jako osobne zamówienie.": [
    "We copied your previous journey details and saved the new date as a separate booking.",
    "Wir haben die Daten Ihrer vorherigen Fahrt übernommen und den neuen Termin als separate Buchung gespeichert.",
    "Zkopírovali jsme údaje předchozí jízdy a nový termín uložili jako samostatnou objednávku."
  ],
  "OTWÓRZ NOWĄ REZERWACJĘ": [
    "OPEN NEW BOOKING",
    "NEUE BUCHUNG ÖFFNEN",
    "OTEVŘÍT NOVOU REZERVACI"
  ],
  "Zamów ponownie": [
    "Book again",
    "Erneut buchen",
    "Objednat znovu"
  ],
  "WRÓĆ DO MOICH PRZEJAZDÓW": [
    "BACK TO MY RIDES",
    "ZURÜCK ZU MEINE FAHRTEN",
    "ZPĚT NA MOJE JÍZDY"
  ],
  "MATT CUSTOMER · ZAMÓW PONOWNIE": [
    "MATT CUSTOMER · BOOK AGAIN",
    "MATT CUSTOMER · ERNEUT BUCHEN",
    "MATT CUSTOMER · OBJEDNAT ZNOVU"
  ],
  "Ten sam transport, nowy termin": [
    "Same journey, new date",
    "Gleiche Fahrt, neuer Termin",
    "Stejná jízda, nový termín"
  ],
  "Skopiowaliśmy trasę i Twoje dane. Uzupełnij tylko nowy termin": [
    "We copied your route and details. Just enter a new date and time",
    "Wir haben Strecke und Angaben übernommen. Geben Sie nur den neuen Termin ein",
    "Zkopírovali jsme trasu a vaše údaje. Stačí zadat nový termín"
  ],
  " oraz numer lotu, jeżeli go znasz": [
    " and the flight number, if known",
    " und die Flugnummer, falls bekannt",
    " a číslo letu, pokud ho znáte"
  ],
  "POPRZEDNIA TRASA": [
    "PREVIOUS ROUTE",
    "VORHERIGE STRECKE",
    "PŘEDCHOZÍ TRASA"
  ],
  "Nazwa restauracji": [
    "Restaurant name",
    "Name des Restaurants",
    "Název restaurace"
  ],
  "Adres restauracji": [
    "Restaurant address",
    "Adresse des Restaurants",
    "Adresa restaurace"
  ],
  "Liczba pojazdów": [
    "Number of vehicles",
    "Anzahl der Fahrzeuge",
    "Počet vozidel"
  ],
  "Nowy termin": [
    "New date and time",
    "Neuer Termin",
    "Nový termín"
  ],
  "Data rozpoczęcia rozwozów": [
    "Transport start date",
    "Datum des Transportbeginns",
    "Datum zahájení rozvozu"
  ],
  "Godzina rozpoczęcia": [
    "Start time",
    "Beginn",
    "Čas zahájení"
  ],
  "Klient": [
    "Customer",
    "Kunde",
    "Zákazník"
  ],
  "ZAMÓW TEN TRANSPORT PONOWNIE": [
    "BOOK THIS TRANSPORT AGAIN",
    "DIESE FAHRT ERNEUT BUCHEN",
    "OBJEDNAT TUTO DOPRAVU ZNOVU"
  ],
  "ANULUJ I WRÓĆ": [
    "CANCEL AND GO BACK",
    "ABBRECHEN UND ZURÜCK",
    "ZRUŠIT A ZPĚT"
  ],
  "Safari → Udostępnij → Do ekranu początkowego": [
    "Safari → Share → Add to Home Screen",
    "Safari → Teilen → Zum Home-Bildschirm",
    "Safari → Sdílet → Přidat na plochu"
  ],
  "Menu przeglądarki → Zainstaluj aplikację": [
    "Browser menu → Install app",
    "Browsermenü → App installieren",
    "Nabídka prohlížeče → Nainstalovat aplikaci"
  ],
  "Zainstaluj aplikację MATT TRANSPORT": [
    "Install the MATT TRANSPORT app",
    "MATT TRANSPORT App installieren",
    "Nainstalovat aplikaci MATT TRANSPORT"
  ],
  "✓ Zainstalowano": [
    "✓ Installed",
    "✓ Installiert",
    "✓ Nainstalováno"
  ],
  "Aplikacja gotowa": [
    "App ready",
    "App bereit",
    "Aplikace připravena"
  ],
  "Aplikacja": [
    "App",
    "App",
    "Aplikace"
  ],
  "MATT TRANSPORT jest na telefonie.": [
    "MATT TRANSPORT is on your phone.",
    "MATT TRANSPORT ist auf Ihrem Telefon.",
    "MATT TRANSPORT máte v telefonu."
  ],
  "MATT TRANSPORT na telefonie.": [
    "MATT TRANSPORT on your phone.",
    "MATT TRANSPORT auf Ihrem Telefon.",
    "MATT TRANSPORT ve vašem telefonu."
  ],
  "ZAINSTALOWANA ✓": [
    "INSTALLED ✓",
    "INSTALLIERT ✓",
    "NAINSTALOVÁNO ✓"
  ],
  "INSTALUJ →": [
    "INSTALL →",
    "INSTALLIEREN →",
    "NAINSTALOVAT →"
  ],
  "Nie udało się otworzyć formularza oceny.": [
    "Could not open the rating form.",
    "Bewertungsformular konnte nicht geöffnet werden.",
    "Formulář hodnocení se nepodařilo otevřít."
  ],
  "Dziękujemy — Twoja ocena jest już zapisana.": [
    "Thank you — your rating has already been saved.",
    "Vielen Dank — Ihre Bewertung wurde bereits gespeichert.",
    "Děkujeme — vaše hodnocení je již uloženo."
  ],
  "Nie udało się zapisać oceny.": [
    "Could not save your rating.",
    "Bewertung konnte nicht gespeichert werden.",
    "Hodnocení se nepodařilo uložit."
  ],
  "Dziękujemy za 5/5! Jeśli chcesz, możesz teraz dodać opinię również w Google.": [
    "Thank you for 5/5! You can now also leave a Google review if you wish.",
    "Vielen Dank für 5/5! Wenn Sie möchten, können Sie jetzt auch eine Google-Bewertung abgeben.",
    "Děkujeme za 5/5! Pokud chcete, můžete nyní přidat recenzi také na Google."
  ],
  "Dziękujemy za opinię. Twoje uwagi trafiły bezpośrednio do MATT TRANSPORT.": [
    "Thank you for your feedback. Your comments have been sent directly to MATT TRANSPORT.",
    "Vielen Dank für Ihr Feedback. Ihre Hinweise wurden direkt an MATT TRANSPORT übermittelt.",
    "Děkujeme za hodnocení. Vaše připomínky byly předány přímo MATT TRANSPORT."
  ],
  "Jak minęła podróż?": [
    "How was your journey?",
    "Wie war Ihre Fahrt?",
    "Jaká byla vaše cesta?"
  ],
  "Co możemy poprawić?": [
    "What can we improve?",
    "Was können wir verbessern?",
    "Co můžeme zlepšit?"
  ],
  "Napisz krótko, co wymagało poprawy…": [
    "Briefly tell us what could be improved…",
    "Beschreiben Sie kurz, was verbessert werden könnte…",
    "Stručně napište, co je třeba zlepšit…"
  ],
  "Możesz zostawić kilka słów…": [
    "You can leave a short comment…",
    "Sie können einen kurzen Kommentar hinterlassen…",
    "Můžete zanechat krátký komentář…"
  ],
  "ZAPISZ OCENĘ": [
    "SAVE RATING",
    "BEWERTUNG SPEICHERN",
    "ULOŽIT HODNOCENÍ"
  ],
  "⭐ DODAJ OPINIĘ W GOOGLE": [
    "⭐ LEAVE A GOOGLE REVIEW",
    "⭐ GOOGLE-BEWERTUNG ABGEBEN",
    "⭐ PŘIDAT RECENZI NA GOOGLE"
  ],
  "Wesele": [
    "Wedding",
    "Hochzeit",
    "Svatba"
  ],
  "Transport weselny": [
    "Wedding transport",
    "Hochzeitstransport",
    "Svatební doprava"
  ],
  "Jeżeli ten adres e-mail jest powiązany z rezerwacjami MATT TRANSPORT, wysłaliśmy link do Moich przejazdów.": [
    "If this email address is associated with MATT TRANSPORT bookings, we have sent a link to My rides.",
    "Wenn diese E-Mail-Adresse mit MATT TRANSPORT Buchungen verknüpft ist, haben wir einen Link zu Meine Fahrten gesendet.",
    "Pokud je tento e-mail spojen s rezervacemi MATT TRANSPORT, odeslali jsme odkaz na Moje jízdy."
  ],
  "Zapisywanie rezerwacji i ponowne przeliczanie ceny na serwerze...": [
    "Saving booking and recalculating the price...",
    "Buchung wird gespeichert und der Preis neu berechnet...",
    "Ukládání rezervace a přepočet ceny..."
  ],
  "Cennik indywidualny": [
    "Individual price list",
    "Individuelle Preisliste",
    "Individuální ceník"
  ],
  "Cennik standardowy MATT / indywidualny fallback": [
    "MATT standard prices / individual fallback",
    "MATT-Standardpreise / individuelle Ersatzpreise",
    "Standardní ceny MATT / individuální náhradní ceny"
  ],
  "Z jakiego lotniska?": [
    "Which airport are you arriving at?",
    "An welchem Flughafen kommen Sie an?",
    "Na které letiště přilétáte?"
  ],
  "Indywidualny cennik kontrahenta.": [
    "Individual company price list.",
    "Individuelle Firmenpreisliste.",
    "Individuální firemní ceník."
  ],
  "Cena standardowa MATT dla tej pozycji.": [
    "MATT standard price for this item.",
    "MATT-Standardpreis für diese Position.",
    "Standardní cena MATT pro tuto položku."
  ],
  "ZAMAWIANIE...": [
    "ORDERING...",
    "WIRD BESTELLT...",
    "OBJEDNÁVÁNÍ..."
  ],
  "WYLOGUJ": [
    "SIGN OUT",
    "ABMELDEN",
    "ODHLÁSIT"
  ],
  "np. jan@firma.pl": [
    "e.g. name@example.com",
    "z. B. name@firma.de",
    "např. jmeno@firma.cz"
  ],
  "Data przylotu": [
    "Arrival date",
    "Ankunftsdatum",
    "Datum příletu"
  ],
  "np. ENT7692": [
    "e.g. ENT7692",
    "z. B. ENT7692",
    "např. ENT7692"
  ],
  "np. LO3880": [
    "e.g. LO3880",
    "z. B. LO3880",
    "např. LO3880"
  ],
  "TWORZENIE REZERWACJI…": [
    "CREATING BOOKING…",
    "BUCHUNG WIRD ERSTELLT…",
    "VYTVÁŘENÍ REZERVACE…"
  ],
  "Dodatkowa uwaga (opcjonalnie)": [
    "Additional comment (optional)",
    "Zusätzlicher Kommentar (optional)",
    "Další poznámka (volitelně)"
  ],
  "Przelew": [
    "Bank transfer",
    "Banküberweisung",
    "Bankovní převod"
  ],
  "Dashboard": [
    "Dashboard",
    "Übersicht",
    "Přehled"
  ],
  "+ Nowa rezerwacja": [
    "+ New booking",
    "+ Neue Buchung",
    "+ Nová rezervace"
  ],
  "Szablony i cykliczne": [
    "Templates and recurring rides",
    "Vorlagen und regelmäßige Fahrten",
    "Šablony a opakované jízdy"
  ],
  "Kalendarz": [
    "Calendar",
    "Kalender",
    "Kalendář"
  ],
  "Cennik i warunki": [
    "Prices and terms",
    "Preise und Konditionen",
    "Ceník a podmínky"
  ],
  "Pracownicy": [
    "Employees",
    "Mitarbeiter",
    "Zaměstnanci"
  ],
  "Rozliczenia": [
    "Billing",
    "Abrechnung",
    "Vyúčtování"
  ],
  "Dane firmy": [
    "Company details",
    "Firmendaten",
    "Údaje firmy"
  ],
  "Panel klienta biznesowego": [
    "Business customer portal",
    "Geschäftskundenportal",
    "Portál firemního zákazníka"
  ],
  "Zamawiaj transfery i kontroluj rezerwacje swojej firmy.": [
    "Book transfers and manage your company bookings.",
    "Buchen Sie Transfers und verwalten Sie Ihre Firmenbuchungen.",
    "Objednávejte transfery a spravujte firemní rezervace."
  ],
  "E-mail służbowy": [
    "Work email",
    "Geschäftliche E-Mail",
    "Pracovní e-mail"
  ],
  "Hasło": [
    "Password",
    "Passwort",
    "Heslo"
  ],
  "LOGOWANIE...": [
    "SIGNING IN...",
    "ANMELDUNG...",
    "PŘIHLAŠOVÁNÍ..."
  ],
  "ZALOGUJ DO PANELU FIRMY": [
    "SIGN IN TO COMPANY PORTAL",
    "IM FIRMENPORTAL ANMELDEN",
    "PŘIHLÁSIT DO FIREMNÍHO PORTÁLU"
  ],
  "Nieprawidłowy e-mail lub hasło.": [
    "Incorrect email or password.",
    "Falsche E-Mail-Adresse oder falsches Passwort.",
    "Nesprávný e-mail nebo heslo."
  ],
  "Nie udało się zalogować. Spróbuj ponownie.": [
    "Could not sign in. Please try again.",
    "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.",
    "Přihlášení se nezdařilo. Zkuste to znovu."
  ]
};

export function customerText(key: string, value: unknown): string {
  const locale = resolveCustomerLocale(value);
  if (locale === "pl") return key;
  return customerCopy[key]?.[locale === "en" ? 0 : locale === "de" ? 1 : 2] ?? key;
}
