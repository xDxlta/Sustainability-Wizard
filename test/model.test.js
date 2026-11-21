const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/factors.js');
const M = require('../js/model.js');

const answers = { country: 'MY', rooms: '200', occupancy: 'default', current: 'pet_free', bottlesPerRoomNight: 'default', bottleSizeMl: 'default', priceBand: 'unknown', areas: ['rooms'] };

test('market defaults are applied and carry kind + verification status', () => {
  const n = M.normalise(F, answers, {});
  assert.equal(n.inputs.currency, 'MYR');
  assert.equal(n.inputs.occupancy, F.countries.MY.occupancy.value);
  assert.equal(n.provenance.occupancy.kind, 'sourced');
  assert.equal(n.provenance.occupancy.status, 'unverified');
  assert.equal(n.inputs.bottlesPerRoomNight, 3);
  assert.equal(n.provenance.bottlesPerRoomNight.kind, 'derived');
  assert.equal(n.inputs.bottleSizeMl, 500);
  assert.equal(n.provenance.bottleSizeMl.kind, 'assumption');
  assert.ok(Math.abs(n.inputs.wageHourly - 1700 / (2080 / 12)) < 1e-9);
});

test('"unknown" price uses the TYPICAL reference price: the median of the market references', () => {
  const n = M.normalise(F, answers, {});
  const p = F.countries.MY.bottlePrices.filter(b => b.typical).map(b => b.price).sort((a, b) => a - b);
  assert.ok(F.countries.MY.bottlePrices.some(b => !b.typical)); // premium references exist but never drive "Not sure"
  const median = p.length % 2 ? p[(p.length - 1) / 2] : (p[p.length / 2 - 1] + p[p.length / 2]) / 2;
  assert.ok(Math.abs(n.inputs.pricePerBottle - median) < 1e-9);
  assert.equal(n.provenance.pricePerBottle.typical, true);
  assert.match(n.provenance.pricePerBottle.note, /median of 4 mass-market references/);
  assert.equal(M.typicalPrice({ bottlePrices: [{ price: 1, typical: true }, { price: 5, typical: true }, { price: 2, typical: true }, { price: 99, typical: false }] }), 2);
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
  const kinds = ['sourced', 'sourced-secondary', 'client-statement', 'derived', 'assumption', 'constant'];
  Object.keys(F.factors).forEach(k => {
    const f = F.factors[k];
    assert.ok(kinds.includes(f.kind), k + ' kind');
    if (f.kind === 'sourced') {
      assert.ok(['opened', 'team-opened', 'team-checked', 'unverified', 'missing'].includes(f.status), k + ' status');
      assert.ok(f.source && /^https?:\/\//.test(f.source.url), k + ' url');
      if (f.status === 'missing') assert.equal(f.value, null);
    }
    if (f.kind === 'assumption') assert.ok(f.note && f.note.length > 20, k + ' assumption needs a note');
    if (f.kind === 'sourced-secondary') assert.ok(f.source && f.source.publisher && f.source.title && f.source.year, k + ' secondary source');
  });
  F.marketOrder.forEach(c => {
    const C = F.countries[c];
    ['fx', 'occupancy', 'wageMonthly'].forEach(p => { assert.ok(C[p] && C[p].kind, c + '.' + p); if (C[p].kind === 'sourced') assert.ok(C[p].status && C[p].rule, c + '.' + p + ' status/rule'); });
    C.bottlePrices.forEach(b => { assert.ok(/^https?:\/\//.test(b.url), c + ' price url'); assert.ok(['unverified', 'team-opened'].includes(b.status), c + ' price status'); assert.ok(['mass', 'foodservice', 'premium'].includes(b.tier), c + ' tier'); assert.equal(typeof b.typical, 'boolean'); assert.ok(b.refPublic, c + ' public reference'); assert.equal(b.typical, b.tier === 'mass'); });
    (C.occupancyRefs || []).forEach(r => { assert.equal(r.status, 'team-checked'); assert.ok(r.value > 0 && r.value < 1 && r.publisher && r.document && r.period && r.publicSource, c + ' occupancy ref ' + r.id); assert.ok(r.url === null || /^https:\/\//.test(r.url)); });
  });
  assert.deepEqual(F.marketOrder.slice(0, 3), ['MY', 'ID', 'PH']);
  assert.ok(F.rules.occupancy && F.rules.wage && F.rules.fx && F.rules.co2Pet);
});

test('occupancy is typed in percent; "default" uses the national figure; older fractions still read', () => {
  const base = { country: 'MY', rooms: '100', current: 'pet_free', bottlesPerRoomNight: '2', bottleSizeMl: '500', priceBand: 'unknown', areas: ['rooms'], temps: 'ambient' };
  assert.equal(M.normalise(F, Object.assign({}, base, { occupancy: '72.5' }), {}).inputs.occupancy, 0.725);
  assert.equal(M.normalise(F, Object.assign({}, base, { occupancy: '0.7' }), {}).inputs.occupancy, 0.7);
  assert.equal(M.normalise(F, Object.assign({}, base, { occupancy: 'default' }), {}).inputs.occupancy, F.countries.MY.occupancy.value);
});
