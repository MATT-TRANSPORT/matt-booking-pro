# MATT Booking PRO International Edition — raport 18.10.2026

**Status: PR nadal roboczy. Nie jest to zakończone wdrożenie International Edition. Nie scalać ani nie publikować na produkcji przed zamknięciem braków poniżej.**

Kontynuowana gałąź: `feature/international-booking-languages`, istniejący [PR #48](https://github.com/MATT-TRANSPORT/matt-booking-pro/pull/48). Punktem wyjścia był commit `baeb70dd9e696b3802c4b88926317a40c770026e` i stan po 31 commitach. Nie utworzono nowej implementacji ani nowego PR.

## Wprowadzone poprawki

- Wspólna obsługa języka PL/EN/DE/CS: parametr URL, język zapisany w rezerwacji, lokalne preferencje i domyślny PL. Zmiana flagi odświeża zamontowany formularz bez utraty wpisanych danych. Działa również przy zablokowanym localStorage.
- Uzupełnione etykiety, podsumowania i komunikaty formularza lotniskowego na telefonie i desktopie, formularza B2B, portalu rezerwacji, wycen oraz płatności. Zachowana dotychczasowa kalkulacja cen.
- Ujednolicone przekazywanie języka w formularzach Wedding i Transport pozostały. B2B zapisuje teraz `customer_locale` przy tworzeniu rezerwacji.
- Tłumaczenia „Moich przejazdów”, ponawiania rezerwacji, instalacji aplikacji klienta i formularza oceny. Ponowienie przekazuje język do nowego zamówienia; linki do rezerwacji i powroty do portalu zachowują `lang`.
- E-mail logowania klienta w czterech językach; język zachowany po weryfikacji jednorazowego linku. Odpowiedź API nadal nie ujawnia, czy e-mail istnieje w bazie.
- Powiadomienia SMS/WhatsApp i push: tłumaczenia wszystkich 13 obsługiwanych typów zdarzeń, poprawny termin oraz trasa powrotnego odcinka, link portalu z językiem klienta.
- Stripe Checkout B2C/B2B: język z zapisanego zamówienia, zachowany w adresach sukcesu i anulowania; bez zmiany waluty, kwoty i zasad dostępności płatności.
- Wiadomości o przygotowanej, zaakceptowanej i odrzuconej wycenie w czterech językach. Wspólna stopka e-maila jest lokalizowana, a wiadomości operacyjne administratora pozostają polskie.
- Travel Guide obejmuje oba odcinki transferu lotniskowego. Zwykły transport A→B w obie strony nie dostaje już instrukcji lotniskowych.
- Błąd połączenia przy zapisie formularza B2C nie blokuje już przycisku w stanie „zapisywanie”. Poprawiony układ przycisków kontaktowych na mobilnej stronie płatności B2B.
- Uzupełnione 11 stron `/firma`: logowanie, dashboard, lista i szczegóły rezerwacji, nowa rezerwacja, pracownicy, szablony, kalendarz, cennik, rozliczenia i ustawienia. Wspólne komponenty dokumentów, płatności i warunków handlowych przyjmują język klienta, a w panelu administracyjnym zachowują PL.
- Język klienta przenoszony nagłówkiem własnych żądań API; lokalizowane walidacje i bezpieczne komunikaty błędów. Nie przekazujemy wewnętrznych błędów SQL ani dostawców do interfejsu klienta.
- Szablony B2B dla pracownika, prośba o ocenę, wiadomości o zmianie/anulowaniu rezerwacji firmowej oraz publiczne statusy i alerty lotnicze w czterech językach. Wewnętrzne instrukcje operacyjne nie trafiają do alertów klienta.
- Ponawianie firmowej rezerwacji w obie strony pyta o termin powrotu i zachowuje go w nowej rezerwacji. API odrzuca brak powrotu lub powrót wcześniejszy od wyjazdu.
- Zgodnie z dodatkowym poleceniem: dla klientów indywidualnych dostępne tylko gotówka i płatność online. Przelew usunięty z formularza desktop/mobile, ponawiania i nowej wyceny transportu pozostałego. Starszy formularz nie zapisze przelewu przez API; historyczne dane i przelewy firmowe pozostają zachowane. Ponowienie historycznej rezerwacji z przelewem domyślnie wybiera gotówkę.
- Dodane powtarzalne testy, lokalny serwer protokołu Supabase do testów portalu, konfiguracja Playwright i lockfile zależności.

## Wyniki sprawdzenia

| Kontrola | Wynik | Zakres |
|---|---|---|
| TypeScript `tsc --noEmit` | PASS | aktualny kod aplikacji |
| Next.js build | PASS | Next.js 15.5.28; testowe lokalne ustawienia Supabase, bez kluczy produkcyjnych |
| Testy logiki | 61/61 PASS | języki, powiadomienia, e-maile, wyceny, linki, oba rodzaje Checkout i blokada ponownej zapłaty |
| Testy przeglądarkowe Chromium | 104/104 PASS | PL/EN/DE/CS × desktop 1440×1000 i mobile 390×844 |
| Kontrola błędów JS i szerokości | PASS | każdy ze 104 scenariuszy |
| Mobilne przyciski kontaktowe | PASS | sprawdzenie położenia oraz ręczna kontrola zrzutu DE |
| Supabase — schemat, tylko odczyt | PASS | `bookings.customer_locale` i `wedding_bookings.customer_locale`: text, NOT NULL, DEFAULT 'pl'; CHECK dopuszcza pl/en/de/cs |

Testy przeglądarkowe sprawdzają: transfer lotniskowy w obie strony z 8 pasażerami, busem i płatnością online; dokładnie dwie opcje płatności i brak przelewu; przełączanie flag; nagłówki i walidację formularzy; wysłanie transportu A→B i Wedding; symulowane anulowanie płatności; zapisany język opłaconej rezerwacji B2B; listę prywatnych przejazdów; ponawianie transportu; działanie bez dostępu do pamięci przeglądarki; logowanie i dziewięć głównych stron zalogowanej firmy, szczegóły rezerwacji, walidację oraz ponowienie obu odcinków.

**Granice testów:** wszystkie żądania API przeglądarki były przechwycone przez lokalne atrapy; SSR portalu firmowego korzystał z lokalnego serwera Supabase dopuszczającego wyłącznie odczyt; połączenia poza lokalną aplikacją były blokowane. Testy Checkout używały atrap Stripe oraz bazy. Nie utworzono prawdziwych rezerwacji, nie wysłano wiadomości klientom, nie obciążono kart. To nie jest potwierdzenie działania Stripe w trybie testowym ani pełnego przepływu przez zewnętrzne integracje.

Powtórzenie kontroli:

```sh
npm ci
npm run test:international
npx tsc --noEmit
# Do lokalnego buildu testów używać wyłącznie testowej konfiguracji Supabase.
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3201 NEXT_PUBLIC_SUPABASE_ANON_KEY=matt-local-test-only npm run build
npx playwright install chromium
npm run test:international:browser
```

W środowisku tej sesji standardowy plik Chromium nie dawał się pobrać. Testy uruchomiono Chromium 143 z zewnętrznego pakietu testowego przez `MATT_CHROMIUM_EXECUTABLE`; pakiet ten nie jest zależnością produkcyjną aplikacji.

## Podglądy i stan wydania

- [Booking — podgląd gałęzi](https://matt-booking-pro-git-feature-internationa-67b25c-matt-transport.vercel.app)
- [Panel — podgląd gałęzi](https://matt-booking-pro1-git-feature-internation-bf0d83-matt-transport.vercel.app)
- [Wyniki wdrożeń i aktualny commit PR](https://github.com/MATT-TRANSPORT/matt-booking-pro/pull/48/checks)

To adresy podglądów istniejącej gałęzi, nie nowe wdrożenie produkcyjne. Aktualny stan obu kompilacji zdalnych jest publikowany przez integrację Vercel w PR. Zielone statusy starego commitu nie potwierdzają nowej wersji.

Dostęp Vercel CLI został przywrócony. Potwierdzono oba projekty w zespole `matt-transport`, wspólny katalog główny i Node.js 24. Zmienne Secret dla Stripe i powiadomień obejmują Preview i Production. Próba odczytu konfiguracji Preview przez `env run` nie udostępniła kluczy Stripe ani Supabase; nie potwierdzono izolowanego trybu Stripe test ani testowej bazy. Nie wykonywano próbnych płatności na niezweryfikowanym środowisku ani nie zmieniano konfiguracji produkcyjnej.

## Braki blokujące zakończenie i produkcję

1. Pełne E2E przez izolowany testowy Supabase z kontem firmy, autoryzacją, zapisem, wyceną i webhookiem Stripe test mode. Lokalne atrapy nie weryfikują RLS, rzeczywistych sesji, dostawców ani webhooków. Brak potwierdzonej testowej konfiguracji blokuje bezpieczne wykonanie tego etapu.
2. Rzeczywiste dostarczenie e-mail/SMS/push na kontrolowane konta testowe oraz testy Safari/iOS i silników innych niż Chromium.
3. Końcowy audyt kompletności treści całego produktu na realnym podglądzie obu projektów. Zielona kompilacja i lokalne testy nie potwierdzają pełnego przepływu z usługami zewnętrznymi.
4. Dopiero po zamknięciu tych braków: wydanie stabilnej wersji, smoke test produkcji i kontrola logów.

Nie wykonano merge ani publikacji na produkcji. Raport opisuje zweryfikowany etap prac i rzeczywiste braki, a nie zakończoną realizację całego zlecenia.
