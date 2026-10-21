-- Read receipts belong to the signed-in operator, never to the booking status.
create table public.panel_booking_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, booking_id)
);
create index panel_booking_reads_booking_idx on public.panel_booking_reads(booking_id);
alter table public.panel_booking_reads enable row level security;
revoke all on public.panel_booking_reads from public, anon, authenticated;
grant select, insert on public.panel_booking_reads to service_role;
comment on table public.panel_booking_reads is 'Server-only per-operator receipts. Access requires verified staff role in the application.';
