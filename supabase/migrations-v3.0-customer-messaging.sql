-- MATT Booking PRO v3.0.0 — CUSTOMER SMS + WHATSAPP NOTIFICATIONS
-- Uruchom po v2.9.0.2.

alter table public.bookings
  add column if not exists customer_notification_channel text not null default 'email',
  add column if not exists customer_notification_opt_in_at timestamptz,
  add column if not exists customer_notification_opt_out_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_customer_notification_channel_check'
  ) then
    alter table public.bookings
      add constraint bookings_customer_notification_channel_check
      check (customer_notification_channel in ('email','sms','whatsapp'));
  end if;
end $$;

create table if not exists public.customer_message_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_key text not null,
  channel text not null check (channel in ('sms','whatsapp')),
  provider text not null default 'twilio',
  provider_message_sid text unique,
  to_phone text not null,
  body text,
  content_sid text,
  status text not null default 'preparing',
  error_code text,
  error_message text,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(booking_id, event_key, channel)
);

create index if not exists customer_message_log_booking_idx
  on public.customer_message_log(booking_id, created_at desc);

create index if not exists customer_message_log_status_idx
  on public.customer_message_log(status, updated_at desc);

alter table public.customer_message_log enable row level security;

comment on column public.bookings.customer_notification_channel is
  'Kanał powiadomień operacyjnych wybrany przez klienta: email, sms albo whatsapp (WhatsApp z fallbackiem SMS).';
comment on column public.bookings.customer_notification_opt_in_at is
  'Czas świadomego wyboru SMS lub WhatsApp dla tej rezerwacji.';
comment on table public.customer_message_log is
  'Dziennik transakcyjnych SMS/WhatsApp wysyłanych do klientów przez Twilio.';

notify pgrst, 'reload schema';
