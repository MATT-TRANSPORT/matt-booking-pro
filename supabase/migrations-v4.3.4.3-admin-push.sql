-- MATT Booking PRO v4.3.4.3 — ADMIN PUSH NOTIFICATIONS
-- Osobne subskrypcje Web Push dla aplikacji MATT Administrator.

create extension if not exists pgcrypto;

create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_push_subscriptions_user_idx
  on public.admin_push_subscriptions(user_id, active);

create index if not exists admin_push_subscriptions_active_idx
  on public.admin_push_subscriptions(active);

alter table public.admin_push_subscriptions enable row level security;

comment on table public.admin_push_subscriptions is
  'Subskrypcje Web Push panelu MATT Administrator. Backend korzysta z service role.';
