// Creates TEST Checkout sessions only, from records produced by controlled-preview-api.
// Confirmation setup is performed separately in the isolated test database.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {createServerClient}=require('@supabase/ssr');
assert.equal(process.env.MATT_ALLOW_PREVIEW_TEST_CHECKOUT,'1');
assert.ok(process.env.MATT_PREVIEW_CHECKOUT_RESULTS,'Save TEST session IDs outside git');
const config=JSON.parse(fs.readFileSync(process.env.MATT_TEST_CONFIG_FILE,'utf8'));
assert.equal(config.MATT_TEST_MODE,'1');
assert.equal(new URL(config.NEXT_PUBLIC_SUPABASE_URL).hostname,'ozeqdorryajfioxpufzb.supabase.co');
const users=JSON.parse(fs.readFileSync(process.env.MATT_E2E_USERS_FILE,'utf8'));
const records=process.env.MATT_PREVIEW_RECORD_FILES.split(',').flatMap(file=>JSON.parse(fs.readFileSync(file,'utf8')).records).filter(r=>(r.kind==='airport'&&r.locale!=='pl')||r.kind==='company');
assert.equal(records.length,7);assert.equal(new Set(records.map(r=>r.id)).size,7);
assert.ok(records.every(r=>/^[a-f0-9-]{36}$/.test(r.id)&&/^[a-f0-9-]{36}$/.test(r.token)));
const roots={airport:'https://matt-booking-pro-git-feature-internationa-67b25c-matt-transport.vercel.app',company:'https://matt-booking-pro1-git-feature-internation-bf0d83-matt-transport.vercel.app'};
const results=[];
(async()=>{
 for(const root of Object.values(roots)){
  const r=await fetch(root+'/booking?lang=pl',{signal:AbortSignal.timeout(30000)});
  assert.equal(r.status,200);assert.ok((await r.text()).includes('ŚRODOWISKO TESTOWE'));
 }
 const jar=new Map();
 const auth=createServerClient(config.NEXT_PUBLIC_SUPABASE_URL,config.NEXT_PUBLIC_SUPABASE_ANON_KEY,{global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})},cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(x=>jar.set(x.name,x.value))}});
 const user=users.find(x=>x.role==='company_a');
 const login=await auth.auth.signInWithPassword({email:user.email,password:user.password});assert.equal(login.error,null);
 const cookie=[...jar].map(([name,value])=>name+'='+value).join('; ');
 try{
  for(const record of records){
   const path=record.kind==='airport'?'/api/payments/checkout/'+record.token:'/api/company/bookings/'+record.id+'/checkout';
   const reply=await fetch(roots[record.kind]+path,{method:'POST',headers:{'x-matt-locale':record.locale,...(record.kind==='company'?{cookie}:{})},signal:AbortSignal.timeout(40000)});
   const data=await reply.json();assert.equal(reply.status,200,record.kind+'/'+record.locale+': '+JSON.stringify(data.error));
   const url=new URL(data.url);assert.equal(url.origin,'https://checkout.stripe.com');
   const sessionId=url.pathname.split('/').pop();assert.ok(sessionId.startsWith('cs_test_'));
   results.push({...record,url:url.href,sessionId});console.log(record.kind+'/'+record.locale+': TEST session created');
  }
 }finally{
  fs.writeFileSync(process.env.MATT_PREVIEW_CHECKOUT_RESULTS,JSON.stringify(results,null,2),{mode:0o600});
  await auth.auth.signOut();
 }
})().then(()=>process.exit(0)).catch(error=>{console.error(error.message);process.exit(1)});
