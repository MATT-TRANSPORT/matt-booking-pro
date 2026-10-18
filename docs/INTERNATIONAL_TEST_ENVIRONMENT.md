# Izolowane testy International Edition (PR #48)

## Stan środowiska

- Organizacja wybrana przez użytkownika: **MATT TRANSPORT**.
- Osobny projekt Supabase: `matt-booking-pro-test-pr48`, ref `ozeqdorryajfioxpufzb`, Frankfurt. Wycena utworzenia: **0 USD/miesiąc**. Nie zmieniono planu na Pro.
- Projekt produkcyjny `bgmdyqulytluactkwnbn` nie jest bazą testową. Nie kopiowano danych klientów.
- Odtworzono schemat z repozytorium, dodano dwie brakujące tabele push i założono wyłącznie fikcyjne konta oraz trzy rezerwacje oznaczone `E2E-TEST-*`.
- W obu projektach Vercel skonfigurowano siedem zmiennych tylko dla Preview gałęzi `feature/international-booking-languages`: publiczny URL/anon testowego Supabase, `MATT_TEST_MODE=1`, ref testowego projektu i adresy podglądów Booking/Panel/App. Nie zmieniono zmiennych Production.

## Zabezpieczenia kodu

- Test mode odmawia pracy na Production, a klient administracyjny sprawdza host izolowanej bazy przed połączeniem.
- Preview odrzuca klucze Stripe live, także gdy zapomniano ustawić test mode.
- W test mode e-mail, push klienta/admina/kierowcy oraz synchronizacja Calendar są pomijane przed jakimkolwiek wywołaniem dostawcy. Wynik nie udaje wysłania wiadomości.
- Interfejs pokazuje wyraźny komunikat testowy PL/EN/DE/CS. Linki testowych wiadomości i płatności prowadzą do Preview.
- Migracja `restrict_booking_access` usuwa stare reguły odczytu wszystkich rezerwacji przez dowolne zalogowane konto. Firma widzi własne rezerwacje, kierowca przypisane kursy, pracownik MATT odpowiedni zakres operacyjny. Prywatne funkcje uprawnień sprawdzają wyłącznie tożsamość wywołującego i mają ustalony search_path; nie są publicznymi endpointami RPC.
- Nowe migracje zastosowano dotychczas **wyłącznie do projektu testowego**. Przed migracją produkcji trzeba porównać aktualne polityki produkcyjne, wykonać cały scenariusz aplikacji i dopiero wtedy przeprowadzić kontrolowane wydanie.

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

## Brakujące prywatne ustawienia

Publiczny klucz anon nie zastępuje klucza serwera. Integracja Supabase udostępnia publiczne klucze; nie udostępnia service_role nowego projektu ani kluczy Stripe.

W obu projektach Vercel (`matt-booking-pro`, `matt-booking-pro1`), w **Preview tylko dla gałęzi `feature/international-booking-languages`**, trzeba ustawić jako Secret:

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
