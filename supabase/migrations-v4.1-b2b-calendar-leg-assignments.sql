-- MATT Booking PRO v4.1.0
-- B2B PAYMENTS + COMPANY CALENDAR + LEG ASSIGNMENTS
-- Bezpieczna migracja rozszerzająca. Uruchom po v4.0.0.

alter table public.bookings
  add column if not exists return_driver_id uuid references public.drivers(id) on delete set null,
  add column if not exists return_vehicle_id uuid references public.vehicles(id) on delete set null;

create index if not exists bookings_return_driver_date_idx
  on public.bookings(return_date, return_time, return_driver_id)
  where service_type = 'roundtrip' and status not in ('completed','cancelled');

create index if not exists bookings_return_vehicle_date_idx
  on public.bookings(return_date, return_time, return_vehicle_id)
  where service_type = 'roundtrip' and status not in ('completed','cancelled');

-- Zachowujemy dotychczasowe zachowanie dla już istniejących roundtripów:
-- jeżeli wcześniej jedna obsada obsługiwała obie strony, kopiujemy ją na POWRÓT.
update public.bookings
set return_driver_id = driver_id
where service_type = 'roundtrip'
  and return_driver_id is null
  and driver_id is not null;

update public.bookings
set return_vehicle_id = vehicle_id
where service_type = 'roundtrip'
  and return_vehicle_id is null
  and vehicle_id is not null;

comment on column public.bookings.return_driver_id is
  'v4.1.0: kierowca przypisany wyłącznie do nogi POWRÓT rezerwacji roundtrip.';
comment on column public.bookings.return_vehicle_id is
  'v4.1.0: pojazd przypisany wyłącznie do nogi POWRÓT rezerwacji roundtrip.';

notify pgrst, 'reload schema';
