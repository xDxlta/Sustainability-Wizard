const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/recommend.js');
const P = require('../js/products.js');

const base = { country: 'SG', tier: 'premium', ownership: 'managed', build: 'existing', rooms: 300, current: 'pet_free', areas: ['rooms'], placement: 'minibar', temps: 'hotcold', finish: 'chrome', space: 'enough', source: 'mains', issues: ['none'], halal: 'no', drivers: ['cost'], approval: 'gm', timeline: '3to12' };

test('every recommended product id exists in the catalogue', () => {
  const variants = [base,
    Object.assign({}, base, { temps: 'ambient', placement: 'vanity' }),
    Object.assign({}, base, { temps: 'sparkling', space: 'tight' }),
    Object.assign({}, base, { temps: 'cold', finish: 'black', space: 'tight' }),
    Object.assign({}, base, { areas: ['rooms', 'fnb', 'meetings', 'boh', 'public'] })];
  variants.forEach(a => R.areaProducts(a).forEach(area => area.products.forEach(id => assert.ok(P.products[id], id))));
});

test('ambient-only rooms get a tap; hot/cold gets the minibar station; sparkling gets FONTANA', () => {
  assert.deepEqual(R.areaProducts(Object.assign({}, base, { temps: 'ambient' }))[0].products, ['smart_tap']);
  assert.deepEqual(R.areaProducts(Object.assign({}, base, { temps: 'ambient', placement: 'vanity' }))[0].products, ['san_tap']);
  assert.equal(R.areaProducts(base)[0].products[0], 'minibar_station');
  assert.equal(R.areaProducts(Object.assign({}, base, { temps: 'sparkling' }))[0].products[0], 'fontana');
});

test('tight space + black finish => compact CLIMA Vida', () => {
  assert.deepEqual(R.areaProducts(Object.assign({}, base, { temps: 'cold', finish: 'black', space: 'tight' }))[0].products, ['vida']);
});

test('vanity placement triggers the guest-experience warning from the interview', () => {
  const notes = R.areaProducts(Object.assign({}, base, { placement: 'vanity' }))[0].notes.join(' ');
  assert.match(notes, /next to the basin/);
});

test('filter spec: tank, well, sediment and microbial answers raise pre-filter / water test flags', () => {
  const plain = R.filterSpec(base);
  assert.equal(plain.prefilter, false); assert.equal(plain.waterTest, false);
  assert.match(plain.grade, /0\.2 micron/);
  const tank = R.filterSpec(Object.assign({}, base, { source: 'tank' }));
  assert.equal(tank.waterTest, true);
  const well = R.filterSpec(Object.assign({}, base, { source: 'well', issues: ['sediment'] }));
  assert.equal(well.prefilter, true); assert.equal(well.waterTest, true);
  const indo = R.filterSpec(Object.assign({}, base, { country: 'ID' }));
  assert.equal(indo.waterTest, true);
});

test('Halal flag: explicit yes, or Malaysia unless explicitly no', () => {
  assert.equal(R.filterSpec(Object.assign({}, base, { halal: 'yes' })).halal, true);
  assert.equal(R.filterSpec(Object.assign({}, base, { country: 'MY', halal: 'notsure' })).halal, true);
  assert.equal(R.filterSpec(Object.assign({}, base, { country: 'MY', halal: 'no' })).halal, false);
  assert.equal(R.filterSpec(base).halal, false);
});

test('argument order: ROI first by default; efficiency first in cheap-water markets; luxury leads with guest experience; safety first when microbial', () => {
  assert.equal(R.argumentOrder(base)[0].key, 'roi');
  assert.equal(R.argumentOrder(Object.assign({}, base, { country: 'MY', priceBand: 'local' }))[0].key, 'efficiency');
  assert.equal(R.argumentOrder(Object.assign({}, base, { tier: 'luxury' }))[0].key, 'efficiency');
  assert.equal(R.argumentOrder(Object.assign({}, base, { issues: ['microbial'] }))[0].key, 'safety');
  const cert = R.argumentOrder(Object.assign({}, base, { drivers: ['certification'] }));
  assert.equal(cert[1].key, 'sustainability');
  assert.equal(new Set(R.argumentOrder(base).map(a => a.key)).size, 4);
});

test('lead score: certification + near-term + GM approval => Hot; exploring + owner + small => Nurture', () => {
  const hot = R.leadScore(Object.assign({}, base, { drivers: ['certification', 'cost'], timeline: 'lt3', build: 'renovation' }));
  assert.equal(hot.tier, 'Hot');
  const cold = R.leadScore({ rooms: 40, current: 'glass_own', drivers: [], timeline: 'exploring', approval: 'owner', build: 'existing', areas: ['boh'] });
  assert.equal(cold.tier, 'Nurture');
  assert.ok(hot.points > cold.points);
  assert.ok(hot.reasons.length > 0);
});

test('unit plan follows the stated planning assumptions', () => {
  const u = R.unitPlan({ rooms: 320, areas: ['rooms', 'fnb', 'meetings', 'boh', 'public'], fnbOutlets: '3', meetingRooms: '10' });
  assert.equal(u.rooms, 320); assert.equal(u.fnb, 3); assert.equal(u.meetings, 4); assert.equal(u.boh, 3); assert.equal(u.public, 1);
  assert.match(u.note, /assumption/);
});

test('approval note reflects the USD 5,000 / 50,000 thresholds for managed hotels', () => {
  assert.match(R.approvalNote(Object.assign({}, base, { ownership: 'managed' }), 60000), /above USD 50,000/);
  assert.match(R.approvalNote(Object.assign({}, base, { ownership: 'managed' }), 20000), /depends on the agreement/);
  assert.match(R.approvalNote(Object.assign({}, base, { ownership: 'managed' }), 3000), /below USD 5,000/);
});
