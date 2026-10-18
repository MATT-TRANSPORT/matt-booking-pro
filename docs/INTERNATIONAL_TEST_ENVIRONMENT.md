# Izolowane testy International Edition (PR #48)

## Stan środowiska

- Organizacja wybrana przez użytkownika: **MATT TRANSPORT**.
- Osobny projekt Supabase: `matt-booking-pro-test-pr48`, ref `ozeqdorryajfioxpufzb`, Frankfurt. Wycena utworzenia: **0 USD/miesiąc**. Nie zmieniono planu na Pro.
- Projekt produkcyjny `bgmdyqulytluactkwnbn` nie jest bazą testową. Nie kopiowano danych klientów.
- Odtworzono schemat z repozytorium, dodano dwie brakujące tabele push i założono wyłącznie fikcyjne konta oraz trzy rezerwacje oznaczone `E2E-TEST-*`. Publiczny katalog lotnisk i cen zsynchronizowano z aktywnym katalogiem produkcyjnym; nie kopiowano rezerwacji, pracowników ani danych klientów.
- W obu projektach Vercel skonfigurowano siedem zmiennych tylko dla Preview gałęzi `feature/international-booking-languages`: publiczny URL/anon testowego Supabase, `MATT_TEST_MODE=1`, ref testowego projektu i adresy podglądów Booking/Panel/App. Nie zmieniono zmiennych Production.

## Zabezpieczenia kodu

- Test mode odmawia pracy na Production, a klient administracyjny sprawdza host izolowanej bazy przed połączeniem.
- Preview odrzuca klucze Stripe live, także gdy zapomniano ustawić test mode.
- W test mode e-mail, push klienta/admina/kierowcy oraz synchronizacja Calendar są pomijane przed jakimkolwiek wywołaniem dostawcy. Wynik nie udaje wysłania wiadomości.
- Interfejs pokazuje wyraźny komunikat testowy PL/EN/DE/CS. Linki testowych wiadomości i płatności prowadzą do Preview.
- Migracja `restrict_booking_access` usuwa stare reguły odczytu wszystkich rezerwacji przez dowolne zalogowane konto. Firma widzi własne rezerwacje, kierowca przypisane kursy, pracownik MATT odpowiedni zakres operacyjny. Prywatne funkcje uprawnień sprawdzają wyłącznie tożsamość wywołującego i mają ustalony search_path; nie są publicznymi endpointami RPC.
- Nowe migracje zastosowano dotychczas **wyłącznie do projektu testowego**. Metadane aktualnych polityk produkcyjnych porównano wyłącznie do odczytu i odpowiadają regułom zastępowanym przez migrację. Przed jej zastosowaniem trzeba wykonać cały scenariusz aplikacji i dopiero wtedy przeprowadzić kontrolowane wydanie.

## Rzeczywiste testy Auth / RLS

`tests/international-rls.cjs` loguje fikcyjne konta przez rzeczywisty Supabase Auth, a następnie odpytuje REST używając zwykłego klucza anon i JWT użytkownika. Test nie używa service_role. Sprawdza:

1. Brak odczytu rezerwacji i bezpośredniego INSERT przez anon.
2. Rozdzielenie danych dwóch firm, również przy fałszywej wartości admin w edytowalnym user_metadata.
3. Brak bezpośredniej edycji rezerwacji przez konto firmy.
4. Widoczność przypisanego kursu kierowcy.
5. Odczyt i edycję przez konto pracownika MATT.
6. Takie samo ograniczenie historii rezerwacji.

Pliki z hasłami testowymi i kluczami nie są wersjonowane. Skrypt na stałe blokuje uruchomienie na produkcyjnym ref.

```sh
MATT_TEST_CONFIG_FILE=/bezpieczna/sciezka/config.json \
MATT_E2E_USERS_FILE=/bezpieczna/sciezka/users.json \
NODE_USE_ENV_PROXY=1 npm run test:international:rls
```

## Prywatne ustawienia — status wieczorem 18.10.2026

Publiczny klucz anon nie zastępuje klucza serwera. Integracja Supabase udostępnia publiczne klucze; nie udostępnia service_role nowego projektu ani kluczy Stripe.

