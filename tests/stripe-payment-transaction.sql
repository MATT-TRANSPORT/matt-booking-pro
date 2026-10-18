-- Run ONLY against the isolated PR48 database with existing E2E fixtures.
-- Every write, including successful settlement, is rolled back.
begin;
update public.bookings set status='confirmed', total_price=800,
  customer_locale='de', payment_status='pending', payment_checkout_session_id=null, payment_intent_id=null
where booking_number='E2E-TEST-PRIVATE';
set local role service_role;
do $$
declare
  b uuid;
  before_history bigint;
  before_outbox bigint;
  claims integer;
  old_lease uuid;
  claimed_id uuid;
  settled boolean;
  signature text := 'public.settle_customer_stripe_payment_with_outbox(uuid,text,text,bigint,text,text)';
begin
  select id into strict b from public.bookings where booking_number='E2E-TEST-PRIVATE';
  select count(*) into before_history from public.booking_history where booking_id=b;
  select count(*) into before_outbox from public.payment_notification_outbox where booking_id=b;
  if has_table_privilege('anon','public.payment_notification_outbox','SELECT') or
     has_table_privilege('authenticated','public.payment_notification_outbox','SELECT') or
     has_function_privilege('authenticated','public.claim_payment_notifications(uuid,integer)','EXECUTE') then
    raise exception 'Outbox exposed to client roles';
  end if;
  if has_function_privilege('anon', signature, 'EXECUTE') or
     has_function_privilege('authenticated', signature, 'EXECUTE') or
     not has_function_privilege('service_role', signature, 'EXECUTE') then
    raise exception 'Payment function access regression';
  end if;

  begin
    perform public.settle_customer_stripe_payment_with_outbox(b,'cs_test_sql','pi_test_sql',80000,'eur','pending');
    raise exception 'Invalid currency accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid Stripe payment parameters' then raise; end if;
  end;
  if public.settle_customer_stripe_payment_with_outbox(b,'cs_test_sql','pi_test_sql',79999,'pln','pending') then
    raise exception 'Mismatched amount accepted';
  end if;

  -- An old inline sender must not also enqueue a receipt during rollout.
  begin
    perform public.settle_customer_stripe_payment(b,'cs_test_legacy','pi_test_legacy',80000,'pln','pending');
    if (select count(*) from public.payment_notification_outbox where booking_id=b) <> before_outbox then
      raise exception 'Legacy sender also queued a receipt';
    end if;
    raise exception using errcode='P0002',message='Legacy guard test rollback';
  exception when no_data_found then
    if sqlerrm <> 'Legacy guard test rollback' then raise; end if;
  end;
  -- Force rollback of the nested settlement transaction, then prove neither
  -- state nor history survived. No temporary trigger/permissions are installed.
  begin
    settled := public.settle_customer_stripe_payment_with_outbox(b,'cs_test_sql','pi_test_sql',80000,'pln','pending');
    if not settled then raise exception 'Service settlement did not run'; end if;
    if (select payment_status from public.bookings where id=b) <> 'paid' or
       (select count(*) from public.booking_history where booking_id=b) <> before_history+1 then
      raise exception 'Settlement and audit were not written together';
    end if;
    if (select count(*) from public.payment_notification_outbox where booking_id=b) <> before_outbox+2 then
      raise exception 'Settlement did not atomically queue both notifications';
    end if;
    raise exception using errcode='P0002', message='Intentional transaction rollback';
  exception when no_data_found then
    if sqlerrm <> 'Intentional transaction rollback' then raise; end if;
  end;
  if (select payment_status from public.bookings where id=b) <> 'pending' or
     (select count(*) from public.booking_history where booking_id=b) <> before_history then
    raise exception 'Partial payment transaction survived rollback';
  end if;

  if (select count(*) from public.payment_notification_outbox where booking_id=b) <> before_outbox then
    raise exception 'Outbox survived rolled-back payment';
  end if;
  if not public.settle_customer_stripe_payment_with_outbox(b,'cs_test_sql','pi_test_sql',80000,'pln','pending') then
    raise exception 'Valid settlement failed';
  end if;
  if public.settle_customer_stripe_payment_with_outbox(b,'cs_test_other','pi_test_other',80000,'pln','pending') or
     (select count(*) from public.booking_history where booking_id=b) <> before_history+1 then
    raise exception 'Duplicate/stale transition repeated the audit';
  end if;
  if (select count(*) from public.payment_notification_outbox where booking_id=b and booking_snapshot->>'customer_locale'='de') <> before_outbox+2 then
    raise exception 'Queued notification locale lost';
  end if;
  select count(*) into claims from public.claim_payment_notifications(b,3);
  if claims<>2 then raise exception 'Incomplete outbox claim'; end if;
  select id,lease_token into claimed_id,old_lease from public.payment_notification_outbox where booking_id=b limit 1;
  select count(*) into claims from public.claim_payment_notifications(b,3);
  if claims<>0 then raise exception 'Concurrent claim reused active jobs'; end if;
  update public.payment_notification_outbox set processing_started_at=now()-interval '11 minutes' where booking_id=b;
  select count(*) into claims from public.claim_payment_notifications(b,3);
  if claims<>2 then raise exception 'Expired outbox leases not recovered'; end if;
  update public.payment_notification_outbox set status='sent' where id=claimed_id and lease_token=old_lease;
  if found then raise exception 'Old lease overwrote replacement claim'; end if;
  update public.bookings set payment_status='refunded' where id=b;
  if public.settle_customer_stripe_payment_with_outbox(b,'cs_test_sql','pi_test_sql',80000,'pln','refunded') then
    raise exception 'Refund overwritten';
  end if;
  if current_setting('matt.payment_outbox',true)='v1' then raise exception 'Outbox mode leaked past settlement'; end if;
  update public.companies set email='company-admin@example.invalid' where name='E2E TEST COMPANY A';
  update public.bookings set company_id=(select id from public.companies where name='E2E TEST COMPANY A'),
    price_gross=864,total_price=864,payment_status='pending' where id=b;
  if not public.settle_customer_stripe_payment_with_outbox(b,'cs_test_company','pi_test_company',86400,'pln','pending') then
    raise exception 'Company Checkout settlement failed';
  end if;
  if (select count(*) from public.payment_notification_outbox where booking_id=b and payment_reference='pi_test_company'
      and kind='customer_email' and recipient='company-admin@example.invalid')<>1 then
    raise exception 'B2B receipt did not target the company administrator';
  end if;
end $$;
reset role;
rollback;
select 'PASS: service permissions, currency, amount, settlement+audit+outbox, rollback, stale retry, refund protection, outbox claims and stale lease fencing' as result;
