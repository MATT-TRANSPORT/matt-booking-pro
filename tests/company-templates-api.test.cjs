// Isolated route tests: fake Auth/PostgREST, no network or credentials.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let rows, writes;
function reset() {
  rows = {
    company_users: [{ company_id: 'company-a', role: 'admin', active: true, user_id: 'user-a' }],
    company_employees: [{ id: 'employee-a', company_id: 'company-a', active: true }],
    bookings: [{ id: 'booking-a', company_id: 'company-a', company_employee_id: 'employee-a', customer_name: 'Test Employee', airport_label: 'Pyrzowice', airport_key: 'pyrzowice', pickup_address: 'TEST Radlin', service_type: 'to_airport', vehicle_type: 'car', passengers: 1, travel_date: '2027-02-01', return_date: null }],
    company_booking_templates: []
  };
  writes = [];
}
reset();
function dbQuery(table) {
  let clauses = [], mode = 'select', value;
  const q = {
    select() { return q; },
    eq(key, expected) { clauses.push(row => row[key] === expected); return q; },
    maybeSingle() { return execute(true); },
    single() { return execute(true); },
    update(v) { mode = 'update'; value = v; return q; },
    insert(v) { mode = 'insert'; value = v; return q; },
    then(resolve, reject) { return execute(false).then(resolve, reject); }
  };
  function execute(single) {
    return Promise.resolve().then(() => {
      const found = (rows[table] || []).filter(row => clauses.every(p => p(row)));
      if (mode === 'select') return { data: single ? found[0] || null : found, error: null };
      if (mode === 'update') {
        writes.push({ table, mode, value });
        const result = found.map(row => Object.assign(row, value));
        return { data: single ? result[0] || null : result, error: null };
      }
      writes.push({ table, mode, value });
      const data = { id: 'template-created', ...value };
      (rows[table] ||= []).push(data);
      return { data: single ? data : [data], error: null };
    });
  }
  return q;
}
const admin = { from: dbQuery };
const original = Module._load;
Module._load = function(id, parent, isMain) {
  if (id === '@/lib/supabase/server') return { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'user-a' } } }) }, from: dbQuery }) };
  if (id === '@/lib/supabase/admin') return { createAdminClient: () => admin };
  if (id.startsWith('@/')) id = path.join(root, id.slice(2));
  return original.call(this, id, parent, isMain);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const post = require('../app/api/company/templates/route.ts').POST;
function req(body, lang = 'en') {
  return { headers: new Headers({ 'x-matt-locale': lang }), nextUrl: new URL('http://localhost/api/company/templates'), json: async () => body };
}
test('malformed JSON returns 400 without writes', async () => {
  reset();
  const request = req(null);
  request.json = async () => { throw new SyntaxError('invalid JSON'); };
  const response = await post(request);
  assert.equal(response.status, 400);
  assert.equal(writes.length, 0);
});
test('unknown action and missing identifiers are rejected', async () => {
  for (const body of [{ action: 'unknown' }, { action: 'delete' }, { action: 'update' }, { action: 'from_booking' }]) {
    reset();
    const response = await post(req(body));
    assert.equal(response.status, 400);
    assert.equal(writes.length, 0);
  }
});
test('template creation prevents cross-company and inactive employees', async () => {
  const base = { action: 'create', name: 'TEST', address: 'TEST Radlin', airport: 'pyrzowice', employeeId: 'employee-a', serviceType: 'to_airport' };
  for (const mutation of [() => { rows.company_employees[0].active = false; }, () => { rows.company_employees[0].company_id = 'company-b'; }]) {
    reset();
    mutation();
    const response = await post(req(base));
    assert.equal(response.status, 400);
    assert.equal(writes.length, 0);
  }
});
test('valid template creation uses current company ID', async () => {
  reset();
  const response = await post(req({ action: 'create', name: 'TEST', address: 'TEST Radlin', airport: 'pyrzowice', employeeId: 'employee-a' }));
  assert.equal(response.status, 200);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].value.company_id, 'company-a');
});
test('from_booking rejects a booking belonging to another company', async () => {
  reset();
  rows.bookings[0].company_id = 'company-b';
  const response = await post(req({ action: 'from_booking', bookingId: 'booking-a' }));
  assert.equal(response.status, 404);
  assert.equal(writes.length, 0);
});
test('from_booking creates a usable template for active company employee', async () => {
  reset();
  const response = await post(req({ action: 'from_booking', bookingId: 'booking-a' }));
  assert.equal(response.status, 200);
  assert.equal(writes[0].value.employee_id, 'employee-a');
  assert.equal(writes[0].value.company_id, 'company-a');
});
test('soft delete scopes template to the current company', async () => {
  reset();
  rows.company_booking_templates.push({ id: 'template-a', company_id: 'company-a', active: true });
  const response = await post(req({ action: 'delete', id: 'template-a' }));
  assert.equal(response.status, 200);
  assert.equal(rows.company_booking_templates[0].active, false);
});
