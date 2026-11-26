export const copy = {
  "pl": [
    "Czat MATT",
    "Napisz wiadomość",
    "Wyślij",
    "W czym mogę pomóc? Możesz zapytać o cenę, rezerwację, płatność lub kontakt.",
    "Cena zależy od trasy i liczby pasażerów. W formularzu wybierz usługę i wpisz trasę, datę oraz liczbę osób, aby sprawdzić wycenę.",
    "Rezerwację złożysz w formularzu. Wybierz usługę, podaj trasę i datę, a następnie sprawdź podsumowanie.",
    "Przy prywatnym transferze możesz wybrać gotówkę lub płatność online po potwierdzeniu.",
    "Dyspozytor jest dostępny pod numerem +48 691 242 691. W pilnej sprawie zadzwoń.",
    "Jeśli podasz temat, pomogę z wyceną, rezerwacją lub płatnością. Inne pytania możesz zadać dyspozytorowi: +48 691 242 691."
  ],
  "en": [
    "MATT chat",
    "Write a message",
    "Send",
    "How can I help? Ask about prices, booking, payment or contacting dispatch.",
    "The price depends on your route and group size. Choose a service and enter your route, date and passenger count in the form for a quote.",
    "Choose a service in the booking form, enter the route and date, then review the summary.",
    "For a private transfer you can choose cash or online payment after confirmation.",
    "Call dispatch on +48 691 242 691 for urgent requests.",
    "I can help with prices, booking or payment. For other questions, call dispatch on +48 691 242 691."
  ],
  "de": [
    "MATT-Chat",
    "Nachricht schreiben",
    "Senden",
    "Wie kann ich helfen? Fragen Sie nach Preis, Buchung, Zahlung oder Kontakt.",
    "Der Preis hängt von Strecke und Gruppengröße ab. Wählen Sie eine Leistung und geben Sie Strecke, Datum und Personenzahl im Formular ein.",
    "Wählen Sie im Buchungsformular eine Leistung, geben Sie Strecke und Datum ein und prüfen Sie die Zusammenfassung.",
    "Bei einem Privattransfer können Sie bar oder nach Bestätigung online bezahlen.",
    "In dringenden Fällen erreichen Sie die Disposition unter +48 691 242 691.",
    "Ich helfe bei Preisen, Buchung und Zahlung. Für weitere Fragen erreichen Sie die Disposition unter +48 691 242 691."
  ],
  "cs": [
    "Chat MATT",
    "Napište zprávu",
    "Odeslat",
    "Jak vám mohu pomoci? Zeptejte se na cenu, rezervaci, platbu nebo kontakt.",
    "Cena závisí na trase a počtu cestujících. Ve formuláři vyberte službu a zadejte trasu, datum a počet osob.",
    "Ve formuláři vyberte službu, zadejte trasu a datum a zkontrolujte souhrn rezervace.",
    "U soukromého transferu můžete platit hotově nebo online po potvrzení.",
    "V naléhavých případech volejte dispečink na +48 691 242 691.",
    "Mohu pomoci s cenou, rezervací nebo platbou. Další dotazy zodpoví dispečink na +48 691 242 691."
  ]
};
export function classify(input: string) {
  const s = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ł/g,"l").trim();
  if (s === "matt start") return "resume";
  if (/dyspozytor|czlowiek|konsultant|dispatch|human|operator|mitarbeiter|disposition|dispec|clovek|kontakt|contact/.test(s)) return "human";
  if (/cena|cene|cenu|koszt|ile|price|cost|how much|preis|kostet|kolik|wycen|quote/.test(s)) return "price";
  if (/plac|plat|pay|cash|kart|zahl|bezahl|hotov|gotow/.test(s)) return "payment";
  if (/rezerw|rezerv|book|buch|termin|formular/.test(s)) return "booking";
  if (/^(pl|en|de|cs|hej|czesc|hello|hi|hallo|ahoj|dzien dobry|dobry den|guten tag)[!. ]*$/.test(s)) return "hello";
  return "other";
}
export function languageHint(input: string) {
  const s=input.toLowerCase().trim();
  if (/^de$|\b(wie|ich|hallo|preis|kostet|buchen|guten|zahlung)\b/.test(s)) return "de";
  if (/^cs$|[řěů]|\b(kolik|ahoj|rezervace|dobrý den|platba)\b/.test(s)) return "cs";
  if (/^en$|\b(hello|hi|how|what|book|payment|price|much|please|human)\b/.test(s)) return "en";
  if (/^pl$|[ąęłńśźż]|\b(ile|kosztuje|hej|rezerwacja|dyspozytor|cena)\b/.test(s)) return "pl";
  return "";
}
export const indexByAction = {hello:3,resume:3,price:4,booking:5,payment:6,human:7,other:8} as const;