W obu projektach Vercel (`matt-booking-pro`, `matt-booking-pro1`) potwierdzono obecność Secret `SUPABASE_SERVICE_ROLE_KEY` i `STRIPE_SECRET_KEY` w **Preview dla gałęzi `feature/international-booking-languages`**. Wartości nie odczytywano; API katalogu lotnisk działa w obu projektach. Osobny testowy webhook i autentyczna płatność pozostają do skonfigurowania i sprawdzenia. Docelowe ustawienia:

| Nazwa | Źródło |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / backend key **projektu testowego** `ozeqdorryajfioxpufzb` |
| `STRIPE_SECRET_KEY` | klucz `sk_test_...` osobnego sandboxa lub trybu testowego Stripe; nigdy `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` testowego endpointu webhooka Stripe dla tego środowiska |

Nie wklejać tych wartości do rozmowy ani repozytorium. Wprowadzić je bezpośrednio w ustawieniach Vercel. Przy nowym kluczu Supabase typu `sb_secret_...` zmienna zachowuje nazwę `SUPABASE_SERVICE_ROLE_KEY`; SDK traktuje ją jako klucz backendowy.

Po konfiguracji: przebudować oba Preview, zweryfikować katalog lotnisk, zapis B2C/B2B/Wedding/Transport pozostały, portal, ponowienia i oba odcinki, Checkout test, płatność testową, autentyczny webhook oraz idempotencję. Webhook musi mieć poprawny dostęp przez Deployment Protection; samo utworzenie sesji Checkout nie dowodzi obsługi płatności.

Wysyłka powiadomień jest celowo wyłączona w tym środowisku. Rzeczywiste dostarczanie wymaga oddzielnego kontrolowanego testu z odbiorcami testowymi; obecny wynik testów nie potwierdza deliverability.

## Wydanie

PR pozostaje roboczy do zaliczenia pełnego przepływu z usługami. Zielony build, poprawny Auth/RLS i testy lokalne nie zastępują płatności Stripe test z webhookiem ani smoke testu produkcji. Produkcji nie opublikowano.

## Regresje webhooka Stripe

`npm run test:payments:webhook` uruchamia 16 testów z prawdziwymi podpisami generowanymi przez SDK Stripe i lokalną atrapą PostgREST. Nie łączy się z dostawcami ani nie używa rzeczywistych kluczy. Testy obejmują duplikaty i równoczesne zdarzenia, błędy zapisu i retry, odzyskanie przejęcia po przerwanym procesie, walutę PLN, rozdzielenie test/live oraz spóźnione sukcesy/błędy po rozliczeniu lub zwrocie.

Przed wdrożeniem nowego webhooka zastosować `supabase/migrations/20261018184000_stripe_webhook_claims.sql`. Dodaje wyłącznie `processing_started_at` w dzienniku zdarzeń. W bazie testowej już zastosowano i zweryfikowano. Proces ma limit 300 s, a ponowne przejęcie przerwanego zadania jest możliwe po 10 minutach; aktywny duplikat otrzymuje 503, aby Stripe ponowił dostarczenie. To nie zastępuje testu autentycznego dostarczenia przez Stripe ani testów awarii dostawców wiadomości.


### Dalsza kontrola płatności 18.10 wieczorem

Webhook: 17/17 podpisanych testów lokalnych. Dodatkowo `tests/stripe-payment-transaction.sql` przeszedł w izolowanym PostgreSQL; wszystkie zapisy danych wycofano. Migracje `20261018184000_stripe_webhook_claims.sql` i `20261018184521_stripe_payment_audit_transaction.sql` są zastosowane wyłącznie w TEST i muszą poprzedzać nowe wdrożenie webhooka na produkcji. Druga funkcja jest `SECURITY INVOKER`, bez EXECUTE dla PUBLIC/anon/authenticated, z EXECUTE dla service_role.

