const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");
const filename = path.join(__dirname, "../lib/routeDetourPolicy.ts");
const js = ts.transpileModule(fs.readFileSync(filename, "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = module.paths;
mod._compile(js, filename);
const { routeDetourKm, normalizeRouteStops, calculateFullRouteDetour } = mod.exports;

test("40 km pickup along the normal route has zero distance surcharge", async () => {
  const paths = [];
  const result = await calculateFullRouteDetour({
    baseAddress: "Rybnik", pickupAddress: "Pickup 40km away", destinationAddress: "Airport",
    drivingKm: async (_origin, _destination, via) => { paths.push(via); return via.length ? 100 : 100; }
  });
  assert.deepEqual(paths, [[], ["Pickup 40km away"]]);
  assert.equal(result.extraKm, 0);
});

test("multiple stops count only the full-route incremental distance once", async () => {
  const result = await calculateFullRouteDetour({
    baseAddress: "Base", pickupAddress: "A", stops: ["B", "C"], destinationAddress: "Airport",
    drivingKm: async (_from, _to, via) => via.length ? 106 : 100
  });
  assert.equal(result.extraKm, 6);
  assert.equal(routeDetourKm(100, 106), 6);
});
test("reject invalid and excessive stops", () => {
  assert.throws(() => normalizeRouteStops(Array(11).fill("A")));
  assert.throws(() => normalizeRouteStops([""]));
  assert.equal(routeDetourKm(100, 98), 0);
});
