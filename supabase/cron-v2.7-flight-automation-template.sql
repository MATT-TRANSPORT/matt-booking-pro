-- MATT Booking PRO v2.7 — FLIGHT AUTOMATION CRON SETUP
--
-- BEFORE RUNNING:
-- 1. In Vercel add environment variable:
--    FLIGHT_MONITOR_CRON_SECRET
--    with a long random value (minimum 32 characters).
--
-- 2. Replace ONLY:
--    PASTE_THE_SAME_SECRET_HERE
--    below with exactly the same value.
--
-- 3. Run this SQL in Supabase SQL Editor AFTER deploying v2.7.
--
-- Cron calls MATT panel every 10 minutes.
-- The application decides whether each flight actually needs an AirLabs request.
-- This means cron can run often without querying AirLabs every time.

create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists supabase_vault;

-- Remove the old Vault value if this setup is re-run.
delete from vault.secrets
where name = 'matt_flight_monitor_cron_secret';

select vault.create_secret(
  'PASTE_THE_SAME_SECRET_HERE',
  'matt_flight_monitor_cron_secret'
);

-- Re-running cron.schedule with the same job name replaces that job.
select cron.schedule(
  'matt-flight-monitor-v2-7',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://panel.matt-transport.pl/api/cron/flight-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-flight-monitor-secret',
      (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'matt_flight_monitor_cron_secret'
        limit 1
      )
    ),
    body := jsonb_build_object(
      'source', 'supabase-cron',
      'time', now()
    ),
    timeout_milliseconds := 15000
  ) as request_id;
  $$
);

-- Check job:
select jobid, jobname, schedule, active
from cron.job
where jobname = 'matt-flight-monitor-v2-7';
