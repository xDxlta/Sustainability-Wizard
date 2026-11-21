/* Swisspro hotel pipeline tool - pipeline records: state, export and import.
 *
 * Pure functions on a plain state object, so the round trip is testable in Node. The interface keeps the
 * state in the browser (localStorage); nothing is sent anywhere.
 *
 * state = { version: 1, records: { [hotelId]: record }, requests: { [hotelId]: wizardRequest } }
 * record = { status, date, product, quotedValue, decider, reason, note, history: [{ date, status }], prefilled, projectId }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./config.js')); }
  else { root.CRM = root.CRM || {}; root.CRM.store = factory(root.CRM.config); }
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  var FILE_TYPE = 'swisspro-crm-pipeline', VERSION = 1;

  function emptyState() { return { version: VERSION, records: {}, requests: {} }; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function isClosed(status) { return C.closedStatuses.indexOf(status) >= 0; }
  function str(v) { return v == null ? '' : String(v); }

  function emptyRecord() {
    return { status: 'Not contacted', date: '', product: '', quotedValue: null, decider: 'unknown', reason: '', note: '', history: [], prefilled: false, projectId: null };
  }

  /** Record of a hotel, or an empty one (never stored until the user changes something). */
  function get(state, hotelId) { return state.records[hotelId] || emptyRecord(); }

  /** Brings any object into the shape of a record; throws on a status, decider or reason outside the fixed lists. */
  function cleanRecord(r, where) {
    var out = emptyRecord();
    if (!r || typeof r !== 'object') throw new Error('Record ' + where + ' is not an object.');
    if (C.statuses.indexOf(r.status) < 0) throw new Error('Record ' + where + ': unknown status "' + r.status + '".');
    out.status = r.status;
    out.date = /^\d{4}-\d{2}-\d{2}$/.test(str(r.date)) ? r.date : '';
    out.product = str(r.product).trim();
    var q = r.quotedValue === '' || r.quotedValue == null ? null : Number(r.quotedValue);
    out.quotedValue = q != null && isFinite(q) && q >= 0 ? q : null;
    out.decider = r.decider == null || r.decider === '' ? 'unknown' : r.decider;
    if (C.deciders.indexOf(out.decider) < 0) throw new Error('Record ' + where + ': unknown decider "' + r.decider + '".');
    out.reason = isClosed(out.status) ? str(r.reason) : '';
    if (out.reason && C.reasons.indexOf(out.reason) < 0) throw new Error('Record ' + where + ': unknown reason "' + r.reason + '".');
    out.note = str(r.note);
    out.history = Array.isArray(r.history) ? r.history.filter(function (h) { return h && C.statuses.indexOf(h.status) >= 0; }).map(function (h) { return { date: str(h.date), status: h.status }; }) : [];
    out.prefilled = !!r.prefilled;
    out.projectId = r.projectId == null ? null : String(r.projectId);
    return out;
  }

  /**
   * Applies a change to the record of one hotel and returns the stored record. A status change is added
   * to the history. The date of last change is `patch.date` when given, otherwise `day` (today).
   */
  function update(state, hotelId, patch, day) {
    var before = get(state, hotelId), next = Object.assign({}, before, patch);
    next.date = patch.date || day || today();
    next.prefilled = false;
    var rec = cleanRecord(next, hotelId);
    if (rec.status !== before.status || !before.history.length) rec.history = before.history.concat([{ date: rec.date, status: rec.status }]);
    state.records[hotelId] = rec;
    return rec;
  }

  function remove(state, hotelId) { delete state.records[hotelId]; }

  /* ------------------------------------------------------------------ JSON */
  function exportJson(state, day) {
    return JSON.stringify({ type: FILE_TYPE, version: VERSION, exported: day || today(), records: state.records, requests: state.requests }, null, 1);
  }

  /** Reads a file written by exportJson. Throws an Error with a plain message when the file is not one. */
  function importJson(text) {
    var d;
    try { d = JSON.parse(text); } catch (e) { throw new Error('This file is not valid JSON.'); }
    if (!d || d.type !== FILE_TYPE) throw new Error('This is not a pipeline file exported from this tool.');
    if (d.version !== VERSION) throw new Error('This pipeline file has version ' + d.version + '; this tool reads version ' + VERSION + '.');
    var state = emptyState();
    Object.keys(d.records || {}).forEach(function (id) { state.records[id] = cleanRecord(d.records[id], id); });
    Object.keys(d.requests || {}).forEach(function (id) { if (d.requests[id] && typeof d.requests[id] === 'object') state.requests[id] = d.requests[id]; });
    return state;
  }

  /* ------------------------------------------------------------------ CSV */
  /** One CSV cell. Text that a spreadsheet would read as a formula is prefixed with an apostrophe. */
  function cell(v) {
    if (v == null) return '';
    var s = typeof v === 'number' ? String(v) : String(v);
    if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCsv(header, rows) {
    return [header].concat(rows).map(function (r) { return r.map(cell).join(','); }).join('\r\n') + '\r\n';
  }
  function historyText(rec) { return rec.history.map(function (h) { return h.date + ' ' + h.status; }).join(' > '); }

  /** Pipeline records as CSV, one row per hotel that has a record. */
  function pipelineCsv(state, hotelsById) {
    var header = ['hotel_id', 'hotel', 'country', 'city', 'owner_group', 'rooms', 'status', 'date_of_last_change', 'product', 'quoted_value_sgd', 'who_decides', 'reason', 'note', 'status_history', 'prefilled_from_swisspro_file'];
    var rows = Object.keys(state.records).sort().map(function (id) {
      var r = state.records[id], h = hotelsById[id] || {};
      return [id, h.name, h.country, h.city, h.owner_group, h.rooms, r.status, r.date, r.product, r.quotedValue, r.decider, r.reason, r.note, historyText(r), r.prefilled ? 'yes' : 'no'];
    });
    return toCsv(header, rows);
  }

  return {
    FILE_TYPE: FILE_TYPE, VERSION: VERSION, emptyState: emptyState, emptyRecord: emptyRecord, today: today, isClosed: isClosed,
    get: get, update: update, remove: remove, cleanRecord: cleanRecord,
    exportJson: exportJson, importJson: importJson, toCsv: toCsv, cell: cell, pipelineCsv: pipelineCsv, historyText: historyText
  };
});
