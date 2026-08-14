alter table public.drivers
  add column if not exists color text not null default '#D6AD55';

create table if not exists public.wedding_vehicle_assignments(
  id uuid primary key default gen_random_uuid(),
  wedding_booking_id uuid not null references public.wedding_bookings(id) on delete cascade,
  slot_no integer not null,
  requested_vehicle_type text not null default 'bus' check(requested_vehicle_type in ('car','bus')),
  driver_id uuid references public.drivers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(wedding_booking_id,slot_no)
);
create index if not exists wedding_vehicle_assignments_booking_idx
  on public.wedding_vehicle_assignments(wedding_booking_id);

alter table public.wedding_vehicle_assignments enable row level security;
