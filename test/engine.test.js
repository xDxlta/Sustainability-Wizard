const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/factors.js');
const E = require('../js/engine.js');

const base = {
  country: 'SG', usdPerLocal: 1 / 1.28, rooms: 100, occupancy: 0.8, bottlesPerRoomNight: 2, bottleSizeMl: 500,
  bottleMaterial: 'pet', pricePerBottle: 0.5, otherBottlesPerDay: 0, minutesPerRoomPerDay: 1, minutesPerCarton: 2,
  wageHourly: 10, stockWeeks: 2, capex: null, annualService: null
};

test('annual bottles = rooms x occupancy x bottles x 365 (+ other x 365)', () => {
  const b = E.annualBottles(base);
  assert.equal(b.occupiedRoomNights, 100 * 0.8 * 365);
  assert.equal(b.total, 100 * 0.8 * 2 * 365);
  const b2 = E.annualBottles(Object.assign({}, base, { otherBottlesPerDay: 50 }));
  assert.equal(b2.otherBottles, 50 * 365);
  assert.equal(b2.total, b.total + 50 * 365);
});

test('occupancy is clamped to 0..1 and negative inputs are ignored', () => {
  assert.equal(E.annualBottles(Object.assign({}, base, { occupancy: 1.5 })).total, 100 * 1 * 2 * 365);
  assert.equal(E.annualBottles(Object.assign({}, base, { rooms: -5 })).total, 0);
  assert.equal(E.annualBottles(Object.assign({}, base, { rooms: 'abc' })).total, 0);
});

test('500 ml PET bottle uses the sourced IBWA weight; other sizes use the labelled scaling rule', () => {
  assert.equal(E.petBottleWeightGrams(F, 500), 9.89);
  assert.ok(Math.abs(E.petBottleWeightGrams(F, 1500) - 9.89 * Math.pow(3, 2 / 3)) < 1e-9);
  assert.ok(E.petBottleWeightGrams(F, 330) < 9.89);
  assert.ok(E.petBottleWeightGrams(F, 1000) > 9.89);
});

test('environmental impact: plastic kg and CO2e scale with bottles and the PET factor', () => {
  const b = E.annualBottles(base);
  const env = E.environmentalImpact(F, base, b);
  assert.ok(env.quantified);
  assert.ok(Math.abs(env.packagingKg - b.total * 9.89 / 1000) < 1e-9);
  assert.ok(Math.abs(env.co2eKg - env.packagingKg * F.factors.co2e_kg_per_kg_pet.value) < 1e-9);
  assert.ok(env.co2eCarKm > 0);
  assert.equal(env.litres, b.total * 0.5);
});

test('glass bottles: CO2e = litres x glass factor (Garfi 2016, per litre); plastic stays unquantified', () => {
  const inp = Object.assign({}, base, { bottleMaterial: 'glass' });
  const b = E.annualBottles(inp);
  const env = E.environmentalImpact(F, inp, b);
  assert.equal(env.quantified, true);
  assert.equal(env.packagingKg, null);
  assert.ok(Math.abs(env.co2eKg - b.total * 0.5 * F.factors.glass_co2e.value) < 1e-9);
  assert.equal(F.factors.glass_co2e.value, 0.061);
});

test('glass bottles: CO2e not quantified, with the reason, when the glass factor is missing', () => {
  const F2 = { factors: Object.assign({}, F.factors, { glass_co2e: { value: null, kind: 'sourced', status: 'missing', note: 'why missing' } }) };
  const inp = Object.assign({}, base, { bottleMaterial: 'glass' });
  const env = E.environmentalImpact(F2, inp, E.annualBottles(inp));
  assert.equal(env.quantified, false);
  assert.equal(env.co2eKg, null);
  assert.equal(env.reason, 'why missing');
});

test('bottle weight override is honoured', () => {
  const inp = Object.assign({}, base, { bottleWeightOverrideG: 20 });
  const env = E.environmentalImpact(F, inp, E.annualBottles(inp));
  assert.equal(env.bottleWeightG, 20);
});

