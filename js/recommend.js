/* Solution fit, filtration notes and argument order (version 2).
 * Products and prices come only from js/pricelist.js (Swisspro Hospitality price list). No lead score. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.recommend = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LABELS = {
    tier: { luxury: 'Luxury', premium: 'Premium / upscale', select: 'Select-service / midscale' },
    build: { existing: 'Existing building', renovation: 'Renovation planned', newbuild: 'New build / pre-opening' },
    areas: { rooms: 'Guest rooms', fnb: 'Restaurants and bars', meetings: 'Meeting rooms and events', boh: 'Staff areas and back of house' },
    current: { pet_free: 'Complimentary single-use plastic bottles', pet_sold: 'Single-use plastic bottles sold via minibar', glass_bought: 'Bought-in glass bottles', glass_own: 'Reusable glass from own bottling plant', none: 'No bottled water in rooms' },
    timing: { lt3: 'Within 3 months', '3to12': 'In 3 to 12 months', gt12: 'In more than 12 months' },
    approval: { gm: 'Hotel management', owner: 'Owner or asset manager' }
  };
  var TEMP_LABEL = { ambient: 'ambient', chilled: 'chilled', hot: 'hot', sparkling: 'sparkling' };

  function has(arr, v) { return (arr || []).indexOf(v) >= 0; }

  /* ---------------------------------------------------------------- unit planning (labelled assumption) */
  function unitPlan(a) {
    var rooms = Math.max(0, Number(a.rooms) || 0);
    var plan = { inRoom: has(a.areas, 'rooms') ? rooms : 0, stations: 0 };
    ['fnb', 'meetings', 'boh'].forEach(function (k) { if (has(a.areas, k)) plan.stations += 1; });
    plan.note = 'Unit counts are planning assumptions: one in-room unit per guest room and one drinking station per selected area outside the rooms. The site survey and the proposal set the real quantities.';
    return plan;
  }

  /* ---------------------------------------------------------------- solution per price-list area */
  function inRoomSolution(a) {
    var temps = a.temps || 'ambient', placement = a.placement || 'notsure';
    var s = { area: 'inRoom', areaLabel: 'In-Room', covers: [LABELS.areas.rooms], notes: [], requiredTemps: [], mount: null };
    if (temps === 'ambient') {
      s.title = 'Filtered drinking-water tap in the room';
      s.description = placement === 'vanity'
        ? 'A filtered tap integrated at the vanity, with the cartridge concealed in the cabinet below. Guests dislike a second tap right next to the basin, so Swisspro should propose a fitting that replaces the existing one rather than adding a tap.'
        : 'A dedicated filtered tap at the minibar counter with the cartridge concealed below. No electricity, no drain beyond a drip tray.';
      s.requiredTemps = ['ambient']; s.mount = 'tap';
    } else if (temps === 'sparkling') {
      s.title = 'Still, chilled and sparkling water in the room';
      s.description = 'An in-room unit that dispenses chilled, ambient and sparkling filtered water at the minibar, replacing both the still and the sparkling bottles. Typical for suites and luxury rooms; it needs a power point and a CO2 supply.';
      s.requiredTemps = ['chilled', 'sparkling']; s.mount = null;
    } else {
      s.title = temps === 'hotcold' ? 'Hot and chilled filtered water at the minibar' : 'Chilled filtered water at the minibar';
      s.description = (temps === 'hotcold'
        ? 'A compact under-counter or countertop unit at the minibar that gives chilled and hot filtered water on demand, so the kettle goes as well. '
        : 'A compact under-counter or countertop unit at the minibar that gives chilled and ambient filtered water on demand. ')
        + 'The hotel\'s own carafe or glass bottle sits next to it for the guest to fill.';
      s.requiredTemps = temps === 'hotcold' ? ['hot', 'chilled'] : ['chilled']; s.mount = null;
      if (placement === 'vanity') s.notes.push('Chilled or hot water needs a power point and cabinet space, which the vanity rarely has. The minibar counter is the practical location.');
    }
    if (placement === 'notsure') s.notes.push('Placement advice: the minibar counter is preferred by guests and operators (interview feedback); the vanity suits an ambient tap only.');
    if (a.build === 'existing') s.notes.push('Retrofit: the unit must fit the existing minibar cabinet; chilled or hot water needs a power point and a drip tray or drain nearby. Swisspro checks this in the site survey.');
    else s.notes.push('With the joinery still open, plan the power point, drain and cabinet space for the unit now; a built-in unit can then be concealed completely.');
    if (a.tier === 'luxury' && temps !== 'sparkling') s.notes.push('Luxury hotels often add sparkling water for suites; ask for it in the proposal if wanted.');
    return s;
  }

  function stationSolution(a) {
    var covers = ['fnb', 'meetings', 'boh'].filter(function (k) { return has(a.areas, k); }).map(function (k) { return LABELS.areas[k]; });
    var s = { area: 'fnb', areaLabel: 'F&B / Drinking Station', covers: covers, notes: [], requiredTemps: ['chilled'], mount: 'station' };
    s.title = 'Self-serve drinking station';
    s.description = 'A drinking station with chilled and ambient filtered water (sparkling as an option) for restaurants, bars, pre-function areas and staff canteens. Staff can also fill the hotel\'s own glass carafes for table service and for meeting rooms, so no bottles are carried to the ballroom.';
    if (has(a.areas, 'meetings')) s.notes.push('For events, a station in the pre-function area works better than one in a corridor (interview feedback); carafes filled back of house cover the meeting rooms themselves.');
    if (a.tier === 'luxury' || has(a.areas, 'fnb')) s.notes.push('For table service in restaurants, Swisspro can propose a back-of-house filling point for still and sparkling water in glass bottles.');
    return s;
  }

  function attachProducts(solution, PL) {
    if (!PL || !PL.loaded()) {
      solution.products = [];
      solution.productNote = 'The model and the price come from the Hospitality section of the Swisspro price list. That list is not loaded in this version, so no model is named here; the proposal names it.';
      return solution;
    }
    var matched = PL.match(solution.area, solution.requiredTemps, null);
    if (matched.length) { solution.products = matched; solution.productNote = 'Listed in the ' + PL.AREAS[solution.area] + ' section of the Swisspro price list.'; }
    else {
      solution.products = PL.match(solution.area, [], null);
      solution.productNote = 'No ' + PL.AREAS[solution.area] + ' unit on the price list covers every requested water type; the units of that section are listed and Swisspro confirms the fit in the proposal.';
    }
    return solution;
  }

  function solutions(a, PL) {
    var out = [];
    if (has(a.areas, 'rooms')) out.push(attachProducts(inRoomSolution(a), PL));
    if (has(a.areas, 'fnb') || has(a.areas, 'meetings') || has(a.areas, 'boh')) out.push(attachProducts(stationSolution(a), PL));
    return out;
  }

  /* ---------------------------------------------------------------- filtration (generic, no unverified product claims) */
  function filtration(a) {
    var notes = [], flags = { waterTest: false, pretreatment: false, halal: 'no' };
    var issues = a.issues || [];
    var summary = 'Swisspro units treat the hotel\'s own tap water with replaceable multi-stage filter cartridges, exchanged under the service contract (the price list names a comprehensive SUPERSWISS replacement with labour and parts). The filtration specification for your water is confirmed in the proposal, after a water test where the notes below ask for one.';
    if (a.source === 'tank') { notes.push('Water stored in rooftop or basement tanks can lose its chlorine residual, which lets bacteria regrow; a water test at the tank outlet should precede the specification.'); flags.waterTest = true; }
    if (a.source === 'well') { notes.push('Private wells and boreholes are outside the municipal safety net: a laboratory test before the design and, depending on the result, pre-treatment ahead of the filter units.'); flags.waterTest = true; flags.pretreatment = true; }
    if (a.source === 'notsure') { notes.push('Water source unknown: Swisspro tests the water during the site survey before sizing the filtration.'); flags.waterTest = true; }
    if (has(issues, 'sediment')) { notes.push('Sediment or discolouration: a sediment pre-filter protects the cartridges and the exchange interval may be shorter than the standard contract.'); flags.pretreatment = true; }
    if (has(issues, 'chlorine')) notes.push('Chlorine taste or smell is a taste issue, not a safety issue; the cartridges are designed to remove it.');
    if (has(issues, 'microbial')) { notes.push('Reported microbial concerns: include a water test and a bacteria-retaining specification in the proposal.'); flags.waterTest = true; }
    if (a.country === 'ID') { notes.push('Indonesia: a 2024 study of PDAM piped water found sporadic microbial contamination where the chlorine residual was depleted (unverified source), so a water test is advisable even on mains supply.'); flags.waterTest = true; }
    if (a.halal === 'yes') { flags.halal = 'yes'; notes.push('You need Halal-certified filtration: ask Swisspro to include its Halal certification in the proposal.'); }
    else if (a.halal === 'notsure') { flags.halal = 'ask'; notes.push('If your F&B operation requires Halal-certified equipment, ask for the certificate with the proposal.'); }
    return { summary: summary, notes: notes, flags: flags };
  }

  /* ---------------------------------------------------------------- argument order (adapts to tier and market) */
  function argumentOrder(a, inp, F) {
    var threshold = F && F.factors.cheap_water_threshold_usd ? F.factors.cheap_water_threshold_usd.value : 0.25;
    var priceUsd = inp ? inp.pricePerBottle * inp.usdPerLocal : null;
    var cheapWater = priceUsd != null && priceUsd > 0 && priceUsd < threshold;
    var args = {
      roi: { key: 'roi', title: 'Return on investment', why: 'Owners challenge the payback first. Lead with the bottled-water spend avoided, the service-contract cost and the payback period.' },
      efficiency: { key: 'efficiency', title: 'Efficiency and guest experience', why: 'Water available 24/7 without waiting for housekeeping, one item less to buy, store and count, no heavy trolleys, no pallets in the store.' },
      safety: { key: 'safety', title: 'Water safety', why: 'Filtered water from a tested supply replaces the bottle as the safety guarantee; the specification is confirmed in the proposal.' },
      sustainability: { key: 'sustainability', title: 'Sustainability and compliance', why: 'Bottles and plastic avoided, certification criteria and local plastic rules. Convincing as support, rarely as the main reason (interview).' }
    };
    var order;
    if (a.tier === 'luxury') order = ['efficiency', 'sustainability', 'roi', 'safety'];
    else if (cheapWater) order = ['efficiency', 'safety', 'roi', 'sustainability'];
    else order = ['roi', 'efficiency', 'sustainability', 'safety'];
    if (a.source === 'well' || has(a.issues, 'microbial')) { order.splice(order.indexOf('safety'), 1); order.unshift('safety'); }
    var out = order.map(function (k) { return Object.assign({}, args[k]); });
    if (cheapWater) out.filter(function (x) { return x.key === 'roi'; })[0].why = 'Bottled water is cheap in this market, so the cash payback is long on its own. Add the labour, storage and delivery savings and show the payback both ways.';
    if (a.tier === 'luxury') out[0].why = 'Luxury decisions are driven by guest experience: always-available chilled (and sparkling) water in the room, concealed in the joinery, and no plastic in sight for audit inspectors.';
    return { order: out, cheapWater: cheapWater, priceUsd: priceUsd };
  }

  /* Neutral note on approval thresholds from the interview (not a question). */
  function approvalNote(capexUsd) {
    var s = 'For orientation: approval limits in hotel management agreements vary. Some require owner approval above USD 5,000; others let the general manager decide up to USD 50,000 (Marriott VP Procurement APAC, interview, October 2026).';
    if (capexUsd != null && capexUsd > 0) {
      if (capexUsd > 50000) s += ' This investment is above USD 50,000, so owner approval is likely needed; prepare the five-year view for the asset manager.';
      else if (capexUsd > 5000) s += ' This investment sits in the band where it depends on the agreement; check the capital-expenditure threshold.';
      else s += ' This investment is below USD 5,000 and may sit within hotel management\'s authority.';
    }
    return s;
  }

  function segment(a) {
    return { tier: LABELS.tier[a.tier] || '-', build: LABELS.build[a.build] || '-', current: LABELS.current[a.current] || '-', areas: (a.areas || []).map(function (x) { return LABELS.areas[x] || x; }) };
  }

  function recommend(a, inp, F, PL) {
    var args = argumentOrder(a, inp, F);
    return { segment: segment(a), unitPlan: unitPlan(a), solutions: solutions(a, PL), filtration: filtration(a), arguments: args.order, cheapWater: args.cheapWater, approvalNote: approvalNote, labels: LABELS };
  }

  return { recommend: recommend, unitPlan: unitPlan, solutions: solutions, inRoomSolution: inRoomSolution, stationSolution: stationSolution, filtration: filtration, argumentOrder: argumentOrder, approvalNote: approvalNote, LABELS: LABELS, TEMP_LABEL: TEMP_LABEL };
});
