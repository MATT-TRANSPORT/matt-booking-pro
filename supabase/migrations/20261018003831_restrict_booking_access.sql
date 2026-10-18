-- Remove legacy policies that exposed all bookings to every signed-in account.
-- Private helpers resolve only the caller's role/driver and avoid RLS recursion.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_matt_staff()
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','dispatcher','accounting')
  );
$$;
create or replace function private.matt_driver_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select d.id from public.drivers d
  where auth.uid() is not null and (d.user_id = auth.uid() or d.profile_id = auth.uid())
  order by d.id limit 1;
$$;
revoke all on function private.is_matt_staff() from public, anon;
revoke all on function private.matt_driver_id() from public, anon;
grant execute on function private.is_matt_staff() to authenticated;
grant execute on function private.matt_driver_id() to authenticated;

-- Customer inserts go through validated server routes, never directly to REST.
drop policy if exists public_insert_booking on public.bookings;
drop policy if exists authenticated_read_bookings on public.bookings;
create policy authenticated_read_bookings on public.bookings for select to authenticated
using (
  (select private.is_matt_staff()) or
  driver_id = (select private.matt_driver_id()) or
  return_driver_id = (select private.matt_driver_id())
);
-- The existing company_read_own_bookings policy adds active-company membership.
drop policy if exists authenticated_update_bookings on public.bookings;
create policy authenticated_update_bookings on public.bookings for update to authenticated
using ((select private.is_matt_staff()))
with check ((select private.is_matt_staff()));

drop policy if exists authenticated_read_profiles on public.profiles;
create policy authenticated_read_profiles on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_matt_staff()));

drop policy if exists authenticated_read_drivers on public.drivers;
create policy authenticated_read_drivers on public.drivers for select to authenticated
using (
  (select private.is_matt_staff()) or id = (select private.matt_driver_id()) or
  exists (select 1 from public.bookings b where b.driver_id = drivers.id or b.return_driver_id = drivers.id)
);

drop policy if exists authenticated_read_history on public.booking_history;
create policy authenticated_read_history on public.booking_history for select to authenticated
using (exists (select 1 from public.bookings b where b.id = booking_history.booking_id));
drop policy if exists authenticated_insert_history on public.booking_history;
create policy authenticated_insert_history on public.booking_history for insert to authenticated
with check ((select private.is_matt_staff()));

notify pgrst, 'reload schema';
