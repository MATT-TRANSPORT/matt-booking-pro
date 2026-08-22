-- MATT Booking PRO v4.0.0 — kontrola produkcyjna

-- 1. Kolumny review automation
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='bookings'
  and column_name in (
    'completed_at',
    'review_request_started_at',
    'review_request_sent_at',
    'review_request_email_sent_at',
    'review_request_push_sent_at'
  )
order by column_name;

-- 2. Cron komunikacji powinien nadal działać co 15 minut.
select jobid, jobname, schedule, active
from cron.job
where jobname='matt-customer-notifications-15m';

-- 3. Ostatnie uruchomienia crona
select jobid, status, return_message, start_time, end_time
from cron.job_run_details
where jobid in (
  select jobid from cron.job where jobname='matt-customer-notifications-15m'
)
order by start_time desc
limit 10;

-- 4. Polityki zapisanych adresów B2B
select policyname, cmd
from pg_policies
where schemaname='public' and tablename='company_addresses'
order by policyname;
