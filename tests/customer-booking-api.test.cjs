// Real route handlers with local database/provider fixtures; no network calls.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const {randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'..');
let writes=[],emails=[],adminAccess=0;
let repeatSource=null, expiredSessions=[], strictExpiryFails=false;
const allRecords=[];
function reset(){writes=[];emails=[];adminAccess=0;expiredSessions=[];strictExpiryFails=false}
function query(table){
 let insert,update;
 const q={select(){return q},eq(){return q},limit(){return q},order(){return q},single(){return q},maybeSingle(){return q},insert(value){insert=value;return q},update(value){update=value;return q},
 then(resolve,reject){return Promise.resolve().then(()=>{
  if(update){writes.push({table,value:update});return {data:{...repeatSource,...update},error:null}}
  if(insert && table==='bookings' && JSON.parse(JSON.stringify(insert)).customer_email_normalized!==undefined) return {data:null,error:{message:'cannot insert a non-DEFAULT value into column customer_email_normalized'}};
  if(insert){writes.push({table,value:insert});return {data:{id:randomUUID(),booking_number:'TEST-ONLY',customer_access_token:'test-only',...insert},error:null}}
  const rows={bookings:repeatSource,airport_pricing:{airport_key:'pyrzowice',label:'Katowice-Pyrzowice',route_address:'Test airport',car_price:290,bus_price:400,active:true},company_users:{company_id:'test-company',role:'admin'},company_employees:{id:'test-employee',first_name:'E2E TEST',last_name:'ONLY',email:'test@example.invalid'},companies:{email:'company@example.invalid'}};
  return {data:rows[table]??null,error:null};
 }).then(resolve,reject)}};return q;
}
const admin={from:query};
const originalLoad=Module._load;
Module._load=function(id,parent,isMain){
 if(id==='@/lib/supabase/admin')return {createAdminClient:()=>{adminAccess++;return admin}};
 if(id==='@/lib/supabase/server')return {createClient:async()=>({from:query,auth:{getUser:async()=>({data:{user:{id:'test-user',email:'company@example.invalid'}}})}})};
 if(id==='@/lib/stripeServer')return {expireCheckoutSession:async id=>{expiredSessions.push(id)},expireCheckoutSessionForChange:async id=>{if(strictExpiryFails)throw new Error("Stripe unavailable");expiredSessions.push(id)}};
 if(id==='@/lib/googleCalendar')return {syncBookingCalendar:async()=>{}};
 if(id==='@/lib/email')return {sendMattEmail:async value=>{emails.push(value);return {sent:false,skipped:true}}};
 if(id==='@/lib/adminNotifications')return {sendNewBookingAdminPush:async()=>({sent:0,skipped:true}),sendNewWeddingAdminPush:async()=>({sent:0,skipped:true})};
 if(id==='@/lib/customerNotifications')return {sendBookingNotification:async()=>({sent:false,skipped:true})};
 if(id==='@/lib/pushServer')return {sendAdminPush:async()=>({sent:0,skipped:true}),sendDriverPush:async()=>({sent:0,skipped:true})};
 if(id==='@/lib/routesServer')return {shortestDrivingRouteKm:async()=>({distanceKm:120})};
 if(id==='@/lib/companyPricing')return {calculateCompanyQuote:async(_admin,input)=>({serviceType:input.serviceType,airportKey:input.airportKey,airportLabel:'Katowice-Pyrzowice',vehicleType:input.vehicleType,defaultPaymentMethod:'company_transfer',net:800,gross:864,vatRate:8,distanceKm:20,billableKm:0}),bookingPricingFields:()=>({total_price:864,price_net:800,price_gross:864,vat_price:64,vat_rate:8})};
 if(id.startsWith('@/'))id=path.join(root,id.slice(2));
 return originalLoad.call(this,id,parent,isMain);
};
require.extensions['.ts']=function(module,file){module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file)};
const routes={airport:require('../app/api/bookings/route.ts').POST,company:require('../app/api/company/bookings/route.ts').POST,wedding:require('../app/api/wedding-bookings/route.ts').POST,general:require('../app/api/general-bookings/route.ts').POST};
const base={serviceType:'roundtrip',address:'TEST ONLY - Radlin',origin:'TEST ONLY - Radlin',destination:'TEST ONLY - Katowice',airport:'pyrzowice',vehicleType:'bus',passengers:8,distanceKm:20,travelDate:'2027-01-20',travelTime:'08:30',returnDate:'2027-01-27',returnTime:'14:55',roundtrip:true,customerName:'E2E TEST ONLY',phone:'+48000000000',email:'test@example.invalid',paymentMethod:'cash',employeeId:'test-employee',startDate:'2027-01-20',startTime:'18:30',restaurantName:'TEST ONLY',restaurantAddress:'TEST ONLY',vehiclesCount:2,vehicleTypes:['bus','bus']};
const invalidCopy={pl:'Nieprawidłowe dane formularza.',en:'Invalid form data.',de:'Ungültige Formulardaten.',cs:'Neplatné údaje formuláře.'};
function request(body,locale,mode='header'){
 return {headers:new Headers(mode==='header'?{'x-matt-locale':locale}:{}),nextUrl:new URL('http://localhost/test'+(mode==='query'?'?lang='+locale:'')),json:async()=>body};
}
for(const locale of ['pl','en','de','cs'])for(const [kind,post] of Object.entries(routes)){
 test(`${kind}/${locale}: malformed JSON and non-object bodies return localized 400 before writes`,async()=>{
  for(const body of ['malformed',null,[],42,'text']){
   reset();const req=request(body,locale);if(body==='malformed')req.json=async()=>{throw new SyntaxError('Invalid JSON')};
   const response=await post(req);assert.equal(response.status,400);assert.equal((await response.json()).error,invalidCopy[locale]);assert.deepEqual(writes,[]);assert.equal(adminAccess,0);
  }
 });
 for(const mode of ['body','header','query'])test(`${kind}/${locale}: ${mode} locale survives persistence and response`,async()=>{
  reset();const input={...base,...(mode==='body'?{locale}:{})};const response=await post(request(input,locale,mode));
  assert.equal(response.status,200);const data=await response.json();assert.equal(data.customer_locale,locale);
  const record=writes.find(w=>['bookings','wedding_bookings'].includes(w.table));assert.equal(record.value.customer_locale,locale);
  assert.equal(data.return_date??input.returnDate,input.returnDate);assert.equal(data.return_time??input.returnTime,input.returnTime);
  const customerMail=emails.find(m=>['test@example.invalid','company@example.invalid'].includes(m.to));assert.ok(customerMail);
  if(locale!=='pl')assert.doesNotMatch(customerMail.subject,/Transport weselny|Przyjęliśmy|Rezerwacja przyjęta/);
  if(kind!=='wedding')assert.ok(customerMail.html.includes('lang='+locale));
  if(mode==='body')allRecords.push({table:record.table,record:record.value,kind,locale});
 });
}
for(const locale of ['pl','en','de','cs'])test(`company/${locale}: missing, invalid and earlier return dates never reach booking insert`,async()=>{
 for(const overrides of [{travelDate:''},{travelDate:'invalid'},{returnDate:null},{returnDate:'2027-01-19'}]){
  reset();const response=await routes.company(request({...base,...overrides,locale},locale));assert.equal(response.status,400);assert.equal(writes.length,0);
 }
});
test('export safe database contract fixtures when explicitly requested',()=>{
 if(process.env.MATT_BOOKING_CONTRACT_FILE)fs.writeFileSync(process.env.MATT_BOOKING_CONTRACT_FILE,JSON.stringify(allRecords),{mode:0o600});
});
for(const locale of ['pl','en','de','cs']){
 test(`wedding/${locale}: invalid vehicle counts and dates cause no writes`,async()=>{
  for(const overrides of [{vehiclesCount:-1},{vehiclesCount:1.5},{vehiclesCount:21},{vehiclesCount:'invalid'},{startDate:'invalid'},{startDate:'2027-02-31'},{startTime:'99:00'}]){
   reset();const response=await routes.wedding(request({...base,...overrides,locale},locale));assert.equal(response.status,400);assert.deepEqual(writes,[]);
  }
 });
 for(const kind of ['airport','company','general'])test(`${kind}/${locale}: invalid passenger counts cause no writes`,async()=>{
  for(const passengers of ['invalid',1.5,-1,kind==='general'?31:9]){
   reset();const response=await routes[kind](request({...base,passengers,locale},locale));assert.equal(response.status,400);assert.deepEqual(writes,[]);
  }
 });
}

