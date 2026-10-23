-- Checkout receipts survive a worker crash after the payment transaction commits.
create table public.payment_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_reference text not null,
  kind text not null check (kind in ('customer_email','admin_push')),
  booking_snapshot jsonb not null,
  recipient text,
  prepared_email jsonb,
  status text not null default 'pending' check (status in ('pending','processing','retry','sent','skipped','needs_attention')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  processing_started_at timestamptz,
  lease_token uuid,
  first_attempt_at timestamptz,
  sent_at timestamptz,
  provider_id text,
  last_error text,
  created_at timestamptz not null default now(),
  unique (booking_id,payment_reference,kind)
);
alter table public.payment_notification_outbox enable row level security;
revoke all on public.payment_notification_outbox from public,anon,authenticated;
grant select,insert,update,delete on public.payment_notification_outbox to service_role;
create index payment_notification_outbox_due on public.payment_notification_outbox(status,available_at)
  where status in ('pending','retry','processing');

create function public.queue_checkout_notifications() returns trigger
language plpgsql security invoker set search_path='' as $$
declare recipient_email text; reference text;
begin
  if current_setting('matt.payment_outbox',true) is distinct from 'v1' then return new; end if;
  if new.payment_status='paid' and old.payment_status is distinct from 'paid'
     and new.payment_provider='stripe' then
    reference := coalesce(new.payment_intent_id,new.payment_checkout_session_id);
    if reference is null then raise exception 'Missing Checkout payment reference'; end if;
    if new.company_id is not null then
      select email into recipient_email from public.companies where id=new.company_id;
    else recipient_email := new.email;
    end if;
    insert into public.payment_notification_outbox(booking_id,payment_reference,kind,booking_snapshot,recipient)
    values (new.id,reference,'customer_email',to_jsonb(new),recipient_email),
           (new.id,reference,'admin_push',to_jsonb(new),null)
    on conflict (booking_id,payment_reference,kind) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.queue_checkout_notifications() from public,anon,authenticated;
create trigger checkout_notification_outbox after update of payment_status on public.bookings
for each row execute function public.queue_checkout_notifications();

create function public.claim_payment_notifications(p_booking_id uuid default null,p_limit integer default 3)
returns setof public.payment_notification_outbox
language sql security invoker set search_path='' as $$
  with due as (
    select id from public.payment_notification_outbox
    where (p_booking_id is null or booking_id=p_booking_id)
      and ((status in ('pending','retry') and available_at<=now())
        or (status='processing' and processing_started_at<now()-interval '10 minutes'))
    order by available_at,id for update skip locked
    limit greatest(1,least(coalesce(p_limit,3),3))
  )
  update public.payment_notification_outbox o set
    status='processing', attempts=o.attempts+1,
    processing_started_at=now(),lease_token=gen_random_uuid()
  from due where o.id=due.id returning o.*;
$$;
revoke all on function public.claim_payment_notifications(uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_payment_notifications(uuid,integer) to service_role;
