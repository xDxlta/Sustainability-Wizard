/* Swisspro hotel pipeline tool - link to the Sustainability Wizard.
 *
 * A wizard request can be attached to a hotel in two ways:
 *   1. the file written by the wizard's "Save the request as a file" button (exact figures, and it says
 *      which figures the hotel gave itself), or
 *   2. the request summary text the wizard produces (figures as printed, so the bottle price is rounded).
 * Only the figures are kept: date, rooms, market, occupancy, bottles per room-night and price per bottle.
 * Names, emails and phone numbers in a request are never stored by this tool.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.CRM = root.CRM || {}; root.CRM.wizardlink = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FILE_TYPE = 'swisspro-wizard-request';
  var COUNTRY = { Malaysia: 'Malaysia', Indonesia: 'Indonesia', 'the Philippines': 'Philippines', Philippines: 'Philippines', Singapore: 'Singapore' };
  var CODE = { MY: 'Malaysia', ID: 'Indonesia', PH: 'Philippines', SG: 'Singapore' };
  function n(s) { var v = Number(String(s).replace(/,/g, '')); return isFinite(v) ? v : null; }

  /**
   * Reads the wizard's request summary text. `defaultBottles` is the wizard's assumed bottles per
   * room-night: the text does not say whether the hotel chose that figure, so it counts as the hotel's
   * own only when it differs. Returns the request, or throws with a plain message.
   */
  function parseSummary(text, defaultBottles) {
    var t = String(text || '');
    var m = /([\d,]+) rooms in (.+?), ([\d.]+)% occupancy( \((?:closest match|national average)[^\n]*\))?\.\s*$/m.exec(t);
    if (!m) throw new Error('This does not look like a request summary from the wizard: the line "… rooms in …, …% occupancy." is missing.');
    var date = /Sustainability Wizard, (\d{4}-\d{2}-\d{2})/.exec(t);
    var today = /Today: [^\n]*/.exec(t), b = null, price = null, currency = null, refPrice = false;
    if (today) {
      var bm = /, ([\d.]+) x [\d.]+ (?:ml|L) per room and night/.exec(today[0]);
      if (bm) b = n(bm[1]);
      var pm = /at (\S+) ([\d,]+(?:\.\d+)?) per bottle( \(reference price\))?/.exec(today[0]);
      if (pm) { currency = pm[1]; price = n(pm[2]); refPrice = !!pm[3]; }
    }
    return {
      via: 'summary text', date: date ? date[1] : null,
      country: COUNTRY[m[2]] || m[2], rooms: n(m[1]),
      occupancy: m[4] ? null : n(m[3]) / 100,
      bottlesPerRoomNight: b != null && b !== defaultBottles ? b : null,
      pricePerBottle: price != null && !refPrice ? price : null,
      currency: currency
    };
  }

  /** Reads the file written by the wizard's "Save the request as a file" button. */
  function parseFile(fileText) {
    var d;
    try { d = JSON.parse(fileText); } catch (e) { throw new Error('This file is not valid JSON.'); }
    if (!d || d.type !== FILE_TYPE || !d.figures) throw new Error('This is not a request file saved from the wizard.');
    var f = d.figures;
    function own(x) { return x && x.fromHotel && isFinite(Number(x.value)) ? Number(x.value) : null; }
    return {
      via: 'request file', date: /^\d{4}-\d{2}-\d{2}/.test(String(d.date)) ? String(d.date).slice(0, 10) : null,
      country: CODE[f.country] || f.country || null, rooms: n(f.rooms),
      occupancy: own(f.occupancy), bottlesPerRoomNight: own(f.bottlesPerRoomNight), pricePerBottle: own(f.pricePerBottle),
      currency: f.currency || null
    };
  }

  /** Accepts either form. */
  function parse(text, defaultBottles) {
    var s = String(text || '').trim();
    if (!s) throw new Error('Paste the request summary or choose a request file first.');
    return s.charAt(0) === '{' ? parseFile(s) : parseSummary(s, defaultBottles);
  }

  /** Plain warnings when the request does not fit the hotel it is attached to. */
  function check(request, hotel) {
    var w = [];
    if (request.country && request.country !== hotel.country) w.push('The request is for ' + request.country + ', this hotel is in ' + hotel.country + '. The price per bottle was not taken over.');
    if (request.rooms != null && request.rooms !== hotel.rooms) w.push('The request says ' + request.rooms + ' rooms, the hotel list says ' + hotel.rooms + '. The hotel list is used.');
    if (request.occupancy == null && request.bottlesPerRoomNight == null && request.pricePerBottle == null) w.push('The hotel gave no occupancy, bottle count or price of its own in this request, so the market reference values stay.');
    return w;
  }

  /** The hotel's own figures in the form crm/js/economics.js expects, or null when the request carries none. */
  function figuresFor(request, hotel) {
    if (!request) return null;
    var sameCountry = !request.country || request.country === hotel.country;
    var f = { occupancy: request.occupancy, bottlesPerRoomNight: request.bottlesPerRoomNight, pricePerBottle: sameCountry ? request.pricePerBottle : null };
    return f.occupancy == null && f.bottlesPerRoomNight == null && f.pricePerBottle == null ? null : f;
  }

  return { FILE_TYPE: FILE_TYPE, parse: parse, parseSummary: parseSummary, parseFile: parseFile, check: check, figuresFor: figuresFor };
});
