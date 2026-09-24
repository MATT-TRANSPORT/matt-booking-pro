-- MATT Booking PRO v4.9.0 — QUOTE ACCEPTANCE WORKFLOW

alter table public.bookings
  add column if not exists quote_sent_at timestamptz,
  add column if not exists quote_expires_at timestamptz,
  add column if not exists quote_accepted_at timestamptz,
  add column if not exists quote_rejected_at timestamptz,
  add column if not exists quote_note text;

create index if not exists bookings_quote_decision_idx
  on public.bookings(quote_required, quote_status, quote_expires_at);

comment on column public.bookings.quote_sent_at is
  'Moment wysłania indywidualnej wyceny klientowi.';
comment on column public.bookings.quote_expires_at is
  'Termin ważności indywidualnej wyceny. NULL dla starszych wycen wymagających ponownego wysłania.';
comment on column public.bookings.quote_accepted_at is
  'Moment zaakceptowania wyceny przez klienta.';
comment on column public.bookings.quote_rejected_at is
  'Moment odrzucenia wyceny przez klienta.';
comment on column public.bookings.quote_note is
  'Opcjonalna wiadomość/warunki dołączone przez MATT do wyceny.';
