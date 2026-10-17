-- Store the language selected by wedding transport customers.
ALTER TABLE public.wedding_bookings
  ADD COLUMN IF NOT EXISTS customer_locale text NOT NULL DEFAULT 'pl';
ALTER TABLE public.wedding_bookings
  ADD CONSTRAINT wedding_bookings_customer_locale_valid
  CHECK (customer_locale IN ('pl', 'en', 'de', 'cs'));
