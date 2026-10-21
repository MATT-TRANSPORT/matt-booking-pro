const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),Module=require('node:module'),ts=require('typescript');
let user,role,memberCompany,signed;
function reset(){user={id:'test-user'};role=null;memberCompany=null;signed=0;}
const original=Module._load;
Module._load=function(name,parent,main){
 if(name==='@/lib/supabase/server')return {createClient:async()=>({auth:{getUser:async()=>({data:{user}})}})};
 if(name==='@/lib/supabase/admin')return {createAdminClient:()=>({from(table){let company;const q={select(){return q},eq(k,v){if(k==='company_id')company=v;return q},single:async()=>({data:{company_id:'company-a',storage_path:'company-a/test.pdf'}}),maybeSingle:async()=>({data:table==='profiles'?(role?{role}:null):(memberCompany===company?{company_id:company,active:true}:null)})};return q},storage:{from:()=>({createSignedUrl:async()=>{signed++;return {data:{signedUrl:'https://example.invalid/test.pdf'}}}})}})};
 return original.call(this,name,parent,main);
};
require.extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {GET}=require('../app/api/booking-documents/[documentId]/download/route.ts');
const call=()=>GET(new Request('http://localhost/test'),{params:Promise.resolve({documentId:'abd9d01d-3437-4695-a824-13cbf8356dcb'})});
test('anonymous and foreign-company users cannot obtain signed document links',async()=>{reset();user=null;assert.equal((await call()).status,401);assert.equal(signed,0);reset();memberCompany='company-b';assert.equal((await call()).status,403);assert.equal(signed,0)});
test('staff and owning company receive private noncached document redirects',async()=>{for(const actor of ['admin','dispatcher','accounting','company']){reset();if(actor==='company')memberCompany='company-a';else role=actor;const r=await call();assert.equal(r.status,307);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.equal(signed,1)}});
