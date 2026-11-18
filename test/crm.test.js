/* Tests of the hotel pipeline tool (crm/): priority score, economics against the wizard engine,
 * export and import round trip, private projects importer, wizard link, case archive, data files. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');

const F = require('../js/factors.js'), PL = require('../js/pricelist.js'), M = require('../js/model.js'), E = require('../js/engine.js'), R = require('../js/recommend.js'), B = require('../js/business.js');
const C = require('../crm/js/config.js'), EC = require('../crm/js/economics.js'), SC = require('../crm/js/score.js'), S = require('../crm/js/store.js');
const P = require('../crm/js/projects.js'), CA = require('../crm/js/cases.js'), WL = require('../crm/js/wizardlink.js'), WM = require('../crm/js/winmodel.js');
const data = require('../crm/data/hotels_public.json'), caseData = require('../crm/data/cases_public.json');
const deps = { F, PL, M, E, R, B };
const byId = {}; data.hotels.forEach(h => { byId[h.id] = h; });
const econ = (id, req) => EC.calculate(deps, byId[id], data.markets[byId[id].market], req);
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} != ${b}`);

/* The two invented sample rows of the brief. Used only here. */
const SAMPLE = JSON.stringify({ projects: [
  { id: 'p90', status: 'Warm', project: 'Sample Hotel A', customer: 'Sample Owner', group: 'Sample Group', product: 'Slim Lite', country: 'Malaysia', value: 40000, install_date: 'Q2 2027', rooms: 250, update: 'Mock up request', hotel_ids: ['h012'] },
  { id: 'p91', status: 'HIT', project: 'Sample Hotel B', customer: null, group: null, product: 'Slim Lite', country: 'Singapore', value: 76000, install_date: 'Q1 2027', rooms: 475, update: 'Approved by owner', hotel_ids: [] }
] });

/* ------------------------------------------------------------------ data */
test('data: 183 hotels in three countries, 40 cases, every hotel has a market with a sourced occupancy', () => {
  assert.strictEqual(data.hotels.length, 183);
  assert.deepStrictEqual([...new Set(data.hotels.map(h => h.country))].sort(), ['Indonesia', 'Malaysia', 'Philippines']);
  assert.strictEqual(caseData.cases.length, 40);
  data.hotels.forEach(h => { const m = data.markets[h.market]; assert.ok(m && m.occupancy_pct > 0 && m.source, h.id); });
  assert.strictEqual(new Set(data.hotels.map(h => h.id)).size, 183);
});

test('data: crm/data/data.js is in step with the two JSON files', () => {
  const built = require('../tools/build-crm-data.js').build();
  assert.strictEqual(fs.readFileSync(path.join(__dirname, '..', 'crm', 'data', 'data.js'), 'utf8'), built, 'run: node tools/build-crm-data.js');
});

