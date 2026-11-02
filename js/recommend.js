/* Solution fit and argument order (version 2.1). Products and prices come only from js/pricelist.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.recommend = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LABELS = {
    areas: { rooms: 'Guest rooms', fnb: 'Restaurants and bars', meetings: 'Meetings and events', boh: 'Staff areas' },
    current: { pet_free: 'Plastic bottles, free', pet_sold: 'Plastic bottles, sold', glass_bought: 'Glass bottles, bought in', glass_own: 'Glass bottles, filled in-house', none: 'No bottled water' },
    temps: { ambient: 'ambient', cold: 'chilled', hotcold: 'hot and chilled', sparkling: 'chilled and sparkling' },
    timing: { lt3: 'Within 3 months', '3to12': '3 to 12 months', gt12: 'Later' },
    approval: { gm: 'Hotel management', owner: 'Owner' },
    source: { mains: 'Municipal mains', tank: 'Mains via storage tank', well: 'Own well or treatment plant' }
  };
  var TEMP_LABEL = { ambient: 'ambient', cold: 'chilled', hot: 'hot', sparkling: 'sparkling' };

  function has(arr, v) { return (arr || []).indexOf(v) >= 0; }

  /* One in-room unit per room, one drinking station per other area (planning assumption, adjustable). */
  function unitPlan(a, overrides) {
    overrides = overrides || {};
    var rooms = Math.max(0, Number(a.rooms) || 0);
    var plan = { inRoom: has(a.areas, 'rooms') ? rooms : 0, stations: 0 };
    ['fnb', 'meetings', 'boh'].forEach(function (k) { if (has(a.areas, k)) plan.stations += 1; });
    if (has(a.areas, 'rooms') && a.temps === 'sparkling' && plan.stations === 0) plan.stations = 1; // sparkling needs a station
    if (overrides.stations != null && isFinite(Number(overrides.stations))) plan.stations = Math.max(0, Math.round(Number(overrides.stations)));
    plan.note = 'One in-room unit per guest room and one drinking station per other area; the proposal sets the real quantities.';
    return plan;
  }

  var SPARKLING_NOTE = 'No listed in-room unit gives sparkling water. Sparkling water for the rooms comes from the drinking station below, for example refilled into carafes or bottles in-house; the proposal sets how.';

  function inRoomSolution(a, overrides) {
    var temps = a.temps || 'ambient';
    var s = { area: 'inRoom', areaLabel: 'In-Room', covers: [LABELS.areas.rooms], requiredTemps: [], notes: [] };
    if (overrides && overrides.inRoomTap && temps !== 'ambient') {
      s.title = 'Filtered tap in the room (lower-cost option)'; s.requiredTemps = ['ambient']; s.lowerCost = true;
      s.notes.push('You asked for ' + LABELS.temps[temps] + ' water in the room; this is the lower-cost option with a filtered tap.');
      if (temps === 'sparkling') s.notes.push(SPARKLING_NOTE);
      return s;
    }
    if (temps === 'ambient') { s.title = 'Filtered tap in the room'; s.requiredTemps = ['ambient']; }
    else if (temps === 'sparkling') {
      s.title = 'Chilled water in the room, sparkling from a station';
      s.requiredTemps = ['cold'];
      s.notes.push('Swisspro in-room units give ambient, chilled, or hot and chilled water. ' + SPARKLING_NOTE);
    }
    else if (temps === 'hotcold') { s.title = 'Hot and chilled water at the minibar'; s.requiredTemps = ['hot', 'cold']; }
    else { s.title = 'Chilled water at the minibar'; s.requiredTemps = ['cold']; }
    return s;
  }

  function stationSolution(a) {
    var covers = ['fnb', 'meetings', 'boh'].filter(function (k) { return has(a.areas, k); }).map(function (k) { return LABELS.areas[k]; });
    var sparkling = has(a.areas, 'rooms') && a.temps === 'sparkling';
    if (sparkling) covers.push('sparkling water for the guest rooms');
    return { area: 'fnb', areaLabel: 'F&B / Drinking Station', covers: covers, requiredTemps: sparkling ? ['cold', 'sparkling'] : ['cold'], notes: [], title: sparkling ? 'Drinking station with sparkling water' : 'Drinking station' };
  }

  /* Plain words for what a listed unit gives, from the water types printed on the price list. */
  function describe(p) {
    var t = (p.temps || []).map(function (x) { return TEMP_LABEL[x]; });
    var water = t.length ? t.join(', ').replace(/, ([^,]*)$/, ' and $1') + ' water' : 'water types not printed on the list';
    if (p.mount === 'tap') return 'Filtered tap, ' + water;
    if (p.mount === 'station') return 'Tap station, ' + water;
    return water.charAt(0).toUpperCase() + water.slice(1);
  }

  function attachProducts(solution, PL) {
    if (!PL || !PL.loaded()) { solution.products = []; solution.exactMatch = false; solution.productNote = 'Price list not loaded.'; return solution; }
    var matched = PL.match(solution.area, solution.requiredTemps, null);
    if (matched.length) {
      solution.products = matched; solution.exactMatch = true; solution.productNote = 'Lowest-priced matching line sets the investment; the proposal sets the model.';
      var pick = matched[0], extras = (pick.temps || []).filter(function (t) { return solution.requiredTemps.indexOf(t) < 0; });
      if (extras.length) solution.notes.push(pick.label.replace(/\s*\(.*\)$/, '') + ' is the lowest-priced ' + PL.AREAS[solution.area] + ' unit with ' + solution.requiredTemps.map(function (t) { return TEMP_LABEL[t]; }).join(' and ') + ' water; it also gives ' + extras.map(function (t) { return TEMP_LABEL[t]; }).join(' and ') + ' water.');
    } else {
      solution.products = PL.areaItems(solution.area); solution.exactMatch = false;
      solution.productNote = 'No ' + PL.AREAS[solution.area] + ' line prints ' + solution.requiredTemps.map(function (t) { return TEMP_LABEL[t]; }).join(' and ') + ' water; the section is listed and the proposal prices it.';
    }
    solution.products.forEach(function (p) { p.describe = describe(p); });
    return solution;
  }

  /* Lower-cost comparison: a filtered tap (ambient) in the room instead of a chilled or hot unit. */
  function alternative(a, PL, overrides) {
    if (!has(a.areas, 'rooms') || !a.temps || a.temps === 'ambient' || (overrides && overrides.inRoomTap)) return null;
    var s = attachProducts(inRoomSolution({ temps: 'ambient' }), PL);
    return s.exactMatch ? s : null;
  }

  function solutions(a, PL, overrides) {
    var out = [];
    if (has(a.areas, 'rooms')) out.push(attachProducts(inRoomSolution(a, overrides), PL));
    if (has(a.areas, 'fnb') || has(a.areas, 'meetings') || has(a.areas, 'boh') || (has(a.areas, 'rooms') && a.temps === 'sparkling')) out.push(attachProducts(stationSolution(a), PL));
    return out;
  }

  /* Argument order: ROI first; efficiency first where bottled water is cheap. */
  function argumentOrder(inp, F) {
    var threshold = F && F.factors.cheap_water_threshold_usd ? F.factors.cheap_water_threshold_usd.value : 0.25;
    var priceUsd = inp ? inp.pricePerBottle * inp.usdPerLocal : null;
    var cheapWater = priceUsd != null && priceUsd > 0 && priceUsd < threshold;
    var args = {
      roi: { key: 'roi', title: 'Return on investment', why: 'Spend avoided, service contract, payback.' },
      efficiency: { key: 'efficiency', title: 'Efficiency and guest experience', why: 'Water any time, one item less to buy, store and carry.' },
      safety: { key: 'safety', title: 'Water safety', why: 'Filtered water from a tested supply, specification in the proposal.' },
      sustainability: { key: 'sustainability', title: 'Sustainability', why: 'Bottles, plastic and CO2e avoided; supports certifications.' }
    };
    var order = cheapWater ? ['efficiency', 'safety', 'roi', 'sustainability'] : ['roi', 'efficiency', 'sustainability', 'safety'];
    return { order: order.map(function (k) { return args[k]; }), cheapWater: cheapWater, priceUsd: priceUsd };
  }

  function segment(a, overrides) {
    var lower = !!(overrides && overrides.inRoomTap && a.temps && a.temps !== 'ambient' && has(a.areas, 'rooms'));
    return { current: LABELS.current[a.current] || '-', areas: (a.areas || []).map(function (x) { return LABELS.areas[x] || x; }), temps: LABELS.temps[a.temps] || null, lowerCost: lower, tempsShown: lower ? LABELS.temps.ambient : (LABELS.temps[a.temps] || null) };
  }

  function recommend(a, inp, F, PL, overrides) {
    var args = argumentOrder(inp, F);
    return { segment: segment(a, overrides), unitPlan: unitPlan(a, overrides), solutions: solutions(a, PL, overrides), alternative: alternative(a, PL, overrides), arguments: args.order, cheapWater: args.cheapWater, labels: LABELS };
  }

  return { recommend: recommend, unitPlan: unitPlan, solutions: solutions, alternative: alternative, describe: describe, inRoomSolution: inRoomSolution, stationSolution: stationSolution, argumentOrder: argumentOrder, LABELS: LABELS, TEMP_LABEL: TEMP_LABEL };
});
