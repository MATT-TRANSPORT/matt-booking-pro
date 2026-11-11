const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Module=require("node:module");
const ts=require("typescript");
const root=path.resolve(__dirname,"..");
const originalLoad=Module._load;
Module._load=function(id,parent,isMain){
  if(id==="@/lib/bookingOrigin")return {bookingOrigin:()=> "https://example.invalid"};
  if(id==="@/lib/testEnvironment")return {isTestEnvironment:()=>true};
  if(id==="@/lib/bookingLocale")return {withCustomerLocale:(url)=>url};
  if(id.startsWith("@/"))id=path.join(root,id.slice(2));
  return originalLoad.call(this,id,parent,isMain);
};
require.extensions[".ts"]=function(module,file){
  module._compile(ts.transpileModule(fs.readFileSync(file,"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
  }).outputText,file);
};
const {isCompletedOnlineUnpaid}=require("../lib/payment.ts");

test("private online booking completed but pending is flagged",()=>{
  assert.equal(isCompletedOnlineUnpaid({status:"completed",payment_method:"online",payment_status:"pending"}),true);
});
test("private booking not selected for online payment is not flagged",()=>{
  assert.equal(isCompletedOnlineUnpaid({status:"completed",payment_method:"cash",payment_status:"pending",online_payment_requested:false}),false);
});
test("B2B employee online payment pending is flagged",()=>{
  assert.equal(isCompletedOnlineUnpaid({status:"completed",company_id:"company-1",payment_method:"employee_payment",payment_status:"pending"}),true);
});
test("B2B bank transfer is not flagged",()=>{
  assert.equal(isCompletedOnlineUnpaid({status:"completed",company_id:"company-1",payment_method:"company_transfer",payment_status:"pending"}),false);
});
test("only completed bookings are flagged",()=>{
  assert.equal(isCompletedOnlineUnpaid({status:"in_progress",payment_method:"online",payment_status:"pending"}),false);
});
test("paid and refunded online bookings are not flagged",()=>{
  for(const payment_status of ["paid","refunded"]){
    assert.equal(isCompletedOnlineUnpaid({status:"completed",payment_method:"online",payment_status}),false);
  }
});
test("failed and review online payments remain visible for follow-up",()=>{
  for(const payment_status of ["failed","review"]){
    assert.equal(isCompletedOnlineUnpaid({status:"completed",payment_method:"online",payment_status}),true);
  }
});