test('repository: the private folder is ignored and holds no tracked file', () => {
  assert.match(fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8'), /^crm\/data-private\/$/m);
});

test('data: corrections of 18 Nov 2026 (JW Marriott Kuala Lumpur rooms, private owners)', () => {
  assert.strictEqual(byId.h121.name, 'JW Marriott Hotel Kuala Lumpur');
  assert.strictEqual(byId.h121.rooms, 578);
  assert.strictEqual(econ('h121').installationList, 578 * 160);
  assert.strictEqual(data.hotels.filter(h => h.owner_group === C.privateOwner).length, 8);
  data.hotels.forEach(h => assert.ok(!/\b(Datuk|Dato|Datin|Tan Sri|Tan Kian)\b|^[A-Z][a-z]+ and [A-Z][a-z]+ [A-Z][a-z]+$|^Justin Chen$/.test(h.owner_group || ''), h.id + ' ' + h.owner_group));
  assert.strictEqual(data.hotels.filter(h => h.owner_group === 'Century Properties (Dua Mutiara)').length, 3);
});

test('existing solution: four hotels point to their own public case; the label does not touch the score', () => {
  assert.strictEqual(C.solved.label, 'Already has a solution (public case)');
  const names = { h006: /Westin Kuala Lumpur/, h041: /Element.*Kuala Lumpur/, h133: /St\. Regis Bali/, h001: /Manila Marriott/ };
  assert.deepStrictEqual(Object.keys(C.solved.byHotel).sort(), Object.keys(names).sort());
  Object.keys(names).forEach(id => {
    const c = caseData.cases.filter(x => x.id === C.solved.byHotel[id])[0];
    assert.match(byId[id].name, names[id]); assert.match(c.hotel, names[id]);
    assert.ok(c.outcome.indexOf('switched') === 0);
  });
  assert.ok(!/solved|solution/i.test(fs.readFileSync(path.join(__dirname, '..', 'crm', 'js', 'score.js'), 'utf8')), 'score.js has no rule for an existing solution');
  assert.strictEqual(sc(byId.h006, { econ: econ('h006'), ownerCount: 1 }).total, 79);
});

test('score: a private owner is known but not a group (1 hotel, 4 points, never the project bonus of another private owner)', () => {
  const h = data.hotels.filter(x => x.owner_group === C.privateOwner)[0];
  const o = comp(sc(h, { econ: econ(h.id), ownerCount: 1, ownerHasProject: false, privateOwner: true }), 'owner');
  assert.ok(o.points === 4 && !o.notSourced && /Private owner/.test(o.detail));
});

/* ------------------------------------------------------------------ economics */
test('economics: equal to the wizard engine for the same inputs (every hotel)', () => {
  data.hotels.forEach(h => {
    const e = econ(h.id), occ = data.markets[h.market].occupancy_pct / 100;
    const code = EC.COUNTRY_CODE[h.country], c = F.countries[code];
    // The wizard's own path for a hotel that answers "Not sure" for bottles and price.
    const answers = { country: code, rooms: h.rooms, occupancy: data.markets[h.market].occupancy_pct, current: 'pet_free', bottlesPerRoomNight: 'default', bottleSizeMl: 'default', priceBand: 'unknown', areas: ['rooms'], temps: 'ambient' };
    const n = M.normalise(F, answers, {}), calc = E.calculate(F, n.inputs), bc = B.build({ F, PL, R, E }, answers, {}, n.inputs, calc);
    assert.strictEqual(e.bottlesPerYear, bc.calcRooms.bottles.total);
    assert.strictEqual(e.spendLocal, bc.calcRooms.spend.annualLocal);
    assert.strictEqual(e.cashPaybackYears, bc.payback.cashPaybackYears);
    [2, 3, 5].forEach((y, i) => assert.strictEqual(e.breakEven[y].occupancy, bc.breakEven[i].occupancy));
    // And against the engine's primitives directly, with the brief's assumptions written out.
    const bottles = E.annualBottles({ rooms: h.rooms, occupancy: occ, bottlesPerRoomNight: 3 });
    close(e.bottlesPerYear, bottles.total);
    close(e.bottlesPerYear, h.rooms * occ * 365 * 3);
    const price = M.typicalPrice(c), sgdToLocal = F.countries.SG.fx.value / c.fx.value;
    close(e.spendLocal, bottles.total * price);
    assert.strictEqual(e.installationList, h.rooms * 160);
    assert.strictEqual(e.serviceList, h.rooms * 85);
    const pb = E.payback({ capex: h.rooms * 160 * sgdToLocal, annualService: h.rooms * 85 * sgdToLocal }, { annualLocal: bottles.total * price }, { costLocal: 0 });
    close(e.cashPaybackYears, pb.cashPaybackYears);
    [2, 3, 5].forEach(y => close(e.breakEven[y].occupancy, B.breakEvenOccupancy(h.rooms, h.rooms * 160 * sgdToLocal, h.rooms * 85 * sgdToLocal, 3, price, y).occupancy));
  });
});

test('economics: The Westin Kuala Lumpur by hand', () => {
  const e = econ('h006'); // 443 rooms, market kl 63.3%
  close(e.bottlesPerYear, 443 * 0.633 * 365 * 3);
  assert.strictEqual(Math.round(e.bottlesPerYear), 307059);
  assert.strictEqual(e.installationList, 70880);
  assert.strictEqual(e.serviceList, 37655);
  assert.strictEqual(e.cashPaybackYears.toFixed(2), '1.77');
  assert.strictEqual(e.source.occupancy.label, data.markets.kl.source);
  assert.strictEqual(e.fromHotel, false);
});

test('economics: figures from the hotel replace the market reference and are marked', () => {
  const ref = econ('h006'), own = econ('h006', { occupancy: 0.8, bottlesPerRoomNight: 2, pricePerBottle: 1.2 });
  close(own.bottlesPerYear, 443 * 0.8 * 365 * 2);
  close(own.spendLocal, 443 * 0.8 * 365 * 2 * 1.2);
  assert.ok(own.fromHotel && own.source.occupancy.fromHotel && own.source.pricePerBottle.fromHotel && own.source.bottlesPerRoomNight.fromHotel);
  assert.strictEqual(own.installationList, ref.installationList);
  const part = econ('h006', { occupancy: 0.8, bottlesPerRoomNight: null, pricePerBottle: null });
  assert.strictEqual(part.pricePerBottle, ref.pricePerBottle);
  assert.ok(part.source.occupancy.fromHotel && !part.source.pricePerBottle.fromHotel);
});

/* ------------------------------------------------------------------ score */
const cfg = C.score;
const sc = (h, ctx) => SC.score(cfg, h, ctx);
const comp = (s, id) => s.components.filter(c => c.id === id)[0];

test('score: weights are 35, 20, 20, 15, 10 and the label never says probability', () => {
  assert.deepStrictEqual(cfg.weights, { payback: 35, size: 20, owner: 20, segment: 15, timing: 10 });
  assert.strictEqual(cfg.label, 'Priority score (rule-based)');
  const s = sc(byId.h006, { econ: econ('h006'), ownerCount: 1 });
  assert.deepStrictEqual(s.components.map(c => c.max), [35, 20, 20, 15, 10]);
  assert.ok(!/probab|chance|likel/i.test(JSON.stringify(s).replace(/not a probability/g, '')));
});

test('score: The Westin Kuala Lumpur breakdown', () => {
  const s = sc(byId.h006, { econ: econ('h006'), ownerCount: 1, ownerHasProject: false });
  assert.deepStrictEqual(s.components.map(c => c.points), [35, 20, 4, 15, 5]);
  assert.strictEqual(s.total, 79);
});

test('score: payback fit is linear between ratio 0.5 and 1.25', () => {
  const fake = r => ({ occupancy: r * 0.5, breakEven: { 3: { occupancy: 0.5 } }, source: { occupancy: { fromHotel: false } } });
  assert.strictEqual(comp(sc(byId.h006, { econ: fake(0.5) }), 'payback').points, 0);
  assert.strictEqual(comp(sc(byId.h006, { econ: fake(0.3) }), 'payback').points, 0);
  assert.strictEqual(comp(sc(byId.h006, { econ: fake(1.25) }), 'payback').points, 35);
  assert.strictEqual(comp(sc(byId.h006, { econ: fake(2) }), 'payback').points, 35);
  assert.strictEqual(comp(sc(byId.h006, { econ: fake(0.875) }), 'payback').points, 17.5);
});

test('score: size, owner leverage, segment fit and timing follow the config', () => {
  const h = (o) => Object.assign({}, byId.h006, o);
  assert.strictEqual(comp(sc(h({ rooms: 100 }), {}), 'size').points, 5);
  assert.strictEqual(comp(sc(h({ rooms: 900 }), {}), 'size').points, 20);
  [[1, 4], [2, 8], [3, 12], [4, 12], [5, 16], [10, 16]].forEach(([n, p]) => assert.strictEqual(comp(sc(h({}), { ownerCount: n }), 'owner').points, p));
  assert.strictEqual(comp(sc(h({}), { ownerCount: 2, ownerHasProject: true }), 'owner').points, 12);
  assert.strictEqual(comp(sc(h({}), { ownerCount: 10, ownerHasProject: true }), 'owner').points, 20);
  assert.strictEqual(comp(sc(h({ tier: 'Select' }), {}), 'segment').points, 15);
  assert.strictEqual(comp(sc(h({ operating_model: 'owner_operated' }), {}), 'segment').points, 14);
  assert.strictEqual(comp(sc(h({ tier: 'Luxury' }), {}), 'segment').points, 9);
  assert.strictEqual(comp(sc(h({ build_stage: 'new_build', opening: '2027 (Q2, announced)' }), {}), 'segment').points, 13);
  assert.strictEqual(comp(sc(h({ build_stage: 'new_build', opening: '2027 (Q2, announced)' }), {}), 'timing').points, 10);
  assert.strictEqual(comp(sc(h({ build_stage: 'new_build', opening: '2026 (Q4)' }), {}), 'timing').points, 7);
});

test('score: missing data is marked not sourced and scored neutral, never zero', () => {
  const s = sc(Object.assign({}, byId.h006, { owner_group: null, operating_model: 'not_sourced' }), { econ: null });
  const o = comp(s, 'owner'), g = comp(s, 'segment'), p = comp(s, 'payback'), t = comp(s, 'timing');
  assert.ok(o.notSourced && o.points === 10);
  assert.ok(g.notSourced && g.points === 8 + 2 + 3);
  assert.ok(p.notSourced && p.points === 17.5);
  assert.ok(t.notSourced && t.points === 5);
  const nb = comp(sc(Object.assign({}, byId.h006, { build_stage: 'new_build', opening: null }), {}), 'timing');
  assert.ok(nb.notSourced && nb.points === 5);
});

test('score: every hotel scores between 0 and 100 and the components add up', () => {
  data.hotels.forEach(h => {
    const s = sc(h, { econ: econ(h.id), ownerCount: 1 });
    assert.ok(s.total >= 0 && s.total <= 100);
    close(s.sum, s.components.reduce((a, c) => a + c.points, 0));
    s.components.forEach(c => assert.ok(c.points >= 0 && c.points <= c.max && c.detail));
  });
});

test('pitch: the five texts are chosen by segment, as given', () => {
  const h = o => Object.assign({}, byId.h006, o);
  assert.strictEqual(C.pitchFor(h({})).text, 'The GM takes a payback case to the owner. Pitch at renovation or after a mock-up.');
  assert.strictEqual(C.pitchFor(h({ operating_model: 'owner_operated', tier: 'Select' })).text, 'The owner decides alone on payback; the chain approves the supplier.');
  assert.strictEqual(C.pitchFor(h({ build_stage: 'new_build', tier: 'Luxury' })).text, 'Pitch in the design phase, through the consultant or contractor who specifies the rooms.');
  assert.strictEqual(C.pitchFor(h({ tier: 'Luxury' })).text, 'Payback plus a design test; in-house glass bottling is the common alternative.');
  assert.strictEqual(C.pitchFor(h({ operating_model: 'not_sourced' })).text, 'Find out first whether the hotel is managed or owner-operated; it decides who signs.');
  assert.strictEqual(C.pitchFor(h({ tier: 'Collections' })).otherTier, true);
  assert.strictEqual(C.pitchFor(h({})).otherTier, false);
});

/* ------------------------------------------------------------------ pipeline record, export and import */
test('record: fixed lists as in the brief', () => {
  assert.deepStrictEqual(C.statuses, ['Not contacted', 'Contacted', 'Quoted', 'Mock-up', 'Won', 'Lost', 'On hold']);
  assert.strictEqual(C.deciders.length, 8);
  assert.strictEqual(C.reasons.length, 11);
});

function filled() {
  const st = S.emptyState();
  S.update(st, 'h006', { status: 'Contacted', product: 'Slim Lite', decider: 'GM' }, '2026-11-01');
  S.update(st, 'h006', { status: 'Quoted', quotedValue: '70880' }, '2026-11-05');
  S.update(st, 'h006', { status: 'Won', reason: 'payback', note: 'Line one\nline "two", with comma' }, '2026-11-12');
  S.update(st, 'h001', { status: 'Lost', reason: 'chose bottling plant', decider: 'owner' }, '2026-11-10');
  S.update(st, 'h037', { status: 'On hold', note: '=SUM(A1)' }, '2026-11-11');
  st.requests.h006 = { via: 'request file', date: '2026-11-02', country: 'Malaysia', rooms: 443, occupancy: 0.8, bottlesPerRoomNight: 2, pricePerBottle: 1.2, attachedOn: '2026-11-03' };
  return st;
}

test('record: a status change is added to the history with its date; reason only for Won or Lost', () => {
  const st = filled(), r = st.records.h006;
  assert.strictEqual(r.status, 'Won'); assert.strictEqual(r.date, '2026-11-12'); assert.strictEqual(r.quotedValue, 70880);
  assert.deepStrictEqual(r.history, [{ date: '2026-11-01', status: 'Contacted' }, { date: '2026-11-05', status: 'Quoted' }, { date: '2026-11-12', status: 'Won' }]);
  S.update(st, 'h006', { status: 'On hold' }, '2026-11-13');
  assert.strictEqual(st.records.h006.reason, '');
  assert.throws(() => S.update(st, 'h006', { status: 'Sold' }, '2026-11-13'), /unknown status/);
  assert.throws(() => S.update(st, 'h001', { reason: 'bad weather' }, '2026-11-13'), /unknown reason/);
});

test('round trip: export then import gives the same records and requests', () => {
  const st = filled(), text = S.exportJson(st, '2026-11-17'), back = S.importJson(text);
  assert.deepStrictEqual(back.records, st.records);
  assert.deepStrictEqual(back.requests, st.requests);
  assert.strictEqual(S.exportJson(back, '2026-11-17'), text);
});

test('import: other files are refused with a plain message', () => {
  assert.throws(() => S.importJson('not json'), /not valid JSON/);
  assert.throws(() => S.importJson('{"projects":[]}'), /not a pipeline file/);
  assert.throws(() => S.importJson(JSON.stringify({ type: S.FILE_TYPE, version: 1, records: { h006: { status: 'Maybe' } } })), /unknown status/);
});

/** Minimal CSV reader for the test (quoted cells, doubled quotes, line breaks inside quotes). */
function readCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\r') { /* skip */ }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  return rows;
}

