const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/factors.js');
const R = require('../js/recommend.js');
const PL = require('../js/pricelist.js');

const base = { country: 'MY', tier: 'premium', build: 'existing', rooms: 300, current: 'pet_free', areas: ['rooms'], placement: 'minibar', temps: 'hotcold', source: 'mains', issues: [], halal: 'no' };
const inp = { pricePerBottle: 0.61, usdPerLocal: 1 / 4.0745 };

test('solutions are limited to the two price-list areas and follow the answers', () => {
  const s = R.solutions(base, PL);
  assert.equal(s.length, 1); assert.equal(s[0].area, 'inRoom');
  assert.deepEqual(s[0].requiredTemps, ['hot', 'cold']);
  const both = R.solutions(Object.assign({}, base, { areas: ['rooms', 'fnb', 'meetings'] }), PL);
  assert.deepEqual(both.map(x => x.area), ['inRoom', 'fnb']);
  assert.deepEqual(both[1].covers, ['Restaurants and bars', 'Meeting rooms and events']);
  const only = R.solutions(Object.assign({}, base, { areas: ['boh'] }), PL);
  assert.equal(only[0].area, 'fnb');
});

test('in-room solution type follows temperature and placement', () => {
  assert.match(R.inRoomSolution(Object.assign({}, base, { temps: 'ambient' })).title, /tap/);
  assert.deepEqual(R.inRoomSolution(Object.assign({}, base, { temps: 'ambient' })).requiredTemps, ['ambient']);
  assert.match(R.inRoomSolution(Object.assign({}, base, { temps: 'sparkling' })).title, /sparkling/);
  assert.match(R.inRoomSolution(Object.assign({}, base, { temps: 'cold' })).title, /Chilled/);
  assert.match(R.inRoomSolution(Object.assign({}, base, { placement: 'vanity', temps: 'ambient' })).description, /next to the basin/);
  assert.match(R.inRoomSolution(Object.assign({}, base, { placement: 'vanity', temps: 'hotcold' })).notes.join(' '), /minibar counter is the practical location/);
  assert.match(R.inRoomSolution(Object.assign({}, base, { build: 'newbuild' })).notes.join(' '), /joinery/);
  assert.match(R.inRoomSolution(Object.assign({}, base, { build: 'existing' })).notes.join(' '), /Retrofit/);
});

test('products come only from the price list, only from the solution\'s area, matched on printed water types', () => {
  const s = R.solutions(base, PL)[0];                       // hot + cold in room
  assert.deepEqual(s.products.map(p => p.label), ['CLIMA Versa+ (Hot, Cold)']);
  assert.equal(s.exactMatch, true);
  s.products.forEach(p => assert.equal(p.area, 'inRoom'));
  const amb = R.solutions(Object.assign({}, base, { temps: 'ambient' }), PL)[0];
  assert.deepEqual(amb.products.map(p => p.label), ['SMART Classic+', 'SAN Classic+', 'CLIMA Unico+ (Hot, Ambient)']); // cheapest first; the tap is used for the investment
  const spark = R.solutions(Object.assign({}, base, { temps: 'sparkling' }), PL)[0];
  assert.equal(spark.exactMatch, false);
  assert.equal(spark.products.length, 4);                    // all In-Room lines listed
  assert.match(spark.notes.join(' '), /CLIMA Vida S/);
  const station = R.solutions(Object.assign({}, base, { areas: ['fnb'] }), PL)[0];
  assert.equal(station.products[0].label, 'CLIMA Versa (Hot, Cold)');
  station.products.forEach(p => assert.equal(p.area, 'fnb'));
  const empty = { AREAS: PL.AREAS, loaded: () => false };
  assert.match(R.solutions(base, empty)[0].productNote, /not loaded/);
});

test('filtration text is generic (no micron claims) and flags follow the supply answers', () => {
  const plain = R.filtration(base);
  assert.doesNotMatch(plain.summary + plain.notes.join(' '), /micron/i);
  assert.equal(plain.flags.waterTest, false); assert.equal(plain.flags.pretreatment, false); assert.equal(plain.flags.halal, 'no');
  assert.equal(R.filtration(Object.assign({}, base, { source: 'tank' })).flags.waterTest, true);
  const well = R.filtration(Object.assign({}, base, { source: 'well', issues: ['sediment'] }));
  assert.equal(well.flags.pretreatment, true); assert.equal(well.flags.waterTest, true);
  assert.equal(R.filtration(Object.assign({}, base, { country: 'ID' })).flags.waterTest, true);
  assert.equal(R.filtration(Object.assign({}, base, { issues: ['microbial'] })).flags.waterTest, true);
});

test('Halal is asked, never assumed: Malaysia with "no" stays no; "notsure" asks; "yes" requests', () => {
  assert.equal(R.filtration(Object.assign({}, base, { country: 'MY', halal: 'no' })).flags.halal, 'no');
  assert.equal(R.filtration(Object.assign({}, base, { country: 'MY', halal: 'notsure' })).flags.halal, 'ask');
  assert.equal(R.filtration(Object.assign({}, base, { halal: 'yes' })).flags.halal, 'yes');
});

test('argument order: efficiency first where bottled water is cheap; ROI first otherwise; luxury leads with guest experience; safety first for wells', () => {
  const cheap = R.argumentOrder(base, inp, F);
  assert.equal(cheap.cheapWater, true);
  assert.equal(cheap.order[0].key, 'efficiency');
  const dear = R.argumentOrder(base, { pricePerBottle: 2.5, usdPerLocal: 1 / 4.0745 }, F);
  assert.equal(dear.cheapWater, false);
  assert.equal(dear.order[0].key, 'roi');
  assert.equal(R.argumentOrder(Object.assign({}, base, { tier: 'luxury' }), { pricePerBottle: 2.5, usdPerLocal: 1 / 4.0745 }, F).order[0].key, 'efficiency');
  assert.equal(R.argumentOrder(Object.assign({}, base, { source: 'well' }), inp, F).order[0].key, 'safety');
  assert.equal(new Set(cheap.order.map(a => a.key)).size, 4);
});

test('unit plan: one in-room unit per room, one station per other area', () => {
  const u = R.unitPlan({ rooms: 250, areas: ['rooms', 'fnb', 'boh'] });
  assert.equal(u.inRoom, 250); assert.equal(u.stations, 2);
  assert.match(u.note, /assumption/);
  assert.equal(R.unitPlan({ rooms: 250, areas: ['fnb'] }).inRoom, 0);
});

test('approval note is neutral and reflects the interview thresholds', () => {
  assert.match(R.approvalNote(null), /USD 5,000/);
  assert.match(R.approvalNote(60000), /above USD 50,000/);
  assert.match(R.approvalNote(20000), /depends on the agreement/);
  assert.match(R.approvalNote(3000), /below USD 5,000/);
});

test('recommend() returns no lead score', () => {
  const r = R.recommend(base, inp, F, PL);
  assert.equal(r.lead, undefined);
  assert.ok(Array.isArray(r.arguments) && r.solutions.length === 1);
});
