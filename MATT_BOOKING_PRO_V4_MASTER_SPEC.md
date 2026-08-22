# MATT Booking PRO — MASTER SYSTEM SPECIFICATION v4.0.0

**Status:** Production Final  
**Checkpoint bazowy:** v3.6.0 Driver PRO  
**Wersja finalna rdzenia:** v4.0.0

## Moduły produkcyjne

MATT Booking PRO obsługuje B2C, B2B, transport weselny, panel administratora/dyspozytora oraz PWA kierowcy. System korzysta z Next.js/Vercel, Supabase, Google Maps/Places, Resend, Stripe, Google Calendar, AirLabs i Web Push.

## B2C

- rezerwacja transferu na/z lotniska i roundtrip,
- samochód osobowy / bus,
- automatyczna kalkulacja trasy i ceny,
- portal rezerwacji z indywidualnego tokenu,
- edycja i anulowanie zgodnie z regułami,
- Stripe Checkout dla rezerwacji z płatnością online,
- e-mail i Web Push,
- przypomnienie ok. 2h przed aktualną nogą kursu,
- Flight Monitor dla odbiorów z lotniska,
- automatyczna prośba o opinię po zakończeniu kursu.

## B2B PRO

- konta i role firmowe,
- pracownicy,
- zapisane adresy firmy,
- indywidualne wersjonowane warunki handlowe,
- cenniki standardowe/indywidualne,
- NETTO + VAT 8% + BRUTTO,
- snapshot ceny w rezerwacji,
- przelew firmowy / płatność pracownika,
- edycja, anulowanie i powtarzanie rezerwacji,
- dokumenty i faktury przypisane do rezerwacji,
- miesięczne rozliczenia,
- Dashboard skupiony na nadchodzących transportach.

## Dispatcher PRO

- Dzisiaj / Jutro / 7 dni / Następne 3 h / Termin minął,
- „Wymaga uwagi”,
- konflikty kierowców i pojazdów,
- roundtrip jako osobne nogi,
- szybki workflow statusów,
- podgląd lotów i alertów,
- obsługa mobilna.

## Driver PRO

- „Mój następny kurs”,
- Dzisiaj / Jutro / Kolejne / Wszystkie,
- workflow: Wyruszyłem -> Na miejscu -> Pasażer odebrany -> Zakończ,
- backend blokuje pomijanie etapów,
- nawigacja i telefon jednym kliknięciem,
- Flight Monitor dla aktualnej nogi,
- poprawny, osobny przebieg WYJAZDU i POWROTU,
- Web Push przy przydziale, zmianie, anulowaniu i ok. 60 min przed kursem.

## Post-trip Review Automation

- dotyczy B2C,
- uruchamia się dopiero po globalnym statusie completed,
- completed_at zapisuje się przy finalnym zakończeniu,
- roundtrip: dopiero po zakończeniu powrotu,
- opóźnienie wysyłki: ok. 45 min,
- e-mail + opcjonalny Web Push,
- jeden request na rezerwację,
- ochrona przed równoległym podwójnym wysłaniem,
- historyczne completed sprzed v4.0 nie są automatycznie obejmowane wysyłką.

## Raporty

- podsumowanie w Panel -> Raporty,
- eksport miesięczny CSV zgodny z Excel,
- B2C/B2B, trasa, klient, firma, kierowca, pojazd, statusy, płatności,
- NETTO/VAT/BRUTTO dla B2B,
- numer faktury i źródło rezerwacji,
- anulowane wyłączone z eksportu.

## Flota

- kierowcy i pojazdy zarządzane w panelu,
- przebieg, przegląd, ubezpieczenie,
- Dashboard pokazuje pojazdy wymagające uwagi <=30 dni,
- alert pilny <=7 dni lub po terminie.

## Automatyzacje

- Flight Monitor cron,
- Customer Notifications cron co 15 min,
- przypomnienie B2C ok. 2h,
- przypomnienie kierowcy ok. 60 min,
- post-trip review ok. 45 min,
- deduplikacja Push i review requestów.

## Bezpieczeństwo

- role: admin / dispatcher / accounting / driver / role firmowe,
- service role wyłącznie backend,
- RLS dla danych firmowych i subskrypcji,
- administracyjna mutacja bookings wymaga admin/dispatcher,
- tokenowe portale klienta są ograniczone do konkretnej rezerwacji,
- CSV zabezpieczony przed formula injection,
- webhook Stripe z deduplikacją eventów.

## Zasada dalszego rozwoju

v4.0.0 zamyka budowę rdzenia. Dalsze wersje powinny powstawać na podstawie realnego użytkowania produkcyjnego: v4.0.x jako hotfixy, a kolejne funkcje dopiero po zebraniu danych i potrzeb operacyjnych.
