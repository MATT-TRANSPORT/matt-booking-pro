const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');
let conflict=false,expired=[],filters=[];
const booking={id:'fixture',company_id:'company',customer_locale:'en',payment_method:'employee_payment',payment_status:'pending',status:'confirmed',price_gross:864,updated_at:'2026-10-27T12:00:00Z'};
function query(table){let update=false;const q={select(){return q},eq(k,v){if(update)filters.push([k,v]);return q},single(){return q},maybeSingle(){return q},update(){update=true;return q},insert(){return q},then(resolve,reject){return Promise.resolve({data:update?(conflict?null:{id:booking.id}):table==='company_users'?{company_id:'company',role:'admin'}:booking,error:null}).then(resolve,reject)}};return q}
const admin={from:query};const old=Module._load;
Module._load=function(id,parent,main){
 if(id==='@/lib/supabase/admin')return {createAdminClient:()=>admin};
 if(id==='@/lib/supabase/server')return {createClient:async()=>({...admin,auth:{getUser:async()=>({data:{user:{id:'user'}}})}})};
 if(id==='@/lib/stripeServer')return {expireCheckoutSession:async()=>{},getStripe:()=>({checkout:{sessions:{create:async()=>({id:'cs_fixture',url:'https://example.invalid/checkout'}),expire:async id=>{expired.push(id)}}}})};
 if(id==='@/lib/payment')return {paymentCanStart:b=>b.status==='confirmed',appBaseUrl:()=> 'https://example.invalid'};
 if(id.startsWith('@/'))id=path.join(__dirname,'..',id.slice(2));return old.call(this,id,parent,main);
};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const routes=[require('../app/api/company/bookings/[id]/checkout/route.ts').POST,require('../app/api/payments/company-employee/[token]/route.ts').POST];
for(const [i,post] of routes.entries())for(const changed of [false,true])test(`B2B Checkout ${i}: concurrent change=${changed}`,async()=>{conflict=changed;expired=[];filters=[];const req={headers:new Headers(),nextUrl:new URL('https://example.invalid/?lang=en')};const res=await post(req,{params:Promise.resolve({id:'fixture',token:'fixture-token'})});const data=await res.json();assert.equal(res.status,changed?409:200);assert.ok(filters.some(([k,v])=>k==='updated_at'&&v===booking.updated_at));if(changed){assert.equal(data.url,undefined);assert.deepEqual(expired,['cs_fixture'])}else assert.equal(data.url,'https://example.invalid/checkout')});
