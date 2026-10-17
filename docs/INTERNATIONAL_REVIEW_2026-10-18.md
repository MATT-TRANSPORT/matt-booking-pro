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
- Dodane powtarzalne testy, konfiguracja Playwright i lockfile zależności.

## Wyniki sprawdzenia

| Kontrola | Wynik | Zakres |
|---|---|---|
| TypeScript `tsc --noEmit` | PASS | aktualny kod aplikacji |
| Next.js build | PASS | Next.js 15.5.28; testowe lokalne ustawienia Supabase, bez kluczy produkcyjnych |
| Testy logiki | 32/32 PASS | języki, powiadomienia, e-maile, wyceny, linki, oba rodzaje Checkout i blokada ponownej zapłaty |
| Testy przeglądarkowe Chromium | 80/80 PASS, 26,2 s | PL/EN/DE/CS × desktop 1440×1000 i mobile 390×844 |
| Kontrola błędów JS i szerokości | PASS | każdy z 80 scenariuszy |
| Mobilne przyciski kontaktowe | PASS | sprawdzenie położenia oraz ręczna kontrola zrzutu DE |
| Supabase — schemat, tylko odczyt | PASS | `bookings.customer_locale` i `wedding_bookings.customer_locale`: text, NOT NULL, DEFAULT 'pl'; CHECK dopuszcza pl/en/de/cs |

Testy przeglądarkowe sprawdzają: transfer lotniskowy w obie strony z 8 pasażerami, busem i przelewem; przełączanie flag; nagłówki i walidację formularzy; wysłanie transportu A→B i Wedding; symulowane anulowanie płatności; zapisany język opłaconej rezerwacji B2B; listę prywatnych przejazdów; ponawianie transportu; działanie bez dostępu do pamięci przeglądarki.

**Granice testów:** wszystkie żądania API przeglądarki były przechwycone przez lokalne atrapy; połączenia poza lokalną aplikacją były blokowane. Testy Checkout używały atrap Stripe oraz bazy. Nie utworzono prawdziwych rezerwacji, nie wysłano wiadomości klientom, nie obciążono kart. To nie jest potwierdzenie działania Stripe w trybie testowym ani pełnego przepływu przez zewnętrzne integracje.

Powtórzenie kontroli:

```sh
npm ci
npm run test:international
npx tsc --noEmit
# Do lokalnego buildu testów używać wyłącznie testowej konfiguracji Supabase.
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=matt-local-test-only npm run build
npx playwright install chromium
npm run test:international:browser
```

W środowisku tej sesji standardowy plik Chromium nie dawał się pobrać. Testy uruchomiono Chromium 143 z zewnętrznego pakietu testowego przez `MATT_CHROMIUM_EXECUTABLE`; pakiet ten nie jest zależnością produkcyjną aplikacji.

## Podglądy i stan wydania

- [Booking — podgląd gałęzi](https://matt-booking-pro-git-feature-internationa-67b25c-matt-transport.vercel.app)
- [Panel — podgląd gałęzi](https://matt-booking-pro1-git-feature-internation-bf0d83-matt-transport.vercel.app)
- [Wyniki wdrożeń i aktualny commit PR](https://github.com/MATT-TRANSPORT/matt-booking-pro/pull/48/checks)

To adresy podglądów istniejącej gałęzi, nie nowe wdrożenie produkcyjne. Aktualny stan obu kompilacji zdalnych jest publikowany przez integrację Vercel w PR. Zielone statusy starego commitu nie potwierdzają nowej wersji.

Bezpośrednia integracja Vercel zwróciła **403 forbidden** dla zespołu `matt-transport`. Próba dostępu CLI wykazała brak zapisanych danych logowania; logowanie nie zostało wykonane. Nie można zweryfikować konfiguracji środowisk, logów ani przeprowadzić kontrolowanego wydania produkcyjnego tą drogą.

## Braki blokujące zakończenie i produkcję

1. Pełny audyt i domknięcie tłumaczeń pozostałych stron firmowych `/firma`, nawigacji, dokumentów i komponentów rozliczeń. Przetłumaczony formularz B2B nie oznacza kompletnego portalu firmowego.
2. Pozostałe ścieżki wiadomości i walidacji, m.in. starsze dwujęzyczne szablony `lib/b2bEmployeeNotifications.ts`, `lib/reviewRatingEmail.ts`, komunikaty API edycji/wycen i statusów lotniczych. Wspólny słownik ma polski fallback; jego obecność nie stanowi dowodu pełnego pokrycia tłumaczeniami.
3. Pełne E2E przez testowy Supabase z kontem firmy, autoryzacją, zapisem, wyceną i webhookiem Stripe test mode. Lokalne atrapy nie weryfikują RLS, sesji, dostawców ani webhooków.
4. Testy rzeczywistego dostarczenia e-mail/SMS/push na kontrolowane konta testowe oraz Safari/iOS i silniki inne niż Chromium.
5. Przywrócenie dostępu Vercel do właściwego zespołu; sprawdzenie obu projektów i ich środowisk; dopiero po zamknięciu całego zakresu wydanie stabilnej wersji, smoke test produkcji i kontrola logów.

Nie wykonano merge ani publikacji na produkcji. Raport opisuje zweryfikowany etap prac i rzeczywiste braki, a nie zakończoną realizację całego zlecenia.
