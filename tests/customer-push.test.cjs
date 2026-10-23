// Isolated delivery contract: no sockets, real subscriptions or credentials.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
let logs,subscriptions,requests,providerFails,subscriptionError,deleteError;
function reset(){logs=[];subscriptions=[{id:'sub',booking_id:'booking',endpoint:'https://example.invalid/push',p256dh:'fixture',auth:'fixture',active:true}];requests=[];providerFails=false;subscriptionError=false;deleteError=false;process.env.MATT_TEST_MODE='0';process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY='fixture';process.env.VAPID_PRIVATE_KEY='fixture';}
const admin={from(table){let action='select',value,filters=[];const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},insert(v){action='insert';value=v;return q},update(v){action='update';value=v;return q},delete(){action='delete';return q},single(){return q},then(resolve,reject){try{
const rows=table==='customer_push_subscriptions'?subscriptions:logs;
if(table==='customer_push_subscriptions'&&subscriptionError)return Promise.resolve({data:null,error:{message:'DB unavailable'}}).then(resolve,reject);
if(action==='select')return Promise.resolve({data:rows.filter(r=>filters.every(f=>f(r))),error:null}).then(resolve,reject);
if(action==='insert'){if(logs.some(r=>r.event_key===value.event_key))return Promise.resolve({data:null,error:{code:'23505'}}).then(resolve,reject);const row={id:'log-'+logs.length,...value};logs.push(row);return Promise.resolve({data:row,error:null}).then(resolve,reject);}
if(action==='delete'){if(deleteError)return Promise.resolve({error:{message:'Cleanup failed'}}).then(resolve,reject);logs=logs.filter(r=>!filters.every(f=>f(r)));}
if(action==='update')for(const row of rows.filter(r=>filters.every(f=>f(r))))Object.assign(row,value);
return Promise.resolve({error:null}).then(resolve,reject);
}catch(e){return Promise.reject(e).then(resolve,reject)}}};return q}};
const old=Module._load;Module._load=function(id,parent,isMain){if(id==='web-push')return {setVapidDetails(){},async sendNotification(sub,payload){requests.push(JSON.parse(payload));const rejection=Array.isArray(providerFails)?providerFails[requests.length-1]:providerFails;if(rejection)throw Object.assign(new Error('Temporary push failure'),{statusCode:rejection===true?503:rejection});}};if(id.startsWith('@/'))id=path.join(__dirname,'..',id.slice(2));return old.call(this,id,parent,isMain)};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {sendBookingNotification:send}=require('../lib/customerNotifications.ts');
const booking=locale=>({id:'booking',customer_locale:locale,customer_access_token:'test-token',booking_number:'TEST',pickup_address:'Radlin',airport_label:'Pyrzowice',service_type:'roundtrip',travel_date:'2027-01-20',travel_time:'08:30',return_date:'2027-01-27',return_time:'14:55'});
const options={kind:'reminder_24h',leg:'return',eventKey:'test-return'};
for(const locale of ['pl','en','de','cs'])test(locale+': real push preparation retains return leg and locale',async()=>{reset();const r=await send(admin,booking(locale),options);assert.equal(r.sent,true);assert.equal(requests.length,1);assert.match(requests[0].url,new RegExp('lang='+locale));assert.match(requests[0].body,/2027-01-27/);assert.match(requests[0].body,/14:55/);assert.match(requests[0].body,/Pyrzowice → Radlin/);assert.equal((await send(admin,booking(locale),options)).duplicate,true);assert.equal(requests.length,1)});
test('all rejected deliveries allow a later retry of the same event',async()=>{reset();providerFails=true;assert.equal((await send(admin,booking('en'),options)).sent,false);providerFails=false;assert.equal((await send(admin,booking('en'),options)).sent,true);assert.equal(requests.length,2)});
test('subscription lookup failure is an error, not a false no-subscriber result',async()=>{reset();subscriptionError=true;await assert.rejects(send(admin,booking('de'),options),/DB unavailable/);assert.equal(requests.length,0)});
test('failed reservation release is surfaced instead of silently losing retries',async()=>{reset();providerFails=true;deleteError=true;await assert.rejects(send(admin,booking('cs'),options),/Cleanup failed/)});
test('test mode does not read subscriptions or send push',async()=>{reset();process.env.MATT_TEST_MODE='1';assert.equal((await send({from(){throw new Error('Unexpected database access')}},booking('pl'),options)).reason,'test_environment');assert.equal(requests.length,0)});

test('unknown delivery timeout keeps deduplication to avoid a second notification',async()=>{reset();providerFails='timeout';await send(admin,booking('en'),options);providerFails=false;assert.equal((await send(admin,booking('en'),options)).duplicate,true);assert.equal(requests.length,1)});

test('partial success retains deduplication instead of repeating an accepted notification',async()=>{reset();subscriptions.push({...subscriptions[0],id:'sub-2'});providerFails=[false,503];const result=await send(admin,booking('de'),options);assert.equal(result.sent_count,1);assert.equal(result.failed_count,1);providerFails=false;assert.equal((await send(admin,booking('de'),options)).duplicate,true);assert.equal(requests.length,2)});
