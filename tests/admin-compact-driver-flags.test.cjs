const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.join(__dirname, "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

function driverRules() {
  const js = ts.transpileModule(read("lib/driverPayment.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports });
  return exports;
}

test("driver: only unpaid personal cash bookings show a collectable price", () => {
  const { driverPaymentDue: due } = driverRules();
  const cash = {total_price:390, payment_method:"cash",payment_status:"pending"};
  assert.equal(due(cash).collectibleCents, 39000);
  assert.equal(due({...cash,payment_status:"paid"}).collectibleCents, 0);
  assert.equal(due({...cash,payment_status:"review"}).collectibleCents, 0);
  assert.equal(due({...cash,payment_method:"online"}).collectibleCents, 0);
  assert.equal(due({...cash,payment_method:"bank_transfer"}).collectibleCents, 0);
  assert.equal(due({...cash,online_payment_requested:true}).collectibleCents, 0);
  assert.equal(due({...cash,company_id:"company-id",price_gross:529.20,payment_method:"employee_payment"}).collectibleCents, 0);
  assert.equal(due({...cash,company_id:"company-id",price_gross:529.20,payment_method:"company_transfer"}).collectibleCents, 0);
});
test("driver: roundtrip return leg doesn't silently collect full booking again", () => {
  const { driverPaymentDue: due, driverPln } = driverRules();
  const booking = {total_price:800, payment_status:"pending",payment_method:"cash",return_date:"2026-11-03"};
  assert.equal(due(booking,"primary").collectibleCents,80000);
  assert.equal(due(booking,"return").collectibleCents,0);
  assert.equal(due(booking,"return").grossCents,80000);
  assert.match(due(booking,"return").note,/nie pobieraj/i);
  assert.match(driverPln(52920),/529/);
});
test("driver interface and terminal use identical due rules", () => {
  assert.match(read("components/DriverTrips.tsx"),/driverPaymentDue\(b, leg\)/);
  assert.match(read("components/DriverTrips.tsx"),/DO POBRANIA:/);
  assert.match(read("app/api/driver/terminal/payment-intent/route.ts"),/driverPaymentDue\(booking, leg\)\.collectibleCents/);
});
test("booking flags are physical cross-platform SVG assets, not emoji", () => {
  const landing = read("components/BookingLanding.tsx");
  assert.match(landing, /\/flags\/\$\{code\}\.svg/);
  for (const code of ["pl","en","de","cs"]) {
    const filename = `public/flags/${code}.svg`;
    assert.ok(existsSync(path.join(root, filename)), filename);
    assert.match(read(filename), /<svg[^>]+viewBox="0 0 32 20"/);
  }
  assert.match(landing, /aria-pressed=\{locale===code\}/);
});
test("admin details collapse calendar, flight and snapshot by default", () => {
  const page = read("app/panel/rezerwacje/[id]/page.tsx");
  for (const block of ["reservation-calendar-fold","reservation-flight-fold","reservation-snapshot-fold"]) {
    assert.match(page, new RegExp(`<details className="card panel-collapsible-card ${block}"`));
  }
  assert.match(page, /<BookingDocumentsCard[^>]+compact/);
  assert.match(page, /reservation-is-b2b/);
  assert.doesNotMatch(page, /<details[^>]+open(?:\s|>)/);
});
test("dispatcher and booking deletion remain readable and safe", () => {
  const css = read("app/globals.css");
  assert.match(css, /@media\(max-width:1440px\)/);
  assert.match(css, /\.dispatcher-table tr\.dispatcher-b2b/);
  assert.match(css, /\.booking-language-switch\{/);
  const list = read("app/panel/rezerwacje/page.tsx");
  assert.match(list, /justDeleted/);
  assert.match(list, /role="status"/);
  assert.doesNotMatch(list, /onClick=/);
});
