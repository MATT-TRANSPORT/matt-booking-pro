-- MATT Booking PRO v1.4
-- Bezpieczna migracja: można uruchomić wielokrotnie.

alter table public.bookings
add column if not exists updated_at timestamptz not null default now();

create table if not exists public.booking_notifications (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  channel text not null default 'email',
  notification_type text not null,
  recipient text not null,
  provider_id text,
  status text not null default 'sent',
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.booking_notifications enable row level security;

drop policy if exists authenticated_read_notifications
on public.booking_notifications;

create policy authenticated_read_notifications
on public.booking_notifications
for select
to authenticated
using (true);
