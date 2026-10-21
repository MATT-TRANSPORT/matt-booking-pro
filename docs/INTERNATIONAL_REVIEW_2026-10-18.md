## 2026-10-21 — live recurring B2B and operator read receipts

- Actual signed-in B2B UI created TEST series MB-20261021-000035/000036. DB confirms outbound 2027-03-01/08 08:30; return 2027-03-08/15 14:55; roundtrip, PL, 864 PLN gross each, pending. No real reservation or charge.
- Saved-template fix a58d0de: Booking and Panel Preview both READY.
- Added server-only per-operator read receipts; detail mount POST marks read from every entry route, with visible retry on failure. Server rendering/prefetch cannot mark read. No booking-status change. Existing local browser read markers are not trusted/migrated.
- TEST-only migration enables RLS, revokes anon/authenticated access, grants server select/insert. Transactional DB check confirms duplicate-safe insert and access denial; fixture rolled back. Production migration remains pending.
- Fixed history card grid: route/actions occupy separate desktop columns, actions wrap under route on mobile.
- New route regression: 4/4 PASS (anonymous/nonstaff, cross-site/invalid/missing, authenticated actor binding, DB failure); TypeScript PASS. Live staff UI and history layout still require verification after Preview deployment.

## Aktualizacja 21.10.2026 — rzeczywisty formularz szablonów

- Kontynuacja najnowszych zmian 867651a. Nie ponawiano zaliczonych płatności ani całej macierzy językowej.
- Po zalogowaniu właściciela E2E TEST COMPANY A dashboard pokazuje cztery płatności B2B jako opłacone online/potwierdzone.
- Utworzenie szablonu E2E PR48 SERIES 20261021 TEST ONLY przez formularz zapisało rekord 39f656ff-5b36-48bf-8d3f-31d6f8d59fab w izolowanej bazie. Zachowano roundtrip, powrót +7 dni, 14:55. Następnie interfejs uległ awarii: zmienna `t` w mapowaniu zapisanych szablonów przesłaniała tłumacza. Naprawiono nazwę zmiennej i etykietę tworzenia.
- Test renderowania z rzeczywistym React dla niepustych szablonów: 4/4 PASS. API szablonów i faktur: 11/11 PASS. TypeScript PASS. Renderowanie dodano do CI; utworzenie serii i pobranie pliku nadal wymagają testu Preview po tej poprawce.
- „NOWA!” nadal używa localStorage per operator, a nie trwałego zapisu w bazie. Nie uznano tego wymagania ani CSS zakończonych kursów za zakończone.

## Aktualizacja 20.10.2026, 20:10 Europe/Warsaw

