/* Lead sorting and product fit. Qualitative rules, each traceable to the brief, the
 * Marriott interview (Oct 2026) or Swisspro's published product pages. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.recommend = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LABELS = {
    tier: { luxury: 'Luxury', premium: 'Premium / upscale', select: 'Select-service / midscale' },
    ownership: { owned: 'Owner-operated', managed: 'Brand-managed', franchised: 'Franchised' },
    build: { existing: 'Existing building', renovation: 'Renovation planned', newbuild: 'New build / pre-opening' },
    areas: { rooms: 'Guest rooms', fnb: 'Restaurants and bars', meetings: 'Meetings and events', boh: 'Back of house', public: 'Gym, spa, pool and lobby' },
    current: { pet_free: 'Complimentary single-use plastic bottles', pet_sold: 'Single-use plastic bottles sold via minibar', glass_bought: 'Bought-in glass bottles', glass_own: 'Own bottling plant (glass)', cooler: '19 L cooler bottles', none: 'No bottled water in rooms' },
    timeline: { lt3: 'Within 3 months', '3to12': '3-12 months', gt12: 'More than 12 months', exploring: 'Exploring' },
    approval: { gm: 'GM / hotel management can approve', owner: 'Owner approval required', notsure: 'Approval path unclear' }
  };

  function has(arr, v) { return (arr || []).indexOf(v) >= 0; }

  /* ---------------------------------------------------------------- unit planning (assumptions) */
  function unitPlan(a) {
    var rooms = Math.max(0, Number(a.rooms) || 0);
    var plan = {};
    if (has(a.areas, 'rooms')) plan.rooms = rooms;                                   // one water point per room
    if (has(a.areas, 'fnb')) plan.fnb = Math.max(1, Number(a.fnbOutlets) || 1);      // one unit per outlet
    if (has(a.areas, 'meetings')) plan.meetings = Math.max(1, Math.ceil((Number(a.meetingRooms) || 2) / 3)); // one station per 3 rooms
    if (has(a.areas, 'boh')) plan.boh = Math.max(1, Math.ceil(rooms / 150));         // one high-volume unit per 150 rooms
    if (has(a.areas, 'public')) plan.public = 1;
    plan.note = 'Unit counts are planning assumptions (1 per room, 1 per outlet, 1 station per 3 meeting rooms, 1 back-of-house unit per 150 rooms). A site survey decides.';
    return plan;
  }

  /* ---------------------------------------------------------------- product fit per area */
  function roomProducts(a) {
    var out = [], notes = [];
    var temps = a.temps || 'ambient', placement = a.placement || 'notsure', finish = a.finish || 'nopref', tight = a.space === 'tight';
    if (placement === 'vanity') {
      notes.push('Guests dislike a drinking tap right next to the basin (Marriott VP Procurement APAC interview). If the vanity is the only option, use a SAN all-in-one mixer so there is no second tap; otherwise move the water point to the minibar.');
    }
    if (temps === 'ambient') {
      if (placement === 'vanity') out.push('san_tap'); else out.push('smart_tap');
      if (finish === 'black') notes.push('Swisspro\'s published tap range is chrome-plated brass; black is available on the CLIMA Vida dispenser line. Ask Swisspro about finish options for taps.');
    } else if (temps === 'sparkling') {
      out.push('fontana');
      if (!tight) out.push('vida');
      notes.push('Sparkling in every room is a luxury/suite feature; most hotels specify it for suites only and hot/chilled elsewhere.');
    } else {
      if (tight && finish === 'black') { out.push('vida'); }
      else { out.push('minibar_station'); if (finish === 'black') out.push('vida'); }
      if (placement === 'vanity') notes.push('Hot and chilled water needs power and tank space: a minibar counter is the practical location.');
    }
    if (a.tier === 'luxury' && a.keepPremium === 'yes' && out.indexOf('fontana') < 0) {
      notes.push('Because a premium branded water stays on offer, position filtered water as the always-on complimentary option and consider FONTANA with sparkling for suites as the premium in-house alternative.');
    }
    if (a.build === 'newbuild' || a.build === 'renovation') notes.push('With joinery still open, a built-in or under-counter unit can be concealed completely - plan the drainage and power point now.');
    return { products: out, notes: notes };
  }

  function areaProducts(a) {
    var list = [];
    if (has(a.areas, 'rooms')) { var r = roomProducts(a); list.push({ id: 'rooms', label: LABELS.areas.rooms, products: r.products, notes: r.notes }); }
    if (has(a.areas, 'fnb')) list.push({ id: 'fnb', label: LABELS.areas.fnb, products: ['boh_refill', 'self_serve_station', 'fontana'], notes: ['Table service: fill the hotel\'s own glass bottles at a back-of-house station (still and sparkling). Buffet and casual outlets: a guest-facing self-serve station. A built-in FONTANA suits a bar counter.'] });
    if (has(a.areas, 'meetings')) list.push({ id: 'meetings', label: LABELS.areas.meetings, products: ['self_serve_station', 'boh_refill'], notes: ['Swisspro\'s convention-area concept: a self-service station outside the meeting rooms for delegates plus a back-of-house unit where the banquet team refills glass bottles for the ballroom. Avoid stations in long corridors; place them in pre-function areas (interview feedback).'] });
    if (has(a.areas, 'boh')) list.push({ id: 'boh', label: LABELS.areas.boh, products: ['grande', 'mesa', 'san_tap'], notes: ['High-volume CLIMA Grande for stewarding and kitchens; Mesa V2 for staff canteens; SAN mixer for pantry sinks.'] });
    if (has(a.areas, 'public')) list.push({ id: 'public', label: LABELS.areas.public, products: ['self_serve_station', 'mesa'], notes: ['Refill stations with bottle fillers at the gym and pool; keep them visible and branded - they are part of the sustainability story guests notice.'] });
    return list;
  }

  /* ---------------------------------------------------------------- filter specification */
  function filterSpec(a) {
    var reasons = [], prefilter = false, carbon = true, test = false, interval = 'Standard service interval per the service contract.';
    var issues = a.issues || [];
    reasons.push('0.2-micron absolute microfiltration retains bacteria (CDC: absolute pore size of 0.3 micron or smaller is needed to remove bacteria). This is the filtration Swisspro lists for its SAN, SMART, FONTANA and CLIMA Grande units.');
    if (a.source === 'tank') { reasons.push('Water stored in rooftop or basement tanks can lose residual chlorine and allow bacteria to regrow, so the bacteria barrier matters even where mains water is potable.'); test = true; }
    if (a.source === 'well') { reasons.push('Private wells and boreholes are outside the municipal safety net: a laboratory test before design is essential and a sediment pre-filter is standard.'); prefilter = true; test = true; }
    if (has(issues, 'sediment')) { reasons.push('Sediment or discolouration: add a sediment pre-filter stage to protect the ceramic element and expect shorter change intervals.'); prefilter = true; interval = 'Expect more frequent cartridge changes; Swisspro can size the pre-filter after a water test.'; }
    if (has(issues, 'chlorine')) { reasons.push('Chlorine taste or smell: the activated-carbon stage removes it; this is a taste issue, not a safety issue.'); }
    if (has(issues, 'microbial')) { reasons.push('Reported microbial concerns: specify the 0.2-micron absolute grade for every outlet and include a water test in the service contract.'); test = true; }
    if (a.country === 'ID') { reasons.push('Indonesia: a 2024 study of PDAM piped water found sporadic microbial contamination where residual chlorine was depleted - a bacteria-retaining grade is the safe default.'); test = true; }
    if (a.source === 'notsure' || has(issues, 'notsure')) { reasons.push('Water source or quality unknown: Swisspro should test the water during the site survey before sizing filters.'); test = true; }
    var halal = a.halal === 'yes' || (a.country === 'MY' && a.halal !== 'no');
    return { grade: '0.2 micron absolute (microfiltration) + activated carbon', reasons: reasons, prefilter: prefilter, carbon: carbon, waterTest: test, interval: interval, halal: halal,
      halalNote: halal ? 'Ask Swisspro for its Halal certificate; JAKIM certification of water filtration products is established practice in Malaysia.' : null };
  }

  /* ---------------------------------------------------------------- argument order */
  function argumentOrder(a, calc) {
    var cheapWater = (a.country === 'MY' || a.country === 'ID') && (!a.priceBand || a.priceBand === 'unknown' || a.priceBand === 'local' || a.priceBand === 'budget' || a.priceBand === 'mid');
    var args = {
      roi: { key: 'roi', title: 'Return on investment', why: 'Owners challenge the payback first ("why three years and not two"). Lead with annual bottled-water spend avoided, the service-contract cost and the payback period.' },
      efficiency: { key: 'efficiency', title: 'Efficiency and guest experience', why: 'Water available 24/7 without waiting for housekeeping, one SKU less to buy, store and count, no heavy trolleys, no space taken by pallets.' },
      safety: { key: 'safety', title: 'Water safety', why: 'Microfiltration retains bacteria; bottled water is not needed as the safety guarantee.' },
      sustainability: { key: 'sustainability', title: 'Sustainability and compliance', why: 'Bottles and plastic avoided, certification criteria and local plastic rules. Convincing as support, rarely as the main reason (interview).' }
    };
    var order;
    if (a.tier === 'luxury') order = ['efficiency', 'sustainability', 'roi', 'safety'];
    else if (cheapWater) order = ['efficiency', 'safety', 'roi', 'sustainability'];
    else order = ['roi', 'efficiency', 'sustainability', 'safety'];
    if (has(a.drivers, 'certification') || has(a.drivers, 'audit') || has(a.drivers, 'mandate')) { order.splice(order.indexOf('sustainability'), 1); order.splice(1, 0, 'sustainability'); }
    if (has(a.drivers, 'safety') || has(a.issues, 'microbial') || a.source === 'well') { order.splice(order.indexOf('safety'), 1); order.unshift('safety'); }
    var out = order.map(function (k) { return args[k]; });
    if (cheapWater) out[out.map(function (x) { return x.key; }).indexOf('roi')].why = 'Bottled water is cheap in this market, so the cash payback is longer; add the labour, storage and delivery savings to the business case and show the payback both ways.';
    if (a.tier === 'luxury') out[0].why = 'Luxury decisions are cosmetic and guest-experience driven: always-available chilled and sparkling water in the room, concealed in the joinery, and no plastic in sight for Forbes/LQA inspectors.';
    return out;
  }

  /* ---------------------------------------------------------------- lead score */
  function leadScore(a) {
    var pts = 0, reasons = [];
    function add(n, why) { pts += n; reasons.push((n >= 0 ? '+' : '') + n + ' ' + why); }
    if (has(a.drivers, 'certification')) add(3, 'certification trigger');
    if (has(a.drivers, 'audit')) add(3, 'audit standard trigger');
    if (has(a.drivers, 'mandate')) add(3, 'brand or owner mandate');
    if (has(a.drivers, 'renovation') || a.build !== 'existing') add(2, 'renovation or new build enables installation');
    if (has(a.drivers, 'cost')) add(1, 'cost driver');
    if (has(a.drivers, 'efficiency') || has(a.drivers, 'storage')) add(1, 'operational pain');
    var tl = { lt3: 3, '3to12': 2, gt12: 1, exploring: 0 }[a.timeline] || 0; add(tl, 'timeline: ' + (LABELS.timeline[a.timeline] || 'unknown'));
    var ap = { gm: 2, notsure: 1, owner: 0 }[a.approval] || 0; add(ap, LABELS.approval[a.approval] || 'approval unknown');
    var rooms = Number(a.rooms) || 0; if (rooms >= 300) add(2, '300+ rooms'); else if (rooms >= 100) add(1, '100-299 rooms');
    if (a.current === 'pet_free' || a.current === 'pet_sold') add(2, 'single-use plastic in rooms today');
    else if (a.current === 'glass_bought' || a.current === 'cooler') add(1, 'bottled supply to replace');
    if (a.current === 'glass_own') add(0, 'own bottling plant: different need (labour, washing)');
    if (a.tier === 'luxury' && a.keepPremium === 'yes') add(-1, 'premium water stays');
    if ((a.areas || []).length >= 3) add(1, 'multiple areas');
    if (a.email) add(1, 'contact details left');
    var tier = pts >= 11 ? 'Hot' : pts >= 7 ? 'Warm' : 'Nurture';
    return { points: pts, tier: tier, reasons: reasons };
  }

  function approvalNote(a, capexUsd) {
    var s = 'Approval limits in management agreements vary: some require owner approval above USD 5,000, others let the GM decide up to USD 50,000 (interview).';
    if (a.ownership === 'managed' && capexUsd != null) {
      if (capexUsd > 50000) s += ' This investment is above USD 50,000, so owner approval is likely required - prepare the ROI case for the asset manager.';
      else if (capexUsd > 5000) s += ' This investment sits in the band where approval depends on the agreement - check the capital-expenditure threshold.';
      else s += ' This investment is below USD 5,000 and may sit within hotel management\'s authority.';
    }
    if (a.approval === 'owner') s += ' You indicated owner approval is needed: lead with payback and the five-year net saving.';
    return s;
  }

  function segment(a) {
    return {
      tier: LABELS.tier[a.tier] || '-', ownership: LABELS.ownership[a.ownership] || '-', build: LABELS.build[a.build] || '-',
      current: LABELS.current[a.current] || '-', timeline: LABELS.timeline[a.timeline] || '-', approval: LABELS.approval[a.approval] || '-',
      areas: (a.areas || []).map(function (x) { return LABELS.areas[x] || x; })
    };
  }

  function recommend(a, calc) {
    return { segment: segment(a), unitPlan: unitPlan(a), areas: areaProducts(a), filter: filterSpec(a), arguments: argumentOrder(a, calc), lead: leadScore(a), labels: LABELS, approvalNote: approvalNote };
  }

  return { recommend: recommend, unitPlan: unitPlan, areaProducts: areaProducts, filterSpec: filterSpec, argumentOrder: argumentOrder, leadScore: leadScore, approvalNote: approvalNote, LABELS: LABELS };
});
