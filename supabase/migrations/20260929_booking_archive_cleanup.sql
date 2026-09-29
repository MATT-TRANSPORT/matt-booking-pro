alter table public.bookings
  add column if not exists archived_at timestamptz,
  add column if not exists archived_reason text;

create index if not exists bookings_archived_at_idx
  on public.bookings(archived_at)
  where archived_at is not null;
