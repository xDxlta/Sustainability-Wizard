/* Turns wizard answers into engine inputs, applying market defaults from the factor register.
 * Every default applied is recorded in `provenance` so the UI can label it (kind + verification status). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.model = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  function tagOf(x, label) { return { kind: x.kind, status: x.status || null, label: label, source: x.source, note: x.note, url: x.url }; }

  function bottlePriceOptions(F, countryCode) {
    var c = F.countries[countryCode] || F.countries.OTHER;
    var opts = c.bottlePrices.map(function (b) {
      return { id: b.id, label: b.label, desc: c.symbol + b.price.toFixed(c.decimals === 0 ? 0 : 2) + ' per bottle: ' + b.ref, value: b.price, kind: b.kind, status: b.status, url: b.url };
    });
    if (opts.length) opts.unshift({ id: 'unknown', label: 'Not sure, use the lowest reference price', desc: 'Conservative: the cheapest published carton price for the market.' });
    opts.push({ id: 'custom', label: 'I know our price, let me enter it' });
    return opts;
  }

  /** @returns {{inputs: object, provenance: object, country: object}} */
  function normalise(F, a, overrides) {
    overrides = overrides || {};
    var c = F.countries[a.country] || F.countries.OTHER;
    var prov = {};
    var noBottles = !a.current || a.current === 'none';

    var occupancy;
    if (overrides.occupancy != null) { occupancy = num(overrides.occupancy, c.occupancy.value); prov.occupancy = { kind: 'user', label: 'Adjusted by you' }; }
    else if (a.occupancy && a.occupancy !== 'default') { occupancy = num(a.occupancy, c.occupancy.value); prov.occupancy = { kind: 'user', label: 'Your answer' }; }
    else { occupancy = c.occupancy.value; prov.occupancy = tagOf(c.occupancy, c.name + ' reference'); }

    var bpn;
    if (overrides.bottlesPerRoomNight != null) { bpn = num(overrides.bottlesPerRoomNight, 0); prov.bottlesPerRoomNight = { kind: 'user', label: 'Adjusted by you' }; }
    else if (noBottles) { bpn = 0; prov.bottlesPerRoomNight = { kind: 'user', label: 'No bottles in rooms today' }; }
    else if (a.bottlesPerRoomNight && a.bottlesPerRoomNight !== 'default') { bpn = num(a.bottlesPerRoomNight, 2); prov.bottlesPerRoomNight = { kind: 'user', label: 'Your answer' }; }
    else { bpn = F.factors.bottles_per_room_night_default.value; prov.bottlesPerRoomNight = tagOf(F.factors.bottles_per_room_night_default, 'Assumed'); }

    var size = (!a.bottleSizeMl || a.bottleSizeMl === 'default') ? 500 : num(a.bottleSizeMl, 500);
    prov.bottleSizeMl = (!a.bottleSizeMl || a.bottleSizeMl === 'default') ? { kind: 'assumption', label: 'Assumed 500 ml' } : { kind: 'user', label: 'Your answer' };

    var price;
    if (overrides.pricePerBottle != null) { price = num(overrides.pricePerBottle, 0); prov.pricePerBottle = { kind: 'user', label: 'Adjusted by you' }; }
    else if (noBottles) { price = 0; prov.pricePerBottle = { kind: 'user', label: 'No bottles in rooms today' }; }
    else if (a.priceBand === 'custom') { price = num(a.priceCustom, 0); prov.pricePerBottle = { kind: 'user', label: 'Your price' }; }
    else {
      var band = c.bottlePrices.filter(function (b) { return b.id === a.priceBand; })[0];
      if (!band && c.bottlePrices.length) band = c.bottlePrices.slice().sort(function (x, y) { return x.price - y.price; })[0];
      if (band) { price = band.price; prov.pricePerBottle = { kind: band.kind, status: band.status, label: band.label, note: band.ref, url: band.url }; }
      else { price = 0; prov.pricePerBottle = { kind: 'missing', label: 'No price available, cost not calculated' }; }
    }

    var wage;
    if (overrides.wageHourly != null) { wage = num(overrides.wageHourly, 0); prov.wageHourly = { kind: 'user', label: 'Adjusted by you' }; }
    else { wage = F.hourlyWage(c.wageMonthly.value); prov.wageHourly = tagOf(c.wageMonthly, c.wageMonthly.label); }

    function assumed(key, ovKey) {
      if (overrides[ovKey] != null) { prov[ovKey] = { kind: 'user', label: 'Adjusted by you' }; return num(overrides[ovKey], 0); }
      prov[ovKey] = tagOf(F.factors[key], 'Assumed'); return F.factors[key].value;
    }
    var minutesPerRoom = assumed('minutes_per_room_per_day_default', 'minutesPerRoomPerDay');
    var minutesPerCarton = assumed('minutes_per_carton_default', 'minutesPerCarton');
    var stockWeeks = assumed('stock_weeks_default', 'stockWeeks');

    var material = (a.current === 'glass_bought' || a.current === 'glass_own') ? 'glass' : 'pet';
    var inputs = {
      country: c.code, currency: c.currency, symbol: c.symbol, decimals: c.decimals, usdPerLocal: c.fx.value,
      rooms: num(a.rooms, 0), occupancy: occupancy, bottlesPerRoomNight: bpn, bottleSizeMl: size,
      bottleMaterial: material, glassReusable: a.current === 'glass_own',
      bottleWeightOverrideG: overrides.bottleWeightG != null ? num(overrides.bottleWeightG, null) : null,
      pricePerBottle: price, otherBottlesPerDay: overrides.otherBottlesPerDay != null ? num(overrides.otherBottlesPerDay, 0) : num(a.otherBottlesPerDay, 0),
      minutesPerRoomPerDay: minutesPerRoom, minutesPerCarton: minutesPerCarton, wageHourly: wage, stockWeeks: stockWeeks,
      capex: overrides.capex != null ? num(overrides.capex, null) : null,
      annualService: overrides.annualService != null ? num(overrides.annualService, 0) : null
    };
    return { inputs: inputs, provenance: prov, country: c };
  }

  return { normalise: normalise, bottlePriceOptions: bottlePriceOptions };
});
