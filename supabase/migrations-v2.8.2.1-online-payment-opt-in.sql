-- MATT Booking PRO v2.8.2.1 — ONLINE PAYMENT OPT-IN
-- Bezpieczne do uruchomienia niezależnie od tego, czy v2.8.2 było już uruchomione.

alter table public.bookings
  add column if not exists online_payment_requested boolean not null default false;

comment on column public.bookings.online_payment_requested is
  'Klient B2C zaznaczył w formularzu, że chce zapłacić online po potwierdzeniu rezerwacji.';
