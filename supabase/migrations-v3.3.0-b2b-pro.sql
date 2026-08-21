-- MATT Booking PRO v3.3.0 — B2B PRO PRICING ENGINE + BOOKING DOCUMENTS
-- Uruchom po stabilnym v3.0.1.4.
-- Bezpieczna migracja rozszerzająca istniejący moduł B2B.

create extension if not exists pgcrypto;

alter table public.companies
  add column if not exists pricing_origin_address text;

create table if not exists public.company_pricing_terms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  effective_from date not null default current_date,
  active boolean not null default true,
  pricing_origin_address text not null,
  free_km numeric(10,1) not null default 40 check (free_km >= 0),
  extra_km_rate_net numeric(12,2) not null default 2.40 check (extra_km_rate_net >= 0),
  vat_rate numeric(5,2) not null default 8.00 check (vat_rate >= 0),
  use_custom_pricing boolean not null default false,
  payment_days integer not null default 14 check (payment_days >= 0),
  default_payment_method text not null default 'company_transfer'
    check (default_payment_method in ('company_transfer','employee_payment')),
  commercial_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists company_pricing_terms_company_effective_idx
  on public.company_pricing_terms(company_id, effective_from desc, created_at desc);

create table if not exists public.company_pricing_airport_prices (
  id uuid primary key default gen_random_uuid(),
  terms_id uuid not null references public.company_pricing_terms(id) on delete cascade,
  airport_key text not null,
  car_price_net numeric(12,2),
  bus_price_net numeric(12,2),
  created_at timestamptz not null default now(),
  unique(terms_id, airport_key),
  check (car_price_net is null or car_price_net >= 0),
  check (bus_price_net is null or bus_price_net >= 0)
);

create index if not exists company_pricing_airport_prices_terms_idx
  on public.company_pricing_airport_prices(terms_id);

-- Snapshot wyceny B2B na konkretnej rezerwacji.
alter table public.bookings
  add column if not exists company_pricing_terms_id uuid references public.company_pricing_terms(id) on delete set null,
  add column if not exists pricing_source text,
  add column if not exists pricing_origin_address text,
  add column if not exists pricing_distance_km numeric(10,1),
  add column if not exists pricing_free_km numeric(10,1),
  add column if not exists pricing_billable_km numeric(10,1),
  add column if not exists pricing_extra_km_rate_net numeric(12,2),
  add column if not exists price_net numeric(12,2),
  add column if not exists vat_rate numeric(5,2),
  add column if not exists price_gross numeric(12,2),
  add column if not exists pricing_snapshot jsonb;

create index if not exists bookings_company_pricing_terms_idx
  on public.bookings(company_pricing_terms_id)
  where company_pricing_terms_id is not null;

-- Dokumenty rozliczeniowe przypięte do pojedynczych rezerwacji B2B.
create table if not exists public.company_booking_documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  document_type text not null default 'invoice'
    check (document_type in ('invoice','correction','payment_confirmation','other')),
  document_number text,
  original_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists company_booking_documents_booking_idx
  on public.company_booking_documents(booking_id, created_at desc);

create index if not exists company_booking_documents_company_idx
  on public.company_booking_documents(company_id, created_at desc);

-- Prywatny bucket. Pliki są pobierane wyłącznie przez serwer po kontroli uprawnień.
insert into storage.buckets (id, name, public)
values ('company-booking-documents', 'company-booking-documents', false)
on conflict (id) do update set public = false;

-- RLS: firma może czytać swoje warunki/cennik oraz metadane swoich dokumentów.
alter table public.company_pricing_terms enable row level security;
alter table public.company_pricing_airport_prices enable row level security;
alter table public.company_booking_documents enable row level security;

drop policy if exists company_pricing_terms_read_member on public.company_pricing_terms;
create policy company_pricing_terms_read_member
on public.company_pricing_terms for select to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = company_pricing_terms.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists company_pricing_airport_prices_read_member on public.company_pricing_airport_prices;
create policy company_pricing_airport_prices_read_member
on public.company_pricing_airport_prices for select to authenticated
using (
  exists (
    select 1
    from public.company_pricing_terms t
    join public.company_users cu on cu.company_id = t.company_id
    where t.id = company_pricing_airport_prices.terms_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists company_booking_documents_read_member on public.company_booking_documents;
create policy company_booking_documents_read_member
on public.company_booking_documents for select to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = company_booking_documents.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

-- Backfill pierwszej wersji warunków dla istniejących firm.
-- Jeżeli nie ma adresu firmy, używamy wyraźnego placeholdera. Administrator
-- musi go potem poprawić przed pierwszą nową rezerwacją B2B.
insert into public.company_pricing_terms (
  company_id,
  effective_from,
  active,
  pricing_origin_address,
  free_km,
  extra_km_rate_net,
  vat_rate,
  use_custom_pricing,
  payment_days,
  default_payment_method,
  commercial_notes
)
select
  c.id,
  current_date,
  true,
  coalesce(nullif(c.pricing_origin_address,''), nullif(c.address,''), 'UZUPEŁNIJ SIEDZIBĘ KONTRAHENTA'),
  coalesce(c.free_pickup_km, 40),
  2.40,
  8.00,
  coalesce(c.use_custom_pricing, false),
  coalesce(c.payment_days, 14),
  coalesce(c.default_payment_method, 'company_transfer'),
  c.internal_notes
from public.companies c
where not exists (
  select 1 from public.company_pricing_terms t where t.company_id = c.id
);

-- Przenieś istniejące indywidualne ceny do aktualnej wersji warunków.
insert into public.company_pricing_airport_prices (
  terms_id,
  airport_key,
  car_price_net,
  bus_price_net
)
select
  t.id,
  p.airport_key,
  p.car_price,
  p.bus_price
from public.company_airport_prices p
join lateral (
  select id
  from public.company_pricing_terms t2
  where t2.company_id = p.company_id
  order by t2.effective_from desc, t2.created_at desc
  limit 1
) t on true
on conflict (terms_id, airport_key) do nothing;

-- Dla starych rezerwacji B2B zachowujemy oryginalną kwotę jako historyczne NETTO
-- i wyliczamy pola informacyjne. Nie nadpisujemy starego total_price.
update public.bookings
set
  price_net = coalesce(price_net, total_price),
  vat_rate = coalesce(vat_rate, 8.00),
  price_gross = coalesce(price_gross, round((total_price * 1.08)::numeric, 2)),
  pricing_source = coalesce(pricing_source, 'legacy_b2b')
where company_id is not null
  and price_net is null;

comment on column public.companies.pricing_origin_address is
  'Siedziba/oddział kontrahenta używany jako punkt zerowy do kalkulacji darmowych kilometrów B2B.';
comment on table public.company_pricing_terms is
  'Wersjonowane warunki handlowe B2B. Stare rezerwacje zachowują snapshot użytej wersji.';
comment on table public.company_booking_documents is
  'Prywatne dokumenty rozliczeniowe przypięte do pojedynczych rezerwacji B2B.';

notify pgrst, 'reload schema';
