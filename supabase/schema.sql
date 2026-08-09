create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text, role text not null default 'driver' check (role in ('admin','dispatcher','driver','accounting')), phone text,
 created_at timestamptz not null default now()
);
create table if not exists public.drivers (
 id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles(id) on delete set null,
 full_name text not null, phone text, status text not null default 'available', created_at timestamptz not null default now()
);
create table if not exists public.vehicles (
 id uuid primary key default gen_random_uuid(), name text not null, registration text not null unique, color text, seats integer not null default 4,
 type text not null default 'car' check (type in ('car','bus','coach')), status text not null default 'available', inspection_date date, insurance_date date, mileage integer,
 created_at timestamptz not null default now()
);
create sequence if not exists public.booking_seq start 1;
create table if not exists public.bookings (
 id uuid primary key default gen_random_uuid(),
 booking_number text not null unique default ('MB-'||to_char(now(),'YYYYMMDD')||'-'||lpad(nextval('public.booking_seq')::text,6,'0')),
 service_type text not null check (service_type in ('to_airport','from_airport','roundtrip')),
 pickup_address text not null, airport_key text not null, airport_label text not null, travel_date date not null, travel_time time not null,
 return_date date, return_time time, passengers integer not null check(passengers between 1 and 8), vehicle_type text not null check(vehicle_type in ('car','bus')),
 distance_km numeric(8,1) not null default 0, customer_name text not null, phone text not null, email text not null, invoice_required boolean not null default false,
 company_name text, company_nip text, company_address text, flight_number text, return_flight_number text,
 base_price numeric(10,2) not null default 0, extra_price numeric(10,2) not null default 0, vat_price numeric(10,2) not null default 0, total_price numeric(10,2) not null default 0,
 status text not null default 'pending' check(status in ('pending','confirmed','assigned','in_progress','picked_up','completed','cancelled')),
 driver_id uuid references public.drivers(id) on delete set null, vehicle_id uuid references public.vehicles(id) on delete set null,
 notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.booking_history (
 id bigint generated always as identity primary key, booking_id uuid not null references public.bookings(id) on delete cascade,
 event text not null, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;alter table public.drivers enable row level security;alter table public.vehicles enable row level security;alter table public.bookings enable row level security;alter table public.booking_history enable row level security;

drop policy if exists public_insert_booking on public.bookings;
create policy public_insert_booking on public.bookings for insert to anon,authenticated with check (true);
drop policy if exists authenticated_read_bookings on public.bookings;
create policy authenticated_read_bookings on public.bookings for select to authenticated using (true);
drop policy if exists authenticated_update_bookings on public.bookings;
create policy authenticated_update_bookings on public.bookings for update to authenticated using (true) with check (true);
drop policy if exists authenticated_read_drivers on public.drivers;
create policy authenticated_read_drivers on public.drivers for select to authenticated using (true);
drop policy if exists authenticated_read_vehicles on public.vehicles;
create policy authenticated_read_vehicles on public.vehicles for select to authenticated using (true);
drop policy if exists authenticated_read_profiles on public.profiles;
create policy authenticated_read_profiles on public.profiles for select to authenticated using (true);
drop policy if exists authenticated_read_history on public.booking_history;
create policy authenticated_read_history on public.booking_history for select to authenticated using (true);
drop policy if exists authenticated_insert_history on public.booking_history;
create policy authenticated_insert_history on public.booking_history for insert to authenticated with check (true);

insert into public.drivers(full_name,phone,status) select 'Mateusz','+48 691 242 691','available' where not exists(select 1 from public.drivers where full_name='Mateusz');
insert into public.drivers(full_name,phone,status) select 'Wojciech','+48 691 242 691','available' where not exists(select 1 from public.drivers where full_name='Wojciech');
insert into public.vehicles(name,registration,color,seats,type,status) select 'BAIC 7','ST 305AF','niebieski',4,'car','available' where not exists(select 1 from public.vehicles where registration='ST 305AF');
insert into public.vehicles(name,registration,color,seats,type,status) select 'SsangYong','SRB GV50','biały',4,'car','available' where not exists(select 1 from public.vehicles where registration='SRB GV50');

-- GPS kierowców (v1.1)
create table if not exists public.driver_locations (
  id bigint generated always as identity primary key,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);
alter table public.driver_locations enable row level security;
drop policy if exists authenticated_locations on public.driver_locations;
create policy authenticated_locations on public.driver_locations for all to authenticated using(true) with check(true);
