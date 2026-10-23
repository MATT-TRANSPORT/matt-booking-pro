const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const archiveList = readFileSync(path.join(__dirname,"../app/panel/rezerwacje/page.tsx"),"utf8");

test("Server Component booking list never passes inline handlers to DOM", () => {
  assert.doesNotMatch(archiveList, /\bon(?:Click|Change|Submit|MouseEnter|MouseLeave|KeyDown|KeyUp|Focus|Blur)\s*=/);
});

test("Booking archive controls remain rendered inside an action cell", () => {
  assert.match(archiveList, /<td><BookingArchiveActions\b/);
  assert.match(archiveList, /<a className="booking-number-link"/);
});
