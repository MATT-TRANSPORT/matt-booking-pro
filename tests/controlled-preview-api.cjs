// Opt-in HTTP integration test. Only the two isolated PR48 branch aliases are allowed.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {createServerClient}=require('@supabase/ssr');
const roots=['https://matt-booking-pro-git-feature-internationa-67b25c-matt-transport.vercel.app','https://matt-booking-pro1-git-feature-internation-bf0d83-matt-transport.vercel.app'];
assert.equal(process.env.MATT_ALLOW_PREVIEW_TEST_WRITES,'1','Explicit isolated Preview write opt-in required');
assert.ok(process.env.MATT_PREVIEW_RESULT_FILE,'Save test record IDs outside git for reconciliation');
const kinds=process.env.MATT_PREVIEW_KINDS?.split(',');
if(kinds)assert.ok(kinds.length&&kinds.every(kind=>['airport','company','wedding','general'].includes(kind)),'Unknown test kind');
const config=JSON.parse(fs.readFileSync(process.env.MATT_TEST_CONFIG_FILE,'utf8'));
const users=JSON.parse(fs.readFileSync(process.env.MATT_E2E_USERS_FILE,'utf8'));
assert.equal(config.MATT_TEST_MODE,'1');
assert.equal(new URL(config.NEXT_PUBLIC_SUPABASE_URL).hostname,'ozeqdorryajfioxpufzb.supabase.co');
const marker='E2E-PR48-HTTP-20261018';
const results=[],records=[];
async function request(root,path,locale,body,cookie){
 assert.ok(roots.includes(root));
 const r=await fetch(root+path,{method:body===undefined?'GET':'POST',headers:{'x-matt-locale':locale,...(body===undefined?{}:{'content-type':'application/json'}),...(cookie?{cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(60000)});
 const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={error:'Non-JSON response'}}
 return {status:r.status,data,language:r.headers.get('content-language')};
}
(async()=>{
 for(const root of roots){
  const page=await fetch(root+'/booking?service=airport&lang=pl',{signal:AbortSignal.timeout(45000)});
  assert.equal(page.status,200);assert.ok((await page.text()).includes('ŚRODOWISKO TESTOWE'));
  const airports=await request(root,'/api/airports','pl');assert.equal(airports.status,200);assert.equal(airports.data.airports.pyrzowice.bus,400);
 }
 const cookieJar=new Map();
 const auth=createServerClient(config.NEXT_PUBLIC_SUPABASE_URL,config.NEXT_PUBLIC_SUPABASE_ANON_KEY,{global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})},cookies:{getAll:()=>[...cookieJar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(x=>cookieJar.set(x.name,x.value))}});
 const user=users.find(x=>x.role==='company_a');assert.ok(user);
 const login=await auth.auth.signInWithPassword({email:user.email,password:user.password});assert.equal(login.error,null,'Isolated company login');
 const cookie=[...cookieJar].map(([name,value])=>name+'='+value).join('; ');
 try{
  for(const locale of ['pl','en','de','cs']){
   const common={locale,serviceType:'roundtrip',address:'Miejski Ośrodek Kultury, Mariacka 9, Radlin, Polska',origin:'Miejski Ośrodek Kultury, Mariacka 9, Radlin, Polska',destination:'Katowice Airport, Pyrzowice, Polska',airport:'pyrzowice',vehicleType:'bus',passengers:8,distanceKm:18.8,travelDate:'2027-01-20',travelTime:'08:30',returnDate:'2027-01-27',returnTime:'14:55',roundtrip:true,customerName:marker+' '+locale,phone:'+48000000000',email:'pr48-'+locale+'@example.invalid',paymentMethod:'online',notes:marker+' '+locale+' TEST ONLY — NIE REALIZOWAĆ',startDate:'2027-01-20',startTime:'18:30',restaurantName:'E2E TEST ONLY',restaurantAddress:'Mariacka 9, Radlin, Polska',vehiclesCount:2,vehicleTypes:['bus','car']};
   for(const [kind,path,root,extra] of [
    ['airport','/api/bookings',roots[0],{}],
    ['company','/api/company/bookings',roots[1],{paymentMethod:'employee_payment',newEmployee:{firstName:'E2E PR48 '+locale,lastName:'TEST ONLY'}}],
    ['wedding','/api/wedding-bookings',roots[0],{}],
    ['general','/api/general-bookings',roots[0],{}]
   ]){
    if(kinds&&!kinds.includes(kind))continue;
    const reply=await request(root,path,locale,{...common,...extra},kind==='company'?cookie:undefined);
    assert.equal(reply.status,200,kind+'/'+locale+': '+JSON.stringify(reply.data.error));
    const booking=reply.data.booking??reply.data;
    assert.ok(booking.id,kind+'/'+locale+': persisted record');
    assert.equal(booking.customer_locale,locale,kind+'/'+locale+': stored language');
    if(kind!=='wedding'){assert.equal(booking.return_date,'2027-01-27');assert.equal(String(booking.return_time).slice(0,5),'14:55');}
    if(kind==='airport'){assert.equal(Number(booking.total_price),800);assert.equal(booking.payment_method,'online');}
    records.push({kind,locale,id:booking.id,token:booking.customer_access_token});
    if(booking.customer_access_token&&kind!=='company'){
     const portal=await request(roots[0],'/api/client-booking/'+booking.customer_access_token,locale);
     assert.equal(portal.status,200,kind+'/'+locale+': portal');assert.equal(portal.data.booking.customer_locale,locale);
    }
    assert.notEqual(reply.data.email_sent,true,'Preview must never send real email');
    results.push({kind,locale,status:'PASS',scope:'HTTP API → isolated DB → response and token portal when applicable'});
    console.log(kind+'/'+locale+': PASS');
   }
   const invalid=await request(roots[0],'/api/bookings',locale,{...common,paymentMethod:'bank_transfer'});
   assert.equal(invalid.status,400);if(locale!=='pl')assert.ok(!invalid.data.error.includes('Dla rezerwacji indywidualnych'));
   results.push({kind:'bank-transfer-rejected',locale,status:'PASS'});
  }
 }finally{
  fs.writeFileSync(process.env.MATT_PREVIEW_RESULT_FILE,JSON.stringify({marker,results,records},null,2),{mode:0o600});
  await auth.auth.signOut();
 }
 console.log(JSON.stringify({passed:results.length,scope:'Isolated HTTP API integration; no browser/Stripe payment/provider delivery assertions'}));
})().then(()=>process.exit(0)).catch(error=>{console.error(error.message);process.exit(1)});
