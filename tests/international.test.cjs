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
const {customerUpdateText,quickSmsUrl,quickWhatsAppUrl}=require('../lib/customerNotifications.ts');
const {localizedReceivedEmail}=require('../lib/localizedBookingEmails.ts');
const {assignedEmail,adminNewBookingEmail}=require('../lib/emailTemplates.ts');
const {emailTrustNotice}=require('../lib/emailTrustNotice.ts');
const {stablePaymentUrl}=require('../lib/payment.ts');
const {POST:checkout}=require('../app/api/payments/checkout/[token]/route.ts');
const {POST:companyCheckout}=require('../app/api/payments/company-employee/[token]/route.ts');
const base={id:'test-only',booking_number:'TEST-ONLY',customer_name:'<script>test</script>',customer_access_token:'test-token',pickup_address:'Radlin, Mariacka 9',airport_label:'Katowice-Pyrzowice',service_type:'roundtrip',travel_date:'2027-01-20',travel_time:'08:30',return_date:'2027-01-27',return_time:'14:55',passengers:8,vehicle_type:'bus',total_price:800,status:'confirmed',payment_status:'pending',payment_method:'online'};
const kinds=['received','confirmed','assigned','reminder_24h','reminder_120','review_request','in_progress','arrived','completed','cancelled','flight_delay','flight_cancelled','flight_diverted'];

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
