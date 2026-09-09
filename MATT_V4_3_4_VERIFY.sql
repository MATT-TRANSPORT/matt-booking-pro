-- MATT Booking PRO v4.3.4 — VERIFY
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'bookings'
  and column_name in (
    'additional_stop_address',
    'additional_stop_primary',
    'additional_stop_return',
    'additional_stop_primary_extra_km',
    'additional_stop_return_extra_km',
    'additional_stop_fee',
    'additional_stop_extra_price'
  )
order by column_name;
