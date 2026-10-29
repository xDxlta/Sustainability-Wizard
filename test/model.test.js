const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/factors.js');
const M = require('../js/model.js');

const answers = { country: 'MY', tier: 'premium', rooms: '200', occupancy: 'default', current: 'pet_free', bottlesPerRoomNight: 'default', bottleSizeMl: '500', priceBand: 'unknown', areas: ['rooms'], otherBottlesPerDay: '0' };

test('country defaults are applied and labelled', () => {
  const n = M.normalise(F, answers, {});
  assert.equal(n.inputs.currency, 'MYR');
  assert.equal(n.inputs.occupancy, F.countries.MY.occupancy.value);
  assert.equal(n.provenance.occupancy.kind, 'sourced');
  assert.equal(n.inputs.bottlesPerRoomNight, 2);
  assert.equal(n.provenance.bottlesPerRoomNight.kind, 'assumption');
  assert.ok(Math.abs(n.inputs.wageHourly - 1700 / (2080 / 12)) < 1e-9);
});

test('"unknown" price falls back to the LOWEST sourced reference price (conservative)', () => {
  const n = M.normalise(F, answers, {});
  const lowest = Math.min.apply(null, F.countries.MY.bottlePrices.map(b => b.price));
  assert.equal(n.inputs.pricePerBottle, lowest);
});

test('user answers override defaults; custom price is used', () => {
  const n = M.normalise(F, Object.assign({}, answers, { occupancy: '0.7', bottlesPerRoomNight: '3', priceBand: 'custom', priceCustom: '0.9' }), {});
  assert.equal(n.inputs.occupancy, 0.7);
  assert.equal(n.inputs.bottlesPerRoomNight, 3);
  assert.equal(n.inputs.pricePerBottle, 0.9);
  assert.equal(n.provenance.pricePerBottle.kind, 'user');
});

test('results-page overrides win over everything and are labelled "user"', () => {
  const n = M.normalise(F, answers, { occupancy: 0.55, pricePerBottle: 1.1, wageHourly: 12, minutesPerRoomPerDay: 2, stockWeeks: 4, capex: 50000, annualService: 3000, bottleWeightG: 15 });
  assert.equal(n.inputs.occupancy, 0.55);
  assert.equal(n.inputs.pricePerBottle, 1.1);
  assert.equal(n.inputs.wageHourly, 12);
  assert.equal(n.inputs.minutesPerRoomPerDay, 2);
  assert.equal(n.inputs.stockWeeks, 4);
  assert.equal(n.inputs.capex, 50000);
  assert.equal(n.inputs.annualService, 3000);
  assert.equal(n.inputs.bottleWeightOverrideG, 15);
  assert.equal(n.provenance.occupancy.kind, 'user');
});

test('no bottled water in rooms => zero bottles per room-night', () => {
  const n = M.normalise(F, Object.assign({}, answers, { current: 'none' }), {});
  assert.equal(n.inputs.bottlesPerRoomNight, 0);
});

test('glass answers map to glass material; own plant flagged reusable', () => {
  assert.equal(M.normalise(F, Object.assign({}, answers, { current: 'glass_own' }), {}).inputs.bottleMaterial, 'glass');
  assert.equal(M.normalise(F, Object.assign({}, answers, { current: 'glass_own' }), {}).inputs.glassReusable, true);
  assert.equal(M.normalise(F, Object.assign({}, answers, { current: 'glass_bought' }), {}).inputs.glassReusable, false);
});

test('OTHER market: no price reference => price 0 and labelled missing; wage 0', () => {
  const n = M.normalise(F, Object.assign({}, answers, { country: 'OTHER', priceBand: 'unknown' }), {});
  assert.equal(n.inputs.pricePerBottle, 0);
  assert.equal(n.provenance.pricePerBottle.kind, 'missing');
  assert.equal(n.inputs.wageHourly, 0);
  assert.equal(n.inputs.currency, 'USD');
});

test('bottle price options include every sourced band plus custom and unknown', () => {
  const o = M.bottlePriceOptions(F, 'PH');
  assert.equal(o.filter(x => x.id === 'custom').length, 1);
  assert.equal(o.filter(x => x.id === 'unknown').length, 1);
  assert.equal(o.length, F.countries.PH.bottlePrices.length + 2);
  const other = M.bottlePriceOptions(F, 'OTHER');
  assert.deepEqual(other.map(x => x.id), ['custom']);
});

test('every registry factor carries a kind and (if sourced) a URL', () => {
  Object.keys(F.factors).forEach(k => {
    const f = F.factors[k];
    assert.ok(['sourced', 'sourced-secondary', 'derived', 'assumption', 'constant'].includes(f.kind), k + ' kind');
    if (f.kind === 'sourced' || f.kind === 'sourced-secondary') assert.ok(f.source && /^https?:\/\//.test(f.source.url), k + ' url');
    if (f.kind === 'assumption') assert.ok(f.note && f.note.length > 20, k + ' assumption needs a note');
  });
  Object.keys(F.countries).forEach(c => {
    const C = F.countries[c];
    ['fx', 'occupancy', 'wageMonthly'].forEach(p => assert.ok(C[p] && C[p].kind, c + '.' + p));
    C.bottlePrices.forEach(b => assert.ok(/^https?:\/\//.test(b.url), c + ' price url'));
  });
});
