# MATT BOOKING PRO 2.0 — wersja wdrożeniowa 1.0

## Co zawiera
- booking.matt-transport.pl — formularz klienta
- panel.matt-transport.pl — panel administratora
- logowanie Supabase
- automatyczne podpowiedzi adresów Google Places
- automatyczne liczenie trasy Google Routes po wybraniu adresu — bez przycisku
- cennik live
- 20 km w cenie + 2,40 zł/km
- samochód / bus
- przejazd w obie strony x2
- faktura +8%
- minimum 48 h
- zapis rezerwacji do Supabase
- numeracja MB-YYYYMMDD-000001
- dashboard
- lista rezerwacji
- dyspozytor
- kierowcy i pojazdy
- przypisywanie kierowcy i pojazdu
- panel mobilny kierowcy
- historia zmian

## KROK 1 — Supabase
Supabase → SQL Editor → New query.
Wklej cały plik `supabase/schema.sql` i kliknij Run.

## KROK 2 — administrator
Supabase → Authentication → Users → Add user.
Utwórz:
`kontakt@matt-transport.pl`
Ustaw własne hasło.

Następnie SQL Editor i wykonaj (po utworzeniu użytkownika):

```sql
insert into public.profiles (id, full_name, role, phone)
select id, 'Mateusz', 'admin', '+48 691 242 691'
from auth.users
where email='kontakt@matt-transport.pl'
on conflict (id) do update set role='admin', full_name='Mateusz';
```

## KROK 3 — GitHub
Wgraj CAŁĄ zawartość katalogu projektu do repozytorium `matt-booking-pro`.
Nie wrzucaj żadnych haseł ani kluczy do repozytorium.

## KROK 4 — Vercel Environment Variables
Vercel → projekt → Settings → Environment Variables.
Dodaj:

`NEXT_PUBLIC_SUPABASE_URL` — Supabase → Project Settings / API
`NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase → Project Settings / API
`GOOGLE_MAPS_API_KEY` — ten sam klucz Google, którego używałeś wcześniej przy działającym Routes API w WordPressie, albo nowy klucz z Google Cloud
`NEXT_PUBLIC_BOOKING_HOST` = `booking.matt-transport.pl`
`NEXT_PUBLIC_PANEL_HOST` = `panel.matt-transport.pl`

`SUPABASE_SERVICE_ROLE_KEY` jest przewidziany w .env.example, ale ta wersja go nie wymaga do działania podstawowych funkcji.

## KROK 5 — Google
W projekcie Google Cloud muszą być włączone:
- Routes API
- Places API (New)

Klucz Google pozostaje wyłącznie w zmiennych środowiskowych Vercel. Nie wpisuj go w kodzie.

## KROK 6 — Domeny
Vercel → Settings → Domains.
Dodaj:
- booking.matt-transport.pl
- panel.matt-transport.pl

Vercel poda rekordy DNS. Ustaw je w uti.pl dokładnie według wartości Vercel.

## KROK 7 — Deploy
Po wgraniu plików na GitHub Vercel uruchomi deployment automatycznie.

Po wdrożeniu:
- `https://booking.matt-transport.pl` → formularz klienta
- `https://panel.matt-transport.pl` → panel; jeśli nie jesteś zalogowany, przejdź do `/login`

## Pierwszy test
1. Otwórz booking.matt-transport.pl.
2. Wpisz adres i wybierz jedną z podpowiedzi Google.
3. Trasa powinna policzyć się automatycznie.
4. Wyślij rezerwację testową >48 h.
5. Zaloguj się do panelu.
6. Sprawdź rezerwację w Dashboard / Rezerwacje.
7. W Dyspozytorze przypisz Mateusza lub Wojciecha i pojazd.
