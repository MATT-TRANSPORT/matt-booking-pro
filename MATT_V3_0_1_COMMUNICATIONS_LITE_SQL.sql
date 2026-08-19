-- MATT Booking PRO v3.0.1 — COMMUNICATIONS LITE / CUSTOMER WEB PUSH
-- Uruchom PO wdrożonym SQL v3.0.0. Nie usuwamy starych kolumn/tabel Twilio — są nieszkodliwe.

-- v3.0.1 nie używa już SMS/WhatsApp API. Normalizujemy ewentualne świeże wybory v3.0 do e-mail.
update public.bookings
set
  customer_notification_channel = 'email',
  customer_notification_opt_out_at = case
    when customer_notification_channel in ('sms','whatsapp') then now()
    else customer_notification_opt_out_at
  end
where customer_notification_channel in ('sms','whatsapp');

create table if not exists public.customer_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, endpoint)
);

create index if not exists customer_push_subscriptions_booking_idx
  on public.customer_push_subscriptions(booking_id, active);

create table if not exists public.customer_push_notification_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_key text not null,
  title text not null,
  body text not null,
  url text,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (booking_id, event_key)
);

create index if not exists customer_push_notification_log_booking_idx
  on public.customer_push_notification_log(booking_id, created_at desc);

alter table public.customer_push_subscriptions enable row level security;
alter table public.customer_push_notification_log enable row level security;

comment on table public.customer_push_subscriptions is
  'Bezpłatne Web Push dla klientów B2C, przypisane do konkretnej rezerwacji.';
comment on table public.customer_push_notification_log is
  'Dziennik bezpłatnych powiadomień Web Push do klientów B2C.';

notify pgrst, 'reload schema';