test('CSV: one row per record, text with commas, quotes and line breaks survives, formulas are defused', () => {
  const st = filled(), rows = readCsv(S.pipelineCsv(st, byId));
  assert.strictEqual(rows.length, 4);
  const head = rows[0], r = rows.filter(x => x[0] === 'h006')[0], get = k => r[head.indexOf(k)];
  assert.strictEqual(get('hotel'), 'The Westin Kuala Lumpur');
  assert.strictEqual(get('status'), 'Won'); assert.strictEqual(get('reason'), 'payback'); assert.strictEqual(get('quoted_value_sgd'), '70880');
  assert.strictEqual(get('note'), 'Line one\nline "two", with comma');
  assert.strictEqual(get('status_history'), '2026-11-01 Contacted > 2026-11-05 Quoted > 2026-11-12 Won');
  assert.strictEqual(rows.filter(x => x[0] === 'h037')[0][head.indexOf('note')], "'=SUM(A1)");
});

/* ------------------------------------------------------------------ private projects */
test('projects: sample file is read, matched through hotel_ids, and pre-fills by the fixed map', () => {
  const { projects, warnings } = P.parse(SAMPLE);
  assert.strictEqual(projects.length, 2); assert.deepStrictEqual(warnings, []);
  const l = P.link(projects, byId);
  assert.deepStrictEqual(Object.keys(l.byHotel), ['h012']);
  assert.deepStrictEqual(l.unmatched.map(p => p.id), ['p91']);
  assert.strictEqual(projects[0].status, 'Warm'); // shown as given
  const st = S.emptyState();
  assert.strictEqual(P.applyPrefill(st, projects, byId, '2026-11-17'), 1);
  const r = st.records.h012;
  assert.strictEqual(r.status, 'Quoted'); assert.strictEqual(r.product, 'Slim Lite'); assert.strictEqual(r.quotedValue, 40000);
  assert.ok(r.prefilled && r.projectId === 'p90');
  assert.deepStrictEqual(C.projectStatusMap, { Hot: 'Mock-up', Warm: 'Quoted', Cold: 'On hold', HIT: 'Won', Closed: null });
});

