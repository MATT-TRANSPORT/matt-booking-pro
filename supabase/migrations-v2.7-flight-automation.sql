-- MATT Booking PRO v2.7.0 — Flight Automation
-- Run ONCE after v2.6 migration.

create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists supabase_vault;

alter table public.booking_flights
  add column if not exists automation_enabled boolean not null default true,
  add column if not exists next_check_at timestamptz,
  add column if not exists consecutive_errors integer not null default 0,
  add column if not exists last_error text;

create table if not exists public.booking_flight_alerts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  booking_flight_id uuid references public.booking_flights(id) on delete cascade,
  leg text not null default 'primary',
  alert_type text not null,
  severity text not null default 'warning'
    check (severity in ('info','warning','critical')),
  dedupe_key text not null unique,
  title text not null,
  message text not null,
  active boolean not null default true,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_flight_alerts_booking_idx
  on public.booking_flight_alerts(booking_id, active, severity);

create index if not exists booking_flight_alerts_active_idx
  on public.booking_flight_alerts(active, severity, updated_at desc);

create table if not exists public.flight_monitor_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  checked_count integer not null default 0,
  refreshed_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  source text not null default 'cron',
  details jsonb
);

create index if not exists flight_monitor_runs_started_idx
  on public.flight_monitor_runs(started_at desc);

alter table public.booking_flight_alerts enable row level security;
alter table public.flight_monitor_runs enable row level security;

-- Backend korzysta z service role. Brak publicznych polityk RLS.
