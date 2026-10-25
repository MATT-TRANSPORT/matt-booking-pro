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
 assert.match(pl, /driverWhatsAppButton\(b\.driver_phone, b\.booking_number\)/);
 assert.match(pl, /driverWhatsAppButton\(b\.return_driver_phone, b\.booking_number\)/);
 assert.match(pl, /b\.service_type === "roundtrip"/);
});
test("international assigned email has localized driver CTAs for both legs",()=>{
 assert.match(intl, /driverWhatsAppButton\(b\.driver_phone,b\.booking_number,locale\)/);
 assert.match(intl, /driverWhatsAppButton\(b\.return_driver_phone,b\.booking_number,locale\)/);
 for(const language of ["pl","en","de","cs"]) assert.match(helper,new RegExp(language+": "));
});
