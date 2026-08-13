-- MATT BOOKING PRO v2.2 DRIVER
-- Uruchom po migracjach v2.1.1.

alter table public.drivers
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists drivers_user_id_unique_idx
  on public.drivers(user_id)
  where user_id is not null;

-- Nowy status kierowcy "arrived" jest wartością tekstową w bookings.status,
-- więc przy obecnym schemacie nie wymaga migracji enum.
