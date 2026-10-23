const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const css = readFileSync(path.join(root, "app/globals.css"), "utf8");
const dispatcher = readFileSync(path.join(root, "app/panel/dyspozytor/page.tsx"), "utf8");

test("history uses a distinct card selector without changing other dashboard cards", () => {
  assert.match(dispatcher, /booking-stage-card dispatcher-history-card/);
  assert.match(css, /\.dashboard-feed-card\.booking-stage-card\.dispatcher-history-card\s*\{grid-template-columns:46px minmax\(0,1fr\) auto\}/);
});
test("history actions occupy the detail column on mobile", () => {
  assert.match(css, /\.dispatcher-history-card \.dashboard-feed-meta\s*\{grid-column:2\/-1;flex-direction:row;flex-wrap:wrap/);
});
test("narrow phone rules constrain content, actions and column width", () => {
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /\.dashboard-feed-card\.booking-stage-card\.dispatcher-history-card\s*\{\s*grid-template-columns:32px minmax\(0,1fr\)/);
  assert.match(css, /\.dispatcher-history-card \.dashboard-feed-meta>\.btn\s*\{\s*flex:0 1 auto;|\.dispatcher-history-card \.dashboard-feed-meta>\.status,\s*\.dispatcher-history-card \.dashboard-feed-meta>\.btn\s*\{\s*flex:0 1 auto;/);
  assert.match(css, /\.dispatcher-history-card>div:nth-child\(2\)/);
  assert.match(css, /overflow-wrap:anywhere/);
});
