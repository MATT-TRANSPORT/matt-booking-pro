create or replace function public.queue_checkout_notifications() returns trigger
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

-- Versioned entry point avoids queueing receipts from the old inline sender
-- while the two Vercel projects are deployed one after the other.
create function public.settle_customer_stripe_payment_with_outbox(
  p_booking_id uuid,p_checkout_session_id text,p_payment_intent_id text,
  p_amount_cents bigint,p_currency text,p_expected_status text
) returns boolean language plpgsql security invoker set search_path='' as $$
declare previous_mode text; settled boolean;
begin
  previous_mode := current_setting('matt.payment_outbox',true);
  perform set_config('matt.payment_outbox','v1',true);
  settled := public.settle_customer_stripe_payment(p_booking_id,p_checkout_session_id,
    p_payment_intent_id,p_amount_cents,p_currency,p_expected_status);
  perform set_config('matt.payment_outbox',coalesce(previous_mode,''),true);
  return settled;
end $$;
revoke all on function public.settle_customer_stripe_payment_with_outbox(uuid,text,text,bigint,text,text)
  from public,anon,authenticated;
grant execute on function public.settle_customer_stripe_payment_with_outbox(uuid,text,text,bigint,text,text)
  to service_role;
