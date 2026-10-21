const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
let user, role, booking, writes, failure;
const id='b91a9a73-3962-4887-916a-574989891d08';
function reset(){user={id:'operator-a'};role='dispatcher';booking={id};writes=[];failure=false;}
const admin={from(table){const q={select(){return q},eq(){return q},single:async()=>({data:role?{role}:null}),maybeSingle:async()=>({data:booking}),upsert:async(value,options)=>{writes.push({table,value,options});return {error:failure?{message:'unavailable'}:null}}};return q}};
const original=Module._load;
Module._load=function(name,parent,isMain){
 if(name==='@/lib/supabase/server')return {createClient:async()=>({auth:{getUser:async()=>({data:{user}})}})};
 if(name==='@/lib/supabase/admin')return {createAdminClient:()=>admin};
 return original.call(this,name,parent,isMain);
};
require.extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {POST}=require('../app/api/panel/bookings/[id]/read/route.ts');
const request=(site='same-origin')=>({headers:new Headers({'sec-fetch-site':site}),json:async()=>({user_id:'another-operator'})});
const params=(value=id)=>({params:Promise.resolve({id:value})});
test('anonymous and nonstaff users cannot mark bookings read',async()=>{
 for(const candidate of [null,'company_admin','driver', 'customer']){reset();if(candidate===null)user=null;else role=candidate;const response=await POST(request(),params());assert.equal(response.status,candidate===null?401:403);assert.equal(writes.length,0);}
});
test('cross-site requests, invalid IDs and missing bookings do not write',async()=>{
 reset();assert.equal((await POST(request('cross-site'),params())).status,403);assert.equal(writes.length,0);
 reset();assert.equal((await POST(request(),params('invalid'))).status,400);assert.equal(writes.length,0);
 reset();booking=null;assert.equal((await POST(request(),params())).status,404);assert.equal(writes.length,0);
});
test('each staff role uses verified identity and preserves first read on repeat',async()=>{
 for(const staff of ['admin','dispatcher','accounting']){reset();role=staff;const response=await POST(request(),params());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(writes,[{table:'panel_booking_reads',value:{user_id:'operator-a',booking_id:id},options:{onConflict:'user_id,booking_id',ignoreDuplicates:true}}]);}
});
test('database failure is visible rather than reported as saved',async()=>{reset();failure=true;assert.equal((await POST(request(),params())).status,503)});
