// In-memory PostgREST and signed Stripe fixtures. No sockets or real credentials.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const Stripe=require('stripe');
const stripe=new Stripe('sk_test_local_fixture');
const secret='whsec_local_fixture';
const root=path.resolve(__dirname,'..');
let db,failWrites,accesses,mail;
function reset(){
 db={bookings:[{id:'booking-test',booking_number:'TEST-ONLY',status:'confirmed',payment_status:'pending',total_price:800,email:'test@example.invalid',customer_locale:'de'}],payment_webhook_events:[],booking_history:[],admin_stripe_payments:[],driver_card_payments:[]};
 failWrites=null;accesses=0;mail=[];
 process.env.VERCEL_ENV='preview';process.env.MATT_TEST_MODE='1';process.env.STRIPE_SECRET_KEY='sk_test_local_fixture';
}
function query(table){
 accesses++;
 let operation='select',value,filters=[],single=false,throwErrors=false,returning=false;
 const q={
  select(){returning=true;return q},eq(k,v){filters.push(r=>r[k]===v);return q},
  is(k,v){filters.push(r=>(r[k]??null)===v);return q},
  update(v){operation='update';value=v;return q},insert(v){operation='insert';value=v;return q},
  single(){single=true;return q},maybeSingle(){single=true;return q},throwOnError(){throwErrors=true;return q},
  then(resolve,reject){return Promise.resolve().then(()=>{
   if(failWrites===table&&operation!=='select')return {data:null,error:{code:'XX000',message:'Simulated database outage'}};
   const rows=db[table]??=[];let selected=rows.filter(r=>filters.every(f=>f(r)));
   if(operation==='insert'){
    if(table==='payment_webhook_events'&&rows.some(r=>r.provider_event_id===value.provider_event_id))return {data:null,error:{code:'23505',message:'Duplicate event'}};
    selected=[{created_at:new Date().toISOString(),processed_at:null,...structuredClone(value)}];rows.push(...selected);
   }
   if(operation==='update')for(const row of selected)Object.assign(row,structuredClone(value));
   const data=operation==='select'||returning?structuredClone(single?selected[0]??null:selected):null;
   return {data,error:null};
  }).then(result=>{if(throwErrors&&result.error)throw Object.assign(new Error(result.error.message),result.error);return result}).then(resolve,reject)}
 };return q;
}
const admin={from:query};
const originalLoad=Module._load;
Module._load=function(id,parent,isMain){
 if(id==='@/lib/supabase/admin')return {createAdminClient:()=>admin};
 if(id==='@/lib/stripeServer')return {getStripe:()=>stripe,getStripeWebhookSecret:()=>secret};
 if(id==='@/lib/email')return {sendMattEmail:async input=>{mail.push(input);return {sent:false}}};
 if(id==='@/lib/emailTemplates')return {paymentReceivedEmail:()=>({subject:'Test',html:'Test'}),paymentRefundedEmail:()=>({subject:'Test refund',html:'Test refund'})};
 if(id==='@/lib/googleCalendar')return {syncBookingCalendar:async()=>{}};
 if(id==='@/lib/adminNotifications')return {sendPaymentReceivedAdminPush:async()=>{}};
 if(id.startsWith('@/'))id=path.join(root,id.slice(2));
 return originalLoad.call(this,id,parent,isMain);
};
require.extensions['.ts']=function(module,filename){module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename)};
const {POST}=require('../app/api/payments/stripe/webhook/route.ts');
function event(overrides={}){return {id:'evt_test_fixture',object:'event',livemode:false,type:'checkout.session.completed',data:{object:{id:'cs_test_fixture',amount_total:80000,currency:'pln',payment_status:'paid',payment_intent:'pi_test_fixture',metadata:{booking_id:'booking-test'}}},...overrides};}
function request(e,signature){const body=JSON.stringify(e);return {text:async()=>body,headers:new Headers({'stripe-signature':signature??stripe.webhooks.generateTestHeaderString({payload:body,secret})})};}
test('valid signed payment is saved once, including a serial retry',async()=>{
 reset();assert.equal((await POST(request(event()))).status,200);assert.equal(db.bookings[0].payment_status,'paid');
 const history=db.booking_history.length;assert.equal((await POST(request(event()))).status,200);assert.equal(db.booking_history.length,history);assert.equal(mail.length,1);
});
test('invalid signature causes no database access',async()=>{reset();assert.equal((await POST(request(event(),'invalid'))).status,400);assert.equal(accesses,0)});
test('live events cannot write to the test environment',async()=>{reset();assert.equal((await POST(request(event({livemode:true})))).status,400);assert.equal(accesses,0)});
test('database failure is retryable and never acknowledged as paid',async()=>{
 reset();failWrites='bookings';assert.equal((await POST(request(event()))).status,500);assert.equal(db.bookings[0].payment_status,'pending');assert.equal(mail.length,0);assert.ok(!db.payment_webhook_events[0]?.processed_at);
 failWrites=null;assert.equal((await POST(request(event()))).status,200);assert.equal(db.bookings[0].payment_status,'paid');
});
test('concurrent deliveries do not repeat payment side effects',async()=>{
 reset();const results=await Promise.all([POST(request(event())),POST(request(event()))]);
 assert.ok(results.every(r=>[200,503].includes(r.status)));assert.equal(db.booking_history.length,1);assert.equal(mail.length,1);
});
test('currency mismatch is held for review instead of paid',async()=>{
 reset();const e=event();e.data.object.currency='eur';assert.equal((await POST(request(e))).status,200);assert.equal(db.bookings[0].payment_status,'review');
});
test('late success or failure does not undo an already recorded refund',async()=>{
 for(const type of ['checkout.session.completed','checkout.session.async_payment_failed']){
  reset();db.bookings[0].payment_status='refunded';await POST(request(event({type})));assert.equal(db.bookings[0].payment_status,'refunded');assert.equal(db.booking_history.length,0);
 }
});
test('a concurrent worker cannot change another worker\'s active claim',async()=>{
 reset();db.payment_webhook_events.push({provider_event_id:event().id,processing_status:'processing',processing_started_at:new Date().toISOString(),processed_at:null});
 assert.equal((await POST(request(event()))).status,503);assert.equal(db.bookings[0].payment_status,'pending');assert.equal(db.payment_webhook_events[0].processing_status,'processing');
});
test('a crashed worker lease is recovered and claimed only once',async()=>{
 reset();db.payment_webhook_events.push({provider_event_id:event().id,processing_status:'processing',processing_started_at:'2020-01-01T00:00:00Z',processed_at:null});
 const results=await Promise.all([POST(request(event())),POST(request(event()))]);assert.ok(results.every(r=>[200,503].includes(r.status)));assert.equal(db.booking_history.length,1);
});
test('an unavailable event journal prevents all booking writes',async()=>{
 reset();failWrites='payment_webhook_events';assert.equal((await POST(request(event()))).status,500);assert.equal(db.bookings[0].payment_status,'pending');assert.equal(mail.length,0);
});
test('different success event IDs for an already paid checkout do not repeat customer receipt',async()=>{
 reset();await POST(request(event()));await POST(request(event({id:'evt_test_async',type:'checkout.session.async_payment_succeeded'})));assert.equal(mail.length,1);assert.equal(db.booking_history.length,1);
});
test('concurrent different event IDs for one checkout cause one payment transition',async()=>{
 reset();const e=event({id:'evt_test_second',type:'checkout.session.async_payment_succeeded'});
 const results=await Promise.all([POST(request(event())),POST(request(e))]);
 assert.ok(results.every(r=>[200,500].includes(r.status)));assert.equal(db.booking_history.length,1);assert.equal(mail.length,1);
 assert.equal((await POST(request(e))).status,200);assert.equal(mail.length,1);
});
test('replaying a settled checkout after a price change does not undo payment',async()=>{
 reset();await POST(request(event()));db.bookings[0].total_price=900;
 await POST(request(event({id:'evt_test_late',type:'checkout.session.async_payment_succeeded'})));
 assert.equal(db.bookings[0].payment_status,'paid');assert.equal(mail.length,1);assert.equal(db.booking_history.length,1);
});
test('test events are rejected by a production live-key webhook',async()=>{
 reset();process.env.MATT_TEST_MODE='0';process.env.VERCEL_ENV='production';process.env.STRIPE_SECRET_KEY='sk_live_local_fixture';
 assert.equal((await POST(request(event()))).status,400);assert.equal(accesses,0);
});
test('administrative checkout validates amount and currency before changing payment status',async()=>{
 for(const override of [{currency:'eur'},{amount_total:0},{amount_total:79999}]){
  reset();db.admin_stripe_payments.push({id:'admin-test',booking_id:'booking-test',status:'pending',amount_cents:80000});
  const e=event();Object.assign(e.data.object,override,{metadata:{source:'matt_admin_payment',admin_stripe_payment_id:'admin-test'}});
  assert.equal((await POST(request(e))).status,500);assert.equal(db.admin_stripe_payments[0].status,'pending');assert.equal(db.bookings[0].payment_status,'pending');
 }
});
test('late administrative or terminal failure cannot undo a settled payment',async()=>{
 for(const status of ['succeeded','refunded'])for(const terminal of [true,false]){
  reset();const table=terminal?'driver_card_payments':'admin_stripe_payments';db[table].push({id:'payment-test',booking_id:'booking-test',status});
  const e=event({type:'payment_intent.payment_failed'});e.data.object={id:'pi_test_fixture',metadata:terminal?{source:'matt_driver_terminal',driver_card_payment_id:'payment-test'}:{source:'matt_admin_payment',admin_stripe_payment_id:'payment-test'}};
  assert.equal((await POST(request(e))).status,200);assert.equal(db[table][0].status,status);
 }
});
