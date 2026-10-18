// Generate a rollback-only database contract check from real handler fixtures.
// Run the resulting SQL ONLY on isolated project ozeqdorryajfioxpufzb.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const records=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
assert.equal(records.length,16);
for(const row of records){
 assert.ok(['bookings','wedding_bookings'].includes(row.table));
 assert.equal(row.record.customer_name,'E2E TEST ONLY');
 assert.equal(row.record.email,'test@example.invalid');
 for(const key of Object.keys(row.record))assert.match(key,/^[a-z_]+$/);
}
const payload=JSON.stringify(records);
assert.ok(!payload.includes('$contracts$'));
process.stdout.write(`-- TEST ONLY: ozeqdorryajfioxpufzb. Does not exercise deployed HTTP or Stripe.
begin;
do $$
declare
  item jsonb; entry jsonb; columns_sql text; new_id uuid; company_id uuid; employee_id uuid;
  saved_locale text; saved_return date; saved_amount numeric; number_checked integer := 0;
begin
  select id into strict company_id from public.companies where name='E2E TEST COMPANY A';
  insert into public.company_employees(company_id,first_name,last_name,email)
    values(company_id,'E2E','CONTRACT TEST','test@example.invalid') returning id into employee_id;
  for item in select value from jsonb_array_elements($contracts$${payload}$contracts$::jsonb) loop
    entry := item->'record';
    if item->>'kind'='company' then
      entry := entry || jsonb_build_object('company_id',company_id,'company_employee_id',employee_id,
        'ordered_by_user_id','33333333-3333-4333-8333-333333333333');
    end if;
    select string_agg(format('%I',key),',' order by key) into columns_sql from jsonb_object_keys(entry) key;
    execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) returning id',
      item->>'table',columns_sql,columns_sql,item->>'table') into new_id using entry;
    execute format('select customer_locale from public.%I where id=$1',item->>'table') into saved_locale using new_id;
    if saved_locale is distinct from item->>'locale' then raise exception 'Locale lost for %',item->>'kind'; end if;
    if item->>'kind'='wedding' then
      insert into public.wedding_vehicle_assignments(wedding_booking_id,slot_no,requested_vehicle_type)
        values(new_id,1,'bus'),(new_id,2,'bus');
    else
      select return_date,total_price into saved_return,saved_amount from public.bookings where id=new_id;
      if saved_return is distinct from '2027-01-27'::date then raise exception 'Return leg lost'; end if;
      if item->>'kind'='airport' and saved_amount <> 800 then raise exception 'Airport amount incorrect'; end if;
      if item->>'kind'='company' and saved_amount <> 864 then raise exception 'Company amount incorrect'; end if;
    end if;
    number_checked := number_checked+1;
  end loop;
  if number_checked<>16 then raise exception 'Incomplete contract matrix'; end if;
end $$;
rollback;
select 'PASS: 16 handler payloads, four booking kinds × PL/EN/DE/CS, database constraints, locale, return legs and amounts; test rows rolled back' as result;
`);
