const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const helper = fs.readFileSync(path.join(root,"lib/driverWhatsAppEmail.ts"),"utf8");
const pl = fs.readFileSync(path.join(root,"lib/emailTemplates.ts"),"utf8");
const intl = fs.readFileSync(path.join(root,"lib/localizedStatusEmails.ts"),"utf8");

test("whatsapp driver helper accepts Polish and international numbers safely",()=>{
 assert.match(helper, /digits\.startsWith\("00"\)/);
 assert.match(helper, /digits = "48" \+ digits/);
 assert.match(helper, /https:\/\/wa\.me\//);
 assert.match(helper, /encodeURIComponent/);
 assert.match(helper, /return null/);
 assert.match(helper, /replaceAll\("&","&amp;"\)/);
});
test("outbound and return contacts get separate links in Polish assigned email",()=>{
 assert.match(pl, /driverWhatsAppButton\(phone,b\.booking_number\)/);
 assert.match(pl, /isReturn \? b\.return_driver_phone : b\.driver_phone/);
 assert.match(pl, /assignedDriverCard\(b,true\)/);
 assert.match(pl, /b\.service_type === "roundtrip"/);
});
test("international assigned email has localized driver CTAs for both legs",()=>{
 assert.match(intl, /driverWhatsAppButton\(b\.driver_phone,b\.booking_number,locale\)/);
 assert.match(intl, /driverWhatsAppButton\(b\.return_driver_phone,b\.booking_number,locale\)/);
 for(const language of ["pl","en","de","cs"]) assert.match(helper,new RegExp(language+": "));
});

test("Polish customer emails use a branded presentation table with rounded details",()=>{
 const css=pl;
 assert.match(css, /function shell\(title: string, content: string\)/);
 assert.match(css, /table role="presentation"/);
 assert.match(css, /border-radius:22px/);
 assert.match(css, /function mailRow\(/);
 assert.match(css, /SZCZEGÓŁY REZERWACJI/);
});
test("international templates use the same rounded table presentation",()=>{
 assert.match(intl, /table role="presentation"/);
 assert.match(intl, /border-radius:22px/);
 assert.match(intl, /border-radius:16px/);
 assert.match(intl, /function localizedStatusEmail/);
});

test("premium 2.0 puts a compact trip summary and driver actions before guidance",()=>{
  assert.match(pl,/function assignedSummary\(/);
  assert.match(pl,/function assignedDriverCard\(/);
  const start=pl.indexOf("export function assignedEmail(");
  const end=pl.indexOf("export function completedEmail(",start);
  const body=pl.slice(start,end);
  assert.ok(body.indexOf("assignedSummary(b)") < body.indexOf("assignedDriverCard(b)"));
  assert.ok(body.indexOf("assignedDriverCard(b)") < body.lastIndexOf("travelGuideHtml(b.service_type"));
  assert.match(body,/assignedDriverCard\(b,true\)/);
  assert.match(pl,/Zadzwoń do kierowcy/);
});
test("international messages have compact assigned summary",()=>{
  assert.match(intl,/const assignmentHero=kind==="assigned"/);
  assert.match(intl,/kind==="assigned" \? assignmentHero/);
});

test("assigned route typography stays readable and compact in Polish and international email",()=>{
 assert.match(pl, /font-size:17px;font-weight:700;line-height:1\\.5;overflow-wrap:anywhere/);
 assert.match(intl, /font-size:17px;line-height:1\\.5;font-weight:700;color:#fff;overflow-wrap:anywhere/);
 assert.doesNotMatch(pl, /font-size:23px;font-weight:800;line-height:1\\.35;overflow-wrap:anywhere/);
 assert.doesNotMatch(intl, /font-size:22px;font-weight:800;color:#fff;overflow-wrap:anywhere/);
});
