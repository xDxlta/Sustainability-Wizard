/* Swisspro hotel pipeline tool - funnel: steps, time between steps, conversion between steps.
 *
 * Pure functions on the pipeline state. Every dated status change in a record's history is one step.
 * Two figures per step, both honest about their basis:
 *  - typical days to the next step: starts as an assumption (config, with its source) and is updated by
 *    every logged step. Model: exponential waiting time, the assumption counted as `priorWeight` observed
 *    steps (Gamma prior on the rate). Hotels still waiting count with the days they have waited so far
 *    (censored), so slow steps are not underestimated.
 *  - conversion share: moved on / (moved on + lost), shown only from `minObserved` hotels. No assumption.
 * Nothing here is a win probability.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./config.js'), require('./store.js')); }
  else { root.CRM = root.CRM || {}; root.CRM.funnel = factory(root.CRM.config, root.CRM.store); }
})(typeof self !== 'undefined' ? self : this, function (C, S) {
  'use strict';

  var LN2 = Math.log(2), DAY = 86400000;
  function cfg() { return C.funnel; }
  function rank(status) { return cfg().stages.indexOf(status); }
  function isStep(status) { var i = rank(status); return i >= 0 && i < cfg().stages.length - 1; } // a step with a next step (not Won)
  function parse(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; }
  function days(a, b) { var x = parse(a), y = parse(b); return x == null || y == null ? null : Math.max(0, Math.round((y - x) / DAY)); }
  function addDays(d, n) { var x = parse(d); if (x == null) return ''; var t = new Date(x + Math.round(n) * DAY); return t.toISOString().slice(0, 10); }

  /**
   * Spells of one record: one per stay in a step. ended_by = the next status, or '' while still in the step.
   * event = 1 when the hotel moved on to a later step, 0 otherwise (lost, on hold, back, or still waiting).
   */
  function spells(rec, day) {
    var h = (rec && rec.history) || [], out = [];
    for (var i = 0; i < h.length; i++) {
      if (!isStep(h[i].status)) continue;
      var next = h[i + 1] || null, end = next ? next.date : day, d = days(h[i].date, end);
      if (d == null) continue;
      var moved = !!next && rank(next.status) > rank(h[i].status);
      out.push({ stage: h[i].status, entered: h[i].date, left: next ? next.date : '', days: d, endedBy: next ? next.status : '', event: moved ? 1 : 0, lost: !!next && next.status === 'Lost' });
    }
    return out;
  }

  /** All spells of all records, with the hotel id. */
  function allSpells(state, day) {
    var out = [];
    Object.keys(state.records).sort().forEach(function (id) { spells(state.records[id], day).forEach(function (s) { s.hotelId = id; out.push(s); }); });
    return out;
  }

  /**
   * Figures per step: entered, moved on, lost, still waiting, conversion (or null), typical days with basis.
   * typicalDays = median of the exponential model = ln2 * (w * m0 + exposure) / (w + events), m0 = assumed median / ln2.
   */
  function stats(state, day) {
    var f = cfg(), sp = allSpells(state, day), out = {};
    f.stages.slice(0, -1).forEach(function (st) {
      var a = f.assumedDays[st], mine = sp.filter(function (s) { return s.stage === st; });
      var events = mine.filter(function (s) { return s.event; }).length, lost = mine.filter(function (s) { return s.lost; }).length;
      var waiting = mine.filter(function (s) { return !s.endedBy; }).length;
      var exposure = mine.reduce(function (t, s) { return t + s.days; }, 0);
      var w = f.priorWeight, m0 = a.days / LN2;
      var typical = LN2 * (w * m0 + exposure) / (w + events);
      var closed = events + lost;
      out[st] = {
        stage: st, entered: mine.length, movedOn: events, lost: lost, waiting: waiting,
        conversion: closed >= f.minObserved ? events / closed : null, closedForConversion: closed,
        typicalDays: typical, assumedDays: a.days, assumptionSource: a.source, observedSteps: events,
        basis: mine.length === 0 ? 'assumption' : events < f.minObserved ? 'assumption, updated with ' + mine.length + ' logged ' + (mine.length === 1 ? 'stay' : 'stays') + ' (' + events + ' moved on)' : 'mostly logged stays (' + mine.length + ', ' + events + ' moved on); the assumption counts as ' + w
      };
    });
    return out;
  }

  /**
   * Outlook for one record: current step, days in it, typical days to the next step, expected date of the
   * next step, and the expected date of Won if the hotel goes through every remaining step (sum of typical days).
   * Returns null when the record is not in a step (Not contacted, Won, Lost, On hold) or has no dated entry.
   */
  function outlook(state, hotelId, day) {
    var rec = S.get(state, hotelId);
    if (!isStep(rec.status)) return null;
    var h = rec.history, last = h.length ? h[h.length - 1] : null;
    var since = last && last.status === rec.status ? last.date : rec.date;
    if (!parse(since)) return null;
    var st = stats(state, day), f = cfg(), cur = st[rec.status];
    var rest = f.stages.slice(rank(rec.status), -1).reduce(function (t, s) { return t + st[s].typicalDays; }, 0);
    var waited = days(since, day);
    return {
      stage: rec.status, since: since, daysInStage: waited,
      typicalDays: cur.typicalDays, basis: cur.basis, assumptionSource: cur.assumptionSource,
      nextExpected: addDays(since, Math.max(cur.typicalDays, waited)),
      overdue: waited > cur.typicalDays,
      wonIfAllSteps: addDays(since, Math.max(rest, waited)),
      allAssumed: f.stages.slice(rank(rec.status), -1).every(function (s) { return st[s].observedSteps === 0; })
    };
  }

  var HEADER = ['hotel_id', 'hotel', 'country', 'tier', 'rooms', 'score_total', 'step', 'date_entered', 'date_left', 'days', 'ended_by', 'moved_on'];

  /** Time-to-event table: one row per stay in a step. Rows still waiting have ended_by empty and moved_on 0 (censored). */
  function stageTable(state, view, day) {
    var rows = allSpells(state, day).map(function (s) {
      var v = view(s.hotelId), h = v && v.hotel ? v.hotel : {};
      return [s.hotelId, h.name || '', h.country || '', h.tier || '', h.rooms == null ? '' : h.rooms, v && v.score ? v.score.total : '', s.stage, s.entered, s.left, s.days, s.endedBy || 'still in this step', s.event];
    });
    return { header: HEADER, rows: rows };
  }

  return { spells: spells, allSpells: allSpells, stats: stats, outlook: outlook, stageTable: stageTable, days: days, addDays: addDays, HEADER: HEADER };
});
