-- MATT BOOKING PRO v2.1 OPERATIONS
-- Uruchom po migracji v2.0.

alter table public.bookings
add column if not exists updated_at timestamptz not null default now();

create table if not exists public.company_settlements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_month date not null,
  amount numeric(12,2) not null default 0,
  invoice_number text,
  invoice_file_path text,
  status text not null default 'open'
    check(status in ('open','invoiced','paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,period_month)
);

alter table public.company_settlements enable row level security;

drop policy if exists company_settlements_read_member
on public.company_settlements;

create policy company_settlements_read_member
on public.company_settlements
for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_settlements.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

-- Private storage bucket for invoice scans/PDFs.
insert into storage.buckets (id,name,public)
values ('company-invoices','company-invoices',false)
on conflict (id) do nothing;
