import { customerErrorCopy } from "@/lib/customerErrorCopy";
import { resolveCustomerLocale } from "@/lib/bookingLocale";
import { customerText } from "@/lib/customerCopy";

export const companyCopy: Record<string,[string,string,string]> = {
  "ZAPISZ ZMIANY": ["SAVE CHANGES", "ÄNDERUNGEN SPEICHERN", "ULOŽIT ZMĚNY"],
  "SNAPSHOT CENY": ["PRICE SNAPSHOT", "GESPEICHERTE PREISBERECHNUNG", "ULOŽENÝ VÝPOČET CENY"],
  "Dane kontrahenta": [
    "Customer company details",
    "Firmenkundendaten",
    "Údaje firemního zákazníka"
  ],
  "Nazwa": [
    "Name",
    "Name",
    "Název"
  ],
  "Twoja rola": [
    "Your role",
    "Ihre Rolle",
    "Vaše role"
  ],
  "Robocze": [
    "Draft",
    "Entwurf",
    "Koncept"
  ],
  "Oczekuje": [
    "Pending",
    "Ausstehend",
    "Čeká"
  ],
  "Otwarte": [
    "Open",
    "Offen",
    "Otevřeno"
  ],
  "Wystawiona": [
    "Issued",
    "Ausgestellt",
    "Vystaveno"
  ],
  "Zafakturowane": [
    "Invoiced",
    "In Rechnung gestellt",
    "Vyfakturováno"
  ],
  "Opłacona": [
    "Paid",
    "Bezahlt",
    "Zaplaceno"
  ],
  "Rozliczone": [
    "Settled",
    "Abgerechnet",
    "Vyúčtováno"
  ],
  "Po terminie": [
    "Overdue",
    "Überfällig",
    "Po splatnosti"
  ],
  "Anulowane": [
    "Cancelled",
    "Storniert",
    "Zrušeno"
  ],
  "Faktura": [
    "Invoice",
    "Rechnung",
    "Faktura"
  ],
  "Korekta": [
    "Credit note",
    "Korrekturrechnung",
    "Opravný doklad"
  ],
  "Potwierdzenie płatności": [
    "Payment confirmation",
    "Zahlungsbestätigung",
    "Potvrzení platby"
  ],
  "Inny dokument": [
    "Other document",
    "Anderes Dokument",
    "Jiný dokument"
  ],
  "BIEŻĄCY MIESIĄC": [
    "CURRENT MONTH",
    "AKTUELLER MONAT",
    "AKTUÁLNÍ MĚSÍC"
  ],
  "Podsumowanie transportów i kosztów": [
    "Transport and cost summary",
    "Fahrten- und Kostenübersicht",
    "Přehled dopravy a nákladů"
  ],
  "Podsumowanie obejmuje wyłącznie nieanulowane transporty z bieżącego miesiąca.": [
    "The summary includes non-cancelled journeys in the current month only.",
    "Die Übersicht enthält nur nicht stornierte Fahrten des aktuellen Monats.",
    "Přehled zahrnuje pouze nezrušené jízdy v aktuálním měsíci."
  ],
  "Transporty": [
    "Journeys",
    "Fahrten",
    "Jízdy"
  ],
  "Dokumenty przy rezerwacjach": [
    "Booking documents",
    "Buchungsdokumente",
    "Dokumenty k rezervacím"
  ],
  "Tutaj widzisz faktury, korekty i inne dokumenty przypisane bezpośrednio do pojedynczych przejazdów.": [
    "View invoices, credit notes and other documents assigned to individual journeys.",
    "Hier finden Sie Rechnungen, Korrekturen und andere Dokumente zu einzelnen Fahrten.",
    "Zde najdete faktury, opravné a další doklady přiřazené jednotlivým jízdám."
  ],
  "Brak dokumentów przypisanych do rezerwacji.": [
    "No booking documents available.",
    "Keine Buchungsdokumente vorhanden.",
    "K rezervacím zatím nejsou přiřazeny dokumenty."
  ],
  "Data kursu": [
    "Journey date",
    "Fahrtdatum",
    "Datum jízdy"
  ],
  "Typ": [
    "Type",
    "Typ",
    "Typ"
  ],
  "Numer": [
    "Number",
    "Nummer",
    "Číslo"
  ],
  "Plik": [
    "File",
    "Datei",
    "Soubor"
  ],
  "OTWÓRZ": [
    "OPEN",
    "ÖFFNEN",
    "OTEVŘÍT"
  ],
  "Miesięczne rozliczenia": [
    "Monthly billing",
    "Monatsabrechnungen",
    "Měsíční vyúčtování"
  ],
  "Faktury są wystawiane poza MATT Booking PRO. Tutaj pozostają dokumenty przypisane do zbiorczych rozliczeń miesięcznych.": [
    "Invoices are issued separately. Documents for consolidated monthly billing are available here.",
    "Rechnungen werden separat ausgestellt. Dokumente zu monatlichen Sammelabrechnungen finden Sie hier.",
    "Faktury se vystavují samostatně. Zde najdete doklady k souhrnnému měsíčnímu vyúčtování."
  ],
  "Miesiąc": [
    "Month",
    "Monat",
    "Měsíc"
  ],
  "Numer faktury": [
    "Invoice number",
    "Rechnungsnummer",
    "Číslo faktury"
  ],
  "Dokument": [
    "Document",
    "Dokument",
    "Dokument"
  ],
  "POBIERZ": [
    "DOWNLOAD",
    "HERUNTERLADEN",
    "STÁHNOUT"
  ],
  "ODBIÓR": [
    "PICKUP",
    "ABHOLUNG",
    "VYZVEDNUTÍ"
  ],
  "Kalendarz transportów": [
    "Journey calendar",
    "Fahrtenkalender",
    "Kalendář jízd"
  ],
  "Widoczne są wszystkie przejazdy: aktywne, zakończone i anulowane.": [
    "All journeys are shown: active, completed and cancelled.",
    "Alle Fahrten werden angezeigt: aktive, abgeschlossene und stornierte.",
    "Zobrazují se všechny jízdy: aktivní, dokončené a zrušené."
  ],
  "← POPRZEDNI": [
    "← PREVIOUS",
    "← ZURÜCK",
    "← PŘEDCHOZÍ"
  ],
  "Kliknij dzień, aby zobaczyć zlecenia.": [
    "Select a day to view bookings.",
    "Wählen Sie einen Tag, um Buchungen anzuzeigen.",
    "Vyberte den pro zobrazení objednávek."
  ],
  "NASTĘPNY →": [
    "NEXT →",
    "WEITER →",
    "DALŠÍ →"
  ],
  "Pn": [
    "Mon",
    "Mo",
    "Po"
  ],
  "Wt": [
    "Tue",
    "Di",
    "Út"
  ],
  "Śr": [
    "Wed",
    "Mi",
    "St"
  ],
  "Cz": [
    "Thu",
    "Do",
    "Čt"
  ],
  "Pt": [
    "Fri",
    "Fr",
    "Pá"
  ],
  "So": [
    "Sat",
    "Sa",
    "So"
  ],
  "Nd": [
    "Sun",
    "So",
    "Ne"
  ],
  "zlecenie": [
    "booking",
    "Buchung",
    "objednávka"
  ],
  "zlecenia": [
    "bookings",
    "Buchungen",
    "objednávky"
  ],
  "ZLECENIA NA DZIEŃ": [
    "BOOKINGS FOR",
    "BUCHUNGEN FÜR",
    "OBJEDNÁVKY NA DEN"
  ],
  "Brak zleceń na wybrany dzień.": [
    "No bookings for this day.",
    "Keine Buchungen für diesen Tag.",
    "Na tento den nejsou žádné objednávky."
  ],
  "Brak przypisanej firmy": [
    "No company assigned",
    "Keine Firma zugewiesen",
    "Není přiřazena firma"
  ],
  "Konto jest zalogowane, ale nie zostało jeszcze przypisane do klienta biznesowego.": [
    "You are signed in, but your account has not yet been assigned to a business customer.",
    "Sie sind angemeldet, aber Ihr Konto wurde noch keinem Firmenkunden zugewiesen.",
    "Jste přihlášeni, ale účet zatím nebyl přiřazen firemnímu zákazníkovi."
  ],
  "Termin przejazdu minął": [
    "Journey date has passed",
    "Fahrttermin verstrichen",
    "Termín jízdy uplynul"
  ],
  "— bez kierowcy": [
    "— no driver assigned",
    "— kein Fahrer zugewiesen",
    "— bez přiřazeného řidiče"
  ],
  "OTWÓRZ REZERWACJĘ →": [
    "OPEN BOOKING →",
    "BUCHUNG ÖFFNEN →",
    "OTEVŘÍT REZERVACI →"
  ],
  "ZAMÓWIONE TRANSPORTY": [
    "BOOKED TRANSPORT",
    "GEBUCHTE FAHRTEN",
    "OBJEDNANÁ DOPRAVA"
  ],
  "Nadchodzące i aktywne": [
    "Upcoming and active",
    "Anstehend und aktiv",
    "Nadcházející a aktivní"
  ],
  "Najbliższy termin jest zawsze najwyżej. Zakończone, anulowane i minione przejazdy pozostają poniżej w historii.": [
    "The nearest journey is shown first. Completed, cancelled and past journeys appear in the history below.",
    "Der nächste Termin steht oben. Abgeschlossene, stornierte und vergangene Fahrten finden Sie unten im Verlauf.",
    "Nejbližší termín je vždy nahoře. Dokončené, zrušené a minulé jízdy jsou níže v historii."
  ],
  "+ ZAMÓW TRANSPORT": [
    "+ BOOK TRANSPORT",
    "+ FAHRT BUCHEN",
    "+ OBJEDNAT DOPRAVU"
  ],
  "Brak zamówionych transportów.": [
    "No transport booked.",
    "Keine Fahrten gebucht.",
    "Zatím nemáte objednanou dopravu."
  ],
  "Nową rezerwację możesz utworzyć przyciskiem powyżej.": [
    "Use the button above to create a booking.",
    "Über die Schaltfläche oben können Sie eine Buchung erstellen.",
    "Novou rezervaci vytvoříte tlačítkem výše."
  ],
  "Nowa rezerwacja": [
    "New booking",
    "Neue Buchung",
    "Nová rezervace"
  ],
  "Rezerwacje firmy": [
    "Company bookings",
    "Firmenbuchungen",
    "Firemní rezervace"
  ],
  "NETTO + VAT 8%": [
    "NET + 8% VAT",
    "NETTO + 8% MWST.",
    "BEZ DPH + 8 % DPH"
  ],
  "Historia przejazdów": [
    "Journey history",
    "Fahrtenverlauf",
    "Historie jízd"
  ],
  "Najbliższy aktywny termin jest zawsze najwyżej. Historia znajduje się pod separatorem na dole.": [
    "The nearest active journey is shown first. History appears below the divider.",
    "Der nächste aktive Termin steht oben. Den Verlauf finden Sie unter der Trennlinie.",
    "Nejbližší aktivní termín je vždy nahoře. Historii najdete pod oddělovačem dole."
  ],
  "Wszystkie ceny B2B są cenami netto. Do kwoty doliczany jest VAT 8%.": [
    "All B2B prices are net, plus 8% VAT.",
    "Alle B2B-Preise sind Nettopreise zuzüglich 8% MwSt.",
    "Všechny ceny B2B jsou bez DPH. Připočítává se 8 % DPH."
  ],
  "Szablony i rezerwacje cykliczne": [
    "Templates and recurring bookings",
    "Vorlagen und regelmäßige Buchungen",
    "Šablony a opakované rezervace"
  ],
  "Godzina": [
    "Time",
    "Uhrzeit",
    "Čas"
  ],
  "Adres pasażera": [
    "Passenger address",
    "Fahrgastadresse",
    "Adresa cestujícího"
  ],
  "Pojazd zamówiony": [
    "Requested vehicle",
    "Bestelltes Fahrzeug",
    "Objednané vozidlo"
  ],
  "NETTO": [
    "NET",
    "NETTO",
    "BEZ DPH"
  ],
  "BRUTTO": [
    "GROSS",
    "BRUTTO",
    "VČETNĚ DPH"
  ],
  "Dokumenty": [
    "Documents",
    "Dokumente",
    "Dokumenty"
  ],
  "Obsada": [
    "Driver and vehicle",
    "Besetzung",
    "Obsazení"
  ],
  "→ WYJAZD": [
    "→ OUTBOUND",
    "→ HINFAHRT",
    "→ ODJEZD"
  ],
  "Kierowca:": [
    "Driver:",
    "Fahrer:",
    "Řidič:"
  ],
  "Telefon:": [
    "Phone:",
    "Telefon:",
    "Telefon:"
  ],
  "Pojazd:": [
    "Vehicle:",
    "Fahrzeug:",
    "Vozidlo:"
  ],
  "↩ POWRÓT": [
    "↩ RETURN",
    "↩ RÜCKFAHRT",
    "↩ NÁVRAT"
  ],
  "Cennik i warunki handlowe": [
    "Prices and commercial terms",
    "Preise und Geschäftskonditionen",
    "Ceník a obchodní podmínky"
  ],
  "CENY NETTO": [
    "NET PRICES",
    "NETTOPREISE",
    "CENY BEZ DPH"
  ],
  "Transfery lotniskowe": [
    "Airport transfers",
    "Flughafentransfers",
    "Letištní transfery"
  ],
  "Cena bazowa za przejazd w jedną stronę. W obie strony system liczy 2× cenę bazową oraz 2× ewentualną dopłatę za kilometry.": [
    "Base fare for a one-way journey. Round trips cost twice the base fare and twice any distance surcharge.",
    "Grundpreis für eine einfache Fahrt. Hin- und Rückfahrten kosten den doppelten Grundpreis plus den doppelten Kilometerzuschlag.",
    "Základní cena za jednu cestu. Pro cestu tam a zpět se počítá dvojnásobek základní ceny i případného příplatku za kilometry."
  ],
  "Samochód NETTO": [
    "Car NET",
    "Pkw NETTO",
    "Osobní vůz BEZ DPH"
  ],
  "Samochód BRUTTO": [
    "Car GROSS",
    "Pkw BRUTTO",
    "Osobní vůz VČETNĚ DPH"
  ],
  "Bus NETTO": [
    "Minibus NET",
    "Kleinbus NETTO",
    "Minibus BEZ DPH"
  ],
  "Bus BRUTTO": [
    "Minibus GROSS",
    "Kleinbus BRUTTO",
    "Minibus VČETNĚ DPH"
  ],
  "Samochód": [
    "Car",
    "Pkw",
    "Osobní vůz"
  ],
  "zł brutto": [
    "PLN gross",
    "PLN brutto",
    "PLN včetně DPH"
  ],
  "Bus": [
    "Minibus",
    "Kleinbus",
    "Minibus"
  ],
  "Jak liczona jest cena?": [
    "How is the price calculated?",
    "Wie wird der Preis berechnet?",
    "Jak se počítá cena?"
  ],
  "System mierzy najkrótszą trasę samochodową od siedziby kontrahenta do adresu pasażera. Kilometry mieszczące się w limicie są bez dopłaty. Nadwyżka jest mnożona przez stawkę netto za kilometr i dodawana do ceny bazowej transferu.": [
    "We calculate the shortest driving route from your company address to the passenger address. Distance within the allowance is included. Excess kilometres are charged at the net rate and added to the base transfer fare.",
    "Wir berechnen die kürzeste Fahrstrecke vom Firmenstandort zur Fahrgastadresse. Kilometer innerhalb der Freigrenze sind inklusive. Mehrkilometer werden zum Nettosatz berechnet und zum Grundpreis addiert.",
    "Počítáme nejkratší silniční trasu od sídla firmy k adrese cestujícího. Kilometry v limitu jsou bez příplatku. Nadlimitní kilometry se účtují čistou sazbou a přičítají k základní ceně transferu."
  ],
  "Cena końcowa = cena bazowa NETTO + dopłata za km NETTO + VAT 8%.": [
    "Final price = NET base fare + NET distance surcharge + 8% VAT.",
    "Endpreis = NETTO-Grundpreis + NETTO-Kilometerzuschlag + 8% MwSt.",
    "Konečná cena = základní cena BEZ DPH + příplatek za km BEZ DPH + 8 % DPH."
  ],
  "Historia warunków": [
    "Terms history",
    "Verlauf der Konditionen",
    "Historie podmínek"
  ],
  "Każda rezerwacja zachowuje snapshot warunków obowiązujących w chwili wyceny. Późniejsza zmiana cennika nie zmienia ceny starego kursu.": [
    "Each booking retains the terms used for its quote. Later price changes do not affect existing journeys.",
    "Jede Buchung behält die bei der Angebotserstellung geltenden Konditionen. Spätere Preisänderungen beeinflussen bestehende Fahrten nicht.",
    "Každá rezervace si uchovává podmínky platné při výpočtu ceny. Pozdější změny ceníku nemění cenu stávajících jízd."
  ],
  "od": [
    "from",
    "ab",
    "od"
  ],
  "km bez dopłaty ·": [
    "km included ·",
    "km inklusive ·",
    "km bez příplatku ·"
  ],
  "zł netto/km ·": [
    "PLN net/km ·",
    "PLN netto/km ·",
    "PLN bez DPH/km ·"
  ],
  "Podaj nazwę i pełny adres.": [
    "Enter a name and full address.",
    "Geben Sie einen Namen und die vollständige Adresse an.",
    "Zadejte název a úplnou adresu."
  ],
  "Nie udało się zapisać adresu.": [
    "Could not save the address.",
    "Adresse konnte nicht gespeichert werden.",
    "Adresu se nepodařilo uložit."
  ],
  "Usunąć ten zapisany adres?": [
    "Delete this saved address?",
    "Diese gespeicherte Adresse löschen?",
    "Smazat tuto uloženou adresu?"
  ],
  "Nie udało się usunąć adresu.": [
    "Could not delete the address.",
    "Adresse konnte nicht gelöscht werden.",
    "Adresu se nepodařilo smazat."
  ],
  "✓ Adres usunięty.": [
    "✓ Address deleted.",
    "✓ Adresse gelöscht.",
    "✓ Adresa smazána."
  ],
  "Zapisane adresy": [
    "Saved addresses",
    "Gespeicherte Adressen",
    "Uložené adresy"
  ],
  "Stałe miejsca firmy dostępne jednym kliknięciem podczas zamawiania transportu.": [
    "Save company locations for quick selection when booking transport.",
    "Speichern Sie Firmenstandorte zur schnellen Auswahl bei der Buchung.",
    "Uložte si firemní místa pro rychlý výběr při objednávání dopravy."
  ],
  "EDYTUJ": [
    "EDIT",
    "BEARBEITEN",
    "UPRAVIT"
  ],
  "Nie zapisano jeszcze żadnego stałego adresu.": [
    "No saved addresses yet.",
    "Noch keine Adressen gespeichert.",
    "Zatím nejsou uloženy žádné adresy."
  ],
  "Nazwa miejsca": [
    "Location name",
    "Ortsname",
    "Název místa"
  ],
  "Pełny adres": [
    "Full address",
    "Vollständige Adresse",
    "Úplná adresa"
  ],
  "ANULUJ": [
    "CANCEL",
    "ABBRECHEN",
    "ZRUŠIT"
  ],
  "Podaj imię i nazwisko.": [
    "Enter a first and last name.",
    "Geben Sie Vor- und Nachname an.",
    "Zadejte jméno a příjmení."
  ],
  "Błąd zapisu.": [
    "Could not save.",
    "Speichern fehlgeschlagen.",
    "Uložení se nezdařilo."
  ],
  "Błąd.": [
    "An error occurred.",
    "Ein Fehler ist aufgetreten.",
    "Došlo k chybě."
  ],
  "Dodaj pracownika": [
    "Add employee",
    "Mitarbeiter hinzufügen",
    "Přidat zaměstnance"
  ],
  "DODAJ PRACOWNIKA": [
    "ADD EMPLOYEE",
    "MITARBEITER HINZUFÜGEN",
    "PŘIDAT ZAMĚSTNANCE"
  ],
  "✓ Pracownik dodany.": [
    "✓ Employee added.",
    "✓ Mitarbeiter hinzugefügt.",
    "✓ Zaměstnanec přidán."
  ],
  "Aktywny": [
    "Active",
    "Aktiv",
    "Aktivní"
  ],
  "Nieaktywny": [
    "Inactive",
    "Inaktiv",
    "Neaktivní"
  ],
  "Zapisywanie szablonu...": [
    "Saving template...",
    "Vorlage wird gespeichert...",
    "Ukládání šablony..."
  ],
  "Nie udało się zapisać szablonu.": [
    "Could not save the template.",
    "Vorlage konnte nicht gespeichert werden.",
    "Šablonu se nepodařilo uložit."
  ],
  "Usunąć ten szablon?": [
    "Delete this template?",
    "Diese Vorlage löschen?",
    "Smazat tuto šablonu?"
  ],
  "Nie udało się usunąć szablonu.": [
    "Could not delete the template.",
    "Vorlage konnte nicht gelöscht werden.",
    "Šablonu se nepodařilo smazat."
  ],
  "✓ Szablon usunięty.": [
    "✓ Template deleted.",
    "✓ Vorlage gelöscht.",
    "✓ Šablona smazána."
  ],
  "Wybierz szablon, datę i godzinę pierwszego kursu.": [
    "Choose a template and the first journey date and time.",
    "Wählen Sie eine Vorlage sowie Datum und Uhrzeit der ersten Fahrt.",
    "Vyberte šablonu a datum a čas první jízdy."
  ],
  "Pracownik zapisany w szablonie nie jest już dostępny.": [
    "The employee saved in this template is no longer available.",
    "Der in der Vorlage gespeicherte Mitarbeiter ist nicht mehr verfügbar.",
    "Zaměstnanec uložený v šabloně již není dostupný."
  ],
  "nie udało się zapisać": [
    "could not save",
    "konnte nicht gespeichert werden",
    "nepodařilo se uložit"
  ],
  "rezerwację": [
    "booking",
    "Buchung",
    "rezervaci"
  ],
  "Zapisz jako szablon": [
    "Save as template",
    "Als Vorlage speichern",
    "Uložit jako šablonu"
  ],
  "Wybierz istniejącą rezerwację. Trasa, pracownik, pojazd, płatność i dodatkowy przystanek zostaną zapamiętane.": [
    "Choose an existing booking to save its route, employee, vehicle, payment method and additional stop.",
    "Wählen Sie eine bestehende Buchung, um Strecke, Mitarbeiter, Fahrzeug, Zahlungsart und Zwischenstopp zu speichern.",
    "Vyberte stávající rezervaci pro uložení trasy, zaměstnance, vozidla, způsobu platby a další zastávky."
  ],
  "— wybierz —": [
    "— select —",
    "— auswählen —",
    "— vyberte —"
  ],
  "Nazwa szablonu (opcjonalnie)": [
    "Template name (optional)",
    "Vorlagenname (optional)",
    "Název šablony (volitelně)"
  ],
  "ZAPISZ SZABLON": [
    "SAVE TEMPLATE",
    "VORLAGE SPEICHERN",
    "ULOŽIT ŠABLONU"
  ],
  "CYKLICZNE REZERWACJE": [
    "RECURRING BOOKINGS",
    "REGELMÄSSIGE BUCHUNGEN",
    "OPAKOVANÉ REZERVACE"
  ],
  "Utwórz kursy z szablonu": [
    "Create journeys from template",
    "Fahrten aus Vorlage erstellen",
    "Vytvořit jízdy ze šablony"
  ],
  "Jednorazowo albo co tydzień, maksymalnie 12 wystąpień. Każdy kurs jest ponownie wyceniany na backendzie.": [
    "Book once or weekly, up to 12 journeys. Each journey is priced again using current terms.",
    "Einmalig oder wöchentlich, bis zu 12 Fahrten. Jede Fahrt wird nach den aktuellen Konditionen neu berechnet.",
    "Jednorázově nebo každý týden, nejvýše 12 jízd. Každá jízda se znovu ocení dle aktuálních podmínek."
  ],
  "Brak szablonów.": [
    "No templates available.",
    "Keine Vorlagen vorhanden.",
    "Nejsou k dispozici žádné šablony."
  ],
  "Utwórz pierwszy z istniejącej rezerwacji.": [
    "Create your first template from an existing booking.",
    "Erstellen Sie Ihre erste Vorlage aus einer bestehenden Buchung.",
    "Vytvořte první šablonu ze stávající rezervace."
  ],
  "Szablon": [
    "Template",
    "Vorlage",
    "Šablona"
  ],
  "Data pierwszego kursu": [
    "First journey date",
    "Datum der ersten Fahrt",
    "Datum první jízdy"
  ],
  "Powtarzanie": [
    "Repeat",
    "Wiederholung",
    "Opakování"
  ],
  "Jednorazowo": [
    "Once",
    "Einmalig",
    "Jednorázově"
  ],
  "Co tydzień": [
    "Weekly",
    "Wöchentlich",
    "Každý týden"
  ],
  "Liczba kursów": [
    "Number of journeys",
    "Anzahl der Fahrten",
    "Počet jízd"
  ],
  "Pracownik niedostępny": [
    "Employee unavailable",
    "Mitarbeiter nicht verfügbar",
    "Zaměstnanec nedostupný"
  ],
  "Powrót: +": [
    "Return: +",
    "Rückfahrt: +",
    "Návrat: +"
  ],
  "dni ·": [
    "days ·",
    "Tage ·",
    "dní ·"
  ],
  "UTWÓRZ SERIĘ": [
    "CREATE SERIES",
    "SERIE ERSTELLEN",
    "VYTVOŘIT SÉRII"
  ],
  "UTWÓRZ REZERWACJĘ": [
    "CREATE BOOKING",
    "BUCHUNG ERSTELLEN",
    "VYTVOŘIT REZERVACI"
  ],
  "Zapisane szablony": [
    "Saved templates",
    "Gespeicherte Vorlagen",
    "Uložené šablony"
  ],
  "Nie udało się przeliczyć ceny.": [
    "Could not recalculate the price.",
    "Preis konnte nicht neu berechnet werden.",
    "Cenu se nepodařilo přepočítat."
  ],
  "Zapisywanie zmian...": [
    "Saving changes...",
    "Änderungen werden gespeichert...",
    "Ukládání změn..."
  ],
  "✓ Rezerwacja została zaktualizowana i przeliczona na serwerze.": [
    "✓ Booking updated and price recalculated.",
    "✓ Buchung aktualisiert und Preis neu berechnet.",
    "✓ Rezervace aktualizována a cena přepočítána."
  ],
  "Anulowanie rezerwacji...": [
    "Cancelling booking...",
    "Buchung wird storniert...",
    "Rušení rezervace..."
  ],
  "✓ Rezerwacja anulowana. Płatność była zaksięgowana i wymaga weryfikacji ewentualnego zwrotu przez MATT TRANSPORT.": [
    "✓ Booking cancelled. Payment had been received; MATT TRANSPORT will review any refund.",
    "✓ Buchung storniert. Die Zahlung war eingegangen; MATT TRANSPORT prüft eine mögliche Erstattung.",
    "✓ Rezervace zrušena. Platba byla přijata; MATT TRANSPORT prověří případné vrácení."
  ],
  "✓ Rezerwacja została anulowana.": [
    "✓ Booking cancelled.",
    "✓ Buchung storniert.",
    "✓ Rezervace zrušena."
  ],
  "Podaj datę i godzinę nowego przejazdu.": [
    "Enter the new journey date and time.",
    "Geben Sie Datum und Uhrzeit der neuen Fahrt an.",
    "Zadejte datum a čas nové jízdy."
  ],
  "Tworzenie nowej rezerwacji wg aktualnych warunków B2B...": [
    "Creating a booking using current B2B terms...",
    "Buchung nach aktuellen B2B-Konditionen wird erstellt...",
    "Vytváření rezervace dle aktuálních podmínek B2B..."
  ],
  "Nie udało się powtórzyć rezerwacji.": [
    "Could not repeat the booking.",
    "Buchung konnte nicht wiederholt werden.",
    "Rezervaci se nepodařilo zopakovat."
  ],
  "Akcje": [
    "Actions",
    "Aktionen",
    "Akce"
  ],
  "ZAMKNIJ EDYCJĘ": [
    "CLOSE EDITING",
    "BEARBEITUNG SCHLIESSEN",
    "ZAVŘÍT ÚPRAVY"
  ],
  "EDYTUJ REZERWACJĘ": [
    "EDIT BOOKING",
    "BUCHUNG BEARBEITEN",
    "UPRAVIT REZERVACI"
  ],
  "Rezerwacji z zaksięgowaną lub weryfikowaną płatnością nie można samodzielnie edytować. Możesz ją anulować albo skontaktować się z MATT TRANSPORT.": [
    "Bookings with a received or reviewed payment cannot be edited directly. You can cancel or contact MATT TRANSPORT.",
    "Buchungen mit eingegangener oder geprüfter Zahlung können nicht direkt bearbeitet werden. Sie können stornieren oder MATT TRANSPORT kontaktieren.",
    "Rezervace s přijatou nebo ověřovanou platbou nelze přímo upravit. Můžete ji zrušit nebo kontaktovat MATT TRANSPORT."
  ],
  "Rezerwacja w realizacji lub zakończona nie może być edytowana przez portal firmy.": [
    "Journeys in progress or completed cannot be edited in the company portal.",
    "Laufende oder abgeschlossene Fahrten können nicht im Firmenportal bearbeitet werden.",
    "Probíhající a dokončené jízdy nelze ve firemním portálu upravit."
  ],
  "Czy na pewno anulować tę rezerwację?": [
    "Are you sure you want to cancel this booking?",
    "Möchten Sie diese Buchung wirklich stornieren?",
    "Opravdu chcete tuto rezervaci zrušit?"
  ],
  "Kurs zostanie anulowany i usunięty z Google Calendar.": [
    "The journey will be cancelled and removed from Google Calendar.",
    "Die Fahrt wird storniert und aus Google Calendar entfernt.",
    "Jízda bude zrušena a odstraněna z Google Calendar."
  ],
  "Płatność nie zostanie automatycznie zwrócona — MATT zweryfikuje zwrot ręcznie.": [
    "Payment will not be refunded automatically — MATT will review the refund.",
    "Die Zahlung wird nicht automatisch erstattet — MATT prüft die Erstattung.",
    "Platba nebude automaticky vrácena — MATT vrácení prověří."
  ],
  "Niewykorzystana sesja płatności Stripe zostanie wygaszona.": [
    "Any unused Stripe payment session will expire.",
    "Eine ungenutzte Stripe-Zahlungssitzung wird beendet.",
    "Nevyužitá platební relace Stripe bude ukončena."
  ],
  "POWTÓRZ REZERWACJĘ": [
    "REPEAT BOOKING",
    "BUCHUNG WIEDERHOLEN",
    "ZOPAKOVAT REZERVACI"
  ],
  "Nowy kurs zostanie wyceniony według warunków handlowych obowiązujących w dniu utworzenia.": [
    "The new journey will be priced using the terms in effect when it is created.",
    "Die neue Fahrt wird nach den zum Erstellungszeitpunkt geltenden Konditionen berechnet.",
    "Nová jízda bude oceněna dle podmínek platných v okamžiku vytvoření."
  ],
  "Nowa data": [
    "New date",
    "Neues Datum",
    "Nové datum"
  ],
  "UTWÓRZ NOWY KURS": [
    "CREATE NEW JOURNEY",
    "NEUE FAHRT ERSTELLEN",
    "VYTVOŘIT NOVOU JÍZDU"
  ],
  "· nieaktywne": [
    "· inactive",
    "· inaktiv",
    "· neaktivní"
  ],
  "Lot": [
    "Flight",
    "Flug",
    "Let"
  ],
  "Przeliczanie ceny...": [
    "Recalculating price...",
    "Preis wird neu berechnet...",
    "Přepočet ceny..."
  ],
  "Nowa wycena:": [
    "Updated quote:",
    "Neues Angebot:",
    "Nová cena:"
  ],
  "zł netto + VAT": [
    "PLN net + VAT",
    "PLN netto + MwSt.",
    "PLN bez DPH + DPH"
  ],
  "km od siedziby ·": [
    "km from company address ·",
    "km vom Firmenstandort ·",
    "km od sídla firmy ·"
  ],
  "km płatne": [
    "chargeable km",
    "kostenpflichtige km",
    "zpoplatněné km"
  ],
  "Faktury / dokumenty": [
    "Invoices / documents",
    "Rechnungen / Dokumente",
    "Faktury / dokumenty"
  ],
  "Do tej rezerwacji nie dodano jeszcze dokumentu.": [
    "No documents have been added to this booking.",
    "Für diese Buchung wurden noch keine Dokumente hinzugefügt.",
    "K této rezervaci zatím nebyly přidány dokumenty."
  ],
  "OTWÓRZ / POBIERZ": [
    "OPEN / DOWNLOAD",
    "ÖFFNEN / HERUNTERLADEN",
    "OTEVŘÍT / STÁHNOUT"
  ],
  "Przelew firmowy": [
    "Company bank transfer",
    "Firmenüberweisung",
    "Firemní bankovní převod"
  ],
  "✓ Opłacono online": [
    "✓ Paid online",
    "✓ Online bezahlt",
    "✓ Zaplaceno online"
  ],
  "↩ Zwrot płatności": [
    "↩ Payment refunded",
    "↩ Zahlung erstattet",
    "↩ Platba vrácena"
  ],
  "⚠ Płatność do weryfikacji": [
    "⚠ Payment under review",
    "⚠ Zahlung in Prüfung",
    "⚠ Platba k ověření"
  ],
  "Płatność niedostępna dla aktualnego statusu": [
    "Payment unavailable for the current status",
    "Zahlung für den aktuellen Status nicht verfügbar",
    "Platba pro aktuální stav není dostupná"
  ],
  "· płatność dostępna dla administratora firmy": [
    "· payment available to the company administrator",
    "· Zahlung für den Firmenadministrator verfügbar",
    "· platba je dostupná správci firmy"
  ],
  "Płatność nieudana · można ponowić": [
    "Payment failed · try again",
    "Zahlung fehlgeschlagen · erneut versuchen",
    "Platba se nezdařila · zkuste znovu"
  ],
  "💳 ZAPŁAĆ ONLINE": [
    "💳 PAY ONLINE",
    "💳 ONLINE BEZAHLEN",
    "💳 ZAPLATIT ONLINE"
  ],
  "OTWIERANIE...": [
    "OPENING...",
    "WIRD GEÖFFNET...",
    "OTEVÍRÁNÍ..."
  ],
  "Wycena B2B": [
    "B2B quote",
    "B2B-Angebot",
    "Nabídka B2B"
  ],
  "Cennik": [
    "Price list",
    "Preisliste",
    "Ceník"
  ],
  "Kilometry płatne": [
    "Chargeable kilometres",
    "Kostenpflichtige Kilometer",
    "Zpoplatněné kilometry"
  ],
  "Stawka powyżej limitu": [
    "Rate above allowance",
    "Preis über der Freigrenze",
    "Sazba nad limit"
  ],
  "Dopłata za km": [
    "Distance surcharge",
    "Kilometerzuschlag",
    "Příplatek za km"
  ],
  "Razem NETTO": [
    "Total NET",
    "Gesamt NETTO",
    "Celkem BEZ DPH"
  ],
  "Razem BRUTTO": [
    "Total GROSS",
    "Gesamt BRUTTO",
    "Celkem VČETNĚ DPH"
  ],
  "Cena została zapisana wraz z warunkami użytymi w chwili wyceny. Późniejsza zmiana cennika firmy nie zmienia tej rezerwacji.": [
    "The price and terms were saved when the quote was prepared. Later company price changes do not affect this booking.",
    "Preis und Konditionen wurden bei der Angebotserstellung gespeichert. Spätere Änderungen der Firmenpreise beeinflussen diese Buchung nicht.",
    "Cena a podmínky byly uloženy při přípravě nabídky. Pozdější změny firemního ceníku tuto rezervaci nemění."
  ],
  "Wycena historyczna": [
    "Historical quote",
    "Historisches Angebot",
    "Historická cena"
  ],
  "Ta rezerwacja powstała przed wdrożeniem B2B PRO i nie ma zapisanego snapshotu NETTO/VAT/BRUTTO. Pokazujemy dokładnie kwotę zapisaną w starej wersji systemu — bez sztucznego przeliczania historii.": [
    "This booking predates B2B PRO and has no saved net/VAT/gross breakdown. The original recorded amount is shown without recalculating past prices.",
    "Diese Buchung stammt aus der Zeit vor B2B PRO und hat keine gespeicherte Netto/MwSt./Brutto-Aufteilung. Der ursprünglich gespeicherte Betrag wird ohne Neuberechnung angezeigt.",
    "Tato rezervace vznikla před B2B PRO a nemá uložený rozpis bez DPH/DPH/včetně DPH. Zobrazuje se původně uložená částka bez přepočtu minulých cen."
  ],
  "Kwota historyczna": [
    "Historical amount",
    "Historischer Betrag",
    "Původní částka"
  ],
  "+ VAT": [
    "+ VAT",
    "+ MwSt.",
    "+ DPH"
  ],
  "🔒 SNAPSHOT CENY": [
    "🔒 SAVED PRICE",
    "🔒 GESPEICHERTER PREIS",
    "🔒 ULOŽENÁ CENA"
  ],
  "Rabat": [
    "Discount",
    "Rabatt",
    "Sleva"
  ],
  "Razem netto": [
    "Total net",
    "Gesamt netto",
    "Celkem bez DPH"
  ],
  "Razem brutto": [
    "Total gross",
    "Gesamt brutto",
    "Celkem včetně DPH"
  ],
  "Wszystkie podane ceny B2B są cenami netto. Do kwoty doliczany jest VAT": [
    "All B2B prices are net. VAT is added at",
    "Alle B2B-Preise sind Nettopreise. Hinzu kommt MwSt. in Höhe von",
    "Všechny ceny B2B jsou bez DPH. Připočítává se DPH ve výši"
  ],
  "Warunki handlowe": [
    "Commercial terms",
    "Geschäftskonditionen",
    "Obchodní podmínky"
  ],
  "Brak aktywnych warunków handlowych. Skontaktuj się z MATT TRANSPORT.": [
    "No active commercial terms. Contact MATT TRANSPORT.",
    "Keine aktiven Geschäftskonditionen. Kontaktieren Sie MATT TRANSPORT.",
    "Nejsou nastaveny platné obchodní podmínky. Kontaktujte MATT TRANSPORT."
  ],
  "PEŁNY CENNIK": [
    "FULL PRICE LIST",
    "VOLLSTÄNDIGE PREISLISTE",
    "ÚPLNÝ CENÍK"
  ],
  "Siedziba do kalkulacji": [
    "Calculation origin",
    "Ausgangspunkt der Berechnung",
    "Výchozí adresa pro výpočet"
  ],
  "Powyżej limitu": [
    "Above allowance",
    "Über der Freigrenze",
    "Nad limit"
  ],
  "Ważne od": [
    "Valid from",
    "Gültig ab",
    "Platné od"
  ],
  "Termin płatności": [
    "Payment terms",
    "Zahlungsfrist",
    "Splatnost"
  ],
  "dni": [
    "days",
    "Tage",
    "dní"
  ],
  "Warunki dodatkowe": [
    "Additional terms",
    "Zusätzliche Bedingungen",
    "Další podmínky"
  ],
  "Nowa wersja warunków zacznie obowiązywać od": [
    "Updated terms take effect from",
    "Aktualisierte Konditionen gelten ab",
    "Nové podmínky začnou platit od"
  ],
  "Wszystkie ceny B2B są cenami NETTO. Do kwoty doliczany jest VAT 8%.": [
    "All B2B prices are NET, plus 8% VAT.",
    "Alle B2B-Preise sind NETTO zuzüglich 8% MwSt.",
    "Všechny ceny B2B jsou BEZ DPH. Připočítává se 8 % DPH."
  ],
  "Indywidualny": [
    "Individual",
    "Individuell",
    "Individuální"
  ],
  "Historyczny": [
    "Historical",
    "Historisch",
    "Historický"
  ],
  "Standardowy MATT": [
    "MATT standard",
    "MATT-Standard",
    "Standardní MATT"
  ],
  "Standardowy MATT / fallback": [
    "MATT standard / fallback",
    "MATT-Standard / Ersatzpreise",
    "Standardní MATT / náhradní ceny"
  ],
  "B2B PRO · TWOJE WARUNKI": [
    "B2B PRO · YOUR TERMS",
    "B2B PRO · IHRE KONDITIONEN",
    "B2B PRO · VAŠE PODMÍNKY"
  ],
  "Warunki": [
    "Terms",
    "Konditionen",
    "Podmínky"
  ],
  "Zaplanowane": [
    "Scheduled",
    "Geplant",
    "Naplánované"
  ],
  "Aktualne": [
    "Current",
    "Aktuell",
    "Aktuální"
  ],
  "Historyczne": [
    "Historical",
    "Historisch",
    "Historické"
  ],
  "Brak": [
    "None",
    "Keine",
    "Žádné"
  ],
  "Jeszcze nie przypisano": [
    "Not assigned yet",
    "Noch nicht zugewiesen",
    "Zatím nepřiřazeno"
  ],
  "Edytuj adres": [
    "Edit address",
    "Adresse bearbeiten",
    "Upravit adresu"
  ],
  "Dodaj adres": [
    "Add address",
    "Adresse hinzufügen",
    "Přidat adresu"
  ],
  "Nowa godzina przylotu": [
    "New arrival time",
    "Neue Ankunftszeit",
    "Nový čas příletu"
  ],
  "Nowa godzina wyjazdu na lotnisko": [
    "New departure time to airport",
    "Neue Abfahrtszeit zum Flughafen",
    "Nový čas odjezdu na letiště"
  ],
  "Faktura / dokumenty": [
    "Invoice / documents",
    "Rechnung / Dokumente",
    "Faktura / dokumenty"
  ],
  "Dokumenty są prywatne. Firma otrzymuje dostęp tylko do dokumentów swoich rezerwacji.": [
    "Documents are private. Your company can only access documents for its bookings.",
    "Dokumente sind privat. Ihre Firma hat nur Zugriff auf Dokumente ihrer eigenen Buchungen.",
    "Dokumenty jsou soukromé. Firma má přístup pouze k dokumentům svých rezervací."
  ],
  "Brak dokumentów przypisanych do tej rezerwacji.": [
    "No documents for this booking.",
    "Keine Dokumente für diese Buchung.",
    "K této rezervaci nejsou dokumenty."
  ],
  "Dodaj dokument": [
    "Add document",
    "Dokument hinzufügen",
    "Přidat dokument"
  ],
  "Numer dokumentu": [
    "Document number",
    "Dokumentnummer",
    "Číslo dokumentu"
  ],
  "PDF / JPG / PNG · max 10 MB": [
    "PDF / JPG / PNG · max 10 MB",
    "PDF / JPG / PNG · max. 10 MB",
    "PDF / JPG / PNG · max. 10 MB"
  ],
  "Wybierz plik PDF, JPG lub PNG.": [
    "Choose a PDF, JPG or PNG file.",
    "Wählen Sie eine PDF-, JPG- oder PNG-Datei.",
    "Vyberte soubor PDF, JPG nebo PNG."
  ],
  "Wysyłanie dokumentu...": [
    "Uploading document...",
    "Dokument wird hochgeladen...",
    "Nahrávání dokumentu..."
  ],
  "Nie udało się dodać dokumentu.": [
    "Could not add document.",
    "Dokument konnte nicht hinzugefügt werden.",
    "Dokument se nepodařilo přidat."
  ],
  "✓ Dokument został dodany.": [
    "✓ Document added.",
    "✓ Dokument hinzugefügt.",
    "✓ Dokument přidán."
  ],
  "Usunąć ten dokument z rezerwacji?": [
    "Remove this document from the booking?",
    "Dieses Dokument aus der Buchung entfernen?",
    "Odstranit tento dokument z rezervace?"
  ],
  "✓ Dokument usunięty.": [
    "✓ Document removed.",
    "✓ Dokument entfernt.",
    "✓ Dokument odstraněn."
  ],
  "Błąd usuwania.": [
    "Could not delete.",
    "Löschen fehlgeschlagen.",
    "Smazání se nezdařilo."
  ],
  "Na lotnisko": [
    "To airport",
    "Zum Flughafen",
    "Na letiště"
  ],
  "Z lotniska": [
    "From airport",
    "Vom Flughafen",
    "Z letiště"
  ],
  "W obie strony": [
    "Round trip",
    "Hin- und Rückfahrt",
    "Tam a zpět"
  ],
  "Transfer lotniskowy": [
    "Airport transfer",
    "Flughafentransfer",
    "Letištní transfer"
  ],
  "✅ OPŁACONO": [
    "✅ PAID",
    "✅ BEZAHLT",
    "✅ ZAPLACENO"
  ],
  "Płatność zaksięgowana": [
    "Payment received",
    "Zahlung eingegangen",
    "Platba přijata"
  ],
  "↩ ZWROT": [
    "↩ REFUNDED",
    "↩ ERSTATTET",
    "↩ VRÁCENO"
  ],
  "Płatność zwrócona": [
    "Payment refunded",
    "Zahlung erstattet",
    "Platba vrácena"
  ],
  "⚠ WERYFIKACJA": [
    "⚠ UNDER REVIEW",
    "⚠ IN PRÜFUNG",
    "⚠ K OVĚŘENÍ"
  ],
  "Płatność wymaga weryfikacji": [
    "Payment requires review",
    "Zahlung muss geprüft werden",
    "Platbu je třeba ověřit"
  ],
  "❌ NIEUDANA": [
    "❌ FAILED",
    "❌ FEHLGESCHLAGEN",
    "❌ NEÚSPĚŠNÁ"
  ],
  "Płatność online nie powiodła się": [
    "Online payment failed",
    "Online-Zahlung fehlgeschlagen",
    "Online platba se nezdařila"
  ],
  "💳 ONLINE": [
    "💳 ONLINE",
    "💳 ONLINE",
    "💳 ONLINE"
  ],
  "Płatność online firmy — oczekuje": [
    "Company online payment — pending",
    "Online-Firmenzahlung — ausstehend",
    "Firemní online platba — čeká"
  ],
  "🏦 PRZELEW": [
    "🏦 BANK TRANSFER",
    "🏦 ÜBERWEISUNG",
    "🏦 PŘEVOD"
  ],
  "Rozliczenie przelewem firmowym": [
    "Company bank transfer billing",
    "Abrechnung per Firmenüberweisung",
    "Vyúčtování firemním převodem"
  ],
  "Płatność online — oczekuje": [
    "Online payment — pending",
    "Online-Zahlung — ausstehend",
    "Online platba — čeká"
  ],
  "Płatność przelewem tradycyjnym": [
    "Payment by bank transfer",
    "Zahlung per Banküberweisung",
    "Platba bankovním převodem"
  ],
  "💵 GOTÓWKA": [
    "💵 CASH",
    "💵 BARZAHLUNG",
    "💵 HOTOVĚ"
  ],
  "Płatność gotówką u kierowcy": [
    "Cash payment to driver",
    "Barzahlung beim Fahrer",
    "Platba hotově řidiči"
  ],
  "✓ Szablon zapisany.": [
    "✓ Template saved.",
    "✓ Vorlage gespeichert.",
    "✓ Šablona uložena."
  ],
  "Utworzyć {count} rezerwacji co tydzień? Każda zostanie przeliczona wg aktualnych warunków B2B.": [
    "Create {count} weekly bookings? Each will be priced using current B2B terms.",
    "{count} wöchentliche Buchungen erstellen? Jede wird nach den aktuellen B2B-Konditionen berechnet.",
    "Vytvořit {count} týdenních rezervací? Každá bude oceněna dle aktuálních podmínek B2B."
  ],
  "Tworzenie {count} rezerwacji...": [
    "Creating {count} bookings...",
    "{count} Buchungen werden erstellt...",
    "Vytváření {count} rezervací..."
  ],
  "Utworzono {created}/{count}. Błąd dla {date}: {error}": [
    "Created {created}/{count}. Error for {date}: {error}",
    "{created}/{count} erstellt. Fehler für {date}: {error}",
    "Vytvořeno {created}/{count}. Chyba pro {date}: {error}"
  ],
  "✓ Utworzono {count} rezerwacji.": [
    "✓ Created {count} bookings.",
    "✓ {count} Buchungen erstellt.",
    "✓ Vytvořeno {count} rezervací."
  ],
  "dostępne": [
    "available",
    "verfügbar",
    "dostupné"
  ],
  "cennik indywidualny": [
    "individual price list",
    "individuelle Preisliste",
    "individuální ceník"
  ],
  "cennik standardowy": [
    "standard price list",
    "Standardpreisliste",
    "standardní ceník"
  ],
  "STANDARD MATT": [
    "MATT STANDARD",
    "MATT-STANDARD",
    "STANDARD MATT"
  ]
};

export function companyText(key:string,value:unknown) {
 const locale=resolveCustomerLocale(value);
 return locale==="pl"?key:(companyCopy[key]??customerErrorCopy[key])?.[locale==="en"?0:locale==="de"?1:2]??customerText(key,locale);
}
