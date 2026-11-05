const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
let role='admin',writes=0,race=false;
let booking;
const reset=()=>{role='admin';writes=0;race=false;booking={id:'test',status:'pending',payment_status:'pending',payment_paid_at:null,payment_checkout_session_id:null,payment_intent_id:null,updated_at:'v1',total_price:390}};
const admin={from(table){let isUpdate=false;const conditions=[];const q={select:()=>q,eq:(k,v)=>{conditions.push([k,v]);return q},is:(k,v)=>{conditions.push([k,v]);return q},single:async()=>({data:{...booking}}),update:()=>{isUpdate=true;return q},insert:async()=>({error:null}),maybeSingle:async()=>{
 if(race)booking.payment_status='paid';
 if(isUpdate&&conditions.every(([k,v])=>booking[k]===v)){writes++;return {data:{id:'test'}}}return {data:null};
}};return q}};
const original=Module._load;
Module._load=function(id,parent,main){
 if(id==='@/lib/apiAdmin')return {apiAdmin:async()=>role==='anonymous'?{error:'unauthorized',status:401}:{admin,user:{id:'admin'},profile:{role}}};
 if(id==='@/lib/bookingReprice')return {repriceBooking:async(_admin,b)=>{if(b.status!=='pending'||b.payment_status==='paid')throw new Error('locked');return {total_price:533.76,pricing_snapshot:{billable_km:59.9,calculated_at:new Date().toISOString()}}}};
 return original.call(this,id,parent,main);
};
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {POST}=require('../app/api/admin/bookings/[id]/reprice/route.ts');
const call=body=>POST({json:async()=>body},{params:Promise.resolve({id:'test'})});
test('preview does not write; approval requires exact reviewed quote',async()=>{reset();const preview=await call({});assert.equal(preview.status,200);const p=await preview.json();assert.equal(p.newPrice,533.76);assert.equal(writes,0);assert.equal((await call({action:'approve',reviewToken:'bad'})).status,409);assert.equal(writes,0);assert.equal((await call({action:'approve',reviewToken:p.reviewToken})).status,200);assert.equal(writes,1)});
test('changed reservation invalidates preview',async()=>{reset();const p=await (await call({})).json();booking.updated_at='v2';assert.equal((await call({action:'approve',reviewToken:p.reviewToken})).status,409);assert.equal(writes,0)});
test('payment settling between read and update prevents price write',async()=>{reset();const p=await (await call({})).json();race=true;assert.equal((await call({action:'approve',reviewToken:p.reviewToken})).status,409);assert.equal(writes,0)});
test('authentication, administrator role and locked booking are enforced',async()=>{reset();role='anonymous';assert.equal((await call({})).status,401);role='dispatcher';assert.equal((await call({})).status,403);role='admin';booking.status='confirmed';assert.equal((await call({})).status,400);assert.equal(writes,0)});
