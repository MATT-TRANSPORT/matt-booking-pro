# International Edition — bramka wydania / stan 23.10.2026

> Dokument operacyjny dla MATT Booking PRO, PR #48. Nie zawiera sekretów.
> To **nie** jest zgoda na wdrożenie produkcyjne.

## Zweryfikowane w tym przeglądzie

- Najnowszy kod po korekcie mobilnej historii: `7f4cf05ca9536206f20b1b2e61c14958bd1b4850` na `feature/international-booking-languages`.
- GitHub Actions `39920822045`: 236/236 testów PASS i `tsc --noEmit` PASS. Trzy nowe testy sprawdzają **statyczny kontrakt CSS**, nie renderowanie na urządzeniu.
- Booking Preview dla tego SHA: `READY`; Panel Preview: odczytać wynik końcowy przed release.
- Wcześniejsze testy: 16/16 rzeczywistych zapisów HTTP (4 typy × 4 języki); Stripe TEST 8/8 checkout `paid`, powiązane rezerwacje i webhooki zaksięgowane; zalogowane B2B: szablon, seria dwóch rezerwacji, edycja i dokumenty/rozliczenie PDF przetestowane na izolowanym TEST.
- Produkcyjna migracja `20261022184541_international_release_access_payments_and_read_receipts` istnieje, schemat potwierdzony. **Nie stosować jej ponownie.**
- Pominięcie fizycznych testów Safari/iOS oraz push zaakceptowane przez użytkownika: oba statusy pozostają `NIEZWERYFIKOWANE`, nie `PASS`.
- Mobilna historia zakończonych i anulowanych: dodatkowe reguły CSS na <800 i <520 px i test kontraktu. **Fizyczny widok 320–430 px nadal do oceny wizualnej**.

## Dwie niezależne konfiguracje Vercel — krytyczne

**Projekt matt-booking-pro** (`prj_D1rfVbFlsvcIlEmhRHnaDdgTmnKA`):
- **Obecny właściciel obu domen produkcyjnych**: `booking.matt-transport.pl` oraz `panel.matt-transport.pl`.
- Posiada produkcyjne zmienne Supabase, Stripe, Resend, Maps i pozostałych integracji. Wartości chronione, nie kopiować / nie próbować odczytu.
  
**Projekt matt-booking-pro1** (`prj_YhIx6jhJiG2WVJWMxNG5IsYrLRaN`):
- Domena: tylko `matt-booking-pro1.vercel.app`; **nie obsługuje obecnie** `panel.matt-transport.pl`.
- Ma 16 produkcyjnych zmiennych połączenia z Supabase oraz trzy adresy publiczne URL.
- Nie ma produkcyjnych zmiennych dla Stripe, Resend, Google Maps, AirLabs, Google Calendar, VAPID/push ani sekretów cron. Zmienne Preview z gałęzi testowej NIE są konfiguracją Production.
- Przekazanie tych sekretów musi odbyć się przez autoryzowane ustawienia Vercel/łączenie dostawcy; nie kopiować ze środowiska Preview, nie ujawniać w repo ani czacie.

### Wybrany wariant produkcyjny: A — bez migracji domen i sekretów (23.10)

**Decyzja:** oba adresy `booking.matt-transport.pl` i `panel.matt-transport.pl` pozostają w projekcie **matt-booking-pro**. Pierwszy projekt posiada nazwy wszystkich wymaganych produkcyjnych zmiennych integracyjnych (Supabase, Stripe, Resend, Maps, AirLabs, Calendar, VAPID, cron); nie pobierano ani nie kopiowano ich wartości.

Drugi projekt `matt-booking-pro1` pozostaje pomocniczy, bez domen klientów. Nie konfigurujemy tam ponownie Stripe/Resend ani nie przenosimy domen — to zwiększyłoby ryzyko i nakład pracy bez korzyści dla tego wydania. **Uwaga:** oba projekty są połączone z tym samym GitHub `main`, więc merge może wyzwolić build produkcyjny również drugiego projektu, nawet jeśli nie ma on firmowej domeny. Przed merge trzeba ocenić ten efekt i nie dopuścić do równoległego uruchomienia webhooków/cronów.

`lib/bookingOrigin.ts` używa bezpiecznych domyślnych produkcyjnych adresów booking/panel, gdy `NEXT_PUBLIC_BOOKING_URL` i `NEXT_PUBLIC_PANEL_URL` nie są ustawione; ich brak jako osobnych nazw w pierwszym projekcie nie blokuje release. Kontrole wykonać przy odłączonej ścieżce TEST.

**Nie uruchamiać równolegle cron/webhooków z obu projektów bez jednego określonego właściciela** — ryzyko podwójnych powiadomień, ponowień i rozliczeń.

