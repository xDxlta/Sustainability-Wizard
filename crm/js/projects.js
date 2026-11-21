/* Swisspro hotel pipeline tool - Swisspro's own projects (confidential file picked by the user).
 *
 * The file is never part of the repository (crm/data-private/ is in .gitignore). It is read in the
 * browser only. Projects are matched to hotels through hotel_ids. Swisspro's status word is kept as
 * given and pre-fills the pipeline status by the map in crm/js/config.js; "Closed" pre-fills nothing.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./config.js'), require('./store.js')); }
  else { root.CRM = root.CRM || {}; root.CRM.projects = factory(root.CRM.config, root.CRM.store); }
})(typeof self !== 'undefined' ? self : this, function (C, S) {
  'use strict';

  function text(v) { return v == null ? null : String(v).replace(/\s+/g, ' ').trim() || null; }
  function number(v) { if (v == null || v === '') return null; var n = Number(v); return isFinite(n) ? n : null; }

  /** Reads the projects file. Returns { projects, warnings }. Throws when the file has no "projects" list. */
  function parse(fileText) {
    var d;
    try { d = JSON.parse(fileText); } catch (e) { throw new Error('This file is not valid JSON.'); }
    if (!d || !Array.isArray(d.projects)) throw new Error('This file has no "projects" list. See the README for the expected format.');
    var warnings = [], seen = {};
    var projects = d.projects.map(function (p, i) {
      if (!p || typeof p !== 'object') throw new Error('Project ' + (i + 1) + ' is not an object.');
      var id = text(p.id) || 'row' + (i + 1);
      if (seen[id]) warnings.push('Project id ' + id + ' appears more than once.');
      seen[id] = true;
      var status = text(p.status);
      if (!(status in C.projectStatusMap)) warnings.push('Project ' + id + ': status "' + status + '" is not one of Hot, Warm, Cold, HIT, Closed. It is shown as given and pre-fills nothing.');
      return {
        id: id, status: status, project: text(p.project) || '(no name)', customer: text(p.customer), group: text(p.group),
        product: text(p.product), country: text(p.country), value: number(p.value), install_date: text(p.install_date),
        rooms: number(p.rooms), update: text(p.update),
        hotel_ids: Array.isArray(p.hotel_ids) ? p.hotel_ids.map(String) : []
      };
    });
    return { projects: projects, warnings: warnings };
  }

  /** Matches projects to hotels. Returns { byHotel: { hotelId: [project] }, unmatched: [project], warnings }. */
  function link(projects, hotelsById) {
    var byHotel = {}, unmatched = [], warnings = [];
    projects.forEach(function (p) {
      var found = p.hotel_ids.filter(function (id) { return !!hotelsById[id]; });
      p.hotel_ids.forEach(function (id) { if (!hotelsById[id]) warnings.push('Project ' + p.id + ': hotel id ' + id + ' is not in the hotel list.'); });
      if (!found.length) { unmatched.push(p); return; }
      found.forEach(function (id) { (byHotel[id] = byHotel[id] || []).push(p); });
    });
    return { byHotel: byHotel, unmatched: unmatched, warnings: warnings };
  }

  /** Pipeline status a project pre-fills, or null (Closed, unknown words). */
  function prefillStatus(p) { return C.projectStatusMap[p.status] || null; }

  /**
   * Writes pre-filled records for matched hotels that have no record of their own yet (or only an
   * untouched pre-filled one). A record the user has edited is never overwritten.
   * The quoted value is taken over only when the project covers exactly one hotel.
   * Returns the number of records written.
   */
  function applyPrefill(state, projects, hotelsById, day) {
    var linked = link(projects, hotelsById), n = 0;
    Object.keys(linked.byHotel).forEach(function (hotelId) {
      var existing = state.records[hotelId];
      if (existing && !existing.prefilled) return;
      var p = linked.byHotel[hotelId].filter(prefillStatus)[0];
      if (!p) { if (existing) delete state.records[hotelId]; return; }
      var status = prefillStatus(p), single = p.hotel_ids.filter(function (id) { return !!hotelsById[id]; }).length === 1;
      var rec = S.emptyRecord();
      rec.status = status; rec.date = day; rec.product = p.product || '';
      rec.quotedValue = single && p.value != null ? p.value : null;
      rec.history = [{ date: day, status: status }];
      rec.prefilled = true; rec.projectId = p.id;
      state.records[hotelId] = rec; n++;
    });
    return n;
  }

  /** Removes the pre-filled records the user never edited (used when the projects are removed from the browser). */
  function removePrefill(state) {
    var n = 0;
    Object.keys(state.records).forEach(function (id) { if (state.records[id].prefilled) { delete state.records[id]; n++; } });
    return n;
  }

  return { parse: parse, link: link, prefillStatus: prefillStatus, applyPrefill: applyPrefill, removePrefill: removePrefill };
});
