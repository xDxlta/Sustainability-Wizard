/* Swisspro hotel pipeline tool - priority score (rule-based), 0 to 100.
 *
 * Pure function. Every weight and step comes from crm/js/config.js. The score is a ranking aid built
 * from rules; it is not a probability. Missing data never lowers a score silently: the component is
 * marked notSourced and scored neutral (half of its weight, or half of its part).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.CRM = root.CRM || {}; root.CRM.score = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function round1(x) { return Math.round(x * 10) / 10; }
  function pct(x) { return (Math.round(x * 1000) / 10) + '%'; }

  /** Opening year from the data's free text ("2027 (Q2, announced)"); null when none is found. */
  function openingYear(opening) {
    var m = /(\d{4})/.exec(String(opening == null ? '' : opening));
    return m ? Number(m[1]) : null;
  }

  function payback(cfg, econ) {
    var w = cfg.weights.payback, p = cfg.payback, be = econ && econ.breakEven ? econ.breakEven[p.years] : null;
    if (!econ || !be || !(be.occupancy > 0)) return { id: 'payback', label: 'Payback fit', max: w, points: w / 2, notSourced: true, detail: 'Not sourced: no occupancy reference or no price for this market. Scored neutral.' };
    var ratio = econ.occupancy / be.occupancy;
    var points = w * clamp01((ratio - p.zeroAt) / (p.fullAt - p.zeroAt));
    var basis = econ.source && econ.source.occupancy.fromHotel ? 'Occupancy from the hotel' : 'Market occupancy';
    return { id: 'payback', label: 'Payback fit', max: w, points: round1(points), notSourced: false, ratio: ratio,
      detail: basis + ' ' + pct(econ.occupancy) + ' against ' + pct(be.occupancy) + ' needed for a ' + p.years + '-year cash payback: ratio ' + ratio.toFixed(2) + '. Full points from ' + p.fullAt + ', none at ' + p.zeroAt + ' or below.' };
  }

  function size(cfg, hotel) {
    var w = cfg.weights.size;
    if (!(hotel.rooms > 0)) return { id: 'size', label: 'Size', max: w, points: w / 2, notSourced: true, detail: 'Not sourced: room count missing. Scored neutral.' };
    var points = w * clamp01(hotel.rooms / cfg.size.fullAtRooms);
    return { id: 'size', label: 'Size', max: w, points: round1(points), notSourced: false,
      detail: hotel.rooms + ' rooms. Full points from ' + cfg.size.fullAtRooms + ' rooms, in proportion below.' };
  }

  function owner(cfg, hotel, ctx) {
    var w = cfg.weights.owner, o = cfg.owner;
    if (!hotel.owner_group) return { id: 'owner', label: 'Owner leverage', max: w, points: w / 2, notSourced: true, detail: 'Not sourced: owner group missing in the data. Scored neutral.' };
    var count = Math.max(1, ctx.ownerCount || 1);
    var step = o.steps.filter(function (s) { return count >= s.min; })[0];
    var points = step ? step.points : 0, bonus = ctx.ownerHasProject ? o.projectBonus : 0;
    return { id: 'owner', label: 'Owner leverage', max: w, points: Math.min(w, points + bonus), notSourced: false,
      detail: (ctx.privateOwner ? 'Private owner, name not kept: other hotels of the same owner cannot be linked, so it counts as 1 hotel: ' : count + (count === 1 ? ' hotel' : ' hotels') + ' of this owner group in the data: ') + points + ' points.' + (bonus ? ' Another hotel of the group is at ' + o.projectStatuses.join(', ').replace(/, ([^,]*)$/, ' or $1') + ': plus ' + bonus + '.' : '') };
  }

  function segment(cfg, hotel) {
    var w = cfg.weights.segment, s = cfg.segment, parts = [], notSourced = false;
    var tier = s.tier[hotel.tier];
    if (tier == null) { tier = Math.max.apply(null, Object.keys(s.tier).map(function (k) { return s.tier[k]; })) / 2; notSourced = true; parts.push('tier not sourced, neutral ' + tier); }
    else parts.push(hotel.tier + ' ' + tier);
    var model = s.model[hotel.operating_model];
    if (model == null) { model = s.modelMax / 2; notSourced = true; parts.push('operating model not sourced, neutral ' + model); }
    else parts.push((hotel.operating_model === 'managed' ? 'managed ' : 'owner-operated ') + model);
    var stage = s.stage[hotel.build_stage];
    if (stage == null) { stage = 1.5; notSourced = true; parts.push('build stage not sourced, neutral 1.5'); }
    else parts.push((hotel.build_stage === 'existing' ? 'existing ' : 'new build ') + stage);
    return { id: 'segment', label: 'Segment fit', max: w, points: Math.min(w, tier + model + stage), notSourced: notSourced, detail: parts.join(' + ') + '. Existing, Premium or Select, managed scores highest.' };
  }

  function timing(cfg, hotel) {
    var w = cfg.weights.timing, t = cfg.timing;
    if (hotel.build_stage === 'new_build') {
      var y = openingYear(hotel.opening);
      if (y == null) return { id: 'timing', label: 'Timing', max: w, points: w / 2, notSourced: true, detail: 'New build, opening date not sourced. Scored neutral.' };
      if (y > cfg.referenceYear) return { id: 'timing', label: 'Timing', max: w, points: t.newBuildLater, notSourced: false, detail: 'New build, opening ' + y + ': after ' + cfg.referenceYear + ', before opening.' };
      return { id: 'timing', label: 'Timing', max: w, points: t.newBuildThisYear, notSourced: false, detail: 'New build, opening ' + y + ': opens in the year the data was compiled.' };
    }
    return { id: 'timing', label: 'Timing', max: w, points: w / 2, notSourced: true, detail: 'Existing hotel: renovation date not sourced. Scored neutral.' };
  }

  /**
   * hotel: a row of hotels_public.json. ctx: { econ, ownerCount, ownerHasProject }.
   * Returns { total (integer 0..100), components: [{ id, label, max, points, notSourced, detail }], label }.
   */
  function score(cfg, hotel, ctx) {
    ctx = ctx || {};
    var components = [payback(cfg, ctx.econ), size(cfg, hotel), owner(cfg, hotel, ctx), segment(cfg, hotel), timing(cfg, hotel)];
    var sum = components.reduce(function (s, c) { return s + c.points; }, 0);
    return { label: cfg.label, total: Math.round(sum), sum: sum, components: components };
  }

  return { score: score, openingYear: openingYear };
});
