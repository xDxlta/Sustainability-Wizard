/* Acceptance tests for the business case (version 2.5). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const F = require('../js/factors.js');
const E = require('../js/engine.js');
const PL = require('../js/pricelist.js');
const M = require('../js/model.js');
const R = require('../js/recommend.js');
const B = require('../js/business.js');

function run(answers, overrides) {
  const n = M.normalise(F, answers, overrides || {});
  const calc = E.calculate(F, n.inputs);
  const bc = B.build({ F, PL, R, E }, answers, overrides || {}, n.inputs, calc);
  return { n, calc, bc };
}
const NEGATIVE = /no cash payback|does not pay|not pay off|costs more|more than 30/i;
const POSITIVE_KINDS = ['payback', 'payback-staff', 'saving', 'saving-staff', 'per-night', 'facts'];

test('1. Westin Singapore reproduction: 305 rooms, 243,840 bottles at S$0.17, basic tap', () => {
  const answers = { country: 'SG', rooms: '305', occupancy: '1', current: 'pet_free', bottlesPerRoomNight: '2', bottleSizeMl: '500', priceBand: 'custom', priceCustom: '0.17', areas: ['rooms'], temps: 'ambient' };
  const { calc, bc } = run(answers, { bottlesPerRoomNight: 243840 / (305 * 365) });
  assert.ok(Math.abs(calc.bottles.total - 243840) < 1e-6);
  // investment: 305 x S$140 (SMART Classic+), list currency = SGD so no conversion
  assert.equal(bc.lines.length, 1);
  assert.equal(bc.lines[0].product.id, 'ir_smart_plus');
  assert.ok(Math.abs(bc.capexLocal - 42700) < 1e-6);
  // bottled water a year: S$40,640 in the case; S$0.17 is that figure rounded (S$4 per 24 bottles), so within 2.5%
  assert.ok(Math.abs(calc.spend.annualLocal - 40640) / 40640 < 0.025, 'spend ' + calc.spend.annualLocal);
  // default service: one change per room and year at 85.00
  assert.equal(bc.reading, 'perYear');
  assert.ok(Math.abs(bc.servicingLocal - 305 * 85) < 1e-6);
  // payback = investment / (bottle cost - service cost)
  const pb = bc.payback;
  assert.ok(Math.abs(pb.cashPaybackYears - pb.capex / (calc.spend.annualLocal - pb.annualService)) < 1e-9);
  const westin = (service) => E.payback({ capex: 42700, annualService: 305 * service }, { annualLocal: 40640 }, { costLocal: 0 }).cashPaybackYears;
  assert.ok(Math.abs(westin(85) - 42700 / (40640 - 25925)) < 1e-9);
  assert.ok(Math.abs(westin(85) - 2.9) < 0.05, 'with 85.00: ' + westin(85));
  assert.ok(Math.abs(westin(65) - 2.05) < 0.05, 'with 65.00: ' + westin(65));
  assert.equal(bc.lead.kind, 'payback');
});

test('2. Manila 300 rooms, defaults, free plastic bottles: positive lead, cash payback computed', () => {
  const answers = { country: 'PH', rooms: '300', occupancy: 'default', current: 'pet_free', bottlesPerRoomNight: 'default', bottleSizeMl: 'default', priceBand: 'unknown', areas: ['rooms', 'fnb', 'meetings', 'boh'], temps: 'hotcold' };
  const { bc } = run(answers);
  assert.ok(POSITIVE_KINDS.includes(bc.lead.kind));
  assert.equal(bc.lead.kind, 'payback');
  assert.ok(isFinite(bc.payback.cashPaybackYears) && bc.payback.cashPaybackYears < 5);
  assert.ok(bc.payback.fullPaybackYears < bc.payback.cashPaybackYears);
  console.log('    Manila: cash payback ' + bc.payback.cashPaybackYears.toFixed(2) + ' years, including staff time freed ' + bc.payback.fullPaybackYears.toFixed(2) + ' years');
});

test('3. Surabaya 250 rooms, defaults: no negative lead statement, cash payback computed', () => {
  const answers = { country: 'ID', rooms: '250', occupancy: 'default', current: 'pet_free', bottlesPerRoomNight: 'default', bottleSizeMl: '600', priceBand: 'unknown', areas: ['rooms', 'boh'], temps: 'cold' };
  const { bc } = run(answers);
  assert.ok(POSITIVE_KINDS.includes(bc.lead.kind));
  assert.ok(bc.payback.available);
  assert.equal(typeof bc.payback.cashPaybackYears, 'number');
  console.log('    Surabaya: lead ' + bc.lead.kind + ', cash payback ' + (isFinite(bc.payback.cashPaybackYears) ? bc.payback.cashPaybackYears.toFixed(2) + ' years' : 'none') + ', including staff time freed ' + (isFinite(bc.payback.fullPaybackYears) ? bc.payback.fullPaybackYears.toFixed(2) + ' years' : 'none'));
});

test('lead statement never uses negative wording, for any outcome', () => {
  const calc = { spend: { annualLocal: 100 }, labour: { quantified: true, costLocal: 5, hours: 10 }, bottles: { total: 1000, occupiedRoomNights: 500 } };
  [{ available: true, cashPaybackYears: Infinity, fullPaybackYears: Infinity, cashSavingsPerYear: -50, fullSavingsPerYear: -45 },
   { available: true, cashPaybackYears: 12, fullPaybackYears: 4, cashSavingsPerYear: 10, fullSavingsPerYear: 15 },
   { available: true, cashPaybackYears: 9, fullPaybackYears: 8, cashSavingsPerYear: 10, fullSavingsPerYear: 12 },
   { available: false }].forEach(pb => assert.ok(POSITIVE_KINDS.includes(B.leadStatement(calc, pb, 100, 150).kind)));
  assert.equal(B.leadStatement(calc, { available: true, cashPaybackYears: 12, fullPaybackYears: 4, cashSavingsPerYear: 10, fullSavingsPerYear: 15 }, 100, 90).kind, 'payback-staff');
  const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  const lead = app.slice(app.indexOf('function leadText'), app.indexOf('function renderResults'));
  assert.ok(!NEGATIVE.test(lead), 'lead texts contain negative wording');
});

test('4. service reading and upgrade change the numbers; the base case ignores the temperature choice', () => {
  // a price at which the base case pays back, so payback differences are finite
  const a = { country: 'MY', rooms: '150', occupancy: 'default', current: 'pet_free', bottlesPerRoomNight: 'default', bottleSizeMl: 'default', priceBand: 'custom', priceCustom: '1.50', areas: ['rooms', 'fnb'], temps: 'ambient' };
  const base = run(a).bc;
  ['cold', 'hotcold', 'sparkling'].forEach(t => {
    const r = run(Object.assign({}, a, { temps: t })).bc;
    assert.ok(Math.abs(r.capexLocal - base.capexLocal) < 1e-6, t + ' base capex');
    assert.ok(Math.abs(r.servicingLocal - base.servicingLocal) < 1e-6, t + ' base service');
    assert.ok(Math.abs(r.payback.cashPaybackYears - base.payback.cashPaybackYears) < 1e-9, t + ' base payback');
    assert.ok(r.upgrade && r.upgrade.extraCapex > 0, t + ' upgrade priced');
    assert.ok(r.upgrade.payback.cashPaybackYears > r.payback.cashPaybackYears, t + ' upgrade payback differs');
  });
  assert.equal(base.upgrade, null);
  assert.equal(base.lines.find(l => l.area === 'inRoom').product.id, 'ir_smart_plus');
  const sparkling = run(Object.assign({}, a, { temps: 'sparkling' })).bc;
  assert.equal(sparkling.upgrade.inRoom.products[0].id, 'ir_versa_plus');
  assert.ok(sparkling.upgrade.lines.some(l => l.product.id === 'fb_vida_s'));
  const perChange = run(a, { serviceReading: 'perChange' }).bc;
  const per2y = run(a, { serviceReading: 'perContract2y' }).bc;
  assert.ok(perChange.servicingLocal > base.servicingLocal && per2y.servicingLocal < base.servicingLocal);
  assert.ok(perChange.payback.cashPaybackYears > base.payback.cashPaybackYears);
  assert.ok(Math.abs(run(a, { serviceReading: 'perChange', changeMonths: 12 }).bc.servicingLocal - base.servicingLocal) < 1e-6);
});

test('five-year view crosses at the payback; per-room-per-month is arithmetic on the same figures', () => {
  const v = B.fiveYear(100, 150, 40);
  assert.deepEqual(v.bottled, [0, 100, 200, 300, 400, 500]);
  assert.deepEqual(v.swisspro, [150, 190, 230, 270, 310, 350]);
  assert.equal(v.crossYear, 2.5);
  assert.equal(v.crossesInView, true);
  assert.equal(B.fiveYear(100, 150, 120).crossYear, null);
  const m = B.perRoomMonth(10, 1200, 360, 600);
  assert.equal(m.today, 10); assert.equal(m.service, 5); assert.equal(m.investment, 1); assert.equal(m.swisspro, 6);
});

test('5. provenance: every factor has provenance and the Westin case is in the register and on the sources page', () => {
  Object.keys(F.factors).forEach(k => {
    const f = F.factors[k];
    assert.ok(['sourced', 'sourced-secondary', 'derived', 'assumption', 'constant'].includes(f.kind), k);
    assert.ok(f.source || f.note || f.kind === 'constant' || f.kind === 'derived', k + ' has no provenance');
  });
  const w = F.factors.westin_case_2024;
  assert.equal(w.kind, 'sourced-secondary');
  assert.match(w.source.publisher, /Final Presentation 2024, Swisspro student team/);
  assert.match(w.source.title, /p\. 13 and p\. 44, figures provided by Swisspro/);
  assert.equal(F.factors.service_changes_per_room_year.value, 1);
  assert.equal(F.factors.service_changes_per_room_year.kind, 'sourced-secondary');
  const src = fs.readFileSync(path.join(__dirname, '..', 'sources.html'), 'utf8');
  assert.ok(src.includes('Object.keys(F.factors)'), 'sources page lists every factor');
  assert.ok(src.includes("'sourced-secondary'"), 'sources page labels secondary sources');
  assert.match(F.rules.service, /Westin/);
});
