const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let distance = 20, detour = 69.9;
const load = Module._load;
Module._load = function(id, parent, main) {
  if (id === '@/lib/airportPricingServer') return { getAirportPricing: async () => ({label:'Balice',route_address:'Airport',car_price:390,bus_price:500}) };
  if (id === '@/lib/routesServer') return { shortestDrivingRouteKm: async () => ({distanceKm:distance}) };
  if (id.startsWith('@/')) id = path.join(root, id.slice(2)) + '.ts';
  if (id.endsWith('.ts')) {
    if (require.cache[id]) return require.cache[id].exports;
    const mod = new Module(id,parent); mod.filename=id; mod.paths=module.paths; require.cache[id]=mod;
    mod._compile(ts.transpileModule(fs.readFileSync(id,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,id);return mod.exports;
  }
  return load.call(this,id,parent,main);
};
process.env.GOOGLE_MAPS_API_KEY='test';
global.fetch=async (_url,opts)=>{const body=JSON.parse(opts.body);return {ok:true,json:async()=>({routes:[{distanceMeters:(100+(body.intermediates?.length ? detour:0))*1000}]})};};
const {calculateCompanyQuote}=require(path.join(root,'lib/companyPricing.ts'));
const {quoteMultiStopRoute}=require(path.join(root,'lib/multiStopRoutes.ts'));
const {canRepriceBooking}=require(path.join(root,'lib/bookingReprice.ts'));
const admin={from:()=>{const q={select:()=>q,eq:()=>q,lte:()=>q,order:()=>q,limit:()=>q,maybeSingle:async()=>({data:{id:'terms',pricing_origin_address:'Old headquarters',free_km:40,extra_km_rate_net:9,vat_rate:8,use_custom_pricing:false}})};return q;}};
for(const serviceType of ['to_airport','from_airport','roundtrip']) test(`B2B/B2C parity with stops and legacy input: ${serviceType}`,async()=>{
 for(const [pickup,extra] of [[20,0],[20,10],[20,69.9],[31,8],[100,0],[50,25]]) {
  distance=pickup;detour=extra;
  const route=await quoteMultiStopRoute({baseAddress:'Old headquarters',pickupAddress:'Pickup',airportAddress:'Airport',serviceType,outboundStops:['Stop']});
  const company=await calculateCompanyQuote(admin,{companyId:'company',pickupAddress:'Pickup',airportKey:'balice',vehicleType:'car',serviceType,routeStops:{outbound:['Stop'],inbound:[]}});
  assert.equal(company.billableKm,Math.round(Math.max(0,route.totalDetourKm-40)*10)/10);
  assert.equal(company.extraPriceNet,Math.round(company.billableKm*900)/100);
  assert.equal(company.additionalStopExtraPriceNet,0);
  assert.equal(company.additionalStopFeeNet,20);
  assert.equal(company.freeKm,40);
  assert.equal(company.extraKmRateNet,9);
  assert.equal(company.originAddress,'Old headquarters');
  assert.equal(company.snapshot.route_detour_km,route.totalDetourKm);
  const legacy=await calculateCompanyQuote(admin,{companyId:'company',pickupAddress:'Pickup',airportKey:'balice',vehicleType:'car',serviceType,additionalStopAddress:'Stop',additionalStopPrimary:true});
  assert.equal(legacy.gross,company.gross);
 }
});
test('price correction is blocked for confirmed, paid and active checkout bookings',()=>{
 const pending={status:'pending',payment_status:'pending',service_type:'to_airport'};
 assert.equal(canRepriceBooking(pending),true);
 for(const patch of [{status:'confirmed'},{status:'assigned'},{status:'completed'},{payment_status:'paid'},{payment_status:'processing'},{payment_paid_at:'2026-11-05'},{payment_checkout_session_id:'cs_1'},{payment_intent_id:'pi_1'},{service_type:'point_to_point'}]) assert.equal(canRepriceBooking({...pending,...patch}),false);
});
