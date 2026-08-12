alter table public.drivers
  add column if not exists email text,
  add column if not exists license_number text,
  add column if not exists notes text,
  add column if not exists active boolean not null default true;

alter table public.vehicles
  add column if not exists notes text,
  add column if not exists active boolean not null default true,
  add column if not exists inspection_date date,
  add column if not exists insurance_date date,
  add column if not exists mileage integer;

alter table public.bookings
  add column if not exists company_nip text,
  add column if not exists notes text;
