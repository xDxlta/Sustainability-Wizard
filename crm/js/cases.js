/* Swisspro hotel pipeline tool - case archive helpers.
 *
 * The archive shows the public cases exactly as written in crm/data/cases_public.json. For the filters,
 * the free-text fields tier, solution, outcome and build stage are put into a few groups by the rules
 * below. The groups are a reading by this tool; the original wording is always shown next to them.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.CRM = root.CRM || {}; root.CRM.cases = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TIERS = ['Luxury', 'Premium', 'Select', 'Longer Stays', 'Collections', 'Midscale', 'Classics'];
  function tierGroup(t) {
    var s = String(t || '');
    for (var i = 0; i < TIERS.length; i++) if (s.indexOf(TIERS[i]) === 0) return TIERS[i];
    return 'Not verified';
  }

  var SOLUTIONS = [
    ['Kept single-use bottles', /did not switch/i],
    ['Glass bottles from a supplier', /external/i],
    ['In-room filtered water', /in-room|on tap in rooms|dispensers \(guest rooms/i],
    ['In-house glass bottling', /bottling|bottled in|bottles own water|glass-bottle washing|refilling plant/i],
    ['Other', /water source not stated/i],
    ['Refill stations and carafes', /station|dispenser on every floor|carafe/i]
  ];
  function solutionGroup(s) {
    var t = String(s || '');
    for (var i = 0; i < SOLUTIONS.length; i++) if (SOLUTIONS[i][1].test(t)) return SOLUTIONS[i][0];
    return 'Other';
  }

  function outcomeGroup(o) {
    var s = String(o || '').toLowerCase();
    if (s.indexOf('not switched') === 0) return 'Not switched';
    if (/announced|pilot|reported/.test(s)) return 'Switched: announced, pilot or unconfirmed';
    if (s.indexOf('switched') === 0) return 'Switched';
    return 'Not stated';
  }

  /** Build stage of a public case in the words of the hotel list, or null when it is something else or not stated. */
  function stageGroup(b) {
    var s = String(b || '').toLowerCase();
    if (s.indexOf('new build') === 0) return 'new_build';
    if (s.indexOf('existing') === 0) return 'existing';
    return null;
  }

  /** Adds the group fields to every public case. */
  function prepare(cases) {
    return cases.map(function (c) {
      return Object.assign({}, c, { kind: 'public', tierGroup: tierGroup(c.tier), solutionGroup: solutionGroup(c.solution), outcomeGroup: outcomeGroup(c.outcome), stageGroup: stageGroup(c.build_stage) });
    });
  }

  /** A Swisspro project as an archive entry (shown only while the confidential file is loaded). */
  function fromProject(p) {
    return {
      kind: 'swisspro', id: p.id, hotel: p.project, city: null, country: p.country || 'Not stated', chain: p.group, brand: null,
      tier: 'not stated', tierGroup: 'Not stated', build_stage: 'not stated', stageGroup: null,
      solution: p.product || 'not stated', solutionGroup: 'Swisspro product', vendor: 'Swisspro',
      outcome: p.status, outcomeGroup: 'Swisspro status: ' + p.status,
      customer: p.customer, value: p.value, install_date: p.install_date, rooms: p.rooms, update: p.update, hotel_ids: p.hotel_ids
    };
  }

  /**
   * The closest public cases for a hotel: same tier first, then same country, then same build stage
   * (4, 2 and 1 points, so a tier match always ranks above the other two together).
   * `ownCaseId` is the case about this very hotel, if there is one: a hotel is never its own similar case.
   * Returns up to `limit` entries with at least one match: [{ case, points, matched: ['tier', 'country', 'build stage'] }].
   */
  function similar(hotel, prepared, limit, ownCaseId) {
    return prepared.filter(function (c) { return c.kind === 'public' && c.id !== ownCaseId; }).map(function (c) {
      var matched = [], points = 0;
      if (c.tierGroup === hotel.tier) { matched.push('tier'); points += 4; }
      if (c.country === hotel.country) { matched.push('country'); points += 2; }
      if (c.stageGroup && c.stageGroup === hotel.build_stage) { matched.push('build stage'); points += 1; }
      return { case: c, points: points, matched: matched };
    }).filter(function (x) { return x.points > 0; })
      .sort(function (a, b) { return b.points - a.points || String(b.case.source_date).localeCompare(String(a.case.source_date)) || a.case.id.localeCompare(b.case.id); })
      .slice(0, limit || 4);
  }

  return { tierGroup: tierGroup, solutionGroup: solutionGroup, outcomeGroup: outcomeGroup, stageGroup: stageGroup, prepare: prepare, fromProject: fromProject, similar: similar };
});