- Stripe TEST: **8/8 płatności zakończonych** (B2C i B2B × PL/EN/DE/CS). Ostatnie B2B MB-20261018-000025–000028: 864 PLN, Checkout complete/paid, livemode=false. Niezależny odczyt izolowanej bazy potwierdził paid, właściwy customer_locale i po jednym wpisie audytu księgowania. Końcowe przyciski płatności naciskał użytkownik.
- B2C CS: powrót do portalu wyświetlił „Zaplaceno” i „Platba přijata”. Wieczorne powroty B2B zachowały język, lecz sesja konta wygasła: wyświetlono lokalizowany login. Widok opłaconej rezerwacji po ponownym zalogowaniu pozostaje do sprawdzenia.
- Oba Vercel statusy dla c381765: success. [Booking](https://vercel.com/matt-transport/matt-booking-pro/DFjoYeGY8rHBxtXyZZiX38D8Z9KL), [Panel](https://vercel.com/matt-transport/matt-booking-pro1/5NTCZ2cEXHKtzQ3YowNCtxLkpk5V).
- Odtworzono niezapisane lokalnie poprawki: tłumaczenie przycisku zapisu portalu prywatnego, akcji i komunikatu zapisania adresu B2B, przykładów adresów i nazwy szablonu. Bez zmian w panelach operacyjnych.
- Świeża weryfikacja: 212/212 testów logiki/API/webhook/outbox/push PASS; TypeScript PASS. Są to testy lokalne z atrapami zależności, osobne od powyższych rzeczywistych Checkout TEST.
- Nadal bez publikacji produkcyjnej: uwierzytelniony powrót B2B, tworzenie szablonów/serii, pobieranie faktur, rzeczywiste Safari/iOS i dostarczenie push wymagają weryfikacji; potem migracje, wydanie obu projektów i smoke test. Wcześniejsze historyczne listy brakujących pięciu płatności są już nieaktualne.
- Tymczasowy wyjątek ochrony Booking Preview i webhook TEST zostały ponownie włączone za zgodą użytkownika 20.10 rano; wymagają uporządkowania po testach. Panel pozostaje chroniony. Brak prawdziwych płatności i wiadomości do klientów.

# MATT Booking PRO International Edition — raport 18.10.2026

## Aktualny stan — 19.10.2026

**Kontynuacja PR #48, produkcja jeszcze niewydana.** Poniższa aktualizacja zastępuje wcześniejsze historyczne opisy blokad dostępu i nieukończonej konfiguracji.

- Kod aplikacji `d1785a68a6ef3921719a16a1af8173bee1054ab3`: oba wdrożenia Preview SUCCESS — [Booking](https://vercel.com/matt-transport/matt-booking-pro/9wGBZrenqhQM8XzeunXuW8nmqoSR), [Panel](https://vercel.com/matt-transport/matt-booking-pro1/BPQAaGLUmMhuU4RVRzyCjrbEV3Lo). Lokalny Next.js/TypeScript PASS, testy logiki 69/69 PASS.
- Rzeczywiste HTTP Preview → Supabase TEST: **16/16** zapisów (B2C/B2B/Wedding/General × PL/EN/DE/CS). Sprawdzono język, oba odcinki tam, gdzie dotyczą przepływu, i tokenowy portal. API odrzuciło przelew bankowy B2C w czterech językach. B2B użyło rzeczywistego Auth testowej firmy w skrypcie HTTP; nie jest to pełny test logowania zdalnego UI.
- Formularz B2C w zdalnym Chromium utworzył cztery fikcyjne rezerwacje PL/EN/DE/CS z powrotem. Zapis ostatniej CS potwierdzono odczytem bazy 19.10 (MB-20261018-000030).
- **3/8 płatności TEST zakończone**: B2C PL/EN/DE, po 800 PLN. Niezależny odczyt Stripe 19.10: `livemode=false`, `complete`, `paid`; baza ma `paid` i po jednym przetworzonym zdarzeniu webhooka. Nie pobrano rzeczywistych pieniędzy. CS oraz B2B ×4 mają sesje utworzone, ale pozostają `pending`.
- Prawdziwy webhook Stripe TEST rozliczył trzy płatności. Dodatkowy ręczny replay podpisanego, już dostarczonego zdarzenia PL: dwa równoczesne żądania zwróciły duplikat, błędny podpis odrzucono. To nie jest test mechanizmu ponowień transportowych dostawcy Stripe.
- Kolejka powiadomień w TEST nie jest wysyłana do dostawców. Dotychczasowy test PL potwierdził jeden wpis rozliczenia i dwa zadania bez prób wysyłki. Nie deklarujemy rzeczywistego dostarczenia push. SMS/WhatsApp są ręcznymi linkami z tłumaczoną treścią; automatyczne SMS nie należą do zakresu wydania, co użytkownik potwierdził 19.10.
- Naprawiono brak serwerowego klucza Maps w Panel Preview (tylko ta gałąź), co odblokowało wycenę B2B. Dodano dedykowany testowy sekret webhooka w Booking Preview. Nie zmieniano wartości Production.
- Usunięto chwilowe wyświetlanie starych cen lotnisk przed pobraniem katalogu; lokalny fallback odpowiada zweryfikowanym stawkom. Etykieta podatku ma tłumaczenia DE `MwSt.` i CS `DPH`. Dodano test regresji cen oraz opt-in skrypty kontrolowanych HTTP/Checkout/replay.
- Użytkownik zatwierdził czasowy publiczny dostęp wyłącznie do dwóch aliasów gałęzi. **19.10 usunięto oba wyjątki, przywracając ochronę Vercel.** Dedykowany endpoint Stripe TEST został wyłączony po testach; nie należy płacić przygotowanych sesji, dopóki bezpieczny dostęp webhooka nie zostanie ponownie przygotowany. Nie zmieniono globalnych sekretów automatyzacji ani domen produkcyjnych.
- Automatyczna kontrola bezpieczeństwa odrzuciła zatwierdzenie czeskiego Checkout TEST. Nie ponawiano płatności inną drogą. Pozostałe braki i warunki wydania opisano na końcu raportu.

## Uzupełnienie audytu push — 19.10.2026

Użytkownik potwierdził, że automatyczna wysyłka SMS nie jest używana. Nie jest wymagana do wydania i nie należy włączać Twilio. Zakres tłumaczeń SMS/WhatsApp obejmuje istniejące ręczne linki i ich treść.

Testy rzeczywistej funkcji `sendBookingNotification` z izolowanym dostawcą odtworzyły blokadę ponowienia po odrzuceniu wszystkich wysyłek oraz ignorowanie błędu odczytu subskrypcji. Poprawka zwalnia wyłącznie własny wpis deduplikacji po jednoznacznych przejściowych odrzuceniach HTTP 429/5xx, gdy nie było żadnego sukcesu. Timeout/nieznany wynik i częściowy sukces zachowują deduplikację. Błędy odczytu/zapisu bazy są zgłaszane. To pozwala na kolejne wywołanie, ale nie dodaje automatycznego harmonogramu ponowień wszystkich push.

Wynik: **10/10 testów push PASS**, łącznie z 69 testami logiki **79/79 PASS**. Nowy zestaw sprawdza cztery języki, datę i trasę powrotu, link portalu, duplikaty, ponowienie po 503, błąd bazy, błąd zwolnienia rezerwacji, niepewny timeout oraz brak wysyłki w TEST. Nie wysyła nic do rzeczywistych urządzeń.

## Historia wcześniejszych prac — 18.10.2026

Opisy dawnych blokad i konfiguracji poniżej są zapisem kolejnych etapów, a nie aktualnym statusem. Wyniki z atrapami pozostają odrębne od późniejszych testów HTTP i Stripe TEST.

**Historyczny status 18.10: środowisko testowe przygotowane.** Kontynuowany jest [PR #48](https://github.com/MATT-TRANSPORT/matt-booking-pro/pull/48) i gałąź `feature/international-booking-languages`. Nie tworzono nowego PR ani implementacji od zera. Referencja porannych testów aplikacji: `8f23c856657f9149e7c7700d149981f0e71e367d`. Wieczorem ponowiono testy i dodano opisane niżej poprawki webhooka.

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

Dalsza poprawka opisana niżej dodaje trwałą kolejkę dla potwierdzeń klienckiego Stripe Checkout B2C/B2B. Nie obejmuje wszystkich innych powiadomień, płatności panelowych/terminalowych ani zwrotów; rzeczywiste dostarczenie nadal wymaga testów dostawców.

## Dalsze testy API i kontraktów danych — 18.10 wieczorem

- Dodano 85 bezpośrednich testów rzeczywistych handlerów API z lokalnymi atrapami zależności. Początkowy zestaw 69 testów wykazał 44 niepowodzenia w trzech grupach: błędne JSON/non-object kończyły się wyjątkiem, język z nagłówka/linku ginął przy zapisie oraz brakowało walidacji terminów B2B. Testy liczby pasażerów i pojazdów weselnych odtworzyły kolejne braki walidacji.
- Wszystkie cztery handlery B2C/B2B/Wedding/Transport pozostały używają wspólnego odczytu obiektu JSON i jednego rozstrzygniętego języka. Nieprawidłowe żądania zwracają 400 w PL/EN/DE/CS. B2B sprawdza terminy przed utworzeniem pracownika/rezerwacji; pasażerowie muszą stanowić całkowitą liczbę w zakresie formularza, pojazdy weselne 1–20. Wspólny parser dat odrzuca m.in. 31 lutego i godzinę 99:00.
- Dane 16 poprawnych żądań (4 typy × 4 języki) z tych handlerów poddano rzeczywistym INSERT w izolowanym PostgreSQL, sprawdzając constraints, język, powrót i kwoty oraz sloty pojazdów weselnych. Cała transakcja została wycofana. Generator powtarzalnego sprawdzenia: `tests/booking-contract-sql.cjs`, wejście eksportowane przez `MATT_BOOKING_CONTRACT_FILE` w testach API. To **nie** jest test HTTP podglądu ani rzeczywistego PostgREST z kluczem serwerowym.
- Zdalna przeglądarka ponownie odmówiła obserwacji formularza ochroną danych uwierzytelniających, również po otwarciu nowego dokumentu zgodnie z instrukcją narzędzia. Nie ponawiano logowania ani nie wyłączono ochrony.
- Dodano test rzeczywistego REST potwierdzający brak prawa wywołania funkcji rozliczenia Stripe przez anon, firmy, kierowcę i staff. Test Auth/REST/RLS: 8/8 PASS; lokalny Next.js build i TypeScript: PASS. Końcowe wyniki obu buildów Vercel po tej zmianie są publikowane w opisie PR.

## Trwałe potwierdzenia Checkout — 18.10, późny wieczór

- Migracje `20261018202019_payment_notification_outbox.sql` i `20261018202900_payment_outbox_rollout_guard.sql` zastosowano **wyłącznie w TEST**. Nowy wersjonowany RPC rozlicza płatność/historię i atomowo tworzy zadania e-mail klienta/firmy oraz push administratora. Trigger jest wyłączony dla starej ścieżki wysyłającej inline, co chroni przed podwójnymi potwierdzeniami podczas etapowanego wdrażania obu projektów. Obie migracje muszą poprzedzać nowe wdrożenie.
- Kolejkę i funkcje przejmowania może czytać/uruchamiać wyłącznie `service_role`; payload zawiera zapisany język i stan rezerwacji. Dla B2B odbiorcą jest administrator firmy. Przejęcie zadań używa `FOR UPDATE SKIP LOCKED`, blokady na 10 minut i tokenu odcinającego stary proces; pojedynczy worker ma limit 300 sekund.
- Pełne body Resend zostaje zapisane przed pierwszą próbą i jest ponawiane z tym samym kluczem. Żądanie ma timeout 15 sekund. Błędy przejściowe dostają opóźnione ponowienie; błędy trwałe, wyczerpanie 10 prób lub niepewne dostarczenie po 23 godzinach trafiają do `needs_attention`, zamiast ryzykować nową kopię po wygaśnięciu klucza u dostawcy. To nie jest gwarancja dostarczenia do skrzynki odbiorczej.
- Push ma semantykę co najmniej jednej próby dostarczenia, stabilny tag i wyłączone ponowne alarmowanie. Częściowe błędy mogą ponowić żądanie do działających subskrypcji; nie deklarujemy dokładnie jednego dostarczenia Web Push. Brak subskrypcji to `skipped`, nie fałszywy sukces.
- Worker działa po webhooku i w obu istniejących cron handlerach. Produkcyjne metadane harmonogramu sprawdzono wyłącznie do odczytu: `matt-customer-notifications-15m` jest aktywny, `*/15 * * * *`, wywołuje `/api/cron/operations-plus`. Nie uruchamiano produkcyjnego zadania testowo i nie modyfikowano produkcji.
- 18/18 testów worker/Resend/crona i tekstu e-maila z atrapą HTTP oraz 18/18 podpisanych testów webhooka: PASS. Test prawdziwego PostgreSQL potwierdził kolejkę w tej samej transakcji, rollback, przejęcia i odcięcie starego tokenu, brak kolejkowania ze starej ścieżki oraz odbiorcę B2B. Rekordy wycofano. Test mode blokuje dostawców i przejmowanie kolejki przed wywołaniami.
- Naprawiono konwersję HTML do tekstu: podwójne escapowanie regexów usuwało małe litery „t” i gubiło adresy linków. Test potwierdza czytelny tekst i pełny link do portalu.
- Rozszerzony Auth/REST/RLS: 9/9 PASS, także brak dostępu klientów/staff do payloadów i funkcji kolejki. Lokalna kompilacja i TypeScript: PASS.
- Kontrola bezpieczeństwa Supabase nie wykazała nowych ERROR. Pozostały wcześniejsze WARN dotyczące legacy funkcji weselnej, pg_net i ochrony haseł oraz INFO dla prywatnych tabel RLS obsługiwanych serwerowo.

## Rzeczywiste API Resend — bezpieczne adresy testowe

- Resend potwierdził domeny `notify.matt-transport.pl` i `matt-transport.pl` jako verified, sending enabled, eu-west-1.
- Rzeczywiste funkcje aplikacji `paymentReceivedEmail` → `prepareMattEmail` → `sendPreparedMattEmail` wykonały 8 wysyłek: kontekst B2C/B2B × PL/EN/DE/CS. Odbiorcami były wyłącznie oficjalne syntetyczne adresy `delivered+…@resend.dev`; dane i token rezerwacji były fikcyjne. Nie utworzono żadnych rezerwacji ani płatności.
- API przyjęło 8 wiadomości. Niezależny odczyt przez połączenie Resend potwierdził dla wszystkich 8 status `delivered`, właściwy adres testowy, język HTML i język linku. Jest to **symulowane dostarczenie Resend**, nie test rzeczywistej skrzynki Gmail/Outlook, antyspamu ani HTTP Preview.
- Ponowienie tej samej wiadomości z identycznym body i kluczem zwróciło ten sam identyfikator Resend. Łącznie 9 żądań send, 8 unikalnych wiadomości testowych. Etykieta próby: `pr48-9769c5f-20261018`.
- Powtarzalny skrypt `tests/controlled-resend-smoke.cjs` wymaga jawnego opt-in; odbiorców nie można przekazać jako argumentu i są sprawdzani względem domeny testowej. Uruchamia tylko lokalny mailer, nie bazę/Stripe. W tym odrębnym procesie lokalnym wyłącza blokadę wysyłki wyłącznie na czas tych syntetycznych odbiorców. Zdalny Preview nadal blokuje wysyłkę.
- Oba buildy Vercel dla kodu aplikacji `9769c5f`: PASS ([Booking](https://vercel.com/matt-transport/matt-booking-pro/8hAXkWPpRCDUDANF4ADDrEreteSt), [Panel](https://vercel.com/matt-transport/matt-booking-pro1/9EJd3rts2yBvjJFkr7h8R8J68JbN)). Aktualizacje raportu i testów mają wyniki CI w opisie PR.

## Zweryfikowane wyniki

| Kontrola | Wynik | Zakres i granice |
|---|---|---|
| TypeScript | PASS | aktualny kod |
| Lokalny Next.js build | PASS | konfiguracja lokalnego serwera testowego, bez danych produkcyjnych |
| Handlery API rezerwacji | 85/85 PASS | rzeczywiste POST, lokalne atrapy zależności; język w body/nagłówku/URL, błędny JSON, terminy B2B, daty kalendarzowe, liczby pasażerów/pojazdów |
| Kontrakty zapisu w PostgreSQL | 16/16 PASS | 4 typy × 4 języki; rzeczywiste INSERT wygenerowanych danych i rollback; bez HTTP Preview |
| Testy logiki | 69/69 PASS | języki, linki, wiadomości, walidacja, Checkout i zabezpieczenia test mode |
| Playwright Chromium | 104/104 PASS, 53,5 s | PL/EN/DE/CS × desktop 1440×1000 i mobile 390×844; lokalne atrapy API oraz protokołu Supabase |
| Rzeczywisty Resend API | 8/8 PASS + retry PASS | wyłącznie adresy testowe dostawcy, symulowane delivered; bez testu rzeczywistej skrzynki/antyspamu |
| Kolejka potwierdzeń Checkout | 18/18 PASS | symulowane HTTP Resend, awarie/ponowienia/współbieżność i tryb testowy; bez wysłania e-maila |
| Podpisany webhook Stripe (lokalnie) | 18/18 PASS | Rzeczywista weryfikacja podpisu SDK, atrapa PostgREST; ponowienia, współbieżność, błędy bazy, waluta, tryb test/live i spóźnione zdarzenia. Bez połączenia do Stripe. |
| Rzeczywisty Supabase Auth/REST/RLS | 9/9 PASS | dwie firmy, driver, staff, anon; rozdzielenie danych, historia i blokady zapisu; wyłącznie izolowany projekt testowy |
| Vercel Booking | BUILD PASS | kod `c8b6e86`, wdrożenie `9bf956GaWqSNCB3AEZgHiX97v96p` |
| Vercel Panel — wcześniejsze wdrożenia | KOREKTA wcześniejszego PASS | Zielony status obejmował pusty build (96 ms), bez kompilacji Next.js. Ujawniono to w logach 18.10 wieczorem. |
| Vercel Panel — naprawiony build | BUILD PASS | kod `c8b6e86`, wdrożenie `Gg29aXS3Uth9VMA53q8JZhdkmed8`. Poprzednią naprawę potwierdzał rzeczywisty build Next.js `E7W3DHgaBuKEpxTzgngaMT3oFzmf` (1m 9s), API 8 lotnisk. |
| Odczyt UI podglądu Booking | 2/2 PASS | DE, desktop/mobile: HTTP 200, język, komunikat testowy, brak przelewu, brak błędów JS i przekroczenia szerokości; bez wysyłania formularza |
| API cennika podglądu Booking | PASS — odczyt | W zalogowanej zdalnej przeglądarce API zwróciło katalog 8 lotnisk. Poprzedni błąd brakującego klucza już nie występuje. |

Poranny odczyt podglądu wykonano przez uwierzytelniony token Vercel ograniczony do jego origin. Wieczorne odczyty API i formularza wykonano w zalogowanej zdalnej przeglądarce. Lokalny zarządzany proxy ma CA nieobecne w Chromium; dla tego odczytu UI jawnie pominięto sprawdzanie łańcucha TLS. Nie jest to test certyfikatu domeny. Skrypt blokuje żądania zapisujące i zewnętrzne domeny.

Nie utworzono prawdziwych rezerwacji, nie pobrano płatności i nie wysłano wiadomości do klientów. Testowe rekordy i zmiana notatki przez staff istnieją tylko w nowym projekcie testowym. Lokalne testy Checkout używają atrap Stripe — nie dowodzą autentycznej płatności ani webhooka.

Obie kompilacje `c8b6e86` uzyskały status success. Najnowsze kompilacje d1785a6 również zakończyły się sukcesem; odnośniki w aktualizacji na początku raportu.

## Podglądy i kompilacje

- [Booking — podgląd testowy](https://matt-booking-pro-git-feature-internationa-67b25c-matt-transport.vercel.app)
- [Panel — naprawione wdrożenie Preview](https://vercel.com/matt-transport/matt-booking-pro1/E7W3DHgaBuKEpxTzgngaMT3oFzmf)
- [Panel — podgląd testowy](https://matt-booking-pro1-git-feature-internation-bf0d83-matt-transport.vercel.app)
- [Booking — zweryfikowana kompilacja 8f23c85](https://vercel.com/matt-transport/matt-booking-pro/6NzTrJ2moGbTDGhF1Zv5auzLHM5v)
- [Panel — wcześniejszy pusty build 8f23c85 (korekta wyniku)](https://vercel.com/matt-transport/matt-booking-pro1/DKSAoNWwXaWHZkCaxMwFsNQHqrPA)
- [Aktualne statusy PR](https://github.com/MATT-TRANSPORT/matt-booking-pro/pull/48/checks)

Publiczne zmienne nowej bazy i test mode są ustawione w Preview obu projektów, tylko dla tej gałęzi. Nie publikowano nowej wersji Production. Wieczorem potwierdzono w panelu Vercel obecność Secret `SUPABASE_SERVICE_ROLE_KEY` i `STRIPE_SECRET_KEY` w obu projektach, przypisanych do Preview tej gałęzi; nie odczytywano ich wartości. W projekcie `matt-booking-pro1` wykryto pusty Build Command i ustawiono jawnie `npm run build`; zmiana dotyczy przyszłych kompilacji projektu, istniejące wdrożenie produkcyjne pozostaje bez zmian. Nowa kompilacja Preview `E7W3DHgaBuKEpxTzgngaMT3oFzmf` zakończyła się statusem Ready po 1m 9s; API lotnisk sprawdzono w zalogowanej zdalnej przeglądarce i zwróciło dane. Nie wyłączono ochrony wdrożeń i nie utworzono nowych sekretów automatyzacji. Po jednorazowym przejęciu przeglądarki przez użytkownika sprawdzono polski formularz: dwie metody płatności (gotówka/online), pola powrotu i cenę bazową obu odcinków. Podczas zmiany języka ochrona pól uwierzytelniania ponownie ograniczyła odczyt. Pełne E2E nadal nie zostało wykonane.

## Co blokuje produkcję — aktualizacja 19.10.2026

1. Dokończenie pięciu płatności Stripe TEST: B2C CS i B2B PL/EN/DE/CS. Sesje utworzono i zweryfikowano; zatwierdzenie kolejnego Checkout zostało odrzucone przez automatyczną kontrolę bezpieczeństwa przeglądarki, która wymaga przejęcia przez użytkownika także dla testowej transakcji. Nie obchodzono blokady i nie deklarujemy 8/8 płatności.
2. Pełny scenariusz uwierzytelnionego portalu B2B i ponowień w zdalnym UI oraz rzeczywiste Safari/iOS. Lokalny Chromium z atrapami nie zastępuje tych testów.
3. Kontrolowane dostarczenie push do odbiorców testowych. Resend zaliczył wyłącznie syntetyczne dostarczenie dostawcy, nie test rzeczywistych skrzynek.
4. Po zamknięciu powyższych: wymagane migracje na produkcji, etapowane wdrożenie obu projektów, smoke test i kontrola logów. Do tego czasu bez merge i bez publikacji International Edition na produkcji.

[Konfiguracja testów](INTERNATIONAL_TEST_ENVIRONMENT.md). Nie przekazywać sekretów w rozmowie ani repozytorium.


### Authenticated B2B follow-up — 2026-10-19

- Signed-in isolated E2E TEST COMPANY A account: dashboard and round-trip detail verified in browser. EN/DE/CS navigation retains the requested locale; both journey dates/times and net/VAT/gross amounts are visible.
- EN/DE/CS repeat form exposes outbound and return date/time inputs; submitting empty fields gives the appropriate translated validation message. No new booking or payment was submitted during these checks. This is not a completed repeat-booking end-to-end test.
- Fixed hardcoded B2B price-snapshot badge and VAT labels in booking details, quote form and billing. Seeded detail-page navigation, payment, documents and action widgets with the server request locale to prevent their initial Polish render on translated pages. Operational callers retain Polish defaults.
- Local production build passed; international logic plus customer-push fixture tests passed 79/79. Preview verification of this follow-up commit remains pending at commit time.
- Production remains unchanged. Remaining provider-payment, real-device and complete authenticated workflow gates from the earlier report still apply. Manual SMS remains the intended workflow.

- Follow-up: PL empty-repeat validation also passed. Submitting a valid repeat in the isolated browser exposed a real persistence failure; no row was created. The route copied `customer_email_normalized`, a PostgreSQL generated column, from `SELECT *` into INSERT. Excluded it from the repeat payload. Added four locale-specific handler regression cases enforcing generated-column rejection and verifying new return dates, locale, current prices and cleared payment/driver assignments: 89/89 booking API tests pass. Live repeat verification is pending deployment of this fix.
- Both Vercel builds for the preceding UI fix `a4d4e6a` succeeded: Booking `Hx56jaj5tkwNrayL5QEeuMt6fiUF`, Panel `4Di9veCas2929p12Sp2dE52vGPKD`.


### Live B2B follow-up — 2026-10-19 evening

- Repeat-booking UI → API → test DB → detail succeeded in all four languages after `ed68ab4`: CS/EN/DE/PL records MB-20261019-000031 through 000034. Independent DB reads verified locales, outbound/return dates and times, 864 PLN gross, pending payment and cleared driver/Checkout references. These are isolated TEST records, not fulfilled bookings.
- Further UI testing found the edit form omitted return fields and its save label was hardcoded. `c958499` adds editable return dates/times, calendar-date validation for repeat/update, safe malformed-body handling, return changes in history and payment invalidation/reconfirmation. Fixture API tests: 97/97 PASS; TypeScript and local Next build PASS.
- Live DE edit test on TEST MB-20261019-000033: return before departure rejected with German error; valid change to 2027-02-21 15:10 saved and displayed with German success text. Outbound remains 2027-02-12 08:30, gross 864 PLN. DB history independently confirms the return edit. No payment was executed.
- Live CS calendar correctly shows the return leg separately (2027-02-17 14:55) with reversed airport-to-address route. CS billing and empty templates views are translated after hydration. This does not verify invoice downloads or recurring-template creation.
- Follow-up removes initial Polish navigation links on all company server pages, adds the missing save-button translations, and normalizes HH:mm versus HH:mm:ss in edit history to avoid reporting an unchanged departure time as changed.
- Production remains blocked by remaining Stripe TEST completion, wider portal/mobile Safari/iOS and real push delivery checks. No real customer messages or production writes.
