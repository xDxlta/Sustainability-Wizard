const test = require('node:test');
const assert = require('node:assert/strict');
const PL = require('../js/pricelist.js');

test('price list: servicing line kept verbatim; interval and currency are labelled assumptions', () => {
  const s = PL.pricelist.servicing;
  assert.equal(s.name, 'Comprehensive SUPERSWISS Replacement, 2 or 3 Year Contract Price with labour and change of parts');
  assert.equal(s.price, 85);
  assert.equal(s.intervalYears.kind, 'assumption');
  assert.equal(PL.pricelist.currency.kind, 'assumption');
  assert.equal(PL.pricelist.currency.value, 'SGD');
});

test('servicing per unit per year divides the line price by the interval', () => {
  assert.equal(PL.servicingPerUnitPerYear(), 85 / 2);
  assert.equal(PL.servicingPerUnitPerYear(3), 85 / 3);
  assert.equal(PL.servicingPerUnitPerYear(0), 85 / 2);
});

test('items only from the Hospitality section: none loaded in this version', () => {
  assert.equal(PL.loaded(), false);
  assert.deepEqual(PL.match('inRoom', ['chilled']), []);
  PL.pricelist.items.forEach(it => assert.ok(['inRoom', 'fnb'].includes(it.area)));
});
