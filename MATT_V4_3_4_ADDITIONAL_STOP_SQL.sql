-- MATT Booking PRO v4.3.4 — ADDITIONAL STOP
-- Jeden dodatkowy adres / przystanek, osobno dla przejazdu głównego i powrotnego.
-- Opłata: B2C 20 zł / kierunek, B2B 20 zł netto / kierunek.
-- Kilometry: tylko faktyczny objazd względem normalnej trasy.

alter table public.bookings
  add column if not exists additional_stop_address text,
  add column if not exists additional_stop_primary boolean not null default false,
  add column if not exists additional_stop_return boolean not null default false,
  add column if not exists additional_stop_primary_extra_km numeric(10,1) not null default 0,
  add column if not exists additional_stop_return_extra_km numeric(10,1) not null default 0,
  add column if not exists additional_stop_fee numeric(12,2) not null default 0,
  add column if not exists additional_stop_extra_price numeric(12,2) not null default 0;

comment on column public.bookings.additional_stop_address is 'Opcjonalny dodatkowy adres / przystanek.';
comment on column public.bookings.additional_stop_primary is 'Czy dodatkowy przystanek dotyczy głównego przejazdu.';
comment on column public.bookings.additional_stop_return is 'Czy dodatkowy przystanek dotyczy przejazdu powrotnego.';
comment on column public.bookings.additional_stop_primary_extra_km is 'Dodatkowe km objazdu na głównym przejeździe.';
comment on column public.bookings.additional_stop_return_extra_km is 'Dodatkowe km objazdu na powrocie.';
comment on column public.bookings.additional_stop_fee is 'Łączna opłata za przystanki; B2B netto, B2C wg cennika B2C.';
comment on column public.bookings.additional_stop_extra_price is 'Łączna dopłata za faktyczny objazd; B2B netto, B2C wg cennika B2C.';
