const test = require('node:test');
const assert = require('node:assert/strict');
const PL = require('../js/pricelist.js');

test('Hospitality lines transcribed verbatim: 4 In-Room and 8 F&B products with printed prices', () => {
  assert.equal(PL.loaded(), true);
  assert.equal(PL.pricelist.items.length, 12);
  assert.equal(PL.areaItems('inRoom').length, 4);
  assert.equal(PL.areaItems('fnb').length, 8);
  assert.equal(PL.byId(PL.pricelist.items, 'ir_versa_plus').name, 'SWISPRO CLIMA VERSA PLUS (SUPERSWISS PNP)');
  assert.equal(PL.byId(PL.pricelist.items, 'ir_versa_plus').price, 980);
  assert.equal(PL.byId(PL.pricelist.items, 'fb_triple_tap').price, 5999);
  PL.pricelist.items.forEach(it => assert.ok(['inRoom', 'fnb'].includes(it.area)));
});

test('servicing lines kept verbatim; three readings of the 85.00 line, per change (9 months) as default', () => {
  const sv = PL.pricelist.servicing;
  assert.equal(PL.byId(sv.inRoom, 'sv_ir_comprehensive').name, '2 or 3 Year Contract Price with labour and change of parts');
  assert.equal(PL.byId(sv.inRoom, 'sv_ir_comprehensive').price, 85);
  assert.equal(PL.byId(sv.inRoom, 'sv_ir_alacarte').price, 70);
  assert.equal(PL.byId(sv.fnb, 'sv_fb_quarterly').price, 350);
  assert.equal(sv.defaultReading, 'perChange');
  assert.ok(Math.abs(PL.inRoomServicePerYear() - 85 * 12 / 9) < 1e-9);
  assert.ok(Math.abs(PL.inRoomServicePerYear('perChange', 12) - 85) < 1e-9);
  assert.equal(PL.inRoomServicePerYear('perYear'), 85);
  assert.equal(PL.inRoomServicePerYear('perContract2y'), 42.5);
  assert.equal(PL.stationServicePerYear(), 350);
  assert.equal(PL.pricelist.currency.kind, 'assumption');
});

test('match: area-restricted, every required printed water type covered, sorted by price', () => {
  assert.deepEqual(PL.match('inRoom', ['hot', 'cold']).map(x => x.id), ['ir_versa_plus']);
  assert.deepEqual(PL.match('inRoom', ['ambient']).map(x => x.id), ['ir_smart_plus', 'ir_san_plus', 'ir_unico_plus']); // Unico+ prints Ambient too
  assert.deepEqual(PL.match('inRoom', ['cold', 'sparkling']), []);
  assert.deepEqual(PL.match('fnb', ['cold', 'sparkling']).map(x => x.id), ['fb_vida_s']);
  const cold = PL.match('fnb', ['cold']);
  assert.equal(cold[0].id, 'fb_versa');
  assert.ok(cold.every((x, i) => i === 0 || x.price >= cold[i - 1].price));
  assert.ok(!PL.match('fnb', ['cold']).some(x => x.id === 'fb_triple_tap'));
});
