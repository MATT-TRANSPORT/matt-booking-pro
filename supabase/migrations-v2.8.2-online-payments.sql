-- MATT Booking PRO v2.8.2 — ONLINE PAYMENTS (STRIPE)
-- Uruchom po v2.8.1.

alter table public.bookings
  add column if not exists payment_provider text,
  add column if not exists payment_checkout_session_id text,
  add column if not exists payment_intent_id text,
  add column if not exists payment_amount_cents integer,
  add column if not exists payment_currency text not null default 'pln',
  add column if not exists payment_paid_at timestamptz,
  add column if not exists payment_refunded_at timestamptz,
  add column if not exists payment_last_error text,
  add column if not exists payment_review_reason text;

create index if not exists bookings_payment_checkout_session_idx
  on public.bookings(payment_checkout_session_id)
  where payment_checkout_session_id is not null;

create index if not exists bookings_payment_intent_idx
  on public.bookings(payment_intent_id)
  where payment_intent_id is not null;

create table if not exists public.payment_webhook_events (
  provider_event_id text primary key,
  provider text not null default 'stripe',
  event_type text not null,
  booking_id uuid references public.bookings(id) on delete set null,
  processing_status text not null default 'processing',
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.payment_webhook_events enable row level security;

-- Obsługa odbywa się backendem przez service role.
