-- MATT Booking PRO v4.8.0 — CENTRAL AIRPORT PRICING
create table if not exists public.airport_pricing (
  airport_key text primary key,
  label text not null,
  route_address text not null,
  car_price numeric(12,2) not null check (car_price >= 0),
  bus_price numeric(12,2) not null check (bus_price >= 0),
  active boolean not null default true,
  sort_order integer not null default 100 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.airport_pricing enable row level security;

revoke all on table public.airport_pricing from anon, authenticated;
grant select, insert, update, delete on table public.airport_pricing to service_role;

create index if not exists airport_pricing_active_sort_idx
  on public.airport_pricing(active, sort_order, label);

insert into public.airport_pricing
  (airport_key, label, route_address, car_price, bus_price, active, sort_order)
values
  ('pyrzowice', 'Katowice-Pyrzowice', 'Katowice Airport, Wolności 90, 42-625 Pyrzowice, Polska', 260, 360, true, 10),
  ('balice', 'Kraków-Balice', 'Kraków Airport, Kapitana Mieczysława Medweckiego 1, 32-083 Balice, Polska', 370, 430, true, 20),
  ('ostrawa', 'Ostrawa', 'Leoš Janáček Airport Ostrava, 742 51 Mošnov, Czechy', 260, 360, true, 30),
  ('wroclaw', 'Wrocław', 'Port Lotniczy Wrocław, Graniczna 190, 54-530 Wrocław, Polska', 660, 790, true, 40),
  ('warszawa', 'Warszawa', 'Lotnisko Chopina w Warszawie, Żwirki i Wigury 1, 00-906 Warszawa, Polska', 990, 1300, true, 50),
  ('prague', 'Praga', 'Václav Havel Airport Prague, Aviatická, 161 00 Praha 6, Czechy', 1300, 1650, true, 60),
  ('vienna', 'Wiedeń', 'Vienna International Airport, 1300 Schwechat, Austria', 1300, 1650, true, 70)
on conflict (airport_key) do update set
  label = excluded.label,
  route_address = excluded.route_address,
  car_price = excluded.car_price,
  bus_price = excluded.bus_price,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

comment on table public.airport_pricing is
  'v4.8.0: centralny cennik i katalog lotnisk MATT TRANSPORT. Edycja wyłącznie przez backend service_role.';
