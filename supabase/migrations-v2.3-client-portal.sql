-- MATT BOOKING PRO v2.3 — CLIENT PORTAL
-- Uruchom po migracji v2.2-driver.sql.

alter table public.bookings
  add column if not exists customer_access_token uuid default gen_random_uuid(),
  add column if not exists customer_last_edited_at timestamptz;

update public.bookings
set customer_access_token = gen_random_uuid()
where customer_access_token is null;

alter table public.bookings
  alter column customer_access_token set default gen_random_uuid();

create unique index if not exists bookings_customer_access_token_unique_idx
  on public.bookings(customer_access_token)
  where customer_access_token is not null;