## Weryfikacje niezbędne do GO

- [x] Wybrano wariant A: obie domeny zostają na pierwszym projekcie; nie zmieniać przypisań.
- [x] Sprawdzono nazwy/targety zmiennych Production głównego projektu, bez odszyfrowywania sekretów.
- [x] Projekt Supabase Production ACTIVE_HEALTHY; migracja International Edition potwierdzona wcześniej; nie ponawiać.
- [ ] Końcowy podgląd historii: zakończone/anulowane z rekordami, 320/375/430/768/1366 px; brak poziomego przewijania, poprawne przyciski `OTWÓRZ` i statusy. Brak realnego podglądu mobile traktować jako zaakceptowane ryzyko, nie PASS.
- [ ] `NOWA!`: odczyt trwały per operator, po otwarciu znika z góry i pozostaje w planie; zachowanie po przeglądarkowym Wstecz i odświeżeniu. Wcześniejsze E2E TEST PASS; krótki smoke po zmianach.
- [x] Booking/Panel Preview dla `1e3c075`: SUCCESS, GitHub Actions `39921155643`: SUCCESS, 236/236 PASS + TypeScript. Po dalszych commitach sprawdzić SHA ponownie.
- [ ] Jeden aktywny właściciel webhooka Stripe, cronów, wysyłki wiadomości i powiadomień; odbiorcy i domeny produkcyjne zgodne z planem.
- [ ] Backup produkcji i uzgodnione okno wydania; plan cofnięcia wdrożenia kodu bez cofania struktury bazy w ciemno.
- [ ] Dopiero po odrębnym zatwierdzeniu: merge PR, etapowe wdrożenie i szybki smoke bez prawdziwego obciążania klientów. Nie wykonywać automatycznych SMS/WhatsApp.

## Krytyczna bramka: kopia bezpieczeństwa danych rzeczywistych (23.10)

**Stan zweryfikowany**: produkcyjny projekt Supabase `bgmdyqulytluactkwnbn` należy do organizacji na planie **Free**. Według [aktualnej dokumentacji Supabase](https://supabase.com/docs/guides/platform/backups) Free **nie zawiera codziennych automatycznych kopii**. Z tego powodu na razie **NO-GO** dla merge/deploy, mimo zielonych testów.

- Odczyt kontrolny bazy (tylko SELECT, bez zmian): **115** rezerwacji ogółem, **21** aktywnych (w tym **3** pending), 64 zakończone, 30 anulowane. Nie przenosić tego zrzutu do repo jako pełnego backupu: same liczby NIE są kopią danych.
- [ ] Uwierzytelnić możliwość eksportu całej produkcyjnej bazy przez prywatny proces `supabase db dump` lub `pg_dump` przy użyciu danych połączenia w bezpiecznym terminalu. Nie udostępniać hasła, URL z hasłem, pliku SQL ani danych klientów w repo lub czacie.
- [ ] Wykonać kopię schematu i danych do zaszyfrowanego, odseparowanego miejsca. Obiekty Supabase Storage wymagają **osobnego** backupu: backup Postgresa obejmuje ich metadane, nie samą zawartość plików.
- [ ] Potwierdzić, że kopię da się odtworzyć w bezpiecznym, odizolowanym środowisku, oraz zanotować czas i lokalizację kopii.
- [ ] Po publikacji porównać integralność rezerwacji: brak usunięć lub niezamierzonych zmian statusów, terminów i płatności; przybywanie nowych realnych rezerwacji w międzyczasie jest normalne.
- Dopóki powyższa bramka nie jest potwierdzona, **nie scalać PR #48, nie uruchamiać produkcyjnego deploy, nie zmieniać przypisań domen i nie wywoływać endpointów modyfikujących produkcyjne rezerwacje**.

### Istniejące automatyzacje i kontrola zmian

Aktywne zadania pg_cron w bazie produkcyjnej (odczyt nazw i harmonogramów, bez sekretów):
- `matt-customer-notifications-15m` — `*/15 * * * *`
- `matt-flight-monitor-v2-7` — `*/10 * * * *`

Nie zmieniać ich teraz i nie dublować wywołań nowymi cronami z drugiego projektu. Po releasie zweryfikować autoryzację endpointów i brak powtórnych wysyłek.

## Bezpieczne warunki testowe

Testowe rezerwacje, dokumenty i kwoty nie mogą trafić do produkcji. Fizyczny push i Safari/iOS niezaliczone, ale formalnie pominięte. Nie powtarzać zakończonych Stripe TEST 8/8. Nie nadpisywać/usuwać konfiguracji pierwszego projektu.