test('projects: Closed pre-fills nothing; an edited record is never overwritten; removing the file removes untouched pre-fills only', () => {
  const mk = (id, status, hotel_ids) => ({ id, status, project: 'Sample ' + id, customer: null, group: null, product: 'Slim Lite', country: 'Malaysia', value: 1000, install_date: 2027, rooms: '?', update: null, hotel_ids });
  const { projects, warnings } = P.parse(JSON.stringify({ projects: [mk('a', 'Closed', ['h002']), mk('b', 'Hot', ['h003', 'h005']), mk('c', 'Cold', ['h004']), mk('d', 'HIT', ['h009']), mk('e', 'Paused', ['h010']), mk('f', 'Warm', ['h999'])] }));
  assert.strictEqual(projects[0].install_date, '2027'); assert.strictEqual(projects[0].rooms, null);
  assert.strictEqual(warnings.length, 1);
  const st = S.emptyState();
  S.update(st, 'h004', { status: 'Lost', reason: 'price' }, '2026-11-01');
  P.applyPrefill(st, projects, byId, '2026-11-17');
  assert.strictEqual(st.records.h002, undefined);
  assert.strictEqual(st.records.h003.status, 'Mock-up'); assert.strictEqual(st.records.h003.quotedValue, null); // value covers two hotels
  assert.strictEqual(st.records.h004.status, 'Lost');
  assert.strictEqual(st.records.h009.status, 'Won');
  assert.strictEqual(st.records.h010, undefined);
  assert.deepStrictEqual(P.link(projects, byId).unmatched.map(p => p.id), ['f']);
  S.update(st, 'h009', { note: 'checked' }, '2026-11-18');
  P.removePrefill(st);
  assert.deepStrictEqual(Object.keys(st.records).sort(), ['h004', 'h009']);
  assert.throws(() => P.parse('{"hotels":[]}'), /no "projects" list/);
});

