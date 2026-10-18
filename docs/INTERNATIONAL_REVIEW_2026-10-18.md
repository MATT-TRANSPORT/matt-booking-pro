# MATT Booking PRO International Edition — raport 18.10.2026

**Status: środowisko testowe przygotowane, pełne wydanie produkcyjne nadal zablokowane.** Kontynuowany jest [PR #48](https://github.com/MATT-TRANSPORT/matt-booking-pro/pull/48) i gałąź `feature/international-booking-languages`. Nie tworzono nowego PR ani implementacji od zera. Zweryfikowany kod aplikacji: `8f23c856657f9149e7c7700d149981f0e71e367d`.

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

## Zweryfikowane wyniki

| Kontrola | Wynik | Zakres i granice |
|---|---|---|
| TypeScript | PASS | aktualny kod |
| Lokalny Next.js build | PASS | konfiguracja lokalnego serwera testowego, bez danych produkcyjnych |
| Testy logiki | 68/68 PASS | języki, linki, wiadomości, walidacja, Checkout i zabezpieczenia test mode |
| Playwright Chromium | 104/104 PASS, 36,6 s | PL/EN/DE/CS × desktop 1440×1000 i mobile 390×844; lokalne atrapy API oraz protokołu Supabase |
| Rzeczywisty Supabase Auth/REST/RLS | 7/7 PASS | dwie firmy, driver, staff, anon; rozdzielenie danych, historia i blokady zapisu; wyłącznie izolowany projekt testowy |
| Vercel Booking | BUILD PASS | kod `8f23c85` |
| Vercel Panel | BUILD PASS | kod `8f23c85` |
| Odczyt UI podglądu Booking | 2/2 PASS | DE, desktop/mobile: HTTP 200, język, komunikat testowy, brak przelewu, brak błędów JS i przekroczenia szerokości; bez wysyłania formularza |
| API cennika podglądu | BLOCKED / HTTP 500 | jednoznaczny błąd `Brak SUPABASE_SERVICE_ROLE_KEY` |

Odczyt podglądu wykonano przez uwierzytelniony token Vercel ograniczony do jego origin. Lokalny zarządzany proxy ma CA nieobecne w Chromium; dla tego odczytu UI jawnie pominięto sprawdzanie łańcucha TLS. Nie jest to test certyfikatu domeny. Skrypt blokuje żądania zapisujące i zewnętrzne domeny.

Nie utworzono prawdziwych rezerwacji, nie pobrano płatności i nie wysłano wiadomości do klientów. Testowe rekordy i zmiana notatki przez staff istnieją tylko w nowym projekcie testowym. Lokalne testy Checkout używają atrap Stripe — nie dowodzą autentycznej płatności ani webhooka.

## Podglądy i kompilacje

- [Booking — podgląd testowy](https://matt-booking-pro-git-feature-internationa-67b25c-matt-transport.vercel.app)
- [Panel — podgląd testowy](https://matt-booking-pro1-git-feature-internation-bf0d83-matt-transport.vercel.app)
- [Booking — zweryfikowana kompilacja 8f23c85](https://vercel.com/matt-transport/matt-booking-pro/6NzTrJ2moGbTDGhF1Zv5auzLHM5v)
- [Panel — zweryfikowana kompilacja 8f23c85](https://vercel.com/matt-transport/matt-booking-pro1/DKSAoNWwXaWHZkCaxMwFsNQHqrPA)
- [Aktualne statusy PR](https://github.com/MATT-TRANSPORT/matt-booking-pro/pull/48/checks)

Publiczne zmienne nowej bazy i test mode są ustawione w Preview obu projektów, tylko dla tej gałęzi. Nie zmieniono konfiguracji Production. Poprzedni błąd middleware został usunięty; pełny przepływ zatrzymuje teraz brak prywatnego klucza backendu.

## Co blokuje produkcję

1. Prywatny klucz **nowej bazy testowej** `SUPABASE_SERVICE_ROLE_KEY` w Preview obu projektów. Integracja Supabase udostępnia klucze publiczne, nie backendowy sekret.
2. Klucz Stripe test oraz sekret testowego webhooka, poprawny dostęp webhooka przez Deployment Protection i pełna płatność testowa z aktualizacją statusu oraz idempotencją.
3. Pełny zapis B2C/B2B/Wedding/Transport pozostały z podglądu, oba odcinki, portal, powtórzenia i walidacja przez rzeczywistą bazę. Obecne testy Auth/RLS i UI nie zastępują tego scenariusza.
4. Kontrolowane dostarczanie e-mail/SMS/push oraz Safari/iOS. Test mode celowo nie wysyła wiadomości.
5. Zastosowanie sprawdzonych migracji, etapowany build produkcyjny, smoke test i kontrola logów — dopiero po zamknięciu powyższych punktów.

[Dokładna konfiguracja testów i brakujących kluczy](INTERNATIONAL_TEST_ENVIRONMENT.md). Kluczy nie wolno wklejać do rozmowy ani repozytorium. Wprowadzić je bezpośrednio w Vercel jako Secret dla właściwej gałęzi Preview.

Nie wykonano merge ani publikacji International Edition na produkcji.