const repeatBooking=require('../app/api/company/bookings/[id]/route.ts').POST;
for(const locale of ['pl','en','de','cs'])test(`company repeat/${locale}: generated email excluded, new return dates and payment reset persisted`,async()=>{
 reset(); repeatSource={id:'old-test-only',company_id:'test-company',booking_number:'TEST-OLD',customer_email_normalized:'test@example.invalid',email:'test@example.invalid',customer_name:'TEST ONLY',service_type:'roundtrip',pickup_address:'TEST ONLY',airport_key:'pyrzowice',vehicle_type:'bus',passengers:8,travel_date:'2027-01-20',return_date:'2027-01-27',customer_locale:'en',payment_status:'paid',payment_checkout_session_id:'cs_test_old',payment_intent_id:'pi_test_old',driver_id:'old-driver',return_driver_id:'old-return-driver'};
 const response=await repeatBooking(request({action:'repeat',locale,travelDate:'2027-02-10',travelTime:'08:30',returnDate:'2027-02-17',returnTime:'14:55'},locale),{params:Promise.resolve({id:repeatSource.id})});
 assert.equal(response.status,200); const data=await response.json();
 assert.equal(data.customer_locale,locale);assert.equal(data.return_date,'2027-02-17');assert.equal(data.return_time,'14:55');assert.equal(data.travel_date,'2027-02-10');
 const saved=JSON.parse(JSON.stringify(writes.find(w=>w.table==='bookings').value));
 assert.ok(!Object.hasOwn(saved,'customer_email_normalized'));assert.equal(saved.payment_status,'pending');assert.equal(saved.payment_checkout_session_id,null);assert.equal(saved.payment_intent_id,null);assert.equal(saved.driver_id,null);assert.equal(saved.return_driver_id,null);assert.equal(saved.price_gross,864);assert.notEqual(saved.customer_access_token,repeatSource.customer_access_token);
 assert.equal(emails.length,0);
});

