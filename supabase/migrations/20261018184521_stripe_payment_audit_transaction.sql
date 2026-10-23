-- A paid customer booking and its audit entry are one PostgreSQL transaction.
-- Invoke only after Stripe signature, mode, amount and booking validation.
create or replace function public.settle_customer_stripe_payment(
  p_booking_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_amount_cents bigint,
  p_currency text,
  p_expected_status text
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_currency is distinct from 'pln' or p_amount_cents <= 0
     or nullif(p_checkout_session_id, '') is null then
    raise exception 'Invalid Stripe payment parameters';
  end if;

  update public.bookings b set
    payment_provider = 'stripe',
    payment_checkout_session_id = p_checkout_session_id,
    payment_intent_id = p_payment_intent_id,
    payment_amount_cents = p_amount_cents,
    payment_currency = p_currency,
    payment_status = 'paid',
    payment_paid_at = coalesce(b.payment_paid_at, now()),
    payment_refunded_at = null,
    payment_last_error = null,
    payment_review_reason = null,
    updated_at = now()
  where b.id = p_booking_id
    and b.payment_status = p_expected_status
    and b.payment_status <> 'refunded'
    and lower(b.status) in ('confirmed','assigned','in_progress','arrived','picked_up','completed')
    and round((case when b.company_id is not null
      then coalesce(b.price_gross, b.total_price, 0)
      else coalesce(b.total_price, 0) end) * 100) = p_amount_cents;
  if not found then return false; end if;

  if p_expected_status <> 'paid' then
    insert into public.booking_history (booking_id, event, created_by)
    values (p_booking_id,
      '✓ Płatność online Stripe zaksięgowana: ' ||
      to_char(p_amount_cents::numeric / 100, 'FM999999999990.00') || ' zł', null);
  end if;
  return true;
end;
$$;

revoke all on function public.settle_customer_stripe_payment(uuid,text,text,bigint,text,text)
  from public, anon, authenticated;
grant execute on function public.settle_customer_stripe_payment(uuid,text,text,bigint,text,text)
  to service_role;
