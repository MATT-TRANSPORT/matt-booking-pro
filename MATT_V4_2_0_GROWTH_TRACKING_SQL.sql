-- MATT Booking PRO v4.2.0 — GROWTH TRACKING
-- Bezpieczna migracja rozszerzająca. Nie usuwa ani nie resetuje rezerwacji.

alter table public.bookings
  add column if not exists acquisition_source text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists gclid text,
  add column if not exists fbclid text,
  add column if not exists referral_code text,
  add column if not exists landing_page text;

create index if not exists bookings_growth_source_created_idx
  on public.bookings(acquisition_source, created_at desc);

create index if not exists bookings_growth_campaign_created_idx
  on public.bookings(utm_campaign, created_at desc)
  where utm_campaign is not null;

create index if not exists bookings_growth_referral_created_idx
  on public.bookings(referral_code, created_at desc)
  where referral_code is not null;

-- Historyczne B2B rozpoznajemy jednoznacznie jako ruch z portalu firmowego.
-- Starych B2C celowo nie zgadujemy — Panel pokaże je jako LEGACY / brak trackingu.
update public.bookings
set acquisition_source = 'b2b_portal',
    utm_source = coalesce(utm_source, 'company_portal'),
    utm_medium = coalesce(utm_medium, 'owned')
where company_id is not null
  and acquisition_source is null
  and coalesce(booking_source, '') like 'b2b%';

comment on column public.bookings.acquisition_source is
  'v4.2.0: znormalizowane źródło pozyskania rezerwacji, np. google_ads, google_organic, meta_ads, partner, direct.';
comment on column public.bookings.referral_code is
  'v4.2.0: kod partnera / polecenia przekazany jako ref, referral lub referral_code.';
comment on column public.bookings.landing_page is
  'v4.2.0: pierwsza strona MATT Booking PRO z ostatniego niebezpośredniego wejścia przed rezerwacją.';

notify pgrst, 'reload schema';
