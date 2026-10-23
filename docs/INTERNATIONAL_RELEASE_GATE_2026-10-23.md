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

### Decyzja architektoniczna przed uruchomieniem

1. **Wariant A (bez przenoszenia domen):** pierwszy projekt nadal obsługuje oba hosty, jak dotychczas. Nie traktować drugiego projektu jako aktywnego Panelu produkcyjnego.
2. **Wariant B (dwa aktywne projekty):** najpierw wyposażyć drugi projekt w potrzebne produkcyjne integracje, przebudować i przetestować pod własnym adresem, następnie zaplanować kontrolowane przeniesienie `panel.matt-transport.pl` z pierwszego projektu. Dopiero po weryfikacji dostępności i autoryzacji wykonywać zmianę domeny.

**Nie uruchamiać równolegle cron/webhooków z obu projektów bez jasno przypisanego właściciela** — ryzyko podwójnych powiadomień, ponowień i operacji rozliczeń.

## Weryfikacje niezbędne do GO

- [ ] Zatwierdzony docelowy wariant hostingu i routing obu domen (A albo B).
- [ ] Sprawdzony zestaw env tylko po nazwach i targetach: `production` (bez odszyfrowywania), łącznie z usługami używanymi przez aktywny projekt.
- [ ] Zweryfikowane połączenie z **produkcyjnym** Supabase (oddzielonym od TEST), blokady dostępu RLS oraz migracja już zastosowana.
- [ ] Końcowy podgląd historii: zakończone/anulowane z rekordami, 320/375/430/768/1366 px; brak poziomego przewijania, poprawne przyciski `OTWÓRZ` i statusy. Brak realnego podglądu mobile traktować jako zaakceptowane ryzyko, nie PASS.
- [ ] `NOWA!`: odczyt trwały per operator, po otwarciu znika z góry i pozostaje w planie; zachowanie po przeglądarkowym Wstecz i odświeżeniu. Wcześniejsze E2E TEST PASS; krótki smoke po zmianach.
- [ ] Booking/Panel Preview dla dokładnego SHA: `READY`, GitHub Actions `SUCCESS`, TypeScript PASS.
- [ ] Jeden aktywny właściciel webhooka Stripe, cronów, wysyłki wiadomości i powiadomień; odbiorcy i domeny produkcyjne zgodne z planem.
- [ ] Backup produkcji i uzgodnione okno wydania; plan cofnięcia wdrożenia kodu bez cofania struktury bazy w ciemno.
- [ ] Dopiero po odrębnym zatwierdzeniu: merge PR, etapowe wdrożenie i szybki smoke bez prawdziwego obciążania klientów. Nie wykonywać automatycznych SMS/WhatsApp.

## Bezpieczne warunki testowe

Testowe rezerwacje, dokumenty i kwoty nie mogą trafić do produkcji. Fizyczny push i Safari/iOS niezaliczone, ale formalnie pominięte. Nie powtarzać zakończonych Stripe TEST 8/8. Nie nadpisywać/usuwać konfiguracji pierwszego projektu.
