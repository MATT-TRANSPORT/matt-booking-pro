-- MATT Booking PRO v4.5.0 — Unified Operations + Point-to-Point

alter table public.bookings
  add column if not exists booking_category text not null default 'airport',
  add column if not exists destination_address text,
  add column if not exists price_quote_required boolean not null default false;

-- Transport pozostały obsługuje także własny autokar SCANIA do 30 pasażerów.
alter table public.bookings drop constraint if exists bookings_passengers_check;
alter table public.bookings
  add constraint bookings_passengers_check check (passengers >= 1 and passengers <= 30);

create index if not exists bookings_category_schedule_idx
  on public.bookings (booking_category, travel_date, travel_time);

comment on column public.bookings.booking_category is
  'Rodzaj rezerwacji: airport (transfer lotniskowy) lub point_to_point (transport A→B).';

comment on column public.bookings.destination_address is
  'Adres docelowy dla transportu A→B. Dla starszych transferów lotniskowych pozostaje NULL.';

comment on column public.bookings.price_quote_required is
  'TRUE oznacza zapytanie wymagające indywidualnej wyceny przez MATT przed potwierdzeniem.';
