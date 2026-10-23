-- Reproduce the customer push tables previously created outside repo migrations.
create table if not exists public.customer_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 endpoint text not null,
 p256dh text not null,
 auth text not null,
 user_agent text,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(booking_id,endpoint)
);
create index if not exists customer_push_subscriptions_booking_active_idx
 on public.customer_push_subscriptions(booking_id,active);
create table if not exists public.customer_push_notification_log (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 event_key text not null,
 title text not null,
 body text not null,
 url text,
 sent_count integer not null default 0,
 failed_count integer not null default 0,
 created_at timestamptz not null default now(),
 unique(booking_id,event_key)
);
alter table public.customer_push_subscriptions enable row level security;
alter table public.customer_push_notification_log enable row level security;
revoke all on public.customer_push_subscriptions, public.customer_push_notification_log from anon, authenticated;
grant select,insert,update,delete on public.customer_push_subscriptions, public.customer_push_notification_log to service_role;
notify pgrst, 'reload schema';
