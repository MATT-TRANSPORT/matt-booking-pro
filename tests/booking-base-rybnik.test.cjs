const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("public quote and route preview use the same central Rybnik base",()=>{
 const base=read("lib/bookingRouteBase.ts");
 assert.match(base,/Wyzwolenia 20, 44-200 Rybnik/);
 assert.match(read("app/api/route/route.ts"),/PUBLIC_BOOKING_BASE_ADDRESS as BASE_ADDRESS/);
 assert.match(read("app/api/additional-stop/quote/route.ts"),/PUBLIC_BOOKING_BASE_ADDRESS/);
 assert.match(read("app/api/bookings/route.ts"),/PUBLIC_BOOKING_BASE_ADDRESS/);
 assert.doesNotMatch(read("components/BookingForm.tsx"),/Książenic/);
});
