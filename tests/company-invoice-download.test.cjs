const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
let user=true,membership=true,invoiceCompany='company-a',invoicePath='company-a/test.pdf',signed=0;
const invoiceId='11111111-1111-4111-8111-111111111111';
const original=Module._load;
Module._load=function(id,parent,isMain){
 if(id==='@/lib/supabase/server')return {createClient:async()=>({auth:{getUser:async()=>({data:{user:user?{id:'user-a'}:null}})},from:()=>({select(){return this},eq(){return this},async single(){return {data:membership?{company_id:'company-a'}:null}}})})};
 if(id==='@/lib/supabase/admin')return {createAdminClient:()=>({from:()=>({select(){return this},eq(key,value){if(key==='company_id'&&value!==invoiceCompany)this.mismatch=true;return this},async single(){return {data:this.mismatch?null:{invoice_file_path:invoicePath}}}}),storage:{from:()=>({async createSignedUrl(){signed++;return {data:{signedUrl:'https://example.invalid/test.pdf'},error:null}}})}})};
 if(id.startsWith('@/'))id=path.join(root,id.slice(2));return original.call(this,id,parent,isMain);
};
require.extensions['.ts']=function(m,file){m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file)};
const get=require('../app/api/company/settlements/[id]/download/route.ts').GET;
function request(){return {headers:new Headers({'x-matt-locale':'en'}),nextUrl:new URL('http://localhost/test')}}
const call=id=>get(request(),{params:Promise.resolve({id})});
test('invalid document ID is rejected before storage',async()=>{signed=0;const r=await call('invalid');assert.equal(r.status,400);assert.equal(signed,0)});
test('anonymous session cannot create invoice URL',async()=>{signed=0;user=false;const r=await call(invoiceId);assert.equal(r.status,401);assert.equal(signed,0);user=true});
test('foreign company invoice is not accessible',async()=>{signed=0;invoiceCompany='company-b';const r=await call(invoiceId);assert.equal(r.status,404);assert.equal(signed,0);invoiceCompany='company-a'});
test('invoice redirect disables caching and referrer',async()=>{signed=0;const r=await call(invoiceId);assert.equal(r.status,307);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.equal(signed,1)});
