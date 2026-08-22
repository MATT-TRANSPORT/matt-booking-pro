-- MATT Booking PRO v4.0.0 — PRODUCTION FINAL
-- Review automation + B2B saved addresses security.
-- Bezpieczna migracja rozszerzająca. Nie usuwa istniejących danych.

alter table public.bookings
  add column if not exists completed_at timestamptz,
  add column if not exists review_request_started_at timestamptz,
  add column if not exists review_request_sent_at timestamptz,
  add column if not exists review_request_email_sent_at timestamptz,
  add column if not exists review_request_push_sent_at timestamptz;

create index if not exists bookings_review_request_due_idx
  on public.bookings(status, completed_at, review_request_sent_at)
  where status = 'completed' and company_id is null;

-- Nie backfillujemy completed_at dla historycznych kursów.
-- Dzięki temu po wdrożeniu v4.0 nie zostanie wysłana fala próśb o opinię do starych klientów.

alter table public.company_addresses enable row level security;

drop policy if exists company_addresses_read_member on public.company_addresses;
create policy company_addresses_read_member
on public.company_addresses
for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_addresses.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists company_addresses_manage on public.company_addresses;
create policy company_addresses_manage
on public.company_addresses
for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_addresses.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('admin','manager')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_addresses.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('admin','manager')
  )
);

create index if not exists company_addresses_company_active_idx
  on public.company_addresses(company_id, active, label);

notify pgrst, 'reload schema';
