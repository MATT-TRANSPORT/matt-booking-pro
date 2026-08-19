-- MATT Booking PRO v3.0.1 — CUSTOMER WEB PUSH REMINDER CRON
-- Opcjonalne: przypomnienie około 2h przed kursem.
-- Jeżeli NIE uruchamiałeś wcześniejszego MATT_V3_0_CUSTOMER_NOTIFICATIONS_CRON_SETUP_TEMPLATE.sql:
-- 1) dodaj w Vercel CUSTOMER_NOTIFICATIONS_CRON_SECRET
-- 2) zamień PASTE_THE_SAME_SECRET_HERE poniżej na tę samą wartość
-- 3) uruchom cały skrypt.
-- Jeżeli stary cron v3.0 JUŻ działa, nie musisz robić nic — po hotfixie endpoint wysyła Web Push zamiast Twilio.

create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists supabase_vault;

select vault.create_secret(
  'PASTE_THE_SAME_SECRET_HERE',
  'matt_customer_notifications_cron_secret',
  'Sekret dla bezpłatnych przypomnień Web Push klienta'
)
where not exists (
  select 1 from vault.decrypted_secrets
  where name = 'matt_customer_notifications_cron_secret'
);

do $$
begin
  perform cron.unschedule('matt-customer-notifications-15m');
exception when others then null;
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
      (select decrypted_secret from vault.decrypted_secrets where name = 'matt_customer_notifications_cron_secret' limit 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