Dodano outbox dla klienckiego Checkout, opisany poniżej. Nie obejmuje wszystkich innych typów powiadomień; rzeczywiste dostarczenie wymaga testów dostawców. Obie kompilacje Vercel `c8b6e86` przeszły; zmiana transakcji wymaga kolejnych buildów. Produkcja bez zmian.


### Testy API i zgodności ze schematem

`npm run test:bookings:api` sprawdza rzeczywiste handlery B2C/B2B/Wedding/General z lokalnymi atrapami bazy, tras i wysyłki. Eksport 16 payloadów: ustawić `MATT_BOOKING_CONTRACT_FILE` na ścieżkę poza repo i uruchomić ten test. `node tests/booking-contract-sql.cjs <ścieżka>` generuje rollback-only SQL do wykonania WYŁĄCZNIE w projekcie `ozeqdorryajfioxpufzb`. Sprawdzono rzeczywiste constraints, customer_locale, return_date, kwoty i sloty weselne. Nie jest to E2E HTTP Preview.

Rozszerzono `test:international:rls` o odrzucenie RPC `settle_customer_stripe_payment` przez klientów REST anon/company/driver/staff. Żaden test nie wymaga wyłączania RLS ani przyznawania praw klientom.


### Kolejka potwierdzeń Checkout

Przed nowym webhookiem wymagane są migracje `20261018202019_payment_notification_outbox.sql` i `20261018202900_payment_outbox_rollout_guard.sql`. Są zastosowane tylko w TEST. Nowy RPC `settle_customer_stripe_payment_with_outbox` włącza kolejkowanie w obrębie transakcji; stary RPC i stare bezpośrednie zapisy nie tworzą drugiej wiadomości podczas wdrożenia etapami.

`npm run test:payments:outbox`: 18 testów bez kontaktu z dostawcami. `test:payments:webhook`: 18 testów. `tests/stripe-payment-transaction.sql`: rzeczywisty rollback-only test kolejki, płatności, uprawnień, blokad i odbiorcy firmowego. `test:international:rls` sprawdza także odrzucenie dostępu REST do kolejki/nowego RPC.

Worker wykonuje maksymalnie 3 zadania na wywołanie, po webhooku i przy istniejącym cron Operations+ co 15 minut. W TEST worker celowo niczego nie przejmuje i nie wysyła. `sent` oznacza przyjęcie przez API dostawcy, nie potwierdzenie doręczenia do skrzynki. `needs_attention` wymaga kontroli dostarczenia i konfiguracji przed ręcznym ponowieniem; nie wolno automatycznie kasować tego stanu ani nadawać nowego klucza po niepewnym dostarczeniu. Push nie zapewnia exactly-once. Pełne API dostawców i powiadomienia inne niż kliencki Checkout pozostają do weryfikacji.

Auth/REST/RLS po rozszerzeniu: 9/9 PASS. Konwersja plain text zachowuje małe litery i URL portalu; sprawdzona w testach outboxa. Wyniki bieżących kompilacji Preview są aktualizowane w PR #48.


### Bezpieczny test rzeczywistego Resend

`tests/controlled-resend-smoke.cjs` jest testem integracyjnym opt-in, poza procesem Preview. Wymaga lokalnie skonfigurowanego RESEND_API_KEY, `MATT_ALLOW_RESEND_TEST_SEND=1` oraz krótkiej unikalnej etykiety `MATT_RESEND_TEST_RUN`. Opcjonalny `MATT_RESEND_TEST_RESULT_FILE` powinien wskazywać ścieżkę poza repozytorium. Skrypt wysyła wyłącznie do adresów `delivered+etykieta@resend.dev`, nigdy do danych klientów, i nie korzysta z bazy ani Stripe. Powtórzenie próby z nową treścią wymaga nowej etykiety, aby nie naruszyć niezmienności klucza Resend.

Próba `pr48-9769c5f-20261018`: 8/8 przyjęte przez API i 8/8 symulowane delivered potwierdzone odczytem Resend, prawidłowy język i link, jeden replay z tym samym ID. Nie dowodzi to doręczenia do rzeczywistych skrzynek ani działania Preview HTTP. Dokumentacja adresów testowych: https://resend.com/docs/dashboard/emails/send-test-emails .
