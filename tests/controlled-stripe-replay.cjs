// Replay a previously delivered TEST event against the isolated PR48 Preview.
// This exercises real HTTP/signature/database deduplication, not Stripe's retry transport.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const Stripe=require('stripe');
assert.equal(process.env.MATT_ALLOW_PREVIEW_TEST_REPLAY,'1');
const config=JSON.parse(fs.readFileSync(process.env.MATT_TEST_CONFIG_FILE,'utf8'));
assert.equal(config.MATT_TEST_MODE,'1');
assert.equal(new URL(config.NEXT_PUBLIC_SUPABASE_URL).hostname,'ozeqdorryajfioxpufzb.supabase.co');
const event=JSON.parse(fs.readFileSync(process.env.MATT_WEBHOOK_EVENT_FILE,'utf8'));
assert.equal(event.livemode,false);assert.equal(event.type,'checkout.session.completed');
assert.equal(event.data.object.payment_status,'paid');
assert.ok(event.data.object.id.startsWith('cs_test_'));
assert.ok(String(event.data.object.customer_email).endsWith('@example.invalid'));
const secret=fs.readFileSync(process.env.MATT_WEBHOOK_SECRET_FILE,'utf8').match(/^STRIPE_WEBHOOK_SECRET=(whsec_[A-Za-z0-9]+)\s*$/m)?.[1];
assert.ok(secret,'Only a dedicated TEST signing secret file is allowed');
const stripe=new Stripe('sk_test_unused_for_signature_only');
const body=JSON.stringify(event);
async function replay(signingSecret){
 const signature=stripe.webhooks.generateTestHeaderString({payload:body,secret:signingSecret});
 const r=await fetch('https://matt-booking-pro-git-feature-internationa-67b25c-matt-transport.vercel.app/api/payments/stripe/webhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':signature},body,signal:AbortSignal.timeout(30000)});
 return {status:r.status,body:await r.json()};
}
(async()=>{
 const preview=await fetch('https://matt-booking-pro-git-feature-internationa-67b25c-matt-transport.vercel.app/booking?lang=pl',{signal:AbortSignal.timeout(30000)});
 assert.equal(preview.status,200);assert.ok((await preview.text()).includes('ŚRODOWISKO TESTOWE'));
 const invalid=await replay('whsec_intentionally_invalid');assert.equal(invalid.status,400);
 const replies=await Promise.all([replay(secret),replay(secret)]);
 for(const r of replies){assert.equal(r.status,200);assert.equal(r.body.duplicate,true);}
 console.log(JSON.stringify({invalidSignature:'rejected',concurrentReplays:2,duplicates:'acknowledged',scope:'Manual signed TEST replays; inspect the isolated DB to confirm one paid audit and two queue jobs'}));
})().then(()=>process.exit(0)).catch(error=>{console.error(error.message);process.exit(1)});
