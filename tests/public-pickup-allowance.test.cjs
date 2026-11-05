const { test } = require("node:test");
const assert = require("node:assert/strict");
const { registerHooks } = require("node:module");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/lib/routesServer") return { url: "data:text/javascript,export async function shortestDrivingRouteKm(){return {distanceKm:globalThis.__pickupTestKm}}", shortCircuit: true };
  return next(specifier.startsWith("@/") ? pathToFileURL(path.join(root, specifier.slice(2) + ".ts")).href : specifier, context);
}});
async function quote(distance, detour, serviceType = "to_airport", extra = 0) {
  globalThis.__pickupTestKm = distance;
  const { quotePublicMultiStopRoute } = await import("../lib/publicRouteQuote.ts");
  return quotePublicMultiStopRoute({
    baseAddress: "Base", pickupAddress: "Pickup", airportAddress: "Airport", serviceType,
    outboundStops: extra ? ["Stop"] : [],
    drivingKm: async (_a, _b, via) => 100 + (via.length ? detour : 0) + (via.includes("Stop") ? extra : 0)
  });
}
test("pickup within 30 km is free in either direction, including the reported address", async () => {
  for (const direction of ["to_airport", "from_airport", "roundtrip"]) {
    for (const distance of [0.3, 14.3, 29.9, 30]) {
      const result = await quote(distance, 8, direction);
      assert.equal(result.billableKm, 0);
      assert.equal(result.freePickupKm, 30);
    }
  }
});
test("only excess pickup kilometres are charged and on-route pickup remains free", async () => {
  assert.equal((await quote(30.1, 8)).billableKm, 0.1);
  assert.equal((await quote(35, 12)).billableKm, 5);
  assert.equal((await quote(45, 8)).billableKm, 8);
  assert.equal((await quote(45, 0)).billableKm, 0);
  assert.equal((await quote(35, 12, "roundtrip")).billableKm, 10);
});
test("extra stop detour is charged once without removing the free pickup allowance", async () => {
  const result = await quote(14.3, 8, "from_airport", 3);
  assert.equal(result.totalDetourKm, 11);
  assert.equal(result.billableKm, 1);
  assert.equal(result.chargedStopVisits, 1);
});
test("a stop that reduces the pickup detour never produces a negative charge", async () => {
  assert.equal((await quote(14.3, 8, "to_airport", -3)).billableKm, 0);
});
test("invalid measured pickup distance fails closed", async () => {
  await assert.rejects(() => quote(NaN, 8), /Nieprawidłowa/);
});

test("reported pickup produces only the base fare with no kilometre supplement", async () => {
  const route = await quote(0.3, 0.7, "from_airport");
  const { calculateQuote } = await import("../lib/pricing.ts");
  const price = calculateQuote({serviceType: "from_airport", airport: "pyrzowice", vehicleType: "car", distanceKm: 0, invoiceRequired: false, additionalStopExtraKm: route.billableKm});
  assert.equal(price.totalPrice, 290);
  assert.equal(price.additionalStopExtraPrice, 0);
});

test("large real detour inside pickup radius is never free (reported regression)", async () => {
  const result = await quote(29, 69.9);
  assert.equal(result.billableKm, 59.9);
  const { calculateQuote } = await import("../lib/pricing.ts");
  assert.equal(calculateQuote({ serviceType:"to_airport", airport:"balice", vehicleType:"car", distanceKm:29,
    pickupBillableKm:result.pickupBillableKm, additionalStopExtraKm:result.stopBillableKm, invoiceRequired:false }).totalPrice,533.76);
});
test("10 km limit is applied once per complete direction, not once per stop", async () => {
  assert.equal((await quote(20, 10)).billableKm, 0);
  assert.equal((await quote(20, 10.1)).billableKm, 0.1);
  assert.equal((await quote(20, 8, "to_airport", 12)).billableKm, 10);
  assert.equal((await quote(20, 20, "roundtrip")).billableKm, 20);
  assert.equal((await quote(100, 0, "roundtrip")).billableKm, 0);
});
