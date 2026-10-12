-- MATT Booking PRO v5.1 — admin Stripe payment launcher
create table if not exists public.admin_stripe_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  wedding_booking_id uuid references public.wedding_bookings(id) on delete set null,
  created_by uuid,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'pln',
  payment_method text not null default 'auto',
  status text not null default 'pending',
  description text,
  customer_email text,
  checkout_session_id text unique,
  checkout_url text,
  payment_intent_id text,
  failure_reason text,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_stripe_payments_booking_idx
  on public.admin_stripe_payments(booking_id, created_at desc);

create index if not exists admin_stripe_payments_wedding_idx
  on public.admin_stripe_payments(wedding_booking_id, created_at desc);

create index if not exists admin_stripe_payments_status_idx
  on public.admin_stripe_payments(status, created_at desc);

alter table public.admin_stripe_payments enable row level security;

comment on table public.admin_stripe_payments is
  'v5.1: ręczne płatności Stripe uruchamiane z Panelu MATT dla dowolnej kwoty i kanału Checkout.';
