const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (filename) => readFileSync(path.join(root, filename), "utf8");
const css = read("app/globals.css");
const dispatcher = read("components/DispatcherClient.tsx");
const page = read("app/panel/dyspozytor/page.tsx");

test("dispatcher has its own wider shell and only uses table at ultra-wide widths", () => {
  assert.match(page, /className="container dispatcher-page"/);
  assert.match(css, /main\.container\.dispatcher-page\{max-width:1760px\}/);
  assert.match(css, /\.dispatcher-page \.dispatcher-desktop\{display:none\}/);
  assert.match(css, /\.dispatcher-page \.dispatcher-mobile-list\{display:grid/);
  assert.match(css, /@media\(min-width:1841px\)/);
  assert.match(css, /\.dispatcher-page \.dispatcher-table\{min-width:1480px\}/);
});

test("each booking card separates status, dates, route, staff and actions", () => {
  assert.match(dispatcher, /dispatcher-trip-header/);
  assert.match(dispatcher, /dispatcher-trip-status/);
  assert.match(dispatcher, /dispatcher-trip-dates/);
  assert.match(dispatcher, /dispatcher-trip-route/);
  assert.match(dispatcher, /dispatcher-trip-crew/);
  assert.match(dispatcher, /dispatcher-trip-footer/);
  assert.match(dispatcher, /<OperationalLegs b=\{b\} nowKey=\{nowKey\}/);
  assert.match(dispatcher, /<LegAssignmentControls b=\{b\}/);
  assert.match(dispatcher, /<QuickStatusAction b=\{b\}/);
  assert.match(dispatcher, /<QuickLinks b=\{b\}/);
});

test("outbound and return staff selects remain independent and accessible", () => {
  assert.match(dispatcher, /selects\("primary",driverId,vehicleId,setDriverId,setVehicleId\)/);
  assert.match(dispatcher, /selects\("return",returnDriverId,returnVehicleId,setReturnDriverId,setReturnVehicleId\)/);
  assert.match(dispatcher, /aria-label=\{/);
  assert.match(css, /\.dispatcher-page \.dispatcher-trip-crew \.dispatcher-leg-assignment select\{/);
  assert.match(css, /text-overflow:ellipsis/);
});

test("mobile selectors and action footer collapse without horizontal scrolling", () => {
  assert.match(css, /@media\(max-width:960px\)/);
  assert.match(css, /@media\(max-width:650px\)/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /\.dispatcher-page \.dispatcher-trip-footer\{/);
  assert.match(css, /\.dispatcher-page \.dispatcher-trip-footer \.dispatcher-mobile-actions\{/);
  assert.match(css, /\.dispatcher-page \.dispatcher-trip-crew \.dispatcher-leg-assignment\.return\{/);
  assert.match(css, /max-width:100%;min-width:0/);
});

test("UI changes do not include automatic backend booking writes", () => {
  assert.doesNotMatch(page, /\.delete\(\)|\.update\(\{|\.insert\(\{/);
  assert.match(dispatcher, /async function update\(/);
  assert.match(dispatcher, /onClick=\{\(\) => save\(\)\}/);
});

test("dashboard uses only the lower filter bar with completed and cancelled views", () => {
  assert.doesNotMatch(page, /className="dispatcher-archive-tabs"/);
  assert.match(dispatcher, /<nav className="dispatcher-scope" id="kursy"/);
  assert.match(dispatcher, /href="\/panel\/dyspozytor\?view=completed#kursy"/);
  assert.match(dispatcher, /href="\/panel\/dyspozytor\?view=cancelled#kursy"/);
  assert.match(page, /selectedView === "completed" \? "active" : ""/);
  assert.match(page, /selectedView === "cancelled" \? "active" : ""/);
  assert.match(css, /\.dispatcher-scope a,/);
  assert.match(css, /\.dispatcher-scope a\.active,/);
});

test("archived courses return through the same toolbar and keep date selection", () => {
  assert.match(page, /href="\/panel\/dyspozytor#kursy"/);
  assert.match(page, /href="\/panel\/dyspozytor\?scope=today#kursy"/);
  assert.match(page, /href="\/panel\/dyspozytor\?scope=next3h#kursy"/);
  assert.match(page, /initialScope=\{initialScope\}/);
  assert.match(dispatcher, /useState<Scope>\(initialScope\)/);
  assert.match(css, /\.dispatcher-scope\{scroll-margin-top:16px\}/);
});
