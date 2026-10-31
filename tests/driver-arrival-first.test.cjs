const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

test("driver skips in_progress and starts with arrived", () => {
  const ops = read("lib/driverOps.ts");
  assert.match(ops, /DRIVER_FLOW: DriverStep\[\] = \["assigned", "arrived", "picked_up", "completed"\]/);
  assert.match(ops, /if \(value === "in_progress"\) return "assigned"/);
  assert.match(ops, /return nextDriverStatus\(current\) === String\(target \|\| ""\)/);
});

test("driver API accepts arrived and still checks assigned vehicle", () => {
  const api = read("app/api/driver/bookings/[id]/status/route.ts");
  assert.match(api, /const ALLOWED: DriverStep\[\] = \[\s*"arrived",\s*"picked_up",\s*"completed"\s*\]/);
  assert.match(api, /status === "arrived" && !assignedVehicleId/);
  assert.match(api, /driverTransitionAllowed\(booking.status, status\)/);
  assert.match(api, /status === "arrived"/);
});

test("driver schedule labels client pickup, not driver base departure", () => {
  const ui = read("components/DriverTrips.tsx");
  assert.match(ui, /Wyjazd z adresu klienta/);
  assert.doesNotMatch(ui, /<strong>Start \{driverLegOperationalStartDate/);
  assert.doesNotMatch(ui, /<small>Wylot \{driverLegDate/);
  assert.match(ui, /nextStatus === "arrived"/);
});
