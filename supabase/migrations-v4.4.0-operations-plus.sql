-- MATT Booking PRO v4.4.0 — OPERATIONS+
-- Alerts, B2B templates/recurrence, driver issue reports, review funnel and profitability.

create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron;

alter table public.bookings
  add column if not exists admin_pending_escalation_sent_at timestamptz;

alter table public.vehicles
  add column if not exists operating_cost_per_km numeric;

comment on column public.vehicles.operating_cost_per_km is
  'Opcjonalny szacunkowy koszt operacyjny pojazdu za 1 km. Używany wyłącznie do raportu rentowności.';

alter table public.drivers
  add column if not exists cost_per_trip numeric;

comment on column public.drivers.cost_per_trip is
  'Opcjonalny szacunkowy koszt kierowcy za jeden kurs. Używany wyłącznie do raportu rentowności.';

create table if not exists public.booking_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  feedback text,
  google_clicked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_reviews enable row level security;

create table if not exists public.company_booking_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  employee_id uuid references public.company_employees(id) on delete set null,
  pickup_address text not null,
  airport_key text not null,
  service_type text not null default 'to_airport',
  vehicle_type text not null default 'car',
  passengers integer not null default 1 check (passengers between 1 and 8),
  flight_number text,
  return_offset_days integer not null default 0 check (return_offset_days between 0 and 60),
  return_time text,
  return_flight_number text,
  notes text,
  payment_method text,
  additional_stop_address text,
  additional_stop_primary boolean not null default false,
  additional_stop_return boolean not null default false,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_booking_templates_company_idx
  on public.company_booking_templates(company_id, active, name);

alter table public.company_booking_templates enable row level security;

create table if not exists public.driver_issue_reports (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  issue_type text not null default 'other',
  description text not null,
  mileage integer,
  photo_path text,
  status text not null default 'open' check (status in ('open','resolved')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists driver_issue_reports_open_idx
  on public.driver_issue_reports(status, created_at desc);

alter table public.driver_issue_reports enable row level security;

insert into storage.buckets (id, name, public)
values ('driver-issues', 'driver-issues', false)
on conflict (id) do update set public = false;

-- Zastępujemy stary cron customer-notifications nową wersją OPERATIONS+.
-- Używa tego samego sekretu w Supabase Vault, więc nie wymaga nowych ENV.
select cron.unschedule(jobid)
from cron.job
where jobname = 'matt-customer-notifications-15m';

select cron.schedule(
  'matt-customer-notifications-15m',
  '*/15 * * * *',
  $cron$
  select net.http_post(
    url := 'https://panel.matt-transport.pl/api/cron/operations-plus',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-customer-notifications-secret',
      (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'matt_customer_notifications_cron_secret'
        limit 1
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);
