// In-memory PostgREST + Resend HTTP fixtures. No messages or sockets are sent.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
let jobs,requests,accepted,pushes,failSent,staleLease,replyStatus,pushResult,rpcCalls;
const snapshot=locale=>({id:'test-booking',booking_number:'TEST-ONLY',customer_name:'Test User',customer_locale:locale,customer_access_token:'test-token',service_type:'roundtrip',pickup_address:'TEST ONLY',airport_label:'Test airport',travel_date:'2027-01-20',travel_time:'08:30',return_date:'2027-01-27',return_time:'14:55',passengers:8,vehicle_type:'bus',total_price:800,payment_amount_cents:80000,payment_status:'paid'});
function reset(locale='de',kind='customer_email'){
 jobs=[{id:'job-test',booking_id:'test-booking',kind,booking_snapshot:snapshot(locale),recipient:'test@example.invalid',status:'pending',attempts:0,available_at:'2000-01-01T00:00:00Z',prepared_email:null,first_attempt_at:null}];
 requests=[];accepted=new Map();pushes=[];failSent=false;staleLease=false;replyStatus=200;pushResult={sent:1,failed:0,skipped:false};rpcCalls=0;
 process.env.VERCEL_ENV='production';process.env.MATT_TEST_MODE='0';process.env.RESEND_API_KEY='re_local_fixture';
}
function due(){for(const j of jobs)if(j.status==='retry')j.available_at='2000-01-01T00:00:00Z'}
const admin={
 rpc(name,args){assert.equal(name,'claim_payment_notifications');rpcCalls++;return {throwOnError:async()=>{
  const selected=jobs.filter(j=>(!args.p_booking_id||j.booking_id===args.p_booking_id)&&((['pending','retry'].includes(j.status)&&Date.parse(j.available_at)<=Date.now())||(j.status==='processing'&&Date.parse(j.processing_started_at)<Date.now()-600000))).slice(0,args.p_limit);
  for(const j of selected){j.status='processing';j.attempts++;j.lease_token='lease-'+j.attempts;j.processing_started_at=new Date().toISOString()}
  return {data:structuredClone(selected),error:null};
 }}},
 from(table){assert.equal(table,'payment_notification_outbox');let patch,filters=[];const q={update(v){patch=v;return q},eq(k,v){filters.push(j=>j[k]===v);return q},select(){return q},maybeSingle(){return q},throwOnError:async()=>{
  if(failSent&&patch.status==='sent'){failSent=false;throw new Error('Simulated crash after provider acceptance')}
  const row=jobs.find(j=>filters.every(f=>f(j)));if(!row)return {data:null,error:null};Object.assign(row,structuredClone(patch));return {data:{id:row.id},error:null};
 }};return q}
};
const originalLoad=Module._load;
Module._load=function(id,parent,isMain){
 if(id==='@/lib/supabase/admin')return {createAdminClient:()=>{throw new Error('Unauthorized cron must never open database')}};
 if(id==='@/lib/adminNotifications')return {sendPaymentReceivedAdminPush:async(...args)=>{pushes.push(args);return pushResult}};
 if(id.startsWith('@/'))id=path.join(root,id.slice(2));
 return originalLoad.call(this,id,parent,isMain);
};
require.extensions['.ts']=function(module,file){module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file)};
global.fetch=async(url,options)=>{
 assert.equal(url,'https://api.resend.com/emails');assert.ok(options.signal);assert.equal(options.headers.Authorization,'Bearer re_local_fixture');
 const key=options.headers['Idempotency-Key'];requests.push({key,body:options.body});
 if(staleLease){jobs[0].lease_token='replacement-worker';staleLease=false}
 if(replyStatus!==200)return {ok:false,status:replyStatus,json:async()=>({message:'Simulated provider failure'})};
 if(!accepted.has(key))accepted.set(key,{id:'email-fixture',body:options.body});
 assert.equal(accepted.get(key).body,options.body,'A retry must use the identical provider payload');
 return {ok:true,status:200,json:async()=>({id:accepted.get(key).id})};
};
const {runPaymentNotificationOutbox:run}=require('../lib/paymentNotificationOutbox.ts');
for(const locale of ['pl','en','de','cs'])test(`${locale}: receipt locale and portal link survive durable payload preparation`,async()=>{
 reset(locale);const result=await run(admin);assert.equal(result.sent,1);assert.equal(jobs[0].status,'sent');assert.equal(jobs[0].provider_id,'email-fixture');
 assert.ok(JSON.parse(requests[0].body).html.includes('lang='+locale));assert.equal(requests[0].key,'payment-receipt/job-test');assert.equal(requests.length,1);
});
test('retry after provider acceptance and lost acknowledgement sends one logical email',async()=>{
 reset();failSent=true;await run(admin);assert.equal(jobs[0].status,'retry');assert.equal(accepted.size,1);assert.ok(jobs[0].first_attempt_at);
 jobs[0].booking_snapshot.customer_locale='cs';jobs[0].recipient='changed@example.invalid';due();await run(admin);
 assert.equal(jobs[0].status,'sent');assert.equal(requests.length,2);assert.deepEqual(requests[0],requests[1]);assert.equal(accepted.size,1);
});
test('concurrent workers claim one item only once',async()=>{
 reset();await Promise.all([run(admin),run(admin)]);assert.equal(requests.length,1);assert.equal(jobs[0].attempts,1);
});
test('active leases stay busy, expired leases are recovered',async()=>{
 reset();Object.assign(jobs[0],{status:'processing',processing_started_at:new Date().toISOString(),lease_token:'old'});
 await run(admin);assert.equal(requests.length,0);
 jobs[0].processing_started_at='2000-01-01T00:00:00Z';await run(admin);assert.equal(jobs[0].status,'sent');assert.equal(requests.length,1);
});
test('an old worker cannot overwrite a replacement worker lease',async()=>{
 reset();staleLease=true;const result=await run(admin);assert.equal(result.errors,1);assert.equal(jobs[0].status,'processing');assert.equal(jobs[0].lease_token,'replacement-worker');
});
test('transient provider failure schedules a retry and then completes',async()=>{
 reset();replyStatus=503;assert.equal((await run(admin)).retry,1);assert.equal(jobs[0].status,'retry');assert.equal(accepted.size,0);
 replyStatus=200;due();await run(admin);assert.equal(jobs[0].status,'sent');assert.equal(accepted.size,1);
});
test('permanent provider failure needs attention instead of retrying indefinitely',async()=>{
 reset();replyStatus=422;assert.equal((await run(admin)).needs_attention,1);await run(admin);assert.equal(requests.length,1);assert.equal(jobs[0].status,'needs_attention');
});
test('unknown delivery older than the safe retry window requires manual reconciliation',async()=>{
 reset();jobs[0].first_attempt_at=new Date(Date.now()-23*3600000).toISOString();assert.equal((await run(admin)).needs_attention,1);assert.equal(requests.length,0);
});
test('invalid recipient is retained for attention without an external request',async()=>{
 reset();jobs[0].recipient='';assert.equal((await run(admin)).needs_attention,1);assert.equal(requests.length,0);
});
test('push retry uses a stable tag identity and does not imply email delivery',async()=>{
 reset('de','admin_push');pushResult={sent:0,failed:1,skipped:false};await run(admin);assert.equal(jobs[0].status,'retry');
 due();pushResult={sent:1,failed:0,skipped:false};await run(admin);assert.equal(jobs[0].status,'sent');assert.equal(pushes[0][5],pushes[1][5]);assert.equal(pushes[0][5],'job-test');assert.equal(requests.length,0);
});
test('no push subscribers is skipped rather than falsely reported as sent',async()=>{
 reset('pl','admin_push');pushResult={sent:0,failed:0,skipped:true};const result=await run(admin);assert.equal(result.sent,0);assert.equal(result.skipped,1);assert.equal(jobs[0].status,'skipped');
});
test('test mode never claims jobs or contacts providers',async()=>{
 reset();process.env.MATT_TEST_MODE='1';process.env.VERCEL_ENV='preview';await run(admin);assert.equal(rpcCalls,0);assert.equal(requests.length,0);assert.equal(jobs[0].status,'pending');
});

for(const name of ['operations-plus','customer-notifications'])test(`${name}: public status and invalid cron credentials never drain the queue`,async()=>{
 reset();process.env.CUSTOMER_NOTIFICATIONS_CRON_SECRET='local-cron-fixture';
 const route=require('../app/api/cron/'+name+'/route.ts');
 for(const secret of ['', 'wrong'])assert.equal((await route.POST({headers:new Headers({'x-customer-notifications-secret':secret})})).status,401);
 assert.equal((await route.GET()).status,200);assert.equal(rpcCalls,0);assert.equal(requests.length,0);
});
test('plain-text email keeps portal URLs, letters and readable whitespace',()=>{
 const {prepareMattEmail}=require('../lib/email.ts');
 const message=prepareMattEmail({to:'test@example.invalid',locale:'en',subject:'Test',html:'<p>Test transport ticket</p><p><a href="https://example.invalid/rezerwacja/test?lang=en">Visit portal</a></p>'});
 assert.ok(message.text.includes('Test transport ticket'));
 assert.ok(message.text.includes('Visit portal (https://example.invalid/rezerwacja/test?lang=en)'));
});
