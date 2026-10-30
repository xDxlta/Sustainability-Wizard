const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/factors.js');
const M = require('../js/model.js');

const answers = { country: 'MY', tier: 'premium', build: 'existing', rooms: '200', occupancy: 'default', current: 'pet_free', bottlesPerRoomNight: 'default', bottleSizeMl: 'default', priceBand: 'unknown', areas: ['rooms'], otherBottlesPerDay: '0' };

test('market defaults are applied and carry kind + verification status', () => {
  const n = M.normalise(F, answers, {});
  assert.equal(n.inputs.currency, 'MYR');
  assert.equal(n.inputs.occupancy, F.countries.MY.occupancy.value);
  assert.equal(n.provenance.occupancy.kind, 'sourced');
  assert.equal(n.provenance.occupancy.status, 'unverified');
  assert.equal(n.inputs.bottlesPerRoomNight, 2);
  assert.equal(n.provenance.bottlesPerRoomNight.kind, 'assumption');
  assert.equal(n.inputs.bottleSizeMl, 500);
  assert.equal(n.provenance.bottleSizeMl.kind, 'assumption');
  assert.ok(Math.abs(n.inputs.wageHourly - 1700 / (2080 / 12)) < 1e-9);
});

test('"unknown" price falls back to the LOWEST reference price (conservative)', () => {
  const n = M.normalise(F, answers, {});
  const lowest = Math.min.apply(null, F.countries.MY.bottlePrices.map(b => b.price));
  assert.equal(n.inputs.pricePerBottle, lowest);
});

test('user answers override defaults; custom price is used', () => {
  const n = M.normalise(F, Object.assign({}, answers, { occupancy: '0.7', bottlesPerRoomNight: '3', bottleSizeMl: '330', priceBand: 'custom', priceCustom: '0.9' }), {});
  assert.equal(n.inputs.occupancy, 0.7);
  assert.equal(n.inputs.bottlesPerRoomNight, 3);
  assert.equal(n.inputs.bottleSizeMl, 330);
  assert.equal(n.inputs.pricePerBottle, 0.9);
  assert.equal(n.provenance.pricePerBottle.kind, 'user');
});

test('result-page overrides win over everything and are labelled "user"', () => {
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

test('no bottled water in rooms => zero bottles and zero price', () => {
  const n = M.normalise(F, Object.assign({}, answers, { current: 'none' }), {});
  assert.equal(n.inputs.bottlesPerRoomNight, 0);
  assert.equal(n.inputs.pricePerBottle, 0);
});

test('glass answers map to glass material; own plant flagged reusable', () => {
  assert.equal(M.normalise(F, Object.assign({}, answers, { current: 'glass_own' }), {}).inputs.bottleMaterial, 'glass');
  assert.equal(M.normalise(F, Object.assign({}, answers, { current: 'glass_own' }), {}).inputs.glassReusable, true);
  assert.equal(M.normalise(F, Object.assign({}, answers, { current: 'glass_bought' }), {}).inputs.glassReusable, false);
});

test('bottle price options: "not sure" first, every reference band, then custom', () => {
  const o = M.bottlePriceOptions(F, 'PH');
  assert.equal(o[0].id, 'unknown');
  assert.equal(o[o.length - 1].id, 'custom');
  assert.equal(o.length, F.countries.PH.bottlePrices.length + 2);
  assert.deepEqual(M.bottlePriceOptions(F, 'OTHER').map(x => x.id), ['custom']);
});

test('register integrity: kinds, statuses, URLs, rules, assumption notes', () => {
  const kinds = ['sourced', 'derived', 'assumption', 'constant'];
  Object.keys(F.factors).forEach(k => {
    const f = F.factors[k];
    assert.ok(kinds.includes(f.kind), k + ' kind');
    if (f.kind === 'sourced') {
      assert.ok(['opened', 'team-opened', 'unverified', 'missing'].includes(f.status), k + ' status');
      assert.ok(f.source && /^https?:\/\//.test(f.source.url), k + ' url');
      if (f.status === 'missing') assert.equal(f.value, null);
    }
    if (f.kind === 'assumption') assert.ok(f.note && f.note.length > 20, k + ' assumption needs a note');
  });
  F.marketOrder.forEach(c => {
    const C = F.countries[c];
    ['fx', 'occupancy', 'wageMonthly'].forEach(p => { assert.ok(C[p] && C[p].kind, c + '.' + p); if (C[p].kind === 'sourced') assert.ok(C[p].status && C[p].rule, c + '.' + p + ' status/rule'); });
    C.bottlePrices.forEach(b => { assert.ok(/^https?:\/\//.test(b.url), c + ' price url'); assert.equal(b.status, 'unverified'); });
  });
  assert.deepEqual(F.marketOrder.slice(0, 3), ['MY', 'ID', 'PH']);
  assert.ok(F.rules.occupancy && F.rules.wage && F.rules.fx && F.rules.co2Pet);
});
