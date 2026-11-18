/* Swisspro hotel pipeline tool - model page helpers.
 *
 * ============================================================================================
 * FUTURE WIN PROBABILITY - NOT TRAINED YET
 * winProbability() is the one place where a trained model will be plugged in later. Today no
 * model exists, so it returns "not trained yet" and no number. The interface must never show a
 * percentage from this function until `trained` is true.
 * ============================================================================================
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./store.js'), require('./config.js')); }
  else { root.CRM = root.CRM || {}; root.CRM.winmodel = factory(root.CRM.store, root.CRM.config); }
})(typeof self !== 'undefined' ? self : this, function (S, C) {
  'use strict';

  /** Placeholder for a future trained model. `features` is one row of the training table. */
  function winProbability(features) { // eslint-disable-line no-unused-vars
    return { trained: false, probability: null, label: 'not trained yet' };
  }

  /** How many records are closed as Won and as Lost. */
  function counts(state) {
    var c = { won: 0, lost: 0, open: 0 };
    Object.keys(state.records).forEach(function (id) {
      var s = state.records[id].status;
      if (s === 'Won') c.won++; else if (s === 'Lost') c.lost++; else if (s !== 'Not contacted') c.open++;
    });
    return c;
  }

  var HEADER = ['hotel_id', 'hotel', 'country', 'city', 'market', 'brand', 'tier', 'rooms', 'owner_group', 'owner_hotels_in_data', 'operating_model', 'build_stage', 'opening', 'already_has_solution_public_case',
    'score_total', 'score_payback_fit', 'score_size', 'score_owner_leverage', 'score_segment_fit', 'score_timing', 'score_components_not_sourced',
    'economics_basis', 'occupancy', 'bottles_per_room_night', 'price_per_bottle', 'currency', 'bottles_per_year', 'bottle_spend_per_year', 'cash_payback_years',
    'occupancy_needed_2y', 'occupancy_needed_3y', 'occupancy_needed_5y', 'installation_value_sgd', 'service_value_sgd_per_year',
    'product', 'quoted_value_sgd', 'who_decides', 'status_history', 'date_closed', 'outcome', 'reason'];

  function r(x, d) { if (x == null || !isFinite(x)) return ''; var k = Math.pow(10, d); return Math.round(x * k) / k; }

  /**
   * Training table: one row per record closed as Won or Lost.
   * `view(hotelId)` returns { hotel, econ, score, ownerCount } as shown in the interface.
   * Returns { header, rows }.
   */
  function trainingTable(state, view) {
    var rows = [];
    Object.keys(state.records).sort().forEach(function (id) {
      var rec = state.records[id];
      if (!S.isClosed(rec.status)) return;
      var v = view(id); if (!v || !v.hotel) return;
      var h = v.hotel, e = v.econ, sc = v.score, comp = {};
      sc.components.forEach(function (c) { comp[c.id] = c; });
      var be = function (y) { return e && e.breakEven[y] ? r(e.breakEven[y].occupancy, 4) : ''; };
      rows.push([id, h.name, h.country, h.city, h.market, h.brand, h.tier, h.rooms, h.owner_group || '', h.owner_group ? v.ownerCount : '', h.operating_model, h.build_stage, h.opening || '', C.solved.byHotel[h.id] || '',
        sc.total, comp.payback.points, comp.size.points, comp.owner.points, comp.segment.points, comp.timing.points,
        sc.components.filter(function (c) { return c.notSourced; }).map(function (c) { return c.id; }).join(' '),
        e ? (e.fromHotel ? 'from the hotel' : 'market reference') : '', e ? r(e.occupancy, 4) : '', e ? e.bottlesPerRoomNight : '', e ? r(e.pricePerBottle, 4) : '', e ? e.currency : '',
        e ? r(e.bottlesPerYear, 0) : '', e ? r(e.spendLocal, 0) : '', e && isFinite(e.cashPaybackYears) ? r(e.cashPaybackYears, 2) : (e ? 'no payback' : ''),
        be(2), be(3), be(5), e ? r(e.installationList, 0) : '', e ? r(e.serviceList, 0) : '',
        rec.product, rec.quotedValue == null ? '' : rec.quotedValue, rec.decider, S.historyText(rec), rec.date, rec.status, rec.reason]);
    });
    return { header: HEADER, rows: rows };
  }

  return { winProbability: winProbability, counts: counts, trainingTable: trainingTable, HEADER: HEADER };
});
