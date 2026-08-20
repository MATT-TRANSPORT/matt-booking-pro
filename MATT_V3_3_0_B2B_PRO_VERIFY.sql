-- MATT Booking PRO v3.3.0 — szybka kontrola migracji

select table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'company_commercial_terms',
    'company_commercial_prices',
    'booking_documents'
  )
order by table_name;

select column_name
from information_schema.columns
where table_schema='public'
  and table_name='bookings'
  and column_name like 'b2b_%'
order by column_name;

select id, name, public, file_size_limit
from storage.buckets
where id='booking-documents';

select
  c.name,
  t.effective_from,
  t.headquarters_address,
  t.free_km,
  t.extra_km_rate_net,
  t.vat_rate,
  t.use_custom_pricing
from public.companies c
left join lateral (
  select *
  from public.company_commercial_terms t2
  where t2.company_id=c.id
  order by t2.effective_from desc, t2.created_at desc
  limit 1
) t on true
order by c.name;
