-- Apply before deploying the webhook worker. No customer/payment data changed.
alter table public.payment_webhook_events
  add column if not exists processing_started_at timestamptz not null default now();