/* ------------------------------------------------------------------ wizard link */
const SUMMARY = ['Proposal request via the Swisspro Sustainability Wizard, 2026-11-14', 'Hotel: Sample Hotel. Segment: Upscale. Rooms: 443.', 'Contact: not given, no email given.', '',
  '443 rooms in Malaysia, 78% occupancy.', 'Today: plastic bottles, free, 2 x 500 ml per room and night at RM 1.20 per bottle.', 'Wanted: guest rooms; ambient water in the room.'].join('\n');

test('wizard link: the request summary text is read; reference values are not taken as the hotel\'s own', () => {
  const r = WL.parse(SUMMARY, 3);
  assert.deepStrictEqual({ rooms: r.rooms, country: r.country, occupancy: r.occupancy, b: r.bottlesPerRoomNight, p: r.pricePerBottle, date: r.date }, { rooms: 443, country: 'Malaysia', occupancy: 0.78, b: 2, p: 1.2, date: '2026-11-14' });
  assert.ok(!/Sample Hotel|Contact/.test(JSON.stringify(r)), 'no name or contact is kept');
  const ref = WL.parse(SUMMARY.replace('78% occupancy.', '63.3% occupancy (closest match: Kuala Lumpur 4 to 5-star (1H 2025)).').replace('2 x 500', '3 x 500').replace('per bottle.', 'per bottle (reference price).'), 3);
  assert.deepStrictEqual([ref.occupancy, ref.bottlesPerRoomNight, ref.pricePerBottle], [null, null, null]);
  assert.strictEqual(WL.figuresFor(ref, byId.h006), null);
  assert.throws(() => WL.parse('Hello', 3), /does not look like a request summary/);
  const e = econ('h006', WL.figuresFor(r, byId.h006));
  close(e.bottlesPerYear, 443 * 0.78 * 365 * 2);
});