for(const locale of ['pl','en','de','cs']){
 test(`company update/${locale}: return-only change expires old Checkout, saves dates and requests reconfirmation`,async()=>{
  reset();repeatSource={...repeatSource,status:'confirmed',customer_locale:locale,payment_status:'pending',payment_checkout_session_id:'cs_test_old',travel_date:'2027-02-10',travel_time:'08:30:00',return_date:'2027-02-17',return_time:'14:55:00',price_gross:864};
  const body={action:'update',locale,serviceType:'roundtrip',address:repeatSource.pickup_address,airport:'pyrzowice',vehicleType:'bus',passengers:8,travelDate:'2027-02-10',travelTime:'08:30',returnDate:'2027-02-18',returnTime:'15:10'};
  const response=await repeatBooking(request(body,locale),{params:Promise.resolve({id:repeatSource.id})});assert.equal(response.status,200);const data=await response.json();
  assert.equal(data.return_date,'2027-02-18');assert.equal(data.return_time,'15:10');assert.equal(data.status,'pending');assert.equal(data.customer_locale,locale);assert.equal(data.payment_checkout_session_id,null);assert.deepEqual(expiredSessions,['cs_test_old']);
  assert.ok(writes.some(w=>w.table==='booking_history'&&w.value.event.includes('data powrotu')));
 });
 test(`company actions/${locale}: malformed bodies and impossible/reversed dates cannot mutate or expire Checkout`,async()=>{
  for(const action of ['repeat','update'])for(const overrides of [{travelDate:'2027-02-31'},{returnDate:'2027-02-09'},{returnTime:'99:00'},{returnDate:'2027-02-30'}]){
   reset();repeatSource={...repeatSource,status:'confirmed',payment_status:'pending'};
   const response=await repeatBooking(request({action,locale,serviceType:'roundtrip',travelDate:'2027-02-10',travelTime:'08:30',returnDate:'2027-02-17',returnTime:'14:55',...overrides},locale),{params:Promise.resolve({id:repeatSource.id})});
   assert.equal(response.status,400);assert.deepEqual(writes,[]);assert.deepEqual(expiredSessions,[]);
  }
  for(const body of [null,[],42]){reset();const response=await repeatBooking(request(body,locale),{params:Promise.resolve({id:'test-only'})});assert.equal(response.status,400);assert.deepEqual(writes,[]);}
 });
}

