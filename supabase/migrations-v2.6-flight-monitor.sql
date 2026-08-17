-- MATT Booking PRO v2.6.0 — Flight Monitor
-- Run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.booking_flights (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  leg text not null default 'primary' check (leg in ('primary','return')),
  flight_number text not null,
  travel_date date,
  provider text not null default 'airlabs',

  flight_status text,
  dep_iata text,
  arr_iata text,
  dep_terminal text,
  dep_gate text,
  arr_terminal text,
  arr_gate text,
  arr_baggage text,

  dep_time text,
  dep_estimated text,
  arr_time text,
  arr_estimated text,

  dep_delayed integer,
  arr_delayed integer,

  aircraft_model text,
  aircraft_registration text,

  match_ok boolean not null default true,
  match_message text,

  provider_updated_at timestamptz,
  last_checked_at timestamptz not null default now(),
  raw jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (booking_id, leg)
);

create index if not exists booking_flights_booking_idx
  on public.booking_flights(booking_id);

create index if not exists booking_flights_checked_idx
  on public.booking_flights(last_checked_at desc);

create index if not exists booking_flights_status_idx
  on public.booking_flights(flight_status);

create table if not exists public.booking_flight_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  booking_flight_id uuid references public.booking_flights(id) on delete cascade,
  leg text not null default 'primary',
  flight_number text not null,
  event text not null,
  flight_status text,
  arr_estimated text,
  arr_delayed integer,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists booking_flight_history_booking_idx
  on public.booking_flight_history(booking_id, created_at desc);

alter table public.booking_flights enable row level security;
alter table public.booking_flight_history enable row level security;

-- Dane lotnicze są czytane przez backend z service role.
-- Nie tworzymy publicznych polityk RLS.
