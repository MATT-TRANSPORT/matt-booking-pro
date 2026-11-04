const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const src=(file)=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
test("B2C quote and booking both use server-calculated multi-stop routes",()=>{
 const quote=src("app/api/additional-stop/quote/route.ts");
 const api=src("app/api/bookings/route.ts");
 for(const code of [quote,api]) {
  assert.match(code,/quotePublicMultiStopRoute/);
  assert.match(code,/PUBLIC_BOOKING_BASE_ADDRESS/);
  assert.match(code,/body\.routeStops !== undefined/);
 }
 assert.match(api,/additionalStopExtraKm: multiStopRoute\.stopBillableKm/);
 assert.match(api,/pickupBillableKm: multiStopRoute\.pickupBillableKm/);
});
test("B2C UI quotes and submits the same ordered stop list",()=>{
 const ui=src("components/BookingForm.tsx");
 assert.match(ui,/routeStops: multiStopActive \? \{outbound:routeStopsOut/);
 assert.match(ui,/\.\.\.\(multiStopActive\?\{routeStops:\{outbound:routeStopsOut/);
 assert.match(ui,/renderAdditionalStopBox/);
 assert.match(ui,/routeStopsOut\.length\+routeStopsBack\.length>=10/);
});
test("B2C booking itinerary is stored for drivers even without new DB fields",()=>{
 const api=src("app/api/bookings/route.ts");
 assert.match(api,/pricing_snapshot:/);
 assert.match(src("lib/multiStopRoutes.ts"),/route_stops:/);
});
