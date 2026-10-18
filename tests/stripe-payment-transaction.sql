-- Run ONLY against the isolated PR48 database with existing E2E fixtures.
-- Every write, including successful settlement, is rolled back.
begin;
update public.bookings set status='confirmed', total_price=800,
  payment_status='pending', payment_checkout_session_id=null, payment_intent_id=null
where booking_number='E2E-TEST-PRIVATE';
set local role service_role;
do $$
declare
  b uuid;
  before_history bigint;
  settled boolean;
  signature text := 'public.settle_customer_stripe_payment(uuid,text,text,bigint,text,text)';
begin
  select id into strict b from public.bookings where booking_number='E2E-TEST-PRIVATE';
  select count(*) into before_history from public.booking_history where booking_id=b;
  if has_function_privilege('anon', signature, 'EXECUTE') or
     has_function_privilege('authenticated', signature, 'EXECUTE') or
     not has_function_privilege('service_role', signature, 'EXECUTE') then
    raise exception 'Payment function access regression';
  end if;

  begin
    perform public.settle_customer_stripe_payment(b,'cs_test_sql','pi_test_sql',80000,'eur','pending');
    raise exception 'Invalid currency accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid Stripe payment parameters' then raise; end if;
  end;
  if public.settle_customer_stripe_payment(b,'cs_test_sql','pi_test_sql',79999,'pln','pending') then
    raise exception 'Mismatched amount accepted';
  end if;

  -- Force rollback of the nested settlement transaction, then prove neither
  -- state nor history survived. No temporary trigger/permissions are installed.
  begin
    settled := public.settle_customer_stripe_payment(b,'cs_test_sql','pi_test_sql',80000,'pln','pending');
    if not settled then raise exception 'Service settlement did not run'; end if;
    if (select payment_status from public.bookings where id=b) <> 'paid' or
       (select count(*) from public.booking_history where booking_id=b) <> before_history+1 then
      raise exception 'Settlement and audit were not written together';
    end if;
    raise exception using errcode='P0002', message='Intentional transaction rollback';
  exception when no_data_found then
    if sqlerrm <> 'Intentional transaction rollback' then raise; end if;
  end;
  if (select payment_status from public.bookings where id=b) <> 'pending' or
     (select count(*) from public.booking_history where booking_id=b) <> before_history then
    raise exception 'Partial payment transaction survived rollback';
  end if;

  if not public.settle_customer_stripe_payment(b,'cs_test_sql','pi_test_sql',80000,'pln','pending') then
    raise exception 'Valid settlement failed';
  end if;
  if public.settle_customer_stripe_payment(b,'cs_test_other','pi_test_other',80000,'pln','pending') or
     (select count(*) from public.booking_history where booking_id=b) <> before_history+1 then
    raise exception 'Duplicate/stale transition repeated the audit';
  end if;
  update public.bookings set payment_status='refunded' where id=b;
  if public.settle_customer_stripe_payment(b,'cs_test_sql','pi_test_sql',80000,'pln','refunded') then
    raise exception 'Refund overwritten';
  end if;
end $$;
reset role;
rollback;
select 'PASS: service permissions, currency, amount, settlement+audit, rollback, stale retry, refund protection' as result;
