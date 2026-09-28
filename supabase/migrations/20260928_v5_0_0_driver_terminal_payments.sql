create table if not exists public.driver_card_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete restrict,
  leg text not null default 'primary'
    check (leg in ('primary','return')),
  base_amount_cents integer not null
    check (base_amount_cents >= 0),
  surcharge_amount_cents integer not null default 0
    check (surcharge_amount_cents >= 0),
  surcharge_reason text,
  total_amount_cents integer not null
    check (total_amount_cents > 0),
  currency text not null default 'pln'
    check (lower(currency) = 'pln'),
  payment_intent_id text unique,
  stripe_charge_id text,
  status text not null default 'pending'
    check (status in ('pending','succeeded','failed','canceled','refunded')),
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists driver_card_payments_booking_idx
  on public.driver_card_payments(booking_id, created_at desc);

create index if not exists driver_card_payments_driver_idx
  on public.driver_card_payments(driver_id, created_at desc);

create index if not exists driver_card_payments_status_idx
  on public.driver_card_payments(status, created_at desc);

alter table public.driver_card_payments enable row level security;

comment on table public.driver_card_payments is
  'v5.0.0: płatności kartą pobierane przez MATT Driver / Stripe Terminal Tap to Pay. Dane księgowane po stronie backendu.';
