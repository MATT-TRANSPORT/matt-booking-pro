-- MATT BOOKING PRO v2.4 — Wedding + Stability + B2B Commercial

create table if not exists public.wedding_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text unique,
  customer_name text not null,
  start_date date not null,
  start_time time not null,
  restaurant_name text not null,
  restaurant_address text not null,
  vehicles_count integer not null default 1,
  phone text not null,
  email text not null,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists wedding_booking_seq start 1;

create or replace function public.set_wedding_booking_number()
returns trigger language plpgsql as $$
begin
  if new.booking_number is null then
    new.booking_number :=
      'WE-' || to_char(current_date,'YYYYMMDD') || '-' ||
      lpad(nextval('wedding_booking_seq')::text, 4, '0');
  end if;
  return new;
end $$;

drop trigger if exists trg_wedding_booking_number on public.wedding_bookings;
create trigger trg_wedding_booking_number
before insert on public.wedding_bookings
for each row execute function public.set_wedding_booking_number();

alter table public.wedding_bookings enable row level security;

-- B2B payments / terms
alter table public.companies
  add column if not exists default_payment_method text not null default 'company_transfer',
  add column if not exists free_pickup_km integer not null default 40,
  add column if not exists use_custom_pricing boolean not null default false,
  add column if not exists internal_notes text;

alter table public.bookings
  add column if not exists payment_method text default 'company_transfer',
  add column if not exists payment_link text;

create table if not exists public.company_airport_prices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  airport_key text not null,
  car_price numeric(12,2),
  bus_price numeric(12,2),
  created_at timestamptz not null default now(),
  unique(company_id, airport_key)
);

alter table public.company_airport_prices enable row level security;

drop policy if exists company_airport_prices_read_member on public.company_airport_prices;
create policy company_airport_prices_read_member
on public.company_airport_prices for select to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id=company_airport_prices.company_id
      and cu.user_id=auth.uid() and cu.active=true
  )
);
