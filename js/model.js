/* Turns wizard answers into engine inputs, applying country defaults from the factor registry.
 * Every default applied is recorded in `provenance` so the UI can label it. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.model = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }

  function bottlePriceOptions(F, countryCode) {
    var c = F.countries[countryCode] || F.countries.OTHER;
    var opts = c.bottlePrices.map(function (b) {
      return { id: b.id, label: b.label, desc: c.symbol + b.price.toFixed(c.decimals === 0 ? 0 : 2) + ' per bottle - ' + b.ref, value: b.price, kind: b.kind, url: b.url };
    });
    opts.push({ id: 'custom', label: 'I know our price - let me enter it' });
    if (opts.length > 1) opts.push({ id: 'unknown', label: 'Not sure - use the lowest reference price', desc: 'Conservative: the cheapest sourced carton price for the market.' });
    return opts;
  }

  /** @returns {{inputs: object, provenance: object, country: object}} */
  function normalise(F, a, overrides) {
    overrides = overrides || {};
    var c = F.countries[a.country] || F.countries.OTHER;
    var prov = {};
    var bottlesPerRoomNight, occupancy, price, wageHourly, minutesPerRoom, minutesPerCarton, stockWeeks;

    // occupancy
    if (overrides.occupancy != null) { occupancy = num(overrides.occupancy, c.occupancy.value); prov.occupancy = { kind: 'user', label: 'Adjusted by you' }; }
    else if (a.occupancy && a.occupancy !== 'default') { occupancy = num(a.occupancy, c.occupancy.value); prov.occupancy = { kind: 'user', label: 'Your answer' }; }
    else { occupancy = c.occupancy.value; prov.occupancy = { kind: c.occupancy.kind, label: c.name + ' average', source: c.occupancy.source, note: c.occupancy.note }; }

    // bottles per room-night
    var noRoomBottles = a.current === 'none' || (a.areas || []).indexOf('rooms') < 0 && a.current === 'none';
    if (overrides.bottlesPerRoomNight != null) { bottlesPerRoomNight = num(overrides.bottlesPerRoomNight, 0); prov.bottlesPerRoomNight = { kind: 'user', label: 'Adjusted by you' }; }
    else if (a.current === 'none') { bottlesPerRoomNight = 0; prov.bottlesPerRoomNight = { kind: 'user', label: 'No bottles in rooms today' }; }
    else if (a.bottlesPerRoomNight && a.bottlesPerRoomNight !== 'default') { bottlesPerRoomNight = num(a.bottlesPerRoomNight, 2); prov.bottlesPerRoomNight = { kind: 'user', label: 'Your answer' }; }
    else { bottlesPerRoomNight = F.factors.bottles_per_room_night_default.value; prov.bottlesPerRoomNight = { kind: 'assumption', label: 'Assumed', note: F.factors.bottles_per_room_night_default.note }; }

    // price per bottle (local currency)
    if (overrides.pricePerBottle != null) { price = num(overrides.pricePerBottle, 0); prov.pricePerBottle = { kind: 'user', label: 'Adjusted by you' }; }
    else if (a.priceBand === 'custom') { price = num(a.priceCustom, 0); prov.pricePerBottle = { kind: 'user', label: 'Your price' }; }
    else {
      var band = c.bottlePrices.filter(function (b) { return b.id === a.priceBand; })[0];
      if (!band && c.bottlePrices.length) { band = c.bottlePrices.slice().sort(function (x, y) { return x.price - y.price; })[0]; }
      if (band) { price = band.price; prov.pricePerBottle = { kind: band.kind, label: band.label, note: band.ref, url: band.url }; }
      else { price = 0; prov.pricePerBottle = { kind: 'missing', label: 'No price available - cost not calculated' }; }
    }

    // wage
    if (overrides.wageHourly != null) { wageHourly = num(overrides.wageHourly, 0); prov.wageHourly = { kind: 'user', label: 'Adjusted by you' }; }
    else { wageHourly = F.hourlyWage(c.wageMonthly.value); prov.wageHourly = { kind: c.wageMonthly.kind, label: c.wageMonthly.label, source: c.wageMonthly.source, note: c.wageMonthly.note }; }

    minutesPerRoom = overrides.minutesPerRoomPerDay != null ? num(overrides.minutesPerRoomPerDay, 0) : F.factors.minutes_per_room_per_day_default.value;
    prov.minutesPerRoomPerDay = overrides.minutesPerRoomPerDay != null ? { kind: 'user', label: 'Adjusted by you' } : { kind: 'assumption', label: 'Assumed', note: F.factors.minutes_per_room_per_day_default.note };
    minutesPerCarton = overrides.minutesPerCarton != null ? num(overrides.minutesPerCarton, 0) : F.factors.minutes_per_carton_default.value;
    prov.minutesPerCarton = overrides.minutesPerCarton != null ? { kind: 'user', label: 'Adjusted by you' } : { kind: 'assumption', label: 'Assumed', note: F.factors.minutes_per_carton_default.note };
    stockWeeks = overrides.stockWeeks != null ? num(overrides.stockWeeks, 0) : F.factors.stock_weeks_default.value;
    prov.stockWeeks = overrides.stockWeeks != null ? { kind: 'user', label: 'Adjusted by you' } : { kind: 'assumption', label: 'Assumed', note: F.factors.stock_weeks_default.note };

    var material = (a.current === 'glass_bought' || a.current === 'glass_own') ? 'glass' : 'pet';
    var inputs = {
      country: c.code, currency: c.currency, symbol: c.symbol, decimals: c.decimals, usdPerLocal: c.fx.value,
      rooms: num(a.rooms, 0), occupancy: occupancy, bottlesPerRoomNight: bottlesPerRoomNight,
      bottleSizeMl: a.current === 'cooler' ? 19000 : num(a.bottleSizeMl, 500),
      bottleMaterial: material, glassReusable: a.current === 'glass_own',
      bottleWeightOverrideG: overrides.bottleWeightG != null ? num(overrides.bottleWeightG, null) : null,
      pricePerBottle: price, otherBottlesPerDay: num(a.otherBottlesPerDay, 0),
      minutesPerRoomPerDay: minutesPerRoom, minutesPerCarton: minutesPerCarton, wageHourly: wageHourly,
      stockWeeks: stockWeeks,
      capex: overrides.capex != null ? num(overrides.capex, null) : null,
      annualService: overrides.annualService != null ? num(overrides.annualService, 0) : null
    };
    if (a.current === 'cooler') { inputs.bottlesPerRoomNight = 0; inputs.otherBottlesPerDay = num(a.otherBottlesPerDay, 0); prov.bottlesPerRoomNight = { kind: 'user', label: '19 L cooler bottles are not counted per room' }; }
    return { inputs: inputs, provenance: prov, country: c };
  }

  return { normalise: normalise, bottlePriceOptions: bottlePriceOptions };
});
