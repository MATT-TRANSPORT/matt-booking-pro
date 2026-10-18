# MATT Booking PRO International Edition — raport 18.10.2026

**Status: środowisko testowe przygotowane, pełne wydanie produkcyjne nadal zablokowane.** Kontynuowany jest [PR #48](https://github.com/MATT-TRANSPORT/matt-booking-pro/pull/48) i gałąź `feature/international-booking-languages`. Nie tworzono nowego PR ani implementacji od zera. Referencja porannych testów aplikacji: `8f23c856657f9149e7c7700d149981f0e71e367d`. Wieczorem ponowiono testy i dodano opisane niżej poprawki webhooka.

## Zmiany

- Wspólny język PL (domyślny), EN, DE, CS w formularzach B2C/B2B/Wedding/Transport pozostały, podsumowaniach, walidacji API, portalu, Moich przejazdach, ponawianiu, ocenach i logowaniu klienta. Język w bazie, URL, żądaniach API i powiadomieniach.
- Uzupełnione 11 stron firmowych, nawigacja, dokumenty, kalendarz, cennik, pracownicy, szablony, rozliczenia i ustawienia. Panele administracyjne i operacyjne pozostają polskie.
- Wiadomości B2B, wyceny, zmiana/anulowanie rezerwacji, prośby o ocenę, SMS/WhatsApp/push i publiczne alerty lotnicze w języku klienta. Wewnętrzne instrukcje dyspozytora nie trafiają do alertów klienta.
- Travel Guide obejmuje oba odcinki transferu lotniskowego i nie trafia do zwykłych transportów A→B. Stripe zachowuje język rezerwacji i powrotów bez zmiany kwot/PLN.
- Dla klientów indywidualnych dostępne wyłącznie gotówka i płatność online, także przy ponawianiu i nowej wycenie transportu pozostałego. API odrzuca przelew ze starszego formularza. Historyczne dane i przelewy firmowe zachowane.
- Naprawione ponawianie obu odcinków B2B, kolejność terminów, zwalnianie przycisku po błędzie sieci i mobilne przyciski płatności.
- Osobny projekt Supabase `matt-booking-pro-test-pr48`, ref `ozeqdorryajfioxpufzb`, Frankfurt, w organizacji MATT TRANSPORT wskazanej przez użytkownika. Wycena utworzenia: 0 USD/miesiąc. Nie zmieniono abonamentu na Pro ani nie kopiowano danych klientów.
- Odtworzony schemat i wyłącznie fikcyjne konta/rezerwacje. Uzupełnione migracje dwóch tabel push, których brakowało w repo.
- Usunięte legacy reguły odczytu wszystkich rezerwacji przez dowolne zalogowane konto. Nowa migracja uprawnień jest zastosowana **tylko w bazie testowej**. Produkcyjne metadane polityk sprawdzono wyłącznie do odczytu: odpowiadają regułom zastępowanym przez migrację. Zastosowanie jej do produkcji pozostaje częścią kontrolowanego wydania po pełnych testach aplikacji.
- Test mode blokuje produkcyjną bazę i klucze Stripe live na Preview; pomija e-mail/push/Calendar przed wywołaniem dostawcy, pokazuje komunikat testowy w wybranym języku i kieruje linki do Preview.

- Wieczorne testy webhooka odtworzyły 5 usterek przed poprawkami (2/7 PASS). Dodano atomowe przejmowanie zdarzenia na kluczu głównym i warunkowe przejście stanu rezerwacji, kontrolę wszystkich błędów PostgREST, zgodność test/live oraz waluty PLN i ochronę zwróconych/rozliczonych płatności przed spóźnionymi zdarzeniami. Nowa migracja `20261018184000_stripe_webhook_claims.sql` jest zastosowana tylko w bazie testowej; musi poprzedzać publikację nowego webhooka na produkcji.

Dalsza regresja odtworzyła brak atomowości: awaria historii po zapisie `paid` pozostawiała brakujący audyt. Migracja `20261018184521_stripe_payment_audit_transaction.sql` łączy zapis stanu i historii w transakcję `SECURITY INVOKER`, dostępną wyłącznie dla `service_role`. Zastosowana tylko w bazie testowej; wymagana przed wdrożeniem webhooka. Test SQL `tests/stripe-payment-transaction.sql` potwierdził uprawnienia, walutę, kwotę, zapis, rollback, odrzucenie nieaktualnego przejścia i ochronę zwrotu, po czym wycofał wszystkie zmiany danych.

Brak utrwalonej kolejki ponowień powiadomień pozostaje ograniczeniem: awaria procesu po zatwierdzeniu płatności może przerwać wysłanie potwierdzenia. Testy transakcji nie dowodzą niezawodnego dostarczenia e-mail/push ani pełnej atomowości innych rodzajów płatności.

## Dalsze testy API i kontraktów danych — 18.10 wieczorem

- Dodano 85 bezpośrednich testów rzeczywistych handlerów API z lokalnymi atrapami zależności. Początkowy zestaw 69 testów wykazał 44 niepowodzenia w trzech grupach: błędne JSON/non-object kończyły się wyjątkiem, język z nagłówka/linku ginął przy zapisie oraz brakowało walidacji terminów B2B. Testy liczby pasażerów i pojazdów weselnych odtworzyły kolejne braki walidacji.
- Wszystkie cztery handlery B2C/B2B/Wedding/Transport pozostały używają wspólnego odczytu obiektu JSON i jednego rozstrzygniętego języka. Nieprawidłowe żądania zwracają 400 w PL/EN/DE/CS. B2B sprawdza terminy przed utworzeniem pracownika/rezerwacji; pasażerowie muszą stanowić całkowitą liczbę w zakresie formularza, pojazdy weselne 1–20. Wspólny parser dat odrzuca m.in. 31 lutego i godzinę 99:00.
- Dane 16 poprawnych żądań (4 typy × 4 języki) z tych handlerów poddano rzeczywistym INSERT w izolowanym PostgreSQL, sprawdzając constraints, język, powrót i kwoty oraz sloty pojazdów weselnych. Cała transakcja została wycofana. Generator powtarzalnego sprawdzenia: `tests/booking-contract-sql.cjs`, wejście eksportowane przez `MATT_BOOKING_CONTRACT_FILE` w testach API. To **nie** jest test HTTP podglądu ani rzeczywistego PostgREST z kluczem serwerowym.
- Zdalna przeglądarka ponownie odmówiła obserwacji formularza ochroną danych uwierzytelniających, również po otwarciu nowego dokumentu zgodnie z instrukcją narzędzia. Nie ponawiano logowania ani nie wyłączono ochrony.
- Dodano test rzeczywistego REST potwierdzający brak prawa wywołania funkcji rozliczenia Stripe przez anon, firmy, kierowcę i staff. Test Auth/REST/RLS: 8/8 PASS; lokalny Next.js build i TypeScript: PASS. Końcowe wyniki obu buildów Vercel po tej zmianie są publikowane w opisie PR.

## Zweryfikowane wyniki

| Kontrola | Wynik | Zakres i granice |
|---|---|---|
| TypeScript | PASS | aktualny kod |
| Lokalny Next.js build | PASS | konfiguracja lokalnego serwera testowego, bez danych produkcyjnych |
| Handlery API rezerwacji | 85/85 PASS | rzeczywiste POST, lokalne atrapy zależności; język w body/nagłówku/URL, błędny JSON, terminy B2B, daty kalendarzowe, liczby pasażerów/pojazdów |
| Kontrakty zapisu w PostgreSQL | 16/16 PASS | 4 typy × 4 języki; rzeczywiste INSERT wygenerowanych danych i rollback; bez HTTP Preview |
| Testy logiki | 68/68 PASS | języki, linki, wiadomości, walidacja, Checkout i zabezpieczenia test mode |
| Playwright Chromium | 104/104 PASS, 53,5 s | PL/EN/DE/CS × desktop 1440×1000 i mobile 390×844; lokalne atrapy API oraz protokołu Supabase |
| Podpisany webhook Stripe (lokalnie) | 17/17 PASS | Rzeczywista weryfikacja podpisu SDK, atrapa PostgREST; ponowienia, współbieżność, błędy bazy, waluta, tryb test/live i spóźnione zdarzenia. Bez połączenia do Stripe. |
| Rzeczywisty Supabase Auth/REST/RLS | 8/8 PASS | dwie firmy, driver, staff, anon; rozdzielenie danych, historia i blokady zapisu; wyłącznie izolowany projekt testowy |
| Vercel Booking | BUILD PASS | kod `c8b6e86`, wdrożenie `9bf956GaWqSNCB3AEZgHiX97v96p` |
| Vercel Panel — wcześniejsze wdrożenia | KOREKTA wcześniejszego PASS | Zielony status obejmował pusty build (96 ms), bez kompilacji Next.js. Ujawniono to w logach 18.10 wieczorem. |
| Vercel Panel — naprawiony build | BUILD PASS | kod `c8b6e86`, wdrożenie `Gg29aXS3Uth9VMA53q8JZhdkmed8`. Poprzednią naprawę potwierdzał rzeczywisty build Next.js `E7W3DHgaBuKEpxTzgngaMT3oFzmf` (1m 9s), API 8 lotnisk. |
| Odczyt UI podglądu Booking | 2/2 PASS | DE, desktop/mobile: HTTP 200, język, komunikat testowy, brak przelewu, brak błędów JS i przekroczenia szerokości; bez wysyłania formularza |
| API cennika podglądu Booking | PASS — odczyt | W zalogowanej zdalnej przeglądarce API zwróciło katalog 8 lotnisk. Poprzedni błąd brakującego klucza już nie występuje. |

Poranny odczyt podglądu wykonano przez uwierzytelniony token Vercel ograniczony do jego origin. Wieczorne odczyty API i formularza wykonano w zalogowanej zdalnej przeglądarce. Lokalny zarządzany proxy ma CA nieobecne w Chromium; dla tego odczytu UI jawnie pominięto sprawdzanie łańcucha TLS. Nie jest to test certyfikatu domeny. Skrypt blokuje żądania zapisujące i zewnętrzne domeny.

Nie utworzono prawdziwych rezerwacji, nie pobrano płatności i nie wysłano wiadomości do klientów. Testowe rekordy i zmiana notatki przez staff istnieją tylko w nowym projekcie testowym. Lokalne testy Checkout używają atrap Stripe — nie dowodzą autentycznej płatności ani webhooka.

Obie kompilacje `c8b6e86` uzyskały status success. Końcowa zmiana transakcji wymaga nowych kompilacji Preview; bieżące wyniki są także aktualizowane w opisie PR #48.

## Podglądy i kompilacje

- [Booking — podgląd testowy](https://matt-booking-pro-git-feature-internationa-67b25c-matt-transport.vercel.app)
- [Panel — naprawione wdrożenie Preview](https://vercel.com/matt-transport/matt-booking-pro1/E7W3DHgaBuKEpxTzgngaMT3oFzmf)
- [Panel — podgląd testowy](https://matt-booking-pro1-git-feature-internation-bf0d83-matt-transport.vercel.app)
- [Booking — zweryfikowana kompilacja 8f23c85](https://vercel.com/matt-transport/matt-booking-pro/6NzTrJ2moGbTDGhF1Zv5auzLHM5v)
- [Panel — wcześniejszy pusty build 8f23c85 (korekta wyniku)](https://vercel.com/matt-transport/matt-booking-pro1/DKSAoNWwXaWHZkCaxMwFsNQHqrPA)
- [Aktualne statusy PR](https://github.com/MATT-TRANSPORT/matt-booking-pro/pull/48/checks)

Publiczne zmienne nowej bazy i test mode są ustawione w Preview obu projektów, tylko dla tej gałęzi. Nie publikowano nowej wersji Production. Wieczorem potwierdzono w panelu Vercel obecność Secret `SUPABASE_SERVICE_ROLE_KEY` i `STRIPE_SECRET_KEY` w obu projektach, przypisanych do Preview tej gałęzi; nie odczytywano ich wartości. W projekcie `matt-booking-pro1` wykryto pusty Build Command i ustawiono jawnie `npm run build`; zmiana dotyczy przyszłych kompilacji projektu, istniejące wdrożenie produkcyjne pozostaje bez zmian. Nowa kompilacja Preview `E7W3DHgaBuKEpxTzgngaMT3oFzmf` zakończyła się statusem Ready po 1m 9s; API lotnisk sprawdzono w zalogowanej zdalnej przeglądarce i zwróciło dane. Nie wyłączono ochrony wdrożeń i nie utworzono nowych sekretów automatyzacji. Po jednorazowym przejęciu przeglądarki przez użytkownika sprawdzono polski formularz: dwie metody płatności (gotówka/online), pola powrotu i cenę bazową obu odcinków. Podczas zmiany języka ochrona pól uwierzytelniania ponownie ograniczyła odczyt. Pełne E2E nadal nie zostało wykonane.

## Co blokuje produkcję

1. Potwierdzenie poprawności wartości i rzeczywistego działania obu konfiguracji Preview. Klucze są obecne w obu projektach, a Booking odczytuje katalog lotnisk; nie dowodzi to jeszcze poprawności Stripe ani pełnego przepływu zapisu.
2. Weryfikacja dodanego klucza Stripe test oraz konfiguracja osobnego sekretu testowego webhooka, poprawny dostęp webhooka przez Deployment Protection i pełna płatność testowa z aktualizacją statusu oraz idempotencją.
3. Pełny zapis B2C/B2B/Wedding/Transport pozostały z podglądu, oba odcinki, portal, powtórzenia i walidacja przez rzeczywistą bazę. Obecne testy Auth/RLS i UI nie zastępują tego scenariusza.
4. Kontrolowane dostarczanie e-mail/SMS/push oraz Safari/iOS. Test mode celowo nie wysyła wiadomości.
5. Zastosowanie sprawdzonych migracji, etapowany build produkcyjny, smoke test i kontrola logów — dopiero po zamknięciu powyższych punktów.

[Dokładna konfiguracja testów i brakujących kluczy](INTERNATIONAL_TEST_ENVIRONMENT.md). Kluczy nie wolno wklejać do rozmowy ani repozytorium. Wprowadzić je bezpośrednio w Vercel jako Secret dla właściwej gałęzi Preview.

Nie wykonano merge ani publikacji International Edition na produkcji.
