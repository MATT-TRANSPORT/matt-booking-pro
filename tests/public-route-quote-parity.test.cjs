const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname,"..");
const origLoad = Module._load;
Module._load = function(id,parent,isMain) {
 if(id === "@/lib/bookingRouteBase") return { PUBLIC_BOOKING_FREE_PICKUP_KM:30 };
 return origLoad.call(this,id,parent,isMain);
};
const file=path.join(root,"lib/pricing.ts");
const mod=new Module(file,module);
mod.filename=file;
mod.paths=module.paths;
mod._compile(ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {calculateQuote}=mod.exports;
const code=p=>fs.readFileSync(path.join(root,p),"utf8");
const quote=(opts={})=>calculateQuote({serviceType:"to_airport",airport:"pyrzowice",vehicleType:"car",distanceKm:0,invoiceRequired:false,...opts});

test("pickup on the normal airport route retains the 290 PLN fare",()=>{
 const price=quote({pickupBillableKm:0});
 assert.equal(price.totalPrice,290);
 assert.equal(price.extraPrice,0);
});
test("roundtrip billable pickup distance is not multiplied twice",()=>{
 const price=quote({serviceType:"roundtrip",pickupBillableKm:3});
 assert.equal(price.basePrice,580);
 assert.equal(price.extraPrice,7.2);
 assert.equal(price.totalPrice,587.2);
});
test("additional stops and pickup charges remain separate",()=>{
 const price=quote({pickupBillableKm:3,additionalStopCount:2,additionalStopExtraKm:2});
 assert.equal(price.extraPrice,7.2);
 assert.equal(price.additionalStopFee,40);
 assert.equal(price.additionalStopExtraPrice,4.8);
 assert.equal(price.totalPrice,342);
});
test("B2C browser and API use the same full-route server quote",()=>{
 const ui=code("components/BookingForm.tsx");
 const api=code("app/api/bookings/route.ts");
 const server=code("app/api/additional-stop/quote/route.ts");
 assert.match(ui,/pickupExtraPrice/);
 assert.match(ui,/stopDetourPrice/);
 assert.match(ui,/additionalStopBusy \|\| !additionalStopQuote/);
 assert.match(server,/pickupExtraPrice/);
 assert.match(server,/stopDetourPrice/);
 assert.match(api,/pickupBillableKm: multiStopRoute\.pickupBillableKm/);
 assert.match(api,/additionalStopExtraKm: multiStopRoute\.stopBillableKm/);
 assert.match(api,/expectedTotal/);
});
