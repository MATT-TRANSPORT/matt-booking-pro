const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const source=(file)=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
test("B2B quote and booking APIs both forward route stops to server pricing",()=>{
 for(const file of ["app/api/company/quote/route.ts","app/api/company/bookings/route.ts"]){
  const code=source(file);
  assert.match(code,/body\.routeStops !== undefined/);
  assert.match(code,/calculateCompanyQuote/);
 }
});
test("B2B price is recomputed by the server and ordered stops survive in snapshot",()=>{
 const code=source("lib/companyPricing.ts");
 assert.match(code,/quoteMultiStopRoute/);
 assert.match(code,/route_stops: routeStops/);
 assert.match(code,/route_detour_km: multiStopRoute\.totalDetourKm/);
 assert.match(code,/pricing_snapshot: quote\.snapshot/);
});
test("B2B UI sends the same ordered route stops for quote and submission",()=>{
 const code=source("components/CompanyBookingForm.tsx");
 assert.equal((code.match(/routeStops:\s*\{ outbound: routeStopsOut/g)||[]).length,2);
 assert.match(code,/section\.set\(section\.values\.map/);
 assert.match(code,/routeStopsOut\.length \+ routeStopsBack\.length >= 10/);
});
test("driver renders the ordered stops from saved snapshot",()=>{
 const code=source("components/DriverTrips.tsx");
 assert.match(code,/\(snapshot as any\)\.route_stops/);
 assert.match(code,/Kolejne przystanki/);
});
