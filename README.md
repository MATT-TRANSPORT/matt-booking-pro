# MATT Booking PRO 2.0 — starter

## 1. Supabase
SQL Editor → New query → wklej `supabase/schema.sql` → Run.
Następnie Authentication → Users → Add user i utwórz konto `kontakt@matt-transport.pl`.

## 2. Vercel → Settings → Environment Variables
Dodaj:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- GOOGLE_MAPS_API_KEY
- NEXT_PUBLIC_BOOKING_HOST=booking.matt-transport.pl
- NEXT_PUBLIC_PANEL_HOST=panel.matt-transport.pl

## 3. Google Cloud
Włącz Routes API. Klucz trzymaj tylko w Vercel Environment Variables.

## 4. GitHub
Wgraj całą zawartość tego katalogu do repozytorium `matt-booking-pro`. Push uruchomi deployment Vercel.

## 5. Domeny Vercel
Dodaj `booking.matt-transport.pl` i `panel.matt-transport.pl` w Settings → Domains, a następnie ustaw DNS zgodnie z instrukcją Vercel.

## Co działa w starterze
- formularz klienta,
- 3 warianty przejazdu,
- automatyczne liczenie trasy po 0,9 s bez przycisku,
- wycena live,
- zapis do Supabase,
- numer rezerwacji,
- logowanie administratora,
- pierwszy panel rezerwacji,
- startowa baza kierowców i pojazdów.
