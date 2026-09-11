-- MATT Booking PRO v4.5.0 — NAVIGATION & BOOKING HUB
-- Pozostały transport A→B w tej samej tabeli bookings.

alter table public.bookings
  add column if not exists destination_address text,
  add column if not exists transport_category text,
  add column if not exists quote_required boolean not null default false,
  add column if not exists quote_status text not null default 'not_required';

alter table public.bookings drop constraint if exists bookings_passengers_check;
alter table public.bookings
  add constraint bookings_passengers_check check (passengers >= 1 and passengers <= 30);

alter table public.bookings drop constraint if exists bookings_quote_status_check;
alter table public.bookings
  add constraint bookings_quote_status_check
  check (quote_status in ('not_required','pending','priced','accepted','rejected'));

create index if not exists bookings_quote_required_idx
  on public.bookings(quote_required, quote_status, travel_date, travel_time);

comment on column public.bookings.destination_address is
  'Adres docelowy dla transportów punkt A → punkt B. Dla transferów lotniskowych pozostaje NULL.';
comment on column public.bookings.transport_category is
  'Kategoria transportu pozostałego: private, event, school_club, employee, other.';
comment on column public.bookings.quote_required is
  'TRUE oznacza zlecenie wymagające indywidualnej wyceny administratora.';
comment on column public.bookings.quote_status is
  'Status indywidualnej wyceny: not_required, pending, priced, accepted, rejected.';