test('spend = bottles x price, converted to USD', () => {
  const b = E.annualBottles(base);
  const s = E.spend(base, b);
  assert.equal(s.annualLocal, b.total * 0.5);
  assert.ok(Math.abs(s.annualUsd - s.annualLocal / 1.28) < 1e-6);
  assert.equal(E.spend(Object.assign({}, base, { pricePerBottle: 0 }), b).annualLocal, 0);
});

test('labour hours = room minutes + carton minutes; cost = hours x wage', () => {
  const b = E.annualBottles(base);
  const l = E.labour(F, base, b);
  const expectedRoomHours = b.occupiedRoomNights * 1 / 60;
  const expectedCartonHours = (b.total / 24) * 2 / 60;
  assert.ok(Math.abs(l.roomHours - expectedRoomHours) < 1e-9);
  assert.ok(Math.abs(l.cartonHours - expectedCartonHours) < 1e-9);
  assert.ok(Math.abs(l.costLocal - l.hours * 10) < 1e-9);
  assert.ok(Math.abs(l.fteEquivalent - l.hours / 2080) < 1e-9);
  const noWage = E.labour(F, Object.assign({}, base, { wageHourly: 0 }), b);
  assert.equal(noWage.quantified, false);
  assert.ok(noWage.hours > 0);
});

test('logistics: pallets, storage area, deliveries and tonnes handled', () => {
  const b = E.annualBottles(base);
  const g = E.logistics(F, base, b);
  assert.ok(Math.abs(g.palletsPerYear - b.total / 1872) < 1e-9);
  assert.ok(Math.abs(g.peakPallets - g.palletsPerYear * 2 / 52) < 1e-9);
  assert.ok(Math.abs(g.storageM2 - g.peakPallets * 1.2) < 1e-9);
  assert.equal(g.deliveriesPerYear, 26);
  assert.ok(Math.abs(g.kgPerBottle - (0.5 + 0.00989)) < 1e-9);
  assert.ok(Math.abs(g.tonnesHandled - b.total * g.kgPerBottle / 1000) < 1e-9);
  // 1.5 L bottles: fewer per pallet
  const big = E.logistics(F, Object.assign({}, base, { bottleSizeMl: 1500 }), b);
  assert.ok(big.palletsPerYear > g.palletsPerYear);
});

test('payback: null capex => not available; otherwise cash and full payback in years', () => {
  const b = E.annualBottles(base);
  const s = E.spend(base, b); const l = E.labour(F, base, b);
  const none = E.payback(base, s, l);
  assert.equal(none.available, false);
  assert.equal(none.cashPaybackYears, null);
  const pb = E.payback(Object.assign({}, base, { capex: 20000, annualService: 2000 }), s, l);
  assert.ok(pb.available);
  assert.ok(Math.abs(pb.cashSavingsPerYear - (s.annualLocal - 2000)) < 1e-9);
  assert.ok(Math.abs(pb.cashPaybackYears - 20000 / (s.annualLocal - 2000)) < 1e-9);
  assert.ok(pb.fullPaybackYears < pb.cashPaybackYears);
  assert.ok(Math.abs(pb.fiveYearNetCash - ((s.annualLocal - 2000) * 5 - 20000)) < 1e-9);
});

test('payback is Infinity when service cost exceeds savings', () => {
  const b = E.annualBottles(base);
  const s = E.spend(Object.assign({}, base, { pricePerBottle: 0.01 }), b); const l = E.labour(F, Object.assign({}, base, { wageHourly: 0 }), b);
  const pb = E.payback(Object.assign({}, base, { capex: 1000, annualService: 1e9 }), s, l);
  assert.equal(pb.cashPaybackYears, Infinity);
});

test('calculate() runs end to end and reproduces the Fairmont-scale order of magnitude', () => {
  // Fairmont Singapore + Swissotel claim 1.5 million bottles/yr avoided over 2,030 rooms (hotel website, see factors.js).
  const r = E.calculate(F, Object.assign({}, base, { rooms: 2030, occupancy: 0.819, bottlesPerRoomNight: 2 }));
  assert.ok(r.bottles.total > 1.0e6 && r.bottles.total < 1.6e6, 'got ' + r.bottles.total);
});

test('missing factor throws instead of silently returning 0', () => {
  assert.throws(() => E.environmentalImpact({ factors: {} }, base, E.annualBottles(base)), /Missing factor/);
});
