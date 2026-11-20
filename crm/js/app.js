/* Swisspro hotel pipeline tool - interface.
 * Static, no server, no external request. Routes: #/hotels, #/hotel/<id>, #/cases, #/model, #/data.
 * All figures come from crm/data (public files), the wizard's factors and engine, or the user's own records. */
(function () {
  'use strict';
  var SW = window.SW, CRM = window.CRM, D = window.CRM_DATA;
  var F = SW.factors, PL = SW.pricelist, fmt = SW.format;
  var deps = { F: F, PL: PL, M: SW.model, E: SW.engine, R: SW.recommend, B: SW.business };
  var C = CRM.config, S = CRM.store, P = CRM.projects, CA = CRM.cases, WL = CRM.wizardlink, WM = CRM.winmodel, FU = CRM.funnel, EC = CRM.economics, SC = CRM.score;

  var hotels = D.hotels.hotels, markets = D.hotels.markets, hotelNote = D.hotels.note, hotelsById = {};
  hotels.forEach(function (h) { hotelsById[h.id] = h; });
  var publicCases = CA.prepare(D.cases.cases);
  var ownerCount = {};
  hotels.forEach(function (h) { if (h.owner_group) ownerCount[h.owner_group] = (ownerCount[h.owner_group] || 0) + 1; });
  /** Hotels of the same owner group in the data. A private owner is not a group: 1. Owner not sourced: null. */
  function groupCount(h) { return !h.owner_group ? null : (h.owner_group === C.privateOwner ? 1 : ownerCount[h.owner_group]); }
  function isGroup(h) { return !!h.owner_group && h.owner_group !== C.privateOwner; }
  var caseById = {};
  publicCases.forEach(function (c) { caseById[c.id] = c; });
  /** The public case about this very hotel, or null. */
  function ownCase(h) { return caseById[C.solved.byHotel[h.id]] || null; }
  var LIST = PL.pricelist.currency.value; // list currency of the wizard's price list (SGD)

  var app = document.getElementById('app');
  var state = loadState(), projectFile = loadProjects(), linked = linkProjects();
  var ui = { q: '', country: '', tier: '', model: '', stage: '', owner: '', status: '', solved: '', sort: 'score', dir: 'desc', listScroll: 0,
    cases: { country: '', tier: '', solution: '', outcome: '', kind: '' } };
  var views = null, econCache = {};

  /* ------------------------------------------------------------------ storage (this browser only) */
  function loadState() {
    try { var t = localStorage.getItem(C.storageKey); if (t) return S.importJson(t); } catch (e) { /* unreadable: start empty */ }
    return S.emptyState();
  }
  function save() { views = null; try { localStorage.setItem(C.storageKey, S.exportJson(state)); } catch (e) { /* private mode: records live until the tab closes */ } }
  function loadProjects() {
    try { var t = localStorage.getItem(C.projectsKey); if (t) { var d = JSON.parse(t); if (d && Array.isArray(d.projects)) return d; } } catch (e) { /* ignore */ }
    return null;
  }
  function saveProjects() { try { if (projectFile) localStorage.setItem(C.projectsKey, JSON.stringify(projectFile)); else localStorage.removeItem(C.projectsKey); } catch (e) { /* ignore */ } }
  function linkProjects() { return projectFile ? P.link(projectFile.projects, hotelsById) : { byHotel: {}, unmatched: [], warnings: [] }; }

  /* ------------------------------------------------------------------ small helpers */
  function el(tag, attrs) {
    var n = document.createElement(tag), a = attrs || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v == null || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(n, arguments[i]);
    return n;
  }
  function add(n, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(n, x); }); return; }
    n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  function svg(tag, attrs) { var n = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); }); return n; }
  /** The wizard's layered wave edge (same three paths). Used on the page header only. */
  function wave() {
    var s = svg('svg', { class: 'wave', viewBox: '0 0 1440 90', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' });
    s.appendChild(svg('path', { class: 'w1', d: 'M0 38 C 220 8, 470 66, 720 38 S 1210 6, 1440 36 V90 H0 Z' }));
    s.appendChild(svg('path', { class: 'w2', d: 'M0 56 C 300 82, 610 30, 900 54 S 1290 78, 1440 50 V90 H0 Z' }));
    s.appendChild(svg('path', { class: 'w3', d: 'M0 72 C 360 52, 720 92, 1080 68 S 1330 60, 1440 74 V90 H0 Z' }));
    return s;
  }
  function pageHead(title, sub, right, back) {
    return el('section', { class: 'crm-head' },
      el('div', { class: 'wrap crm-head-inner' },
        el('div', {}, back ? el('a', { class: 'back', href: back.href, text: '← ' + back.text }) : null, el('h1', { text: title }), sub ? el('p', {}, sub) : null),
        right || null),
      wave());
  }
  function ns(text) { return el('span', { class: 'ns', text: text || 'not sourced' }); }
  function sgd(v) { return fmt.cur(LIST, v, 0); }
  function local(e, v, short) { return (short ? fmt.curShort : fmt.cur)(e.symbol, v, 0); }
  function unit(e, v) { return fmt.cur(e.symbol, v, e.decimals === 0 ? 0 : 2); }
  function occNeeded(b) { return !b ? '-' : (b.reached ? fmt.pct(Math.ceil(b.occupancy * 1000) / 1000) : 'not reached'); }
  function label(kind, v) { return (C.labels[kind] && C.labels[kind][v]) || v; }
  function download(name, text, mime) {
    var a = el('a', { href: URL.createObjectURL(new Blob([text], { type: mime })), download: name });
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function readFile(input, done) {
    var f = input.files && input.files[0]; if (!f) return;
    var r = new FileReader(); r.onload = function () { done(String(r.result), f.name); input.value = ''; }; r.readAsText(f);
  }
  function fileButton(text, accept, done, cls) {
    return el('label', { class: 'btn ' + (cls || 'btn-line') + ' file-btn' }, text, el('input', { type: 'file', accept: accept, 'aria-label': text, onchange: function (e) { readFile(e.target, done); } }));
  }
  function select(id, options, value, onchange, lbl) {
    var s = el('select', { class: 'input', id: id, 'aria-label': lbl || null, onchange: function (e) { onchange(e.target.value); } });
    options.forEach(function (o) { var opt = el('option', { value: o[0], text: o[1] }); if (o[0] === value) opt.selected = true; s.appendChild(opt); });
    return s;
  }
  function field(lbl, control, cls) { return el('div', { class: cls || null }, el('label', { for: control.id, text: lbl }), control); }
  function statusEl(hotelId) {
    var rec = S.get(state, hotelId), ps = linked.byHotel[hotelId];
    var s = el('span', { class: 'status', 'data-s': rec.status, text: rec.status });
    return ps ? [s, el('span', { class: 'sub orig', text: 'Swisspro: ' + ps.map(function (p) { return p.status; }).join(', ') })] : s;
  }
  function scoreEl(sc) { return el('span', { class: 'score', title: C.score.label }, el('b', { text: String(sc.total) }), el('span', { class: 'bar' }, el('i', { style: 'width:' + sc.total + '%' }))); }

  /* ------------------------------------------------------------------ derived figures per hotel */
  function econOf(h) {
    var figs = WL.figuresFor(state.requests[h.id], h), key = h.id + '|' + JSON.stringify(figs);
    if (!(key in econCache)) econCache[key] = EC.calculate(deps, h, markets[h.market], figs);
    return econCache[key];
  }
  function buildViews() {
    var active = {};
    hotels.forEach(function (h) { if (isGroup(h) && C.score.owner.projectStatuses.indexOf(S.get(state, h.id).status) >= 0) (active[h.owner_group] = active[h.owner_group] || []).push(h.id); });
    views = {};
    hotels.forEach(function (h) {
      var econ = econOf(h), rec = S.get(state, h.id);
      var has = !!(isGroup(h) && (active[h.owner_group] || []).some(function (id) { return id !== h.id; }));
      var sc = SC.score(C.score, h, { econ: econ, ownerCount: groupCount(h), ownerHasProject: has, privateOwner: h.owner_group === C.privateOwner });
      views[h.id] = { hotel: h, econ: econ, score: sc, ownerCount: groupCount(h), record: rec,
        value: rec.quotedValue != null ? { amount: rec.quotedValue, quoted: true } : { amount: econ ? econ.installationList : null, quoted: false } };
    });
    return views;
  }
  function view(id) { return (views || buildViews())[id]; }

  /* ------------------------------------------------------------------ confidential data banner */
  function renderPrivateBar() {
    var bar = document.getElementById('private-bar'); bar.textContent = '';
    if (!projectFile) return;
    var matched = Object.keys(linked.byHotel).length;
    bar.appendChild(el('div', { class: 'private-bar' }, el('div', { class: 'wrap' },
      el('span', { text: 'Swisspro projects loaded (confidential): ' + projectFile.projects.length + ' projects, matched to ' + matched + ' hotels. They stay in this browser and are not part of the public data.' }),
      el('button', { type: 'button', class: 'link-btn', onclick: removeProjects }, 'Remove from this browser'))));
  }
  function removeProjects() {
    if (!window.confirm('Remove Swisspro\'s projects from this browser? Records you edited yourself stay; pre-filled records you never touched are removed.')) return;
    P.removePrefill(state); projectFile = null; linked = linkProjects(); saveProjects(); save(); route();
  }
  function loadProjectText(text, name, status) {
    try {
      var parsed = P.parse(text);
      projectFile = { fileName: name, loadedOn: S.today(), projects: parsed.projects, warnings: parsed.warnings };
      linked = linkProjects();
      var n = P.applyPrefill(state, projectFile.projects, hotelsById, S.today());
      saveProjects(); save(); route();
      var st = document.getElementById('project-status'); if (st) st.textContent = 'Loaded ' + parsed.projects.length + ' projects; ' + n + ' pipeline records pre-filled.';
    } catch (e) { if (status) { status.textContent = e.message; status.className = 'error'; } }
  }

  /** The label for a hotel that already replaced single-use bottles according to the public case archive, with a link to the case. */
  function solvedLabel(h) {
    var c = ownCase(h);
    return c ? el('a', { class: 'solved', href: '#/cases/' + c.id, title: 'Open the public case ' + c.id + ' in the case archive', text: C.solved.label }) : null;
  }
  function solvedPanel(h) {
    var c = ownCase(h); if (!c) return null;
    return el('section', { class: 'panel solved-panel', id: 'solved' },
      el('div', {}, el('span', { class: 'solved', text: C.solved.label })),
      el('p', {}, c.solutionGroup === 'Other' ? null : el('strong', { text: c.solutionGroup + ': ' }), fmt.cap(c.solution) + '. Outcome: ' + c.outcome + '.' + (c.vendor && c.vendor !== 'not stated' ? ' Vendor: ' + c.vendor + '.' : '') + ' ',
        el('a', { href: '#/cases/' + c.id, text: 'Open the case in the archive' }), ' · ', el('a', { href: c.source_url, target: '_blank', rel: 'noopener noreferrer', text: 'Source' }), c.source_date ? ' (' + c.source_date + ')' : null),
      el('p', { class: 'small muted', text: 'This does not change the priority score: the score has no rule for an existing solution. Check what the hotel uses today before you approach it.' }));
  }

  /* ================================================================== hotel list */
  function matches(h) {
    var v = view(h.id);
    if (ui.q) { var q = ui.q.toLowerCase(); if ((h.name + ' ' + h.city + ' ' + h.brand + ' ' + (h.owner_group || '')).toLowerCase().indexOf(q) < 0) return false; }
    if (ui.country && h.country !== ui.country) return false;
    if (ui.tier && h.tier !== ui.tier) return false;
    if (ui.model && h.operating_model !== ui.model) return false;
    if (ui.stage && h.build_stage !== ui.stage) return false;
    if (ui.owner === '__none' ? !!h.owner_group : (ui.owner && h.owner_group !== ui.owner)) return false;
    if (ui.status && v.record.status !== ui.status) return false;
    if (ui.solved && (ui.solved === 'yes') !== !!ownCase(h)) return false;
    return true;
  }
  function sortValue(h) { var v = view(h.id); return ui.sort === 'rooms' ? h.rooms : ui.sort === 'value' ? (v.value.amount == null ? -1 : v.value.amount) : v.score.sum; }

  function renderHotels() {
    var distinct = function (k) { var m = {}; hotels.forEach(function (h) { m[h[k]] = 1; }); return Object.keys(m).sort(); };
    var owners = Object.keys(ownerCount).sort(function (a, b) { return ownerCount[b] - ownerCount[a] || a.localeCompare(b); });
    var tbody = el('tbody'), count = el('span');
    var heads = {};
    function refresh() {
      var rows = hotels.filter(matches).sort(function (a, b) { var d = sortValue(a) - sortValue(b); return (ui.dir === 'asc' ? d : -d) || a.name.localeCompare(b.name); });
      tbody.textContent = '';
      rows.forEach(function (h) {
        var v = view(h.id);
        tbody.appendChild(el('tr', {},
          el('td', {}, scoreEl(v.score)),
          el('td', {}, el('a', { class: 'hname', href: '#/hotel/' + h.id, text: h.name }), el('span', { class: 'sub', text: h.city + ' · ' + h.brand }), solvedLabel(h)),
          el('td', { text: h.country }),
          el('td', { text: h.tier }),
          el('td', {}, h.operating_model === 'not_sourced' ? ns() : label('operating_model', h.operating_model)),
          el('td', {}, label('build_stage', h.build_stage), h.opening ? el('span', { class: 'sub', text: 'opens ' + h.opening }) : null),
          el('td', { class: 'num', text: fmt.int(h.rooms) }),
          el('td', {}, h.owner_group ? [h.owner_group, groupCount(h) > 1 ? el('span', { class: 'sub', text: groupCount(h) + ' hotels in the data' }) : null] : ns()),
          el('td', {}, statusEl(h.id)),
          el('td', { class: 'num' }, v.value.amount == null ? ns() : sgd(v.value.amount), el('span', { class: 'sub', text: v.value.quoted ? 'quoted' : 'installation' }))));
      });
      if (!rows.length) tbody.appendChild(el('tr', {}, el('td', { colspan: '10', class: 'empty', text: 'No hotel matches these filters.' })));
      count.textContent = rows.length + ' of ' + hotels.length + ' hotels';
      Object.keys(heads).forEach(function (k) { if (ui.sort === k) heads[k].setAttribute('aria-sort', ui.dir === 'asc' ? 'ascending' : 'descending'); else heads[k].removeAttribute('aria-sort'); });
      var ss = document.getElementById('f-sort'); if (ss) ss.value = ui.sort + ':' + ui.dir;
    }
    function set(k) { return function (v) { ui[k] = v; refresh(); }; }
    function sortHead(key, text, cls) {
      var th = el('th', { class: cls || null }, el('button', { type: 'button', onclick: function () { if (ui.sort === key) ui.dir = ui.dir === 'desc' ? 'asc' : 'desc'; else { ui.sort = key; ui.dir = 'desc'; } refresh(); } }, text));
      heads[key] = th; return th;
    }
    var search = el('input', { class: 'input', id: 'f-q', type: 'search', placeholder: 'Hotel, city, brand or owner', value: ui.q, oninput: function (e) { ui.q = e.target.value.trim(); refresh(); } });
    var filters = el('section', { class: 'panel' },
      el('div', { class: 'filters' },
        field('Search by name', search, 'f-search'),
        field('Country', select('f-country', [['', 'All']].concat(distinct('country').map(function (x) { return [x, x]; })), ui.country, set('country'))),
        field('Tier', select('f-tier', [['', 'All']].concat(distinct('tier').map(function (x) { return [x, x]; })), ui.tier, set('tier'))),
        field('Operating model', select('f-model', [['', 'All'], ['managed', 'Managed'], ['owner_operated', 'Owner-operated'], ['not_sourced', 'Not sourced']], ui.model, set('model'))),
        field('Build stage', select('f-stage', [['', 'All'], ['existing', 'Existing'], ['new_build', 'New build']], ui.stage, set('stage'))),
        field('Owner group', select('f-owner', [['', 'All']].concat(owners.map(function (o) { return [o, o + ' (' + ownerCount[o] + ')']; })).concat([['__none', 'Not sourced']]), ui.owner, set('owner'))),
        field('Pipeline status', select('f-status', [['', 'All']].concat(C.statuses.map(function (x) { return [x, x]; })), ui.status, set('status'))),
        field('Existing solution', select('f-solved', [['', 'All'], ['yes', C.solved.label], ['no', 'No public case']], ui.solved, set('solved')))),
      el('div', { class: 'list-bar' },
        el('div', {}, count, ' · ', el('button', { type: 'button', class: 'link-btn', onclick: function () { ui.q = ui.country = ui.tier = ui.model = ui.stage = ui.owner = ui.status = ui.solved = ''; route(); } }, 'Clear filters')),
        el('div', { class: 'sort' }, el('label', { for: 'f-sort', text: 'Sort by' }),
          select('f-sort', [['score:desc', 'Priority score, highest first'], ['score:asc', 'Priority score, lowest first'], ['rooms:desc', 'Rooms, most first'], ['rooms:asc', 'Rooms, fewest first'], ['value:desc', 'Value, highest first'], ['value:asc', 'Value, lowest first']], ui.sort + ':' + ui.dir, function (v) { var p = v.split(':'); ui.sort = p[0]; ui.dir = p[1]; refresh(); }))));
    var table = el('table', { class: 'grid hotels' },
      el('thead', {}, el('tr', {},
        sortHead('score', C.score.label), el('th', { text: 'Hotel' }), el('th', { text: 'Country' }), el('th', { text: 'Tier' }), el('th', { text: 'Operating model' }), el('th', { text: 'Build stage' }),
        sortHead('rooms', 'Rooms', 'num'), el('th', { text: 'Owner group' }), el('th', { text: 'Pipeline status' }), sortHead('value', 'Value (' + LIST + ')', 'num'))),
      tbody);
    app.appendChild(pageHead('Hotel pipeline',
      hotels.length + ' Marriott hotels in Malaysia, Indonesia and the Philippines. Public data, ' + C.dataDate + '. The priority score is built from visible rules; it is not a probability.'));
    app.appendChild(el('div', { class: 'wrap page' }, filters,
      el('section', { class: 'panel flush' }, el('div', { class: 'table-wrap' }, table)),
      el('p', { class: 'small muted', text: 'Value: the quoted value from the pipeline record where one is entered, otherwise the installation value (rooms × ' + sgd(PL.byId(PL.pricelist.items, 'ir_smart_plus').price) + ', the wizard’s price for the basic in-room tap including installation).' })));
    refresh();
  }

  /* ================================================================== hotel page */
  function factsPanel(h) {
    var m = markets[h.market];
    function row(k, v) { return [el('dt', { text: k }), el('dd', {}, v == null || v === '' ? ns() : v)]; }
    return el('section', { class: 'panel', id: 'facts' }, el('h2', { text: 'Facts' }),
      el('div', { class: 'two' },
        el('dl', { class: 'kv' }, row('Country', h.country), row('City', h.city), row('Brand', h.brand), row('Tier', h.tier), row('Rooms', fmt.int(h.rooms))),
        el('dl', { class: 'kv' }, row('Owner group', h.owner_group), row('Operating model', h.operating_model === 'not_sourced' ? null : label('operating_model', h.operating_model)),
          row('Build stage', label('build_stage', h.build_stage) + ' (' + label('hotel_status', h.status).toLowerCase() + ')'), row('Opening date', h.opening),
          row('Market reference', m ? fmt.pct(m.occupancy_pct / 100) + ' occupancy' : null))),
      el('p', { class: 'small muted source-line', text: 'Source of the facts: ' + hotelNote.replace(/ operating_model not_sourced.*$/, '') + ' The file names its sources for the whole list, not per field. “Not sourced” means the project team found no public source.' }),
      m ? el('p', { class: 'small muted', text: 'Source of the market occupancy: ' + m.source + '.' }) : null);
  }

  function economicsPanel(h, e) {
    var sec = el('section', { class: 'panel', id: 'economics' }, el('h2', { text: 'Economics' }));
    if (!e) { sec.appendChild(el('p', {}, ns('Not calculated: room count or market reference missing.'))); return sec; }
    function tile(k, v, n, own) { return el('div', { class: 'tile' }, el('div', { class: 'k' }, k, own ? el('span', { class: 'from-hotel', text: 'from the hotel' }) : null), el('div', { class: 'v', text: v }), n ? el('div', { class: 'n', text: n }) : null); }
    var be = e.breakEven, src = e.source;
    sec.appendChild(el('p', { class: 'small muted', text: 'Calculated with the Sustainability Wizard’s engine and factors. Cash payback without staff time.' + (e.fromHotel ? ' A wizard request is attached: figures marked “from the hotel” replace the market reference values.' : ' Market reference values; attach a wizard request to use the hotel’s own figures.') }));
    sec.appendChild(el('div', { class: 'tiles' },
      tile('Bottles a year', fmt.int(e.bottlesPerYear), fmt.int(h.rooms) + ' rooms × ' + fmt.pct(e.occupancy) + ' × 365 × ' + e.bottlesPerRoomNight, e.fromHotel),
      tile('Bottle spend a year', local(e, e.spendLocal, true), 'about ' + sgd(e.spendList) + ' at ' + unit(e, e.pricePerBottle) + ' per bottle', e.fromHotel),
      tile('Cash payback', fmt.cap(fmt.years(e.cashPaybackYears)), 'at ' + fmt.pct(e.occupancy) + ' occupancy, ' + (src.occupancy.fromHotel ? 'from the hotel' : 'market reference'), e.fromHotel),
      tile('Occupancy needed for payback', occNeeded(be[2]) + ' · ' + occNeeded(be[3]) + ' · ' + occNeeded(be[5]), 'within 2, 3 and 5 years', src.pricePerBottle.fromHotel || src.bottlesPerRoomNight.fromHotel),
      tile('Installation value', sgd(e.installationList), fmt.int(h.rooms) + ' rooms × ' + sgd(e.unitPriceList)),
      tile('Service value a year', sgd(e.serviceList), fmt.int(h.rooms) + ' rooms × ' + sgd(e.servicePerRoomList))));
    function li(text, s) { return el('li', {}, text + ' ', el('span', { class: 'muted', text: '(' + s.label + ')' })); }
    sec.appendChild(el('ul', { class: 'plain small inputs' },
      li('Occupancy ' + fmt.pct(e.occupancy), src.occupancy),
      li(e.bottlesPerRoomNight + ' bottles per occupied room-night', src.bottlesPerRoomNight),
      li(unit(e, e.pricePerBottle) + ' per bottle', src.pricePerBottle),
      el('li', {}, sgd(e.unitPriceList) + ' per room installed and ' + sgd(e.servicePerRoomList) + ' service per room and year ', el('span', { class: 'muted', text: '(wizard price list)' })),
      el('li', {}, '1 ' + LIST + ' = ' + unit(e, e.localPerList) + ' ', el('span', { class: 'muted', text: '(wizard reference rates, 26 to 28 Oct 2026)' })),
      el('li', {}, el('a', { href: '../sources.html', text: 'Sources and assumptions of the wizard' }))));
    return sec;
  }

  function pitchPanel(h) {
    var p = C.pitchFor(h);
    return el('section', { class: 'panel', id: 'pitch' }, el('h2', { text: 'How to pitch' }),
      el('div', { class: 'pitch' }, el('div', { class: 'seg', text: p.segment }), el('div', { class: 'txt', text: p.text })),
      p.otherTier ? el('p', { class: 'small muted source-line', text: 'This hotel is in the tier ' + h.tier + '. The pitch texts cover Premium and Select; the text for the same operating model is shown.' }) : null);
  }

  function scorePanel(sc, solvedNote) {
    var grid = el('div', { class: 'breakdown' });
    sc.components.forEach(function (c) {
      grid.appendChild(el('div', {}, c.label, c.notSourced ? el('span', { class: 'sub ns', text: 'not sourced, neutral' }) : null));
      grid.appendChild(el('span', { class: 'bar wide' + (c.notSourced ? ' neutral' : '') }, el('i', { style: 'width:' + (c.points / c.max * 100) + '%' })));
      grid.appendChild(el('div', { class: 'pts', text: c.points + ' / ' + c.max }));
      grid.appendChild(el('div', { class: 'why', text: c.detail }));
    });
    grid.appendChild(el('div', { class: 'total', text: 'Total ' + sc.total + ' of 100 (sum ' + (Math.round(sc.sum * 10) / 10) + ', rounded)' }));
    return el('section', { class: 'panel', id: 'score' }, el('h2', { text: C.score.label }),
      el('p', { class: 'small muted' }, 'A ranking aid built from five rules with fixed weights (a proposal of the project team). It is not a probability. ', el('a', { href: '#/data', text: 'See the rules' }), '.', solvedNote || null),
      grid);
  }

  function ownerPanel(h) {
    var sec = el('section', { class: 'panel', id: 'owner' }, el('h2', { text: 'Same owner' }));
    if (!h.owner_group) { sec.appendChild(el('p', {}, ns('Owner group not sourced.'))); return sec; }
    if (!isGroup(h)) { sec.appendChild(el('p', { class: 'muted', text: 'Private owner. The name is not kept, so other hotels of the same owner cannot be linked.' })); return sec; }
    var others = hotels.filter(function (x) { return x.owner_group === h.owner_group && x.id !== h.id; }).sort(function (a, b) { return view(b.id).score.sum - view(a.id).score.sum; });
    if (!others.length) { sec.appendChild(el('p', { class: 'muted', text: 'No other hotel of ' + h.owner_group + ' in the data.' })); return sec; }
    sec.appendChild(el('p', { class: 'small muted', text: h.owner_group + ': ' + others.length + (others.length === 1 ? ' other hotel' : ' other hotels') + ' in the data.' }));
    var tb = el('tbody');
    others.forEach(function (x) {
      tb.appendChild(el('tr', {}, el('td', {}, el('a', { class: 'hname', href: '#/hotel/' + x.id, text: x.name }), el('span', { class: 'sub', text: x.city + ', ' + x.country })),
        el('td', { class: 'num', text: fmt.int(x.rooms) }), el('td', {}, scoreEl(view(x.id).score)), el('td', {}, statusEl(x.id))));
    });
    sec.appendChild(el('div', { class: 'table-wrap' }, el('table', { class: 'grid' }, el('thead', {}, el('tr', {}, el('th', { text: 'Hotel' }), el('th', { class: 'num', text: 'Rooms' }), el('th', { text: 'Score' }), el('th', { text: 'Pipeline status' }))), tb)));
    return sec;
  }

  function caseBlock(c, matched) {
    return el('div', { class: 'case' },
      el('div', { class: 't', text: c.hotel }),
      el('div', { class: 'm', text: [c.city, c.country, c.tierGroup === 'Not verified' ? 'tier not verified' : c.tierGroup, c.year && c.year !== 'not stated' ? c.year : null].filter(Boolean).join(' · ') }),
      el('div', {}, el('strong', { text: c.solutionGroup + ': ' }), c.solution + '. Outcome: ' + c.outcome + '.' + (c.results && c.results !== 'not stated' ? ' Result: ' + c.results + '.' : '')),
      el('div', { class: 'small muted' }, matched ? 'Same ' + matched.join(', ') + '. ' : null, el('a', { href: c.source_url, target: '_blank', rel: 'noopener noreferrer', text: 'Source' }), c.source_date ? ' (' + c.source_date + ')' : null));
  }
  function similarPanel(h) {
    var own = ownCase(h), sim = CA.similar(h, publicCases, 4, own ? own.id : null);
    var sec = el('section', { class: 'panel', id: 'similar' }, el('h2', { text: 'Similar cases' }),
      el('p', { class: 'small muted' }, 'The closest of the ' + publicCases.length + ' public cases: same tier first, then same country, then same build stage. ', el('a', { href: '#/cases', text: 'Open the case archive' }), '.', own ? ' The case about this hotel itself is shown at the top of the page, not here.' : null));
    if (!sim.length) sec.appendChild(el('p', { class: 'muted', text: 'No public case shares the tier, country or build stage of this hotel.' }));
    sim.forEach(function (s) { sec.appendChild(caseBlock(s.case, s.matched)); });
    return sec;
  }

  function projectBox(p) {
    function line(k, v) { return v == null || v === '' ? null : el('div', {}, el('span', { class: 'muted', text: k + ': ' }), String(v)); }
    var pre = P.prefillStatus(p);
    return el('div', { class: 'project-box' },
      el('div', { class: 'conf', text: 'SWISSPRO PROJECT · CONFIDENTIAL · FROM YOUR FILE' }),
      el('div', {}, el('strong', { text: p.project })),
      line('Swisspro status, as given', p.status), line('Product', p.product),
      line('Value', p.value == null ? null : fmt.int(p.value) + ' (currency not stated in the file)' + (p.hotel_ids.length > 1 ? ', for ' + p.hotel_ids.length + ' hotels together' : '')),
      line('Installation', p.install_date), line('Rooms in the file', p.rooms), line('Customer', p.customer), line('Update', p.update),
      el('div', { class: 'small muted', text: pre ? 'Pre-fills the pipeline status as ' + pre + '.' : 'Pre-fills no pipeline status: the meaning of “' + p.status + '” is not confirmed. Set the status yourself.' }));
  }

  function recordPanel(h) {
    var rec = S.get(state, h.id), stored = !!state.records[h.id], saved = el('div', { class: 'saved', 'aria-live': 'polite' });
    function commit(patch, rerender) {
      try { S.update(state, h.id, patch, S.today()); } catch (e) { saved.textContent = e.message; return; }
      save();
      if (rerender) { var y = window.scrollY; route(); window.scrollTo(0, y); var s2 = document.querySelector('#record .saved'); if (s2) s2.textContent = 'Saved in this browser.'; }
      else { saved.textContent = 'Saved in this browser.'; var d = document.getElementById('r-date'); if (d && !patch.date) d.value = S.today(); }
    }
    var closed = S.isClosed(rec.status);
    var form = el('div', { class: 'form' },
      el('div', { class: 'row2' },
        field('Status', select('r-status', C.statuses.map(function (x) { return [x, x]; }), rec.status, function (v) { commit({ status: v }, true); })),
        field('Date of last change', el('input', { class: 'input', id: 'r-date', type: 'date', value: rec.date, onchange: function (e) { if (e.target.value) commit({ date: e.target.value }, true); } }))),
      el('div', { class: 'row2' },
        field('Product', el('input', { class: 'input', id: 'r-product', type: 'text', value: rec.product, placeholder: 'for example Slim Lite', onchange: function (e) { commit({ product: e.target.value }); } })),
        field('Quoted value (' + LIST + ')', el('input', { class: 'input', id: 'r-value', type: 'number', min: '0', step: '1', value: rec.quotedValue == null ? '' : rec.quotedValue, onchange: function (e) { commit({ quotedValue: e.target.value }); } }))),
      field('Who decides', select('r-decider', C.deciders.map(function (x) { return [x, fmt.cap(x)]; }), rec.decider, function (v) { commit({ decider: v }); })),
      closed ? field('Reason for ' + rec.status.toLowerCase(), select('r-reason', [['', 'Choose a reason']].concat(C.reasons.map(function (x) { return [x, fmt.cap(x)]; })), rec.reason, function (v) { commit({ reason: v }); })) : null,
      field('Note', el('textarea', { class: 'input', id: 'r-note', rows: '3', placeholder: 'What happened. No names or contact details of hotel staff.', onchange: function (e) { commit({ note: e.target.value }); } }, rec.note)),
      saved);
    var sec = el('section', { class: 'panel', id: 'record' }, el('h2', { text: 'Pipeline record' }));
    (linked.byHotel[h.id] || []).forEach(function (p) { sec.appendChild(projectBox(p)); sec.appendChild(el('div', { style: 'height:12px' })); });
    if (rec.prefilled) sec.appendChild(el('p', { class: 'small muted', style: 'margin-bottom:10px', text: 'Pre-filled from Swisspro’s file on ' + rec.date + (rec.quotedValue != null ? '; the quoted value is the project value as given, check its currency' : '') + '. Any change makes the record yours.' }));
    sec.appendChild(form);
    if (rec.history.length) sec.appendChild(el('p', { class: 'history', text: 'History: ' + S.historyText(rec) }));
    var ol = FU.outlook(state, h.id, S.today());
    if (ol) sec.appendChild(el('div', { class: 'outlook', id: 'outlook' },
      el('p', {}, el('strong', { text: ol.stage + ' since ' + ol.since + ' (' + ol.daysInStage + (ol.daysInStage === 1 ? ' day' : ' days') + '). ' }),
        'Typical time to the next step: about ' + Math.round(ol.typicalDays) + ' days, so the next step is expected around ' + ol.nextExpected + (ol.overdue ? ' (already longer than typical)' : '') + '.'),
      el('p', { text: 'If the hotel goes through every remaining step: Won around ' + ol.wonIfAllSteps + '. This is a time estimate, not a chance of winning.' }),
      el('p', { class: 'basis', text: 'Basis: ' + ol.basis + (ol.allAssumed ? '. Source of the assumption for this step: ' + ol.assumptionSource + '. See the Model page.' : '. See the Model page.') })));
    if (stored) sec.appendChild(el('div', { class: 'actions' }, el('button', { type: 'button', class: 'link-btn', onclick: function () { if (window.confirm('Delete the pipeline record of this hotel?')) { S.remove(state, h.id); save(); route(); } } }, 'Delete this record')));
    return sec;
  }

  function requestPanel(h, e) {
    var req = state.requests[h.id], sec = el('section', { class: 'panel req', id: 'request' }, el('h2', { text: 'Wizard request' }));
    if (req) {
      var cur = e ? e.symbol : (req.currency || '');
      function row(k, v, own) { return [el('dt', { text: k }), el('dd', {}, v == null ? el('span', { class: 'muted', text: 'not given by the hotel, market reference used' }) : [String(v), own ? el('span', { class: 'from-hotel', text: 'from the hotel' }) : null])]; }
      sec.appendChild(el('dl', { class: 'kv' },
        row('Attached', (req.attachedOn || '') + ' (' + req.via + (req.date ? ' of ' + req.date : '') + ')'),
        row('Occupancy', req.occupancy == null ? null : fmt.pct(req.occupancy), true),
        row('Bottles per room-night', req.bottlesPerRoomNight, true),
        row('Price per bottle', req.pricePerBottle == null ? null : fmt.cur(cur, req.pricePerBottle, 2), true)));
      WL.check(req, h).forEach(function (w) { sec.appendChild(el('p', { class: 'notice', style: 'margin-top:10px', text: w })); });
      sec.appendChild(el('div', { class: 'actions' }, el('button', { type: 'button', class: 'link-btn', onclick: function () { delete state.requests[h.id]; save(); route(); } }, 'Remove the request')));
      return sec;
    }
    var err = el('p', { class: 'error', hidden: true });
    var ta = el('textarea', { class: 'input', id: 'q-text', rows: '4', placeholder: 'Paste the request summary from the wizard here' });
    function attach(text) {
      try {
        var r = WL.parse(text, F.factors.bottles_per_room_night_default.value);
        r.attachedOn = S.today(); state.requests[h.id] = r; save(); var y = window.scrollY; route(); window.scrollTo(0, y);
      } catch (ex) { err.textContent = ex.message; err.hidden = false; }
    }
    sec.appendChild(el('p', { class: 'small muted', style: 'margin-bottom:10px', text: 'When this hotel has sent a request through the wizard, attach it: its own occupancy, bottles and price then replace the market reference values. Only these figures are kept, no names or contact details.' }));
    sec.appendChild(el('div', { class: 'form' }, el('label', { for: 'q-text', text: 'Request summary' }), ta, err,
      el('div', { class: 'actions', style: 'margin-top:0' },
        el('button', { type: 'button', class: 'btn btn-primary', onclick: function () { attach(ta.value); } }, 'Attach'),
        fileButton('Or choose a request file', '.json,application/json', function (text) { attach(text); }))));
    return sec;
  }

  function renderHotel(id) {
    var h = hotelsById[id];
    if (!h) { app.appendChild(pageHead('Hotel not found', 'No hotel with the id ' + id + ' in the data.', null, { href: '#/hotels', text: 'All hotels' })); return; }
    var v = view(id);
    app.appendChild(pageHead(h.name, h.city + ', ' + h.country + ' · ' + h.brand + ' · ' + h.tier + ' · ' + fmt.int(h.rooms) + ' rooms',
      el('div', { class: 'head-score' }, el('div', { class: 'big' }, String(v.score.total), el('small', { text: ' / 100' })), el('div', { class: 'lbl', text: C.score.label })),
      { href: '#/hotels', text: 'All hotels' }));
    app.appendChild(el('div', { class: 'wrap page' }, el('div', { class: 'cols' },
      el('div', { class: 'main' }, solvedPanel(h), factsPanel(h), economicsPanel(h, v.econ), pitchPanel(h), scorePanel(v.score, ownCase(h) ? ' ' + C.solved.label + ': not part of the score.' : null), ownerPanel(h), similarPanel(h)),
      el('aside', {}, recordPanel(h), requestPanel(h, v.econ)))));
  }

  /* ================================================================== case archive */
  function renderCases(focusId) {
    var f = ui.cases, all = publicCases.concat(projectFile ? projectFile.projects.map(CA.fromProject) : []);
    var uniq = function (k) { var m = {}; all.forEach(function (c) { m[c[k]] = 1; }); return Object.keys(m).sort(); };
    var tbody = el('tbody'), count = el('span');
    function refresh() {
      var rows = all.filter(function (c) {
        return (!f.country || c.country === f.country) && (!f.tier || c.tierGroup === f.tier) && (!f.solution || c.solutionGroup === f.solution) && (!f.outcome || c.outcomeGroup === f.outcome) && (!f.kind || c.kind === f.kind);
      });
      tbody.textContent = '';
      rows.forEach(function (c) {
        var pub = c.kind === 'public';
        var clean = function (a) { return (a || []).filter(function (x) { return x !== 'not stated'; }).map(function (x) { return x.replace(/_/g, ' '); }).join(', '); };
        var matchedHotels = pub ? [] : (c.hotel_ids || []).filter(function (id) { return hotelsById[id]; });
        tbody.appendChild(el('tr', { id: 'case-' + c.id, class: c.id === focusId ? 'focus' : null },
          el('td', {}, el('span', { class: 'hname', text: c.hotel }), el('span', { class: 'sub', text: [c.city, c.country].filter(Boolean).join(', ') }),
            pub ? null : el('span', { class: 'sub orig', text: 'Swisspro project, confidential' }),
            matchedHotels.map(function (id) { return el('a', { class: 'sub', href: '#/hotel/' + id, text: 'Hotel page: ' + hotelsById[id].name }); })),
          el('td', {}, pub ? [c.chain, c.brand && c.brand !== c.chain && c.brand !== 'not stated' ? ' · ' + c.brand : null] : (c.chain || ns('not stated')), el('span', { class: 'sub', text: 'Tier: ' + c.tier })),
          el('td', {}, el('strong', { text: c.solutionGroup }), el('span', { class: 'sub', text: c.solution }), pub && c.vendor && c.vendor !== 'not stated' ? el('span', { class: 'sub', text: 'Vendor: ' + c.vendor }) : null),
          el('td', {}, c.outcome, el('span', { class: 'sub', text: pub ? 'Year: ' + c.year : (c.install_date ? 'Installation: ' + c.install_date : '') })),
          el('td', {}, pub ? [c.results, clean(c.reasons) ? el('span', { class: 'sub', text: 'Reasons: ' + clean(c.reasons) }) : null, clean(c.barriers) ? el('span', { class: 'sub', text: 'Barriers: ' + clean(c.barriers) }) : null, clean(c.decision_maker) ? el('span', { class: 'sub', text: 'Decided by: ' + clean(c.decision_maker) }) : null]
            : [c.update || ns('no update'), c.value != null ? el('span', { class: 'sub', text: 'Value: ' + fmt.int(c.value) + ' (currency not stated)' }) : null]),
          el('td', {}, pub ? [el('a', { href: c.source_url, target: '_blank', rel: 'noopener noreferrer', text: 'Source' }), el('span', { class: 'sub', text: c.source_date })] : el('span', { class: 'muted', text: 'Your file' }))));
      });
      if (!rows.length) tbody.appendChild(el('tr', {}, el('td', { colspan: '6', class: 'empty', text: 'No case matches these filters.' })));
      count.textContent = rows.length + ' of ' + all.length + ' entries';
    }
    function set(k) { return function (v) { f[k] = v; refresh(); }; }
    var opts = function (k) { return [['', 'All']].concat(uniq(k).map(function (x) { return [x, x]; })); };
    var filters = el('section', { class: 'panel' },
      el('div', { class: 'filters', style: 'grid-template-columns: repeat(' + (projectFile ? 5 : 4) + ', minmax(0, 1fr))' },
        field('Country', select('c-country', opts('country'), f.country, set('country'))),
        field('Tier', select('c-tier', opts('tierGroup'), f.tier, set('tier'))),
        field('Solution', select('c-solution', opts('solutionGroup'), f.solution, set('solution'))),
        field('Outcome', select('c-outcome', opts('outcomeGroup'), f.outcome, set('outcome'))),
        projectFile ? field('Kind', select('c-kind', [['', 'All'], ['public', 'Public cases'], ['swisspro', 'Swisspro projects']], f.kind, set('kind'))) : null),
      el('div', { class: 'list-bar' }, el('div', {}, count, ' · ', el('button', { type: 'button', class: 'link-btn', onclick: function () { ui.cases = { country: '', tier: '', solution: '', outcome: '', kind: '' }; route(); } }, 'Clear filters')),
        el('div', { text: 'Tier, solution and outcome are grouped by this tool for the filters; the wording of the source is shown in each row.' })));
    app.appendChild(pageHead('Case archive', D.cases.cases.length + ' public cases of hotels replacing or keeping single-use bottled water. ' + D.cases.note.replace(/^[^;]*;\s*/, '').replace(/^e/, 'E') + (projectFile ? ' Swisspro’s own projects are listed as well while your file is loaded.' : '')));
    app.appendChild(el('div', { class: 'wrap page' }, filters,
      el('section', { class: 'panel flush' }, el('div', { class: 'table-wrap' }, el('table', { class: 'grid' },
        el('thead', {}, el('tr', {}, el('th', { text: 'Hotel' }), el('th', { text: 'Chain and tier' }), el('th', { text: 'Solution' }), el('th', { text: 'Outcome' }), el('th', { text: projectFile ? 'Result or update' : 'Result' }), el('th', { text: 'Source' }))), tbody)))));
    refresh();
  }

  /* ================================================================== model */
  function renderModel() {
    var c = WM.counts(state), wp = WM.winProbability(null), table = WM.trainingTable(state, view);
    var closed = Object.keys(state.records).filter(function (id) { return S.isClosed(state.records[id].status) && hotelsById[id]; });
    var tb = el('tbody');
    closed.forEach(function (id) {
      var r = state.records[id], h = hotelsById[id];
      tb.appendChild(el('tr', {}, el('td', {}, el('a', { class: 'hname', href: '#/hotel/' + id, text: h.name })), el('td', {}, el('span', { class: 'status', 'data-s': r.status, text: r.status })),
        el('td', {}, r.reason ? fmt.cap(r.reason) : ns('reason not set')), el('td', { text: r.date }), el('td', {}, scoreEl(view(id).score))));
    });
    var day = S.today(), fs = FU.stats(state, day), st = FU.stageTable(state, view, day), ftb = el('tbody');
    C.funnel.stages.slice(0, -1).forEach(function (k) {
      var x = fs[k];
      ftb.appendChild(el('tr', {}, el('td', {}, el('span', { class: 'status', 'data-s': k, text: k })),
        el('td', { class: 'num', text: String(x.entered) }), el('td', { class: 'num', text: String(x.movedOn) }), el('td', { class: 'num', text: String(x.lost) }), el('td', { class: 'num', text: String(x.waiting) }),
        el('td', { class: 'num' }, x.conversion == null ? ns('from ' + C.funnel.minObserved + ' hotels') : fmt.pct(x.conversion)),
        el('td', { class: 'num', text: String(Math.round(x.typicalDays)) }),
        el('td', { class: 'small' }, x.basis, el('span', { class: 'sub', text: 'Assumption: ' + x.assumedDays + ' days, ' + x.assumptionSource }))));
    });
    app.appendChild(pageHead('Model', 'What exists today: the rule-based priority score and a growing record of what happened. No win probability yet.'));
    app.appendChild(el('div', { class: 'wrap page' },
      el('section', { class: 'panel' }, el('h2', { text: 'Win probability: ' + wp.label }),
        el('div', { class: 'prose' },
          el('p', { text: 'A win probability can be trained once enough records are closed as Won and as Lost, each with its reason. Until then the tool ranks hotels by the rule-based priority score and shows no percentage.' })),
        el('div', { class: 'stat-row', style: 'margin-top:16px' },
          el('div', { class: 'stat' }, el('div', { class: 'v', id: 'm-won', text: String(c.won) }), el('div', { class: 'k', text: 'records closed as Won' })),
          el('div', { class: 'stat' }, el('div', { class: 'v', id: 'm-lost', text: String(c.lost) }), el('div', { class: 'k', text: 'records closed as Lost' })),
          el('div', { class: 'stat' }, el('div', { class: 'v', text: String(c.open) }), el('div', { class: 'k', text: 'records still open' }))),
        el('div', { class: 'actions' },
          el('button', { type: 'button', class: 'btn btn-primary', id: 'export-training', disabled: table.rows.length ? null : true, onclick: function () { download('swisspro-training-table-' + S.today() + '.csv', S.toCsv(table.header, table.rows), 'text/csv'); } }, 'Export training table'),
          el('span', { class: 'small muted', text: table.rows.length ? table.rows.length + ' rows, one per closed record: hotel features, score components, economics, status history, outcome and reason.' : 'No record is closed as Won or Lost yet, so there is nothing to export.' }))),
      el('section', { class: 'panel', id: 'funnel' }, el('h2', { text: 'Funnel: time and conversion between steps' }),
        el('div', { class: 'prose' },
          el('p', { text: 'Every dated status change is a step, so the tool learns from replies, meetings, quotes and mock-ups, not only from wins. Typical days start as an assumption and move towards Swisspro\u2019s own figures with every logged step; hotels still waiting count with the days waited so far. A conversion share is shown once ' + C.funnel.minObserved + ' hotels have left a step as moved on or lost.' })),
        el('div', { class: 'table-wrap', style: 'margin-top:12px' }, el('table', { class: 'grid' }, el('thead', {}, el('tr', {}, el('th', { text: 'Step' }), el('th', { class: 'num', text: 'Entered' }), el('th', { class: 'num', text: 'Moved on' }), el('th', { class: 'num', text: 'Lost' }), el('th', { class: 'num', text: 'Still waiting' }), el('th', { class: 'num', text: 'Conversion' }), el('th', { class: 'num', text: 'Typical days to next step' }), el('th', { text: 'Basis' }))), ftb)),
        el('div', { class: 'actions' },
          el('button', { type: 'button', class: 'btn btn-line', id: 'export-stages', disabled: st.rows.length ? null : true, onclick: function () { download('swisspro-stage-table-' + day + '.csv', S.toCsv(st.header, st.rows), 'text/csv'); } }, 'Export stage table'),
          el('span', { class: 'small muted', text: st.rows.length ? st.rows.length + ' rows, one per stay in a step, with days and whether the hotel moved on: the training data for time between steps.' : 'No hotel has a dated step yet.' }))),
      el('section', { class: 'panel flush' }, closed.length
        ? el('div', { class: 'table-wrap' }, el('table', { class: 'grid' }, el('thead', {}, el('tr', {}, el('th', { text: 'Closed record' }), el('th', { text: 'Outcome' }), el('th', { text: 'Reason' }), el('th', { text: 'Date' }), el('th', { text: 'Score' }))), tb))
        : el('p', { class: 'empty', text: 'Closed records appear here once a hotel is set to Won or Lost on its page.' }))));
  }

  /* ================================================================== data and rules */
  function renderData() {
    var n = Object.keys(state.records).length, status = el('p', { class: 'small muted', id: 'io-status', 'aria-live': 'polite' });
    var pstatus = el('p', { class: 'small muted', id: 'project-status', 'aria-live': 'polite' });
    var w = C.score.weights, sc = C.score, seg = sc.segment;
    function rule(name, max, text) { return el('tr', {}, el('td', { text: name }), el('td', { class: 'num', text: String(max) }), el('td', { text: text })); }
    var mk = el('tbody');
    Object.keys(markets).forEach(function (k) { mk.appendChild(el('tr', {}, el('td', { text: k }), el('td', { class: 'num', text: fmt.pct(markets[k].occupancy_pct / 100) }), el('td', { text: markets[k].source }), el('td', { class: 'num', text: String(hotels.filter(function (h) { return h.market === k; }).length) }))); });
    app.appendChild(pageHead('Data and rules', 'Save and load your pipeline records, load Swisspro’s own projects, and see where every figure comes from.'));
    app.appendChild(el('div', { class: 'wrap page' },
      el('div', { class: 'sections' },
        el('section', { class: 'panel', id: 'io' }, el('h2', { text: 'Pipeline records' }),
          el('p', { class: 'prose', text: n + (n === 1 ? ' record is' : ' records are') + ' stored in this browser only. Export them to keep a copy or to move them to another computer.' }),
          el('div', { class: 'actions' },
            el('button', { type: 'button', class: 'btn btn-primary', id: 'export-json', onclick: function () { download('swisspro-pipeline-' + S.today() + '.json', S.exportJson(state), 'application/json'); status.textContent = 'Exported ' + n + ' records as one JSON file.'; } }, 'Export (JSON)'),
            fileButton('Import (JSON)', '.json,application/json', function (text) {
              try {
                var next = S.importJson(text), k = Object.keys(next.records).length;
                if (n && !window.confirm('Importing replaces the ' + n + ' records in this browser with the ' + k + ' records of the file. Continue?')) return;
                state = next; save(); route(); document.getElementById('io-status').textContent = 'Imported ' + k + ' records.';
              } catch (e) { status.textContent = e.message; status.className = 'error'; }
            }),
            el('button', { type: 'button', class: 'btn btn-line', id: 'export-csv', onclick: function () { download('swisspro-pipeline-' + S.today() + '.csv', S.pipelineCsv(state, hotelsById), 'text/csv'); status.textContent = 'Exported ' + n + ' records as CSV.'; } }, 'Export (CSV)')),
          status),
        el('section', { class: 'panel', id: 'private' }, el('h2', { text: 'Swisspro’s own projects (confidential)' }),
          el('p', { class: 'prose', text: 'Choose your projects file. It is read in this browser only and is never part of the public data or the repository. Projects are matched to hotels; Swisspro’s status is shown as given and pre-fills the pipeline status: Hot to Mock-up, Warm to Quoted, Cold to On hold, HIT to Won. Closed pre-fills nothing.' }),
          el('div', { class: 'actions' }, fileButton(projectFile ? 'Load another file' : 'Choose the projects file', '.json,application/json', function (text, name) { loadProjectText(text, name, pstatus); }, 'btn-primary'),
            projectFile ? el('button', { type: 'button', class: 'btn btn-line', onclick: removeProjects }, 'Remove from this browser') : null),
          projectFile ? el('p', { class: 'small muted', style: 'margin-top:10px', text: projectFile.projects.length + ' projects loaded on ' + projectFile.loadedOn + ': ' + Object.keys(linked.byHotel).length + ' hotels matched, ' + linked.unmatched.length + ' projects without a hotel in the list (case archive only).' }) : el('p', { class: 'small muted', style: 'margin-top:10px', text: 'No file loaded: the tool runs on public data only.' }),
          projectFile && (projectFile.warnings.length || linked.warnings.length) ? el('ul', { class: 'plain small' }, projectFile.warnings.concat(linked.warnings).map(function (x) { return el('li', { text: x }); })) : null,
          pstatus)),
      el('section', { class: 'panel', id: 'rules' }, el('h2', { text: sc.label + ': the rules' }),
        el('p', { class: 'small muted', text: 'Five components add up to 100. The weights are a proposal of the project team and live in one file (crm/js/config.js). Where data is missing the component is marked “not sourced” and scored neutral, at half of its points. The score is not a probability. The label “' + C.solved.label + '” (' + Object.keys(C.solved.byHotel).length + ' hotels) is shown next to the score and does not change it.' }),
        el('div', { class: 'table-wrap' }, el('table', { class: 'grid rules' }, el('thead', {}, el('tr', {}, el('th', { text: 'Component' }), el('th', { class: 'num', text: 'Points' }), el('th', { text: 'Rule' }))), el('tbody', {},
          rule('Payback fit', w.payback, 'Reference occupancy of the hotel’s market divided by the occupancy needed for a cash payback within ' + sc.payback.years + ' years. Ratio ' + sc.payback.fullAt + ' or more: full points. Ratio ' + sc.payback.zeroAt + ' or less: none. In proportion in between. With a wizard request attached, the hotel’s own figures are used.'),
          rule('Size', w.size, 'Rooms divided by ' + sc.size.fullAtRooms + ', capped at full points.'),
          rule('Owner leverage', w.owner, 'Hotels of the same owner group in the data: ' + sc.owner.steps.slice().reverse().map(function (s, i, a) { return (a[i + 1] ? (s.min === a[i + 1].min - 1 ? s.min : s.min + ' to ' + (a[i + 1].min - 1)) : s.min + ' or more') + ' = ' + s.points; }).join(', ') + '. Plus ' + sc.owner.projectBonus + ' when another hotel of the group is at Quoted, Mock-up or Won. Owner not sourced: ' + w.owner / 2 + '. A private owner counts as 1 hotel.'),
          rule('Segment fit', w.segment, 'Tier: Premium or Select ' + seg.tier.Premium + ', Longer Stays or Collections ' + seg.tier.Collections + ', Luxury ' + seg.tier.Luxury + '. Operating model: managed ' + seg.model.managed + ', owner-operated ' + seg.model.owner_operated + ', not sourced ' + seg.modelMax / 2 + '. Build stage: existing ' + seg.stage.existing + ', new build ' + seg.stage.new_build + '.'),
          rule('Timing', w.timing, 'New build opening after ' + sc.referenceYear + ': ' + sc.timing.newBuildLater + '. New build opening in ' + sc.referenceYear + ': ' + sc.timing.newBuildThisYear + '. Existing hotel: the renovation date is not in the data, so ' + w.timing / 2 + ' (neutral).'))))),
      el('section', { class: 'panel', id: 'public-data' }, el('h2', { text: 'Public data' }),
        el('div', { class: 'prose' },
          el('p', { text: hotels.length + ' hotels: ' + hotelNote }),
          el('p', { text: D.cases.cases.length + ' cases: ' + D.cases.note }),
          el('p', {}, 'Economics: the Sustainability Wizard’s engine, factors and price list (3 bottles per occupied room-night, typical bottle price of the market, ' + sgd(PL.byId(PL.pricelist.items, 'ir_smart_plus').price) + ' per room installed, ' + sgd(PL.inRoomServicePerYear()) + ' service per room and year, cash payback without staff time). ', el('a', { href: '../sources.html', text: 'Sources and assumptions of the wizard' }), '.')),
        el('h3', { style: 'margin:16px 0 4px', text: 'Reference occupancy per market' }),
        el('div', { class: 'table-wrap' }, el('table', { class: 'grid' }, el('thead', {}, el('tr', {}, el('th', { text: 'Market' }), el('th', { class: 'num', text: 'Occupancy' }), el('th', { text: 'Source, as in the data file' }), el('th', { class: 'num', text: 'Hotels' }))), mk)))));
  }

  /* ================================================================== routing */
  var current = '';
  /** Renders the page of the current hash. `nav` is true when the user moved to another page (then the scroll position is set). */
  function route(nav) {
    var hash = location.hash.replace(/^#\/?/, ''), parts = hash.split('/'), page = parts[0] || 'hotels';
    if (nav && current === 'hotels' && page !== 'hotels') ui.listScroll = window.scrollY;
    if (!views) buildViews();
    app.textContent = '';
    renderPrivateBar();
    if (page === 'hotel') renderHotel(parts[1]);
    else if (page === 'cases') renderCases(parts[1]);
    else if (page === 'model') renderModel();
    else if (page === 'data') renderData();
    else { page = 'hotels'; renderHotels(); }
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) { if (a.getAttribute('data-nav') === (page === 'hotel' ? 'hotels' : page)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = (page === 'hotel' && hotelsById[parts[1]] ? hotelsById[parts[1]].name + ' \u00b7 ' : '') + 'Swisspro hotel pipeline';
    if (nav) window.scrollTo(0, page === 'hotels' ? ui.listScroll : 0);
    if (nav && page === 'cases' && parts[1]) { var row = document.getElementById('case-' + parts[1]); if (row) row.scrollIntoView({ block: 'center' }); }
    current = page;
  }
  window.addEventListener('hashchange', function () { route(true); });
  route(true);

  CRM.app = { state: function () { return state; }, view: view, route: route, loadProjectText: loadProjectText };
})();
