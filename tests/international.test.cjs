const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
const originalLoad = Module._load;
let testBooking, checkoutCalls=[], dbWrites=[];
// Every database and Stripe dependency is replaced before the route is loaded.
// These tests never open a socket or read production credentials.
const admin = {from(table){ const chain={select(){return chain},eq(){return chain},single:async()=>({data:testBooking}),maybeSingle:async()=>({data:testBooking}),update(value){dbWrites.push({table,value});return chain},insert:async value=>{dbWrites.push({table,value});return {error:null}}};return chain;}};
Module._load = function(id,parent,isMain){
  if(id==='@/lib/supabase/server') return {createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'test-user'}}})},from:()=>({select(){return this},eq(){return this},single:async()=>({data:{company_id:'test-company',role:'admin'}})})})};
  if(id==='@/lib/supabase/admin') return {createAdminClient:()=>admin};
  if(id==='@/lib/stripeServer') return {getStripe:()=>({checkout:{sessions:{create:async input=>{checkoutCalls.push(input);return {id:'cs_test_fixture',url:'https://example.invalid/local-checkout'}}}}}),expireCheckoutSession:async()=>{}};
  if(id.startsWith('@/')) id=path.join(root,id.slice(2));
  return originalLoad.call(this,id,parent,isMain);
};
require.extensions['.ts'] = function(module,filename){
  const source=fs.readFileSync(filename,'utf8');
  module._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
};
const {resolveCustomerLocale,withCustomerLocale}=require('../lib/bookingLocale.ts');
const {customerCopy}=require('../lib/customerCopy.ts');
const {calculateQuote}=require('../lib/pricing.ts');
const {customerUpdateText,quickSmsUrl,quickWhatsAppUrl}=require('../lib/customerNotifications.ts');
const {localizedReceivedEmail}=require('../lib/localizedBookingEmails.ts');
const {assignedEmail,adminNewBookingEmail}=require('../lib/emailTemplates.ts');
const {emailTrustNotice}=require('../lib/emailTrustNotice.ts');
const {stablePaymentUrl}=require('../lib/payment.ts');
const {POST:checkout}=require('../app/api/payments/checkout/[token]/route.ts');
const {POST:companyCheckout}=require('../app/api/payments/company-employee/[token]/route.ts');
const base={id:'test-only',booking_number:'TEST-ONLY',customer_name:'<script>test</script>',customer_access_token:'test-token',pickup_address:'Radlin, Mariacka 9',airport_label:'Katowice-Pyrzowice',service_type:'roundtrip',travel_date:'2027-01-20',travel_time:'08:30',return_date:'2027-01-27',return_time:'14:55',passengers:8,vehicle_type:'bus',total_price:800,status:'confirmed',payment_status:'pending',payment_method:'online'};
const kinds=['received','confirmed','assigned','reminder_24h','reminder_120','review_request','in_progress','arrived','completed','cancelled','flight_delay','flight_cancelled','flight_diverted'];

test('fallback fare keeps current round-trip airport prices before the live catalog arrives',()=>{
  const quote=airport=>calculateQuote({airport,serviceType:'roundtrip',vehicleType:airport==='balice'?'car':'bus',distanceKm:18.8,invoiceRequired:false});
  assert.equal(quote('balice').totalPrice,780);
  assert.equal(quote('pyrzowice').totalPrice,800);
});

