// Runs against the explicitly isolated test project using real Supabase Auth/REST.
// Credentials live outside git; no service-role key is used in these assertions.
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createClient}=require('@supabase/supabase-js');
const config=JSON.parse(fs.readFileSync(process.env.MATT_TEST_CONFIG_FILE,'utf8'));
const users=JSON.parse(fs.readFileSync(process.env.MATT_E2E_USERS_FILE,'utf8'));
assert.equal(config.MATT_TEST_MODE,'1');
assert.equal(new URL(config.NEXT_PUBLIC_SUPABASE_URL).hostname,'ozeqdorryajfioxpufzb.supabase.co','This test must never run against production');
const create=()=>createClient(config.NEXT_PUBLIC_SUPABASE_URL,config.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
const clients={},anon=create();
before(async()=>{
 for(const user of users){
  const client=create();const {data,error}=await client.auth.signInWithPassword({email:user.email,password:user.password});
  assert.equal(error,null,`${user.role}: Auth login failed`);assert.ok(data.session);clients[user.role]=client;
 }
});
after(async()=>{for(const client of Object.values(clients))await client.auth.signOut();});
const numbers=async client=>{
 const {data,error}=await client.from('bookings').select('booking_number').eq('booking_source','e2e_test').order('booking_number');assert.equal(error,null);return data.map(x=>x.booking_number);
};
test('anonymous REST cannot read bookings or insert without server validation',async()=>{
 assert.deepEqual(await numbers(anon),[]);
 const {error}=await anon.from('bookings').insert({booking_number:'E2E-FORBIDDEN',service_type:'to_airport',pickup_address:'E2E TEST',airport_key:'pyrzowice',airport_label:'TEST',travel_date:'2027-02-20',travel_time:'08:30',passengers:1,vehicle_type:'car',customer_name:'E2E TEST',phone:'+48000000000',email:'test@example.invalid'});
 assert.equal(error?.code,'42501');
});
test('company A sees only its own bookings despite user-editable admin metadata',async()=>{
 assert.deepEqual(await numbers(clients.company_a),['E2E-TEST-COMPANY-A']);
 const {data,error}=await clients.company_a.from('profiles').select('id');assert.equal(error,null);assert.deepEqual(data,[]);
});
test('company B cannot access the first company or private customers',async()=>{
 assert.deepEqual(await numbers(clients.company_b),['E2E-TEST-COMPANY-B']);
});
test('company cannot update a booking directly through the REST API',async()=>{
 const {data,error}=await clients.company_a.from('bookings').update({notes:'E2E FORBIDDEN UPDATE'}).eq('booking_number','E2E-TEST-COMPANY-A').select('id');
 assert.equal(error,null);assert.deepEqual(data,[]);
});
test('driver sees only an assigned journey',async()=>{
 assert.deepEqual(await numbers(clients.driver),['E2E-TEST-PRIVATE']);
});
test('staff can read all test journeys and update them',async()=>{
 assert.deepEqual(await numbers(clients.staff),['E2E-TEST-COMPANY-A','E2E-TEST-COMPANY-B','E2E-TEST-PRIVATE']);
 const {data,error}=await clients.staff.from('bookings').update({notes:'E2E STAFF VERIFIED'}).eq('booking_number','E2E-TEST-PRIVATE').select('notes');
 assert.equal(error,null);assert.equal(data[0].notes,'E2E STAFF VERIFIED');
});
test('booking history follows the same company boundary',async()=>{
 for(const role of ['company_a','company_b','driver']){
  const {data,error}=await clients[role].from('booking_history').select('event').eq('event','E2E TEST ONLY');assert.equal(error,null);assert.equal(data.length,1);assert.equal(data[0].event,'E2E TEST ONLY');
 }
});
test('anonymous, company, driver and staff REST clients cannot execute server-only Stripe settlement',async()=>{
 for(const client of [anon,...Object.values(clients)]){
  const {error}=await client.rpc('settle_customer_stripe_payment',{
   p_booking_id:'1acca7ba-1a33-45fc-b24f-2db775edbcf4',
   p_checkout_session_id:'cs_test_forbidden',p_payment_intent_id:'pi_test_forbidden',
   p_amount_cents:80000,p_currency:'pln',p_expected_status:'pending'
  });
  assert.equal(error?.code,'42501','Client must never have settlement privileges');
 }
});
