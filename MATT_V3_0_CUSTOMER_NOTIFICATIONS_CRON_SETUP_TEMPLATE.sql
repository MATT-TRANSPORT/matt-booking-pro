-- MATT Booking PRO v3.0 — CUSTOMER NOTIFICATIONS CRON SETUP
-- 1) W Vercel dodaj CUSTOMER_NOTIFICATIONS_CRON_SECRET
-- 2) poniżej zamień PASTE_THE_SAME_SECRET_HERE na DOKŁADNIE tę samą wartość
-- 3) uruchom cały skrypt w Supabase SQL Editor

create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists supabase_vault;

select vault.create_secret(
  'PASTE_THE_SAME_SECRET_HERE',
  'matt_customer_notifications_cron_secret',
  'Sekret v3.0 dla cron przypomnień klienta'
)
where not exists (
  select 1
  from vault.decrypted_secrets
  where name = 'matt_customer_notifications_cron_secret'
);

-- Jeżeli sekret już istnieje, zaktualizuj go ręcznie w Vault lub usuń stary wpis przed ponownym uruchomieniem.

do $$
begin
  perform cron.unschedule('matt-customer-notifications-15m');
exception when others then
  null;
end $$;

select cron.schedule(
  'matt-customer-notifications-15m',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://panel.matt-transport.pl/api/cron/customer-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-customer-notifications-secret',
      (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'matt_customer_notifications_cron_secret'
        limit 1
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