test('legacy, invalid and unsupported locales fall back to Polish',()=>{
  for(const value of [null,undefined,'','cz','fr','EN',42,{},'<script>'])assert.equal(resolveCustomerLocale(value),'pl');
});
test('locale URLs preserve query and fragment without duplicates',()=>{
  const value=withCustomerLocale('/rezerwacja/token?pay=1&lang=en#payment','de');
  assert.equal(value,'/rezerwacja/token?pay=1&lang=de#payment');
  assert.equal(withCustomerLocale(value,'de'),value);
});
test('every shared translation provides EN, DE and CS',()=>{
  for(const [key,row] of Object.entries(customerCopy)){
    assert.equal(row.length,3,key);
    for(const text of row)assert.ok(typeof text==='string'&&text.trim(),key);
  }
});
for(const locale of ['pl','en','de','cs']){
 test(`${locale}: notification lifecycle and return-leg dates`,()=>{
   const booking={...base,customer_locale:locale};
   for(const kind of kinds){const text=customerUpdateText(booking,{kind,leg:'return',driver:{full_name:'Test Driver'},flight:{flight_number:'TEST123',arr_delayed:25}});assert.ok(text&&text!=='undefined',kind);if(locale!=='pl')assert.doesNotMatch(text,/Rezerwacja|Przyjęliśmy|Kierowca|Przypominamy/);}
   const reminder=customerUpdateText(booking,{kind:'reminder_24h',leg:'return'});
   assert.ok(reminder.includes('2027-01-27'));assert.ok(reminder.includes('14:55'));assert.ok(reminder.includes('Katowice-Pyrzowice → Radlin'));
 });
 test(`${locale}: SMS and WhatsApp retain saved language and private portal link`,()=>{
   const booking={...base,customer_locale:locale,phone:'+48123456789',driver_id:'driver',vehicle_id:'vehicle',_driver:{full_name:'Test Driver'}};
   for(const url of [quickSmsUrl(booking),quickWhatsAppUrl(booking)]){
     const decoded=decodeURIComponent(url);assert.ok(decoded.includes('lang='+locale));assert.ok(decoded.includes('Test Driver'));
   }
 });
 test(`${locale}: received mail escapes customer data and preserves locale`,()=>{
   const message=localizedReceivedEmail({...base,locale});
   assert.ok(message.html.includes('&lt;script&gt;'));assert.ok(!message.html.includes('<script>'));
   assert.ok(message.html.includes('lang='+locale));assert.ok(message.html.includes(`lang="${locale}"`));
   assert.ok(emailTrustNotice(locale).html.includes(`lang="${locale}"`));
 });
 test(`${locale}: airport guide covers both legs and excludes general round trips`,()=>{
   const booking={...base,customer_locale:locale};const airport=assignedEmail(booking).html;
   assert.equal((airport.match(/<section lang=/g)||[]).length,2);
   const general=assignedEmail({...booking,destination_address:'Berlin',booking_source:'public_general'}).html;
   assert.equal((general.match(/<section lang=/g)||[]).length,0);
   assert.match(adminNewBookingEmail(booking,'test@example.invalid','123456789').subject,/NOWA REZERWACJA/);
 });
 test(`${locale}: B2C and B2B checkout use saved locale and unchanged amount`,async()=>{
   for(const company of [false,true]){
     testBooking={...base,customer_locale:locale,...(company?{company_id:'test-company',payment_method:'employee_payment',price_gross:864}:{})};checkoutCalls=[];dbWrites=[];
     const response=await (company?companyCheckout:checkout)({}, {params:Promise.resolve({token:'test-token'})});
     assert.equal(response.status,200);assert.equal(checkoutCalls.length,1);const input=checkoutCalls[0];
     assert.equal(input.locale,locale);assert.ok(input.success_url.includes('lang='+locale));assert.ok(input.cancel_url.includes('lang='+locale));assert.ok(input.success_url.includes('{CHECKOUT_SESSION_ID}'));
     assert.equal(input.line_items[0].price_data.currency,'pln');assert.equal(input.line_items[0].price_data.unit_amount,company?86400:80000);
     assert.ok(stablePaymentUrl(testBooking).includes('lang='+locale));
   }
 });
}
test('already paid bookings cannot create another checkout',async()=>{
  testBooking={...base,customer_locale:'de',payment_status:'paid'};checkoutCalls=[];
  const response=await checkout({}, {params:Promise.resolve({token:'test-token'})});
  assert.equal(response.status,409);assert.equal(checkoutCalls.length,0);assert.equal((await response.json()).error,'Diese Buchung ist bereits bezahlt.');
});
const {localizedQuoteEmail}=require('../lib/quoteEmails.ts');
for(const locale of ['pl','en','de','cs'])test(`${locale}: quote offer, acceptance and rejection have locale and escaped details`,()=>{
  for(const kind of ['offered','accepted','rejected']){
    const mail=localizedQuoteEmail(kind,{...base,customer_locale:locale,quote_note:'<script>note</script>',quote_expires_at:'2027-01-19T12:00:00Z'});
    assert.equal(mail.locale,locale);assert.ok(mail.html.includes(`lang="${locale}"`));assert.ok(mail.html.includes('lang='+locale));assert.ok(mail.html.includes('2027-01-27'));assert.ok(mail.html.includes('800.00 PLN'));assert.ok(mail.html.includes('&lt;script&gt;note&lt;/script&gt;'));assert.ok(!mail.html.includes('<script>'));
  }
});
const {customerAccountEmail}=require('../lib/customerAccountEmail.ts');
for(const locale of ['pl','en','de','cs'])test(`${locale}: account login email uses chosen language and escapes email and URL`,()=>{
  const mail=customerAccountEmail(locale,'<test>@example.invalid',`https://example.invalid/login?token=test&lang=${locale}`);
  assert.equal(mail.locale,locale);assert.match(mail.html,new RegExp(`lang="${locale}"`));assert.ok(mail.html.includes('&lt;test&gt;'));assert.ok(mail.html.includes('&amp;lang='+locale));
});
const {b2bEmployeeConfirmedEmail,b2bEmployeeAssignedEmail}=require('../lib/b2bEmployeeNotifications.ts');
for(const locale of ['pl','en','de','cs'])test(`${locale}: B2B employee templates use one language, gross amount and both assignments`,()=>{
 const booking={...base,customer_locale:locale,company_id:'test-company',payment_method:'employee_payment',price_gross:864,driver_name:'<Driver>',return_driver_name:'Return Driver'};
 for(const template of [b2bEmployeeConfirmedEmail(booking),b2bEmployeeAssignedEmail(booking)]){
  assert.ok(template.html.includes(`lang="${locale}"`));assert.ok(template.html.includes('/platnosc/test-token?lang='+locale));assert.ok(template.html.includes('864.00 PLN'));assert.ok(!template.html.includes(' / Online payment'));
 }
 const assigned=b2bEmployeeAssignedEmail(booking).html;assert.ok(assigned.includes('&lt;Driver&gt;'));assert.ok(assigned.includes('Return Driver'));assert.equal((assigned.match(/<section lang=/g)||[]).length,2);
 for(const payment_status of ['paid','review','refunded'])assert.ok(!b2bEmployeeConfirmedEmail({...booking,payment_status}).html.includes('/platnosc/'));
 assert.ok(!b2bEmployeeConfirmedEmail({...booking,status:'cancelled'}).html.includes('/platnosc/'));
});
const {reviewRatingEmail}=require('../lib/reviewRatingEmail.ts');
for(const locale of ['pl','en','de','cs'])test(`${locale}: review mail preserves language in cron-generated rating links`,()=>{
 const mail=reviewRatingEmail({...base,customer_locale:locale},'https://booking.matt-transport.pl/opinia/test-token?source=email');
 assert.ok(mail.html.includes(`lang="${locale}"`));assert.ok(mail.html.includes('source=email&amp;lang='+locale));assert.ok(mail.html.includes('&lt;script&gt;test&lt;/script&gt;'));assert.ok(!mail.html.includes('<script>'));
});
const {customerFlightStatus,customerFlightAlert}=require('../lib/customerFlightText.ts');
for(const locale of ['pl','en','de','cs'])test(`${locale}: public flight alerts are localized and omit dispatcher instructions`,()=>{
 for(const state of ['scheduled','active','landed','cancelled','diverted','incident','unknown'])assert.ok(customerFlightStatus(state,locale));
 const value=customerFlightAlert({alert_type:'delay',leg:'return',severity:'warning',payload:{delay:35},message:'Sprawdź wpływ na obsadę i kolejny kurs.'},locale,{flight_number:'TEST123'});
 assert.ok(value.title.includes('TEST123'));assert.ok(value.title.includes('+35 min'));assert.ok(!value.message.includes('obsadę'));assert.equal(value.leg,'return');
});
const {requestCustomerLocale,customerErrorText,customerJson}=require('../lib/customerErrors.ts');
const {customerFetch}=require('../lib/customerFetch.ts');
for(const locale of ['pl','en','de','cs'])test(`${locale}: API errors preserve status, language and safe details`,async()=>{
 assert.equal(requestCustomerLocale({headers:new Headers({'x-matt-locale':locale})},'pl'),locale);
 assert.equal(requestCustomerLocale({headers:new Headers()},locale),locale);
 const error=customerErrorText('Dla rezerwacji indywidualnych wybierz gotówkę lub płatność online.',locale);
 assert.equal(customerErrorText(error,locale),error);
 const response=customerJson(locale,{error,id:'unchanged',details:{message:'customer content'}},{status:400,headers:{'x-test':'retained'}});
 assert.equal(response.status,400);assert.equal(response.headers.get('x-test'),'retained');assert.deepEqual(await response.json(),{error,id:'unchanged',details:{message:'customer content'}});
 assert.ok(!customerErrorText('SQL password=secret details',locale).includes('secret'));
 const key='Jeżeli ten adres e-mail jest powiązany z rezerwacjami MATT TRANSPORT, wysłaliśmy link do Moich przejazdów.';
 assert.notEqual(customerErrorText(key,locale),customerErrorText('unknown',locale));
});
test('locale request header is attached only to our own API and preserves existing headers',async()=>{
 const original=global.fetch,requests=[];global.fetch=async(input,init)=>{requests.push({input,init});return new Response('{}')};
 try{
  await customerFetch('de','/api/bookings',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert.equal(requests[0].init.headers.get('x-matt-locale'),'de');assert.equal(requests[0].init.headers.get('content-type'),'application/json');
  await customerFetch('de','https://example.invalid/external');assert.equal(requests[1].init,undefined);
 }finally{global.fetch=original;}
});
const {POST:createPrivateBooking}=require('../app/api/bookings/route.ts');
for(const locale of ['pl','en','de','cs'])test(`${locale}: private bank transfer is rejected before writes`,async()=>{
 dbWrites=[];checkoutCalls=[];
 const response=await createPrivateBooking({headers:new Headers({'x-matt-locale':locale}),json:async()=>({locale,paymentMethod:'bank_transfer'})});
 assert.equal(response.status,400);assert.deepEqual(dbWrites,[]);assert.deepEqual(checkoutCalls,[]);
 assert.equal((await response.json()).error,customerErrorText('Dla rezerwacji indywidualnych wybierz gotówkę lub płatność online.',locale));
});
const {companyBookingUpdateEmail}=require('../lib/companyBookingUpdateEmail.ts');
for(const locale of ['pl','en','de','cs'])test(`${locale}: company change and cancellation mail preserve language and refund review`,()=>{
 for(const kind of ['updated','cancelled']){
  const mail=companyBookingUpdateEmail(kind,{...base,customer_locale:locale,booking_number:'<test>'},true);
  assert.equal(mail.locale,locale);assert.ok(mail.html.includes(`lang="${locale}"`));assert.ok(mail.html.includes('lang='+locale));assert.ok(mail.html.includes('&lt;test&gt;'));assert.ok(!mail.html.includes('<test>'));
 }
});

const {POST:companyBookingAction}=require('../app/api/company/bookings/[id]/route.ts');
for(const locale of ['pl','en','de','cs'])test(`${locale}: company repeat requires a later return leg before writes`,async()=>{
 testBooking={...base,company_id:'test-company',customer_locale:locale};dbWrites=[];
 for(const dates of [{},{returnDate:'2027-02-19',returnTime:'14:55'}]){
  const response=await companyBookingAction({headers:new Headers({'x-matt-locale':locale}),json:async()=>({action:'repeat',locale,travelDate:'2027-02-20',travelTime:'08:30',...dates})},{params:Promise.resolve({id:'test-only'})});
  assert.equal(response.status,400);assert.equal((await response.json()).error,customerErrorText('Powrót musi nastąpić po wyjeździe.',locale));assert.deepEqual(dbWrites,[]);
 }
});
const {isTestEnvironment,assertTestDatabase,assertSafeStripeKey}=require('../lib/testEnvironment.ts');
const {bookingOrigin}=require('../lib/bookingOrigin.ts');
async function withTestConfig(overrides,run){
 const previous=Object.fromEntries(Object.keys(overrides).map(key=>[key,process.env[key]]));
 for(const [key,value]of Object.entries(overrides))value===undefined?delete process.env[key]:process.env[key]=value;
 try{return await run();}finally{for(const [key,value]of Object.entries(previous))value===undefined?delete process.env[key]:process.env[key]=value;}
}
const testConfig={MATT_TEST_MODE:'1',VERCEL_ENV:'preview',MATT_TEST_SUPABASE_PROJECT_REF:'isolated-test',NEXT_PUBLIC_SUPABASE_URL:'https://isolated-test.supabase.co',NEXT_PUBLIC_BOOKING_URL:'https://isolated-booking.vercel.app',NEXT_PUBLIC_PANEL_URL:'https://isolated-panel.vercel.app'};
test('test mode refuses production and a different database before any connection',async()=>{
 await withTestConfig({...testConfig,VERCEL_ENV:'production'},()=>assert.throws(()=>isTestEnvironment(),/must not/));
 await withTestConfig(testConfig,()=>{
  assert.equal(isTestEnvironment(),true);assert.doesNotThrow(()=>assertTestDatabase('https://isolated-test.supabase.co'));
  for(const url of ['https://production.supabase.co','https://isolated-test.supabase.co.attacker.invalid'])assert.throws(()=>assertTestDatabase(url),/isolated Supabase/);
 });
 await withTestConfig({...testConfig,MATT_TEST_SUPABASE_PROJECT_REF:undefined},()=>assert.throws(()=>assertTestDatabase('https://isolated-test.supabase.co'),/isolated Supabase/));
});
test('Preview rejects Stripe live keys even when test mode was not set',async()=>{
 await withTestConfig({VERCEL_ENV:'preview',MATT_TEST_MODE:undefined},()=>{
  for(const key of ['sk_live_example','rk_live_example','invalid'])assert.throws(()=>assertSafeStripeKey(key),/test-mode/);
  for(const key of ['sk_test_example','rk_test_example'])assert.doesNotThrow(()=>assertSafeStripeKey(key));
 });
 await withTestConfig({VERCEL_ENV:'production',MATT_TEST_MODE:undefined},()=>assert.doesNotThrow(()=>assertSafeStripeKey('sk_live_example')));
});
test('test mode stops email, customer/admin/driver push and calendar before network or database access',async()=>{
 const {sendMattEmail}=require('../lib/email.ts'),{sendBookingNotification}=require('../lib/customerNotifications.ts');
 const {sendAdminPush,sendDriverPush}=require('../lib/pushServer.ts'),{syncBookingCalendar}=require('../lib/googleCalendar.ts');
 const {getStripe}=require('../lib/stripeServer.ts');
 const untouched=new Proxy({},{get(){throw new Error('Unexpected database access')}}),originalFetch=global.fetch;
 global.fetch=()=>{throw new Error('Unexpected network access')};
 try{await withTestConfig({...testConfig,STRIPE_SECRET_KEY:'sk_live_example'},async()=>{
  assert.equal((await sendMattEmail({to:'test@example.invalid',subject:'test',text:'test'})).sent,false);
  assert.equal((await sendBookingNotification(untouched,base,{kind:'received',eventKey:'test'})).reason,'test_environment');
  assert.equal((await sendAdminPush(untouched,{title:'test',body:'test'})).skipped,true);
  assert.equal((await sendDriverPush(untouched,'test-driver',{title:'test',body:'test',eventKey:'test'})).skipped,true);
  assert.equal((await syncBookingCalendar(untouched,base)).synced,false);
  assert.throws(()=>getStripe(),/test-mode/);
 });}finally{global.fetch=originalFetch;}
});
for(const locale of ['pl','en','de','cs'])test(`${locale}: test email and payment links stay on the isolated preview`,async()=>{
 await withTestConfig(testConfig,()=>{
  assert.equal(bookingOrigin(),'https://isolated-booking.vercel.app');
  const value={...base,customer_locale:locale};
  for(const mail of [localizedReceivedEmail({...value,locale}),assignedEmail(value),localizedQuoteEmail('offered',value),b2bEmployeeConfirmedEmail({...value,company_id:'test-company',payment_method:'employee_payment'})]){
   assert.ok(mail.html.includes('https://isolated-booking.vercel.app/'));assert.ok(mail.html.includes('lang='+locale));
  }
  assert.ok(stablePaymentUrl(value).startsWith('https://isolated-booking.vercel.app/'));
 });
 await withTestConfig({...testConfig,NEXT_PUBLIC_BOOKING_URL:'https://booking.matt-transport.pl'},()=>assert.throws(()=>bookingOrigin(),/isolated Vercel/));
});
