-- MATT BOOKING PRO v3.3.0 — B2B PRO
-- INDYWIDUALNE WARUNKI HANDLOWE + WYCENY NETTO/VAT + DOKUMENTY REZERWACJI
--
-- Bezpieczna migracja rozszerzająca. Nie usuwa istniejących danych.
-- Uruchom cały plik w Supabase SQL Editor PRZED wdrożeniem kodu v3.3.0.

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------
-- 1. Wersjonowane warunki handlowe firmy
-- -------------------------------------------------------------------
create table if not exists public.company_commercial_terms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  effective_from date not null default current_date,
  headquarters_address text,
  headquarters_place_id text,
  free_km numeric(10,1) not null default 40,
  extra_km_rate_net numeric(12,2) not null default 2.40,
  vat_rate numeric(5,2) not null default 8.00,
  payment_days integer not null default 14,
  default_payment_method text not null default 'company_transfer',
  use_custom_pricing boolean not null default false,
  discount_percent numeric(5,2) not null default 0,
  notes text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_commercial_terms_free_km_check check (free_km >= 0),
  constraint company_commercial_terms_extra_rate_check check (extra_km_rate_net >= 0),
  constraint company_commercial_terms_vat_check check (vat_rate >= 0 and vat_rate <= 100),
  constraint company_commercial_terms_discount_check check (discount_percent >= 0 and discount_percent <= 100),
  constraint company_commercial_terms_payment_check check (default_payment_method in ('company_transfer','employee_payment'))
);

create index if not exists company_commercial_terms_company_date_idx
  on public.company_commercial_terms(company_id, effective_from desc, created_at desc);

create table if not exists public.company_commercial_prices (
  id uuid primary key default gen_random_uuid(),
  terms_id uuid not null references public.company_commercial_terms(id) on delete cascade,
  airport_key text not null,
  car_price_net numeric(12,2),
  bus_price_net numeric(12,2),
  created_at timestamptz not null default now(),
  unique(terms_id, airport_key),
  constraint company_commercial_prices_car_check check (car_price_net is null or car_price_net >= 0),
  constraint company_commercial_prices_bus_check check (bus_price_net is null or bus_price_net >= 0)
);

create index if not exists company_commercial_prices_terms_idx
  on public.company_commercial_prices(terms_id);

-- Utwórz startową wersję warunków dla istniejących firm, jeśli jeszcze jej nie ma.
insert into public.company_commercial_terms (
  company_id,
  effective_from,
  headquarters_address,
  free_km,
  extra_km_rate_net,
  vat_rate,
  payment_days,
  default_payment_method,
  use_custom_pricing,
  discount_percent,
  notes,
  active
)
select
  c.id,
  current_date,
  nullif(trim(concat_ws(', ', nullif(c.address,''), nullif(c.postal_code,''), nullif(c.city,''))), ''),
  coalesce(c.free_pickup_km, 40),
  2.40,
  8.00,
  coalesce(c.payment_days, 14),
  coalesce(c.default_payment_method, 'company_transfer'),
  coalesce(c.use_custom_pricing, false),
  coalesce(c.discount_percent, 0),
  c.internal_notes,
  true
from public.companies c
where not exists (
  select 1
  from public.company_commercial_terms t
  where t.company_id = c.id
);

-- Przenieś ewentualne stare indywidualne ceny, jeśli stara tabela istnieje.
do $$
begin
  if to_regclass('public.company_airport_prices') is not null then
    insert into public.company_commercial_prices (
      terms_id,
      airport_key,
      car_price_net,
      bus_price_net
    )
    select
      t.id,
      old.airport_key,
      old.car_price,
      old.bus_price
    from public.company_airport_prices old
    join lateral (
      select x.id
      from public.company_commercial_terms x
      where x.company_id = old.company_id
      order by x.effective_from desc, x.created_at desc
      limit 1
    ) t on true
    where not exists (
      select 1
      from public.company_commercial_prices p
      where p.terms_id = t.id
        and p.airport_key = old.airport_key
    );
  end if;
end $$;

-- -------------------------------------------------------------------
-- 2. Snapshot wyceny na konkretnej rezerwacji
-- -------------------------------------------------------------------
alter table public.bookings
  add column if not exists b2b_terms_id uuid references public.company_commercial_terms(id) on delete set null,
  add column if not exists b2b_headquarters_address text,
  add column if not exists b2b_distance_from_headquarters_km numeric(10,1),
  add column if not exists b2b_free_km numeric(10,1),
  add column if not exists b2b_billable_km numeric(10,1),
  add column if not exists b2b_extra_km_rate_net numeric(12,2),
  add column if not exists b2b_unit_base_net numeric(12,2),
  add column if not exists b2b_base_net numeric(12,2),
  add column if not exists b2b_extra_net numeric(12,2),
  add column if not exists b2b_discount_percent numeric(5,2),
  add column if not exists b2b_discount_net numeric(12,2),
  add column if not exists b2b_net numeric(12,2),
  add column if not exists b2b_vat_rate numeric(5,2),
  add column if not exists b2b_vat numeric(12,2),
  add column if not exists b2b_gross numeric(12,2),
  add column if not exists b2b_pricing_mode text,
  add column if not exists b2b_terms_effective_from date,
  add column if not exists b2b_pricing_snapshot jsonb;

create index if not exists bookings_b2b_terms_id_idx
  on public.bookings(b2b_terms_id);

-- -------------------------------------------------------------------
-- 3. Dokumenty / faktury przypięte do pojedynczej rezerwacji
-- -------------------------------------------------------------------
create table if not exists public.booking_documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  document_type text not null default 'invoice',
  document_number text,
  file_name text not null,
  file_path text not null unique,
  mime_type text not null,
  file_size bigint not null default 0,
  visible_to_company boolean not null default true,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint booking_documents_type_check check (
    document_type in ('invoice','correction','payment_confirmation','other')
  )
);

create index if not exists booking_documents_booking_idx
  on public.booking_documents(booking_id, created_at desc);
create index if not exists booking_documents_company_idx
  on public.booking_documents(company_id, created_at desc);

-- Prywatny bucket. Pliki są pobierane wyłącznie przez autoryzowane API i signed URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'booking-documents',
  'booking-documents',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- -------------------------------------------------------------------
-- 4. RLS dla portalu firmy
-- -------------------------------------------------------------------
alter table public.company_commercial_terms enable row level security;
alter table public.company_commercial_prices enable row level security;
alter table public.booking_documents enable row level security;

drop policy if exists company_commercial_terms_read_member
  on public.company_commercial_terms;
create policy company_commercial_terms_read_member
on public.company_commercial_terms
for select to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_commercial_terms.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists company_commercial_prices_read_member
  on public.company_commercial_prices;
create policy company_commercial_prices_read_member
on public.company_commercial_prices
for select to authenticated
using (
  exists (
    select 1
    from public.company_commercial_terms t
    join public.company_users cu on cu.company_id = t.company_id
    where t.id = company_commercial_prices.terms_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists booking_documents_read_company
  on public.booking_documents;
create policy booking_documents_read_company
on public.booking_documents
for select to authenticated
using (
  visible_to_company = true
  and company_id is not null
  and exists (
    select 1
    from public.company_users cu
    where cu.company_id = booking_documents.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

-- Synchronizuj stare pola firmowe z najnowszą wersją tylko jako fallback UI.
-- Nowy silnik wycen korzysta z company_commercial_terms.

notify pgrst, 'reload schema';
