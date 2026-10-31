const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Module=require("node:module");
const ts=require("typescript");
const root=path.resolve(__dirname,"..");
const original=Module._load;
Module._load=function(id,parent,isMain) {
 if(id.startsWith("@/")) id=path.join(root,id.slice(2));
 if(id.endsWith(".ts")) {
  const code=ts.transpileModule(fs.readFileSync(id,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod=new Module(id,parent);mod.filename=id;mod.paths=module.paths;mod._compile(code,id);return mod.exports;
 }
 return original.call(this,id,parent,isMain);
};
const {quoteMultiStopRoute}=require("../lib/multiStopRoutes.ts");
test("no startup charge when all pickup points lie on usual route",async()=>{
 const seen=[];
 const r=await quoteMultiStopRoute({baseAddress:"Base",pickupAddress:"A",airportAddress:"Airport",serviceType:"to_airport",outboundStops:["B","C"],drivingKm:async(_a,_b,via)=>{seen.push(via);return 100;}});
 assert.deepEqual(seen,[[],["A","B","C"]]);
 assert.equal(r.totalDetourKm,0);
 assert.equal(r.chargedStopVisits,2);
});
test("six extra kilometers are counted once, not per stop",async()=>{
 const r=await quoteMultiStopRoute({baseAddress:"Base",pickupAddress:"A",airportAddress:"Airport",serviceType:"to_airport",outboundStops:["B","C"],drivingKm:async(_a,_b,via)=>via.length?106:100});
 assert.equal(r.totalDetourKm,6);
});
test("return pickup follows intermediate stops",async()=>{
 const seen=[];
 await quoteMultiStopRoute({baseAddress:"Base",pickupAddress:"Client",airportAddress:"Airport",serviceType:"roundtrip",outboundStops:["Out"],inboundStops:["Return"],drivingKm:async(a,b,via)=>{seen.push([a,b,via]);return 100;}});
 assert.deepEqual(seen[3],["Airport","Base",["Return","Client"]]);
});
test("invalid stop count is rejected",async()=>{
 await assert.rejects(()=>quoteMultiStopRoute({baseAddress:"B",pickupAddress:"A",airportAddress:"Airport",serviceType:"to_airport",outboundStops:Array(11).fill("A"),drivingKm:async()=>100}),/Maksymalnie/);
});
