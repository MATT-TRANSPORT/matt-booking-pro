// Explicit opt-in integration test. Sends ONLY to Resend's documented test inbox.
// No database access, real customers, bookings or payment operations.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
assert.equal(process.env.MATT_ALLOW_RESEND_TEST_SEND,'1','Explicit opt-in is required');
const run=process.env.MATT_RESEND_TEST_RUN;
assert.match(run||'',/^[a-z0-9-]{1,36}$/,'Provide a short unique test run label');
const root=path.resolve(__dirname,'..');
require('@next/env').loadEnvConfig(root,false,{info(){},error(){}});
assert.ok(process.env.RESEND_API_KEY,'A local Resend API credential is required');
// Bypass the app-wide non-delivery test guard ONLY in this isolated script;
// recipients below cannot be supplied by a caller or changed to real people.
process.env.MATT_TEST_MODE='0';process.env.VERCEL_ENV='development';
const load=Module._load;
Module._load=function(id,parent,isMain){if(id.startsWith('@/'))id=path.join(root,id.slice(2));return load.call(this,id,parent,isMain)};
require.extensions['.ts']=function(module,file){module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file)};
const {paymentReceivedEmail}=require('../lib/emailTemplates.ts');
const {prepareMattEmail,sendPreparedMattEmail}=require('../lib/email.ts');
const results=[];
(async()=>{
 for(const kind of ['private','company'])for(const locale of ['pl','en','de','cs']){
  const recipient=`delivered+${run}-${kind}-${locale}@resend.dev`;
  assert.match(recipient,/^delivered\+[a-z0-9-]+@resend\.dev$/);
  const booking={id:'TEST-NOT-A-REAL-BOOKING',booking_number:'PR48-TEST-NO-BOOKING',customer_access_token:'pr48-test-not-a-real-booking',customer_name:'TEST ONLY',customer_locale:locale,service_type:'roundtrip',pickup_address:'TEST ONLY',airport_label:'Test airport',travel_date:'2027-01-20',travel_time:'08:30',return_date:'2027-01-27',return_time:'14:55',passengers:8,vehicle_type:'bus',total_price:kind==='company'?864:800,payment_status:'paid',...(kind==='company'?{company_id:'TEST-ONLY',price_net:800,price_gross:864,vat_price:64,vat_rate:8}:{})};
  const template=paymentReceivedEmail(booking);
  const body=prepareMattEmail({to:recipient,locale,subject:`TEST PR48 — ${template.subject}`,html:template.html});
  assert.ok(body.html.includes('lang='+locale));assert.ok(body.text.includes('lang='+locale));
  const key=`pr48-resend/${run}/${kind}/${locale}`;
  const response=await sendPreparedMattEmail(body,key);
  results.push({kind,locale,recipient,sent:response.sent,id:response.id||null,error:response.error||null});
  if(process.env.MATT_RESEND_TEST_RESULT_FILE)fs.writeFileSync(process.env.MATT_RESEND_TEST_RESULT_FILE,JSON.stringify(results,null,2),{mode:0o600});
  if(!response.sent)throw new Error(`Provider did not accept ${kind}/${locale}; see private test result`);
  if(kind==='private'&&locale==='pl'){
   const replay=await sendPreparedMattEmail(body,key);
   assert.equal(replay.sent,true);assert.equal(replay.id,response.id,'Identical retry must return the original provider email ID');
   results[results.length-1].idempotencyReplay='PASS';
  }
 }
 if(process.env.MATT_RESEND_TEST_RESULT_FILE)fs.writeFileSync(process.env.MATT_RESEND_TEST_RESULT_FILE,JSON.stringify(results,null,2),{mode:0o600});
 console.log(JSON.stringify({scope:'Real Resend API; official simulated-delivery addresses only. No Preview HTTP or real mailbox verification.',results},null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1});