test('wizard link: the request file is read; a request for another country does not carry its price over', () => {
  const file = JSON.stringify({ type: 'swisspro-wizard-request', version: 1, date: '2026-11-14', hotel: 'Sample Hotel', figures: { country: 'ID', rooms: 263, currency: 'Rp', occupancy: { value: 0.71, fromHotel: true }, bottlesPerRoomNight: { value: 3, fromHotel: false }, pricePerBottle: { value: 3100, fromHotel: true } }, summary: 'Contact: someone' });
  const r = WL.parse(file, 3);
  assert.deepStrictEqual([r.country, r.rooms, r.occupancy, r.bottlesPerRoomNight, r.pricePerBottle], ['Indonesia', 263, 0.71, null, 3100]);
  assert.ok(!/someone|Sample Hotel/.test(JSON.stringify(r)));
  assert.deepStrictEqual(WL.figuresFor(r, byId.h037), { occupancy: 0.71, bottlesPerRoomNight: null, pricePerBottle: 3100 });
  assert.strictEqual(WL.figuresFor(r, byId.h006).pricePerBottle, null);
  assert.strictEqual(WL.check(r, byId.h006).length, 2);
});

/* ------------------------------------------------------------------ cases */
test('cases: every public case has a source link and falls into a solution and outcome group', () => {
  const prepared = CA.prepare(caseData.cases);
  prepared.forEach(c => { assert.match(c.source_url, /^https:\/\//); assert.ok(c.solutionGroup && c.outcomeGroup && c.tierGroup); });
  const g = k => prepared.reduce((m, c) => { m[c[k]] = (m[c[k]] || 0) + 1; return m; }, {});
  assert.strictEqual(g('outcomeGroup')['Not switched'], 1);
  assert.strictEqual(g('solutionGroup')['Kept single-use bottles'], 1);
  assert.ok(g('solutionGroup')['In-room filtered water'] >= 10 && g('solutionGroup')['In-house glass bottling'] >= 15);
  assert.strictEqual(prepared.filter(c => c.id === 'C21')[0].solutionGroup, 'Glass bottles from a supplier');
});

test('cases: similar cases rank same tier, then same country, then same build stage', () => {
  const sim = CA.similar(byId.h006, CA.prepare(caseData.cases), 4); // Premium, Malaysia, existing
  assert.strictEqual(sim[0].case.id, 'C01');
  assert.deepStrictEqual(sim[0].matched, ['tier', 'country', 'build stage']);
  // A hotel is never its own similar case.
  Object.keys(C.solved.byHotel).forEach(id => {
    const own = C.solved.byHotel[id], list = CA.similar(byId[id], CA.prepare(caseData.cases), 40, own);
    assert.ok(list.every(x => x.case.id !== own), id);
  });
  assert.ok(CA.similar(byId.h006, CA.prepare(caseData.cases), 4, 'C01').length > 0);
  sim.forEach(s => assert.ok(s.matched.indexOf('tier') >= 0));
  for (let i = 1; i < sim.length; i++) assert.ok(sim[i - 1].points >= sim[i].points);
  const lux = CA.similar(byId.h125, CA.prepare(caseData.cases), 4); // Luxury, Indonesia
  assert.ok(lux[0].matched.indexOf('tier') >= 0 && lux[0].matched.indexOf('country') >= 0);
});

/* ------------------------------------------------------------------ model */
test('model: the win probability is not trained and returns no number', () => {
  assert.deepStrictEqual(WM.winProbability({ rooms: 443 }), { trained: false, probability: null, label: 'not trained yet' });
});

test('model: counts and training table, one row per closed record', () => {
  const st = filled();
  assert.deepStrictEqual(WM.counts(st), { won: 1, lost: 1, open: 1 });
  const view = id => ({ hotel: byId[id], econ: econ(id, WL.figuresFor(st.requests[id], byId[id])), score: sc(byId[id], { econ: econ(id), ownerCount: 1 }), ownerCount: 1 });
  const t = WM.trainingTable(st, view);
  assert.strictEqual(t.rows.length, 2);
  t.rows.forEach(r => assert.strictEqual(r.length, t.header.length));
  const row = t.rows.filter(r => r[0] === 'h006')[0], get = k => row[t.header.indexOf(k)];
  assert.strictEqual(get('outcome'), 'Won'); assert.strictEqual(get('reason'), 'payback'); assert.strictEqual(get('economics_basis'), 'from the hotel');
  assert.strictEqual(get('status_history'), '2026-11-01 Contacted > 2026-11-05 Quoted > 2026-11-12 Won');
  assert.strictEqual(get('score_segment_fit'), 15); assert.strictEqual(get('installation_value_sgd'), 70880);
  assert.ok(t.header.indexOf('note') < 0, 'free notes are not part of the training table');
});

/* ------------------------------------------------------------------ repository rules */
test('repository: the tool makes no external request and holds no email address or phone number', () => {
  const dir = path.join(__dirname, '..', 'crm');
  const files = ['index.html', 'crm.css'].concat(fs.readdirSync(path.join(dir, 'js')).map(f => 'js/' + f));
  files.forEach(f => {
    const t = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon|<script[^>]+src="https?:|url\(["']?https?:|@import/.test(t), f + ' reaches outside');
  });
  ['data/hotels_public.json', 'data/cases_public.json'].forEach(f => {
    const t = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.ok(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(t), f + ' holds an email address');
    assert.ok(!/\+\d{2}[\d\s-]{7,}/.test(t), f + ' holds a phone number');
  });
});