for(const locale of ['pl','en','de','cs']) for(const method of ['company_transfer','employee_payment']) {
 test(`company payment change/${locale}/${method}: requires reconfirmation and blocks payment`,async()=>{
  reset();repeatSource={...repeatSource,updated_at:'2026-10-27T10:00:00Z',status:'confirmed',customer_locale:locale,payment_status:'pending',payment_method:method==='company_transfer'?'employee_payment':'company_transfer',payment_link:'https://invalid.test/old',payment_checkout_session_id:'cs_test_old',travel_date:'2027-02-10',travel_time:'08:30',return_date:'2027-02-17',return_time:'14:55',price_gross:864};
  const body={action:'update',locale,paymentMethod:method,serviceType:'roundtrip',address:repeatSource.pickup_address,airport:'pyrzowice',vehicleType:'bus',passengers:8,travelDate:'2027-02-10',travelTime:'08:30',returnDate:'2027-02-17',returnTime:'14:55'};
  const response=await repeatBooking(request(body,locale),{params:Promise.resolve({id:repeatSource.id})});
  assert.equal(response.status,200);const data=await response.json();assert.equal(data.payment_method,method);assert.equal(data.status,'pending');assert.equal(data.payment_link,null);assert.equal(data.payment_checkout_session_id,null);assert.deepEqual(expiredSessions,['cs_test_old']);
  assert.equal(require('../lib/payment.ts').paymentCanStart(data),false);
  assert.ok(writes.some(w=>w.table==='booking_history'&&w.value.event.includes('sposób płatności')));
  const notice=emails.find(e=>e.to==='company@example.invalid');assert.ok(notice);assert.match(notice.html, /confirmation|Bestätigung|potvrzení|potwierdzenie/);
  reset();repeatSource={...repeatSource,payment_method:method};
  const unchanged=await repeatBooking(request(body,locale),{params:Promise.resolve({id:repeatSource.id})});assert.equal(unchanged.status,200);assert.equal((await unchanged.json()).status,'confirmed');assert.deepEqual(expiredSessions,[]);
  for(const bad of ['cash','online','',null,{}]){reset();const response=await repeatBooking(request({...body,paymentMethod:bad},locale),{params:Promise.resolve({id:repeatSource.id})});assert.equal(response.status,400);assert.deepEqual(writes,[]);}
  for(const paymentStatus of ['paid','review','refunded']){reset();repeatSource.payment_status=paymentStatus;const response=await repeatBooking(request({...body,paymentMethod:method==='company_transfer'?'employee_payment':'company_transfer'},locale),{params:Promise.resolve({id:repeatSource.id})});assert.equal(response.status,409);assert.deepEqual(writes,[]);}
  reset();repeatSource.payment_status='pending';strictExpiryFails=true;const failed=await repeatBooking(request({...body,paymentMethod:method==='company_transfer'?'employee_payment':'company_transfer'},locale),{params:Promise.resolve({id:repeatSource.id})});assert.equal(failed.status,409);assert.deepEqual(writes,[]);
 });
}
