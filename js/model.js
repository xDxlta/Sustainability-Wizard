/* Turns wizard answers into engine inputs, applying market defaults from the factor register.
 * Every default applied is recorded in `provenance` so the UI can label it (kind + verification status). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.model = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  function tagOf(x, label) { return { kind: x.kind, status: x.status || null, label: label, source: x.source, note: x.note, url: x.url }; }

  /** Typical reference price of a market: the median of its mass-market references (typical: true) only. */
  function typicalPrice(c) {
    var p = c.bottlePrices.filter(function (b) { return b.typical; }).map(function (b) { return b.price; }).sort(function (x, y) { return x - y; });
    if (!p.length) return 0;
    var m = Math.floor(p.length / 2);
    return p.length % 2 ? p[m] : (p[m - 1] + p[m]) / 2;
  }

  function bottlePriceOptions(F, countryCode) {
    var c = F.countries[countryCode] || F.countries.OTHER;
    var opts = c.bottlePrices.map(function (b) {
      return { id: b.id, label: b.label, desc: c.symbol + b.price.toLocaleString('en-US', { minimumFractionDigits: c.decimals === 0 ? 0 : 2, maximumFractionDigits: c.decimals === 0 ? 0 : 2 }) + ' per bottle', value: b.price, kind: b.kind, status: b.status, url: b.url };
    });
    if (opts.length) opts.unshift({ id: 'unknown', label: 'Not sure', desc: 'We use the typical price, ' + c.symbol + typicalPrice(c).toLocaleString('en-US', { minimumFractionDigits: c.decimals === 0 ? 0 : 2, maximumFractionDigits: c.decimals === 0 ? 0 : 2 }) });
    opts.push({ id: 'custom', label: 'Enter our price', desc: 'Take the price per bottle from your last invoice, including delivery if it is charged separately.' });
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
    else if (a.occupancy != null && a.occupancy !== '' && a.occupancy !== 'default' && isFinite(Number(a.occupancy))) { occupancy = Number(a.occupancy) > 1 ? Number(a.occupancy) / 100 : Number(a.occupancy); prov.occupancy = { kind: 'user', label: 'Your answer' }; } // percent (since 2.2) or fraction (older saved answers)
    else {
      var match = (c.occupancyRefs || []).filter(function (r) { return r.id === a.occupancyRef; })[0];
      if (match) { occupancy = match.value; prov.occupancy = { kind: 'sourced', status: match.status, label: match.label + ' (' + match.period + ')', closest: true, source: { publisher: match.publicSource, url: match.url } }; }
      else { occupancy = c.occupancy.value; prov.occupancy = tagOf(c.occupancy, c.name + ' reference'); }
    }

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
      if (band) { price = band.price; prov.pricePerBottle = { kind: band.kind, status: band.status, label: band.label, note: band.refPublic || band.ref, url: band.url, tier: band.tier }; }
      else if (c.bottlePrices.length) {
        price = typicalPrice(c);
        var typ = c.bottlePrices.filter(function (b) { return b.typical; });
        prov.pricePerBottle = { kind: 'derived', label: 'Typical price', note: 'median of ' + typ.length + ' mass-market references: ' + typ.map(function (b) { return b.refPublic || b.ref; }).join('; '), typical: true };
      }
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

    // Bottles used outside guest rooms per day (meeting rooms, staff, outlets): optional, set under Adjust the assumptions.
    var other = overrides.otherBottlesPerDay != null && isFinite(Number(overrides.otherBottlesPerDay)) ? Math.max(0, Number(overrides.otherBottlesPerDay)) : F.factors.other_bottles_per_day_default.value;
    prov.otherBottlesPerDay = overrides.otherBottlesPerDay != null ? { kind: 'user', label: 'Adjusted by you' } : tagOf(F.factors.other_bottles_per_day_default, 'Not counted');
    // Extra cost per bottle for delivery, storage and disposal: optional, added to the price in the savings.
    var extra = overrides.extraCostPerBottle != null && isFinite(Number(overrides.extraCostPerBottle)) ? Math.max(0, Number(overrides.extraCostPerBottle)) : F.factors.extra_cost_per_bottle_default.value;
    if (noBottles && overrides.pricePerBottle == null) extra = 0;
    var material = (a.current === 'glass_bought' || a.current === 'glass_own') ? 'glass' : 'pet';
    var inputs = {
      country: c.code, currency: c.currency, symbol: c.symbol, decimals: c.decimals, usdPerLocal: c.fx.value,
      rooms: num(a.rooms, 0), occupancy: occupancy, bottlesPerRoomNight: bpn, bottleSizeMl: size,
      bottleMaterial: material, glassReusable: a.current === 'glass_own',
      bottleWeightOverrideG: overrides.bottleWeightG != null ? num(overrides.bottleWeightG, null) : null,
      pricePerBottle: price + extra, purchasePricePerBottle: price, extraCostPerBottle: extra, otherBottlesPerDay: other,
      minutesPerRoomPerDay: minutesPerRoom, minutesPerCarton: minutesPerCarton, newMinutesPerRoomPerDay: overrides.newMinutesPerRoomPerDay != null ? num(overrides.newMinutesPerRoomPerDay, 0) : 0, wageHourly: wage, stockWeeks: stockWeeks,
      capex: overrides.capex != null ? num(overrides.capex, null) : null,
      annualService: overrides.annualService != null ? num(overrides.annualService, 0) : null
    };
    return { inputs: inputs, provenance: prov, country: c };
  }

  return { normalise: normalise, bottlePriceOptions: bottlePriceOptions, typicalPrice: typicalPrice };
});
