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

  /* One in-room unit per room, one drinking station per other area (planning assumption). */
  function unitPlan(a) {
    var rooms = Math.max(0, Number(a.rooms) || 0);
    var plan = { inRoom: has(a.areas, 'rooms') ? rooms : 0, stations: 0 };
    ['fnb', 'meetings', 'boh'].forEach(function (k) { if (has(a.areas, k)) plan.stations += 1; });
    plan.note = 'One in-room unit per guest room and one drinking station per other area; the proposal sets the real quantities.';
    return plan;
  }

  function inRoomSolution(a) {
    var temps = a.temps || 'ambient';
    var s = { area: 'inRoom', areaLabel: 'In-Room', covers: [LABELS.areas.rooms], requiredTemps: [], notes: [] };
    if (temps === 'ambient') { s.title = 'Filtered tap in the room'; s.requiredTemps = ['ambient']; }
    else if (temps === 'sparkling') { s.title = 'Chilled and sparkling water in the room'; s.requiredTemps = ['cold', 'sparkling']; }
    else if (temps === 'hotcold') { s.title = 'Hot and chilled water at the minibar'; s.requiredTemps = ['hot', 'cold']; }
    else { s.title = 'Chilled water at the minibar'; s.requiredTemps = ['cold']; }
    return s;
  }

  function stationSolution(a) {
    var covers = ['fnb', 'meetings', 'boh'].filter(function (k) { return has(a.areas, k); }).map(function (k) { return LABELS.areas[k]; });
    return { area: 'fnb', areaLabel: 'F&B / Drinking Station', covers: covers, requiredTemps: ['cold'], notes: [], title: 'Drinking station' };
  }

  function attachProducts(solution, PL) {
    if (!PL || !PL.loaded()) { solution.products = []; solution.exactMatch = false; solution.productNote = 'Price list not loaded.'; return solution; }
    var matched = PL.match(solution.area, solution.requiredTemps, null);
    if (matched.length) { solution.products = matched; solution.exactMatch = true; solution.productNote = 'Lowest-priced matching line sets the investment; the proposal sets the model.'; }
    else {
      solution.products = PL.areaItems(solution.area); solution.exactMatch = false;
      solution.productNote = 'No ' + PL.AREAS[solution.area] + ' line prints ' + solution.requiredTemps.map(function (t) { return TEMP_LABEL[t]; }).join(' and ') + ' water; the section is listed and the proposal prices it.';
      if (solution.area === 'inRoom' && has(solution.requiredTemps, 'sparkling')) {
        var sp = PL.match('fnb', ['sparkling'], null);
        if (sp.length) solution.notes.push('Sparkling is listed only as a drinking station (' + sp.map(function (p) { return p.label; }).join(', ') + ').');
      }
    }
    return solution;
  }

  function solutions(a, PL) {
    var out = [];
    if (has(a.areas, 'rooms')) out.push(attachProducts(inRoomSolution(a), PL));
    if (has(a.areas, 'fnb') || has(a.areas, 'meetings') || has(a.areas, 'boh')) out.push(attachProducts(stationSolution(a), PL));
    return out;
  }

  /* Argument order: ROI first (Marriott interview); efficiency first where bottled water is cheap. */
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

  /* Neutral note from the interview (not a question). */
  function approvalNote(capexUsd) {
    var s = 'Approval limits vary: some management agreements need owner approval above USD 5,000, others let the general manager decide up to USD 50,000 (Marriott VP Procurement APAC, interview, October 2026).';
    if (capexUsd != null && capexUsd > 50000) s += ' This investment is above USD 50,000.';
    else if (capexUsd != null && capexUsd > 5000) s += ' This investment is between USD 5,000 and 50,000.';
    else if (capexUsd != null && capexUsd > 0) s += ' This investment is below USD 5,000.';
    return s;
  }

  function segment(a) {
    return { current: LABELS.current[a.current] || '-', areas: (a.areas || []).map(function (x) { return LABELS.areas[x] || x; }), temps: LABELS.temps[a.temps] || null };
  }

  function recommend(a, inp, F, PL) {
    var args = argumentOrder(inp, F);
    return { segment: segment(a), unitPlan: unitPlan(a), solutions: solutions(a, PL), arguments: args.order, cheapWater: args.cheapWater, approvalNote: approvalNote, labels: LABELS };
  }

  return { recommend: recommend, unitPlan: unitPlan, solutions: solutions, inRoomSolution: inRoomSolution, stationSolution: stationSolution, argumentOrder: argumentOrder, approvalNote: approvalNote, LABELS: LABELS, TEMP_LABEL: TEMP_LABEL };
});
