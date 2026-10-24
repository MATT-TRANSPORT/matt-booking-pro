const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");
const page = read("app/kierowca/page.tsx");
const trips = read("components/DriverTrips.tsx");
const controls = read("components/DriverAppControls.tsx");
const css = read("app/globals.css");

test("driver landing view no longer has a full-width install card above the profile", () => {
  assert.doesNotMatch(page, /DriverAppControls/);
  assert.match(page, /<DriverTrips driver=\{driver\}/);
});

test("install and push controls remain available from the icon next to driver name", () => {
  assert.match(trips, /<div className="driver-title-row">\s*<h1>\{driver\.full_name\}<\/h1>/);
  assert.match(trips, /<details className="driver-install-menu">/);
  assert.match(trips, /<summary aria-label="Instalacja aplikacji i powiadomienia"/);
  assert.match(trips, /<DriverAppControls \/>/);
  assert.match(controls, /onClick=\{install\}/);
  assert.match(controls, /onClick=\{enablePush\}/);
  assert.match(controls, /onClick=\{disablePush\}/);
  assert.match(css, /\.driver-install-menu-content\{/);
});

test("operational start is hidden from course cards but remains in scheduling logic", () => {
  assert.doesNotMatch(trips, /<p className="muted">Start operacyjny kierowcy:/);
  assert.match(trips, /<small className="driver-booking-ref">\{b\.booking_number\}<\/small>/);
  assert.match(trips, /driverLegOperationalStartTime\(booking, leg\)/);
});

test("existing live flight-status box appears once, immediately beneath scheduled flight time", () => {
  const scheduled = trips.indexOf('className="muted driver-flight-scheduled-time"');
  const status = trips.indexOf('className="driver-flight-box driver-pro-flight-box"');
  const topEnds = trips.indexOf('className="driver-status-stack"', scheduled);
  const route = trips.indexOf('className="driver-route driver-pro-route"', scheduled);
  assert.ok(scheduled >= 0 && status > scheduled && status < topEnds);
  assert.ok(status < route);
  assert.equal((trips.match(/className="driver-flight-box driver-pro-flight-box"/g) || []).length, 1);
  assert.match(trips, /<FlightStatusBadge flight=\{flight\} flightNumber=\{flightNumber\}/);
  assert.match(trips, /displayFlightTime\(flight\.arr_estimated\)/);
  assert.match(trips, /flight\.arr_terminal/);
  assert.match(trips, /flight\.arr_gate/);
});
