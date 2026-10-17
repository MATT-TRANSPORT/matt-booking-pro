-- Preserve the customer's selected language for future transactional notifications.
-- Legacy bookings continue to use Polish.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_locale text NOT NULL DEFAULT 'pl';

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_customer_locale_valid
  CHECK (customer_locale IN ('pl', 'en', 'de', 'cs'));
