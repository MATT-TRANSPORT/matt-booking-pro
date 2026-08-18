-- MATT Booking PRO v2.8.0 — DRIVER PWA & PUSH NOTIFICATIONS
-- Run once after v2.7.

create extension if not exists pgcrypto;

create table if not exists public.driver_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists driver_push_subscriptions_driver_idx
  on public.driver_push_subscriptions(driver_id, active);

create table if not exists public.push_notification_log (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  flight_alert_id uuid references public.booking_flight_alerts(id) on delete cascade,
  event_key text not null,
  title text not null,
  body text not null,
  url text,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique(driver_id, event_key)
);

alter table public.driver_push_subscriptions enable row level security;
alter table public.push_notification_log enable row level security;

-- Backend accesses these tables using service role.
