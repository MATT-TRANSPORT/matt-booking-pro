alter table public.drivers add column if not exists portal_invited_at timestamptz;
alter table public.companies add column if not exists portal_invited_at timestamptz;
alter table public.bookings add column if not exists payment_status text not null default 'pending';
create index if not exists bookings_dispatch_conflict_idx on public.bookings(travel_date,travel_time,driver_id,vehicle_id) where status not in ('completed','cancelled');
