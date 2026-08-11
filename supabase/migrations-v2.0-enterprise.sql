create table if not exists public.companies(
 id uuid primary key default gen_random_uuid(),
 name text not null,nip text,address text,city text,postal_code text,phone text,email text,contact_person text,
 payment_days integer not null default 14,discount_percent numeric(5,2) not null default 0,active boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.company_users(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'employee' check(role in('admin','manager','employee','accounting')),
 active boolean not null default true,created_at timestamptz not null default now(),unique(company_id,user_id)
);
create table if not exists public.company_employees(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 first_name text not null,last_name text not null,phone text,email text,default_address text,department text,notes text,
 active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.company_addresses(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 label text not null,address text not null,active boolean not null default true,created_at timestamptz not null default now()
);
alter table public.bookings
 add column if not exists company_id uuid references public.companies(id) on delete set null,
 add column if not exists company_employee_id uuid references public.company_employees(id) on delete set null,
 add column if not exists ordered_by_user_id uuid references auth.users(id) on delete set null,
 add column if not exists booking_source text not null default 'public',
 add column if not exists invoice_status text not null default 'not_invoiced',
 add column if not exists invoice_number text;
create index if not exists bookings_company_id_idx on public.bookings(company_id);
create index if not exists company_employees_company_id_idx on public.company_employees(company_id);
create index if not exists company_users_user_id_idx on public.company_users(user_id);

alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.company_employees enable row level security;
alter table public.company_addresses enable row level security;

drop policy if exists company_users_read_own on public.company_users;
create policy company_users_read_own on public.company_users for select to authenticated using(user_id=auth.uid());

drop policy if exists companies_read_member on public.companies;
create policy companies_read_member on public.companies for select to authenticated using(
 exists(select 1 from public.company_users cu where cu.company_id=companies.id and cu.user_id=auth.uid() and cu.active=true)
);

drop policy if exists company_employees_read_member on public.company_employees;
create policy company_employees_read_member on public.company_employees for select to authenticated using(
 exists(select 1 from public.company_users cu where cu.company_id=company_employees.company_id and cu.user_id=auth.uid() and cu.active=true)
);
drop policy if exists company_employees_manage on public.company_employees;
create policy company_employees_manage on public.company_employees for all to authenticated
using(exists(select 1 from public.company_users cu where cu.company_id=company_employees.company_id and cu.user_id=auth.uid() and cu.active=true and cu.role in('admin','manager')))
with check(exists(select 1 from public.company_users cu where cu.company_id=company_employees.company_id and cu.user_id=auth.uid() and cu.active=true and cu.role in('admin','manager')));

drop policy if exists company_read_own_bookings on public.bookings;
create policy company_read_own_bookings on public.bookings for select to authenticated using(
 company_id is not null and exists(select 1 from public.company_users cu where cu.company_id=bookings.company_id and cu.user_id=auth.uid() and cu.active=true)
);
