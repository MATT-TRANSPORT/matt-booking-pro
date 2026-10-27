const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
let session,expired,fail=false,calls=0;
const old=Module._load;
Module._load=function(id,parent,main){
 if(id==='@/lib/testEnvironment')return {assertSafeStripeKey(){}};
 if(id==='stripe')return class {checkout={sessions:{retrieve:async()=>{if(fail)throw Error('network');return session},expire:async()=>{calls++;return expired}}}};
 return old.call(this,id,parent,main);
};
require.extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,file);
process.env.STRIPE_SECRET_KEY='sk_test_fixture_only';
const {expireCheckoutSessionForChange}=require('../lib/stripeServer.ts');
test('payment method change safely expires open unpaid Checkout',async()=>{session={status:'open',payment_status:'unpaid'};expired={status:'expired'};await expireCheckoutSessionForChange('cs_test_fixture');assert.equal(calls,1)});
test('already expired unpaid session is safe; missing session needs no Stripe call',async()=>{session={status:'expired',payment_status:'unpaid'};calls=0;await expireCheckoutSessionForChange('cs_test_fixture');await expireCheckoutSessionForChange(null);assert.equal(calls,0)});
test('completed, paid, unknown or failed Checkout cannot be detached',async()=>{for(const status of ['complete','unknown']){session={status,payment_status:'unpaid'};await assert.rejects(expireCheckoutSessionForChange('cs_test_fixture'))}session={status:'open',payment_status:'paid'};await assert.rejects(expireCheckoutSessionForChange('cs_test_fixture'));fail=true;await assert.rejects(expireCheckoutSessionForChange('cs_test_fixture'));fail=false;session={status:'open',payment_status:'unpaid'};expired={status:'open'};await assert.rejects(expireCheckoutSessionForChange('cs_test_fixture'))});
