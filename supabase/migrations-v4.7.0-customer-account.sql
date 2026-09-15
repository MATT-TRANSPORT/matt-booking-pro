-- MATT Booking PRO v4.7.0 — CUSTOMER ACCOUNT / MOJE PRZEJAZDY
-- Passwordless customer access based on one-time e-mail links.

alter table public.bookings
  add column if not exists customer_email_normalized text
  generated always as (lower(btrim(email))) stored;

alter table public.wedding_bookings
  add column if not exists customer_email_normalized text
  generated always as (lower(btrim(email))) stored;

create index if not exists bookings_customer_email_normalized_b2c_idx
  on public.bookings (customer_email_normalized)
  where company_id is null;

create index if not exists wedding_bookings_customer_email_normalized_idx
  on public.wedding_bookings (customer_email_normalized);

create table if not exists public.customer_portal_login_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customer_portal_login_tokens_email_created_idx
  on public.customer_portal_login_tokens (email, created_at desc);

create index if not exists customer_portal_login_tokens_expires_idx
  on public.customer_portal_login_tokens (expires_at);

create table if not exists public.customer_portal_sessions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  session_hash text not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customer_portal_sessions_email_idx
  on public.customer_portal_sessions (email);

create index if not exists customer_portal_sessions_expires_idx
  on public.customer_portal_sessions (expires_at)
  where revoked_at is null;

alter table public.customer_portal_login_tokens enable row level security;
alter table public.customer_portal_sessions enable row level security;

revoke all on table public.customer_portal_login_tokens from anon, authenticated;
revoke all on table public.customer_portal_sessions from anon, authenticated;

grant all on table public.customer_portal_login_tokens to service_role;
grant all on table public.customer_portal_sessions to service_role;

comment on table public.customer_portal_login_tokens is
  'One-time passwordless e-mail login tokens for MATT CUSTOMER / Moje przejazdy.';
comment on table public.customer_portal_sessions is
  'Server-side hashed sessions for MATT CUSTOMER / Moje przejazdy.';
