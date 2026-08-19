-- MATT Booking PRO v2.9.0 — GOOGLE CALENDAR SYNC

alter table public.bookings
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_return_event_id text,
  add column if not exists google_calendar_synced_at timestamptz,
  add column if not exists google_calendar_sync_error text;

create index if not exists bookings_google_calendar_event_idx
  on public.bookings(google_calendar_event_id)
  where google_calendar_event_id is not null;

comment on column public.bookings.google_calendar_event_id is
  'Deterministyczne ID głównego wydarzenia MATT w Google Calendar.';
comment on column public.bookings.google_calendar_return_event_id is
  'Deterministyczne ID wydarzenia powrotnego dla rezerwacji roundtrip.';
comment on column public.bookings.google_calendar_synced_at is
  'Czas ostatniej udanej synchronizacji z Google Calendar.';
comment on column public.bookings.google_calendar_sync_error is
  'Ostatni błąd synchronizacji Google Calendar.';

notify pgrst, 'reload schema';
