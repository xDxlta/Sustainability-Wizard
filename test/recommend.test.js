const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/factors.js');
const R = require('../js/recommend.js');
const PL = require('../js/pricelist.js');

const base = { country: 'MY', rooms: 300, current: 'pet_free', areas: ['rooms'], temps: 'hotcold' };
const inp = { pricePerBottle: 0.61, usdPerLocal: 1 / 4.0745 };

test('solutions are limited to the two price-list areas and follow the answers', () => {
  const s = R.solutions(base, PL);
  assert.equal(s.length, 1); assert.equal(s[0].area, 'inRoom');
  assert.deepEqual(s[0].requiredTemps, ['hot', 'cold']);
  const both = R.solutions(Object.assign({}, base, { areas: ['rooms', 'fnb', 'meetings'] }), PL);
  assert.deepEqual(both.map(x => x.area), ['inRoom', 'fnb']);
  assert.deepEqual(both[1].covers, ['Restaurants and bars', 'Meetings and events']);
  assert.equal(R.solutions(Object.assign({}, base, { areas: ['boh'] }), PL)[0].area, 'fnb');
});

test('in-room solution follows the water type only', () => {
  assert.deepEqual(R.inRoomSolution({ temps: 'ambient' }).requiredTemps, ['ambient']);
  assert.deepEqual(R.inRoomSolution({ temps: 'cold' }).requiredTemps, ['cold']);
  assert.deepEqual(R.inRoomSolution({ temps: 'sparkling' }).requiredTemps, ['cold', 'sparkling']);
  assert.match(R.inRoomSolution({ temps: 'hotcold' }).title, /Hot and chilled/);
});

test('products come only from the price list, only from the solution\'s area, matched on printed water types', () => {
  const s = R.solutions(base, PL)[0];
  assert.deepEqual(s.products.map(p => p.label), ['CLIMA Versa+ (Hot, Cold)']);
  assert.equal(s.exactMatch, true);
  const amb = R.solutions(Object.assign({}, base, { temps: 'ambient' }), PL)[0];
  assert.deepEqual(amb.products.map(p => p.label), ['SMART Classic+', 'SAN Classic+', 'CLIMA Unico+ (Hot, Ambient)']);
  const spark = R.solutions(Object.assign({}, base, { temps: 'sparkling' }), PL)[0];
  assert.equal(spark.exactMatch, false);
  assert.equal(spark.products.length, 4);
  assert.match(spark.notes.join(' '), /CLIMA Vida S/);
  const station = R.solutions(Object.assign({}, base, { areas: ['fnb'] }), PL)[0];
  assert.equal(station.products[0].label, 'CLIMA Versa (Hot, Cold)');
  station.products.forEach(p => assert.equal(p.area, 'fnb'));
  assert.match(R.solutions(base, { AREAS: PL.AREAS, loaded: () => false })[0].productNote, /not loaded/);
});

test('argument order: efficiency first where bottled water is cheap, ROI first otherwise', () => {
  const cheap = R.argumentOrder(inp, F);
  assert.equal(cheap.cheapWater, true); assert.equal(cheap.order[0].key, 'efficiency');
  const dear = R.argumentOrder({ pricePerBottle: 2.5, usdPerLocal: 1 / 4.0745 }, F);
  assert.equal(dear.cheapWater, false); assert.equal(dear.order[0].key, 'roi');
  assert.equal(new Set(cheap.order.map(a => a.key)).size, 4);
});

test('unit plan: one in-room unit per room, one station per other area', () => {
  const u = R.unitPlan({ rooms: 250, areas: ['rooms', 'fnb', 'boh'] });
  assert.equal(u.inRoom, 250); assert.equal(u.stations, 2);
  assert.equal(R.unitPlan({ rooms: 250, areas: ['fnb'] }).inRoom, 0);
});

test('approval note is neutral and reflects the interview thresholds', () => {
  assert.match(R.approvalNote(null), /USD 5,000/);
  assert.match(R.approvalNote(60000), /above USD 50,000/);
  assert.match(R.approvalNote(20000), /between USD 5,000 and 50,000/);
});

test('recommend() returns no lead score and no text-only flags', () => {
  const r = R.recommend(base, inp, F, PL);
  assert.equal(r.lead, undefined); assert.equal(r.filtration, undefined);
  assert.ok(Array.isArray(r.arguments) && r.solutions.length === 1);
});
