/* Swisspro hotel pipeline tool - link to the Sustainability Wizard.
 *
 * A wizard request can be attached to a hotel in two ways:
 *   1. the file written by the wizard's "Save the request as a file" button (exact figures, and it says
 *      which figures the hotel gave itself), or
 *   2. the request summary text the wizard produces (figures as printed, so the bottle price is rounded).
 * Kept: date, rooms, market, occupancy, bottles per room-night and price per bottle, and from a request file
 * what the hotel confirms about itself (role, operating model, drinking water today, renovation, who approves,
 * timing, segment, hotel name) plus the domain of the email for the seriousness check.
 * Names, full email addresses and phone numbers in a request are never stored by this tool.
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
      currency: f.currency || null,
      lead: cleanLead(d.lead)
    };
  }

  /* ------------------------------------------------------------------ what the hotel confirms about itself */
  var LEAD_VALUES = {
    role: ['gm', 'engineering', 'procurement', 'owner', 'other'],
    operating: ['managed', 'franchised', 'independent'],
    water: ['plastic', 'glass_supplier', 'glass_own', 'filter'],
    renovation: ['lt12', '1to3', 'none'],
    approval: ['gm', 'owner'],
    timing: ['lt3', '3to12', 'gt12'],
    segment: ['economy', 'upscale', 'upper', 'luxury']
  };
  var LEAD_LABELS = {
    role: { gm: 'General manager', engineering: 'Engineering', procurement: 'Purchasing', owner: 'Owner or owner representative', other: 'Other' },
    operating: { managed: 'Managed by the chain', franchised: 'Franchised, run by the owner', independent: 'Independent' },
    water: { plastic: 'Plastic bottles', glass_supplier: 'Glass bottles from a supplier', glass_own: 'Own bottling in glass', filter: 'Filter or dispenser' },
    renovation: { lt12: 'Within 12 months', '1to3': 'In 1 to 3 years', none: 'None planned' },
    approval: { gm: 'Hotel management', owner: 'Owner' },
    timing: { lt3: 'Within 3 months', '3to12': '3 to 12 months', gt12: 'Later' }
  };
  /* Who decides in the pipeline record, from the wizard's "Who approves". */
  var DECIDER = { gm: 'GM', owner: 'owner' };
  var FREE_MAIL = ['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.id', 'ymail.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'me.com', 'aol.com', 'qq.com', '163.com', 'proton.me', 'protonmail.com'];
  var DECIDING_ROLES = ['gm', 'engineering', 'procurement', 'owner'];

  /** Keeps only the known answers and the email domain; a hotel name of at most 120 characters. Nothing else, no names or addresses. */
  function cleanLead(l) {
    if (!l || typeof l !== 'object') return null;
    var out = { hotelName: String(l.hotelName || '').slice(0, 120) };
    Object.keys(LEAD_VALUES).forEach(function (k) { out[k] = LEAD_VALUES[k].indexOf(l[k]) >= 0 ? l[k] : ''; });
    var dom = String(l.emailDomain || '').trim().toLowerCase();
    out.emailDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/.test(dom) ? dom : '';
    return out;
  }

  /**
   * Four checks of a request against the hotel it is attached to. Each: { id, label, ok, detail }.
   * passed = all four ok. A request without the hotel's own answers cannot pass.
   */
  function leadCheck(request, hotel) {
    var l = request && request.lead, checks = [];
    var dom = l ? l.emailDomain : '';
    var free = FREE_MAIL.indexOf(dom) >= 0;
    checks.push({ id: 'email', label: 'Business email', ok: !!dom && !free,
      detail: !dom ? 'No email domain in the request.' : free ? dom + ' is a free mail address.' : dom + (/(^|\.)marriott\.com$/.test(dom) ? ' (Marriott)' : ', check that it belongs to the hotel or its owner') });
    var r = request ? request.rooms : null, dev = r != null && hotel.rooms ? Math.abs(r - hotel.rooms) / hotel.rooms : null;
    checks.push({ id: 'rooms', label: 'Rooms match the public data', ok: dev != null && dev <= 0.10,
      detail: r == null ? 'No room count in the request.' : r + ' rooms against ' + hotel.rooms + ' in the hotel list (' + Math.round(dev * 100) + '% apart, at most 10%).' });
    var bad = [];
    if (request && request.occupancy != null && !(request.occupancy >= 0.2 && request.occupancy <= 1)) bad.push('occupancy ' + Math.round(request.occupancy * 100) + '%');
    if (request && request.bottlesPerRoomNight != null && !(request.bottlesPerRoomNight >= 0.5 && request.bottlesPerRoomNight <= 10)) bad.push(request.bottlesPerRoomNight + ' bottles per room-night');
    if (request && request.pricePerBottle != null && !(request.pricePerBottle > 0)) bad.push('price per bottle ' + request.pricePerBottle);
    var own = request && (request.occupancy != null || request.bottlesPerRoomNight != null || request.pricePerBottle != null);
    checks.push({ id: 'figures', label: 'Plausible own figures', ok: !!own && !bad.length,
      detail: !own ? 'The hotel gave no figures of its own.' : bad.length ? 'Outside the plausible range: ' + bad.join(', ') + '.' : 'Occupancy 20 to 100%, 0.5 to 10 bottles per room-night, price above zero.' });
    var role = l ? l.role : '';
    checks.push({ id: 'role', label: 'Deciding role', ok: DECIDING_ROLES.indexOf(role) >= 0,
      detail: role ? LEAD_LABELS.role[role] : 'Role not given.' });
    return { checks: checks, passed: checks.every(function (c) { return c.ok; }) };
  }

  function words(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 1 && ['the', 'by', 'hotel', 'resort', 'and', 'spa', 'a', 'at'].indexOf(w) < 0; }); }
  /**
   * Hotels from the list that fit the name and country of a request, best first (at most 5).
   * Score = shared words ÷ words of the request name; the same country is required when the request names one.
   */
  function matchHotel(request, hotels) {
    var name = request && request.lead ? request.lead.hotelName : '', q = words(name);
    if (!q.length) return [];
    return hotels.filter(function (h) { return !request.country || request.country === h.country; })
      .map(function (h) { var hw = words(h.name + ' ' + h.city), shared = q.filter(function (w) { return hw.indexOf(w) >= 0; }).length; return { hotel: h, score: shared / q.length }; })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score || Math.abs((request.rooms || 0) - a.hotel.rooms) - Math.abs((request.rooms || 0) - b.hotel.rooms); })
      .slice(0, 5);
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

  return { FILE_TYPE: FILE_TYPE, parse: parse, parseSummary: parseSummary, parseFile: parseFile, check: check, figuresFor: figuresFor,
    cleanLead: cleanLead, leadCheck: leadCheck, matchHotel: matchHotel, LEAD_LABELS: LEAD_LABELS, DECIDER: DECIDER };
});
