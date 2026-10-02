-- MATT Driver 5.0.1 — native push tokens
create table if not exists public.driver_native_push_tokens (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  user_id uuid not null,
  token text not null unique,
  platform text not null check (platform in ('android','ios')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists driver_native_push_tokens_driver_idx
  on public.driver_native_push_tokens(driver_id, active);

alter table public.driver_native_push_tokens enable row level security;

-- Backend uses service role.
