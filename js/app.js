/* Swisspro Sustainability Wizard - UI (version 2). Vanilla JS, no build step. */
(function () {
  'use strict';
  var F = window.SW.factors, E = window.SW.engine, PL = window.SW.pricelist, Q = window.SW.questions,
      M = window.SW.model, R = window.SW.recommend, fmt = window.SW.format;
  var STORE = 'swisspro-wizard-v2';
  var ARTIFACT = !!window.SW_ARTIFACT; // hosted preview frame: no print dialog, no mailto, no confirm()
  var EMBED = /[?&]embed=1/.test(location.search) || document.documentElement.hasAttribute('data-embed');
  if (EMBED) document.documentElement.setAttribute('data-embed', '');
  // When embedded in Swisspro's site, tell the parent page our height so the iframe can grow with the content.
  function postHeight() { try { if (window.parent !== window) window.parent.postMessage({ swissproWizardHeight: document.documentElement.scrollHeight }, '*'); } catch (e) { /* ignore */ } }
  if (EMBED) { new MutationObserver(postHeight).observe(document.body, { childList: true, subtree: true }); window.addEventListener('load', postHeight); window.addEventListener('resize', postHeight); }
  var app = document.getElementById('app');
  var state = load() || { view: 'intro', step: 0, answers: {}, overrides: {}, proposal: {} };
  state.proposal = state.proposal || {};

  /* ------------------------------------------------------------------ utilities */
  function load() { try { var s = localStorage.getItem(STORE); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* private mode */ } }
  function el(tag, props) {
    var node = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === 'class') node.className = props[k];
      else if (k === 'html') node.innerHTML = props[k];
      else if (k === 'text') node.textContent = props[k];
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), props[k]);
      else if (props[k] != null) node.setAttribute(k, props[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x != null) node.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
      else node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }
  var KIND_NAMES = { sourced: 'Sourced', derived: 'Derived', assumption: 'Assumption', user: 'Your input', constant: 'Constant', missing: 'Missing' };
  /** Provenance tag: kind plus verification status ("Sourced, unverified"). */
  function tag(p, text) {
    if (typeof p === 'string') p = { kind: p };
    var kind = p.kind === 'user' ? 'user' : p.kind;
    var label = text || KIND_NAMES[kind] || kind;
    if ((kind === 'sourced' || kind === 'derived') && p.status === F.UNVERIFIED) { label += ', unverified'; return el('span', { class: 'tag tag-unverified', text: label }); }
    if (kind === 'sourced' && (p.status === 'team-opened' || p.status === 'team-reported')) { label += p.status === 'team-opened' ? ', opened by the team' : ', reported by the team'; return el('span', { class: 'tag tag-sourced', text: label }); }
    if (p.status === 'missing') return el('span', { class: 'tag tag-missing', text: label });
    return el('span', { class: 'tag tag-' + kind, text: label });
  }
  function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function visibleSteps() { return Q.steps.filter(function (s) { return !s.showIf || s.showIf(state.answers); }); }
  function fieldOptions(f) { return f.dynamic === 'bottlePrices' ? M.bottlePriceOptions(F, state.answers.country) : f.options; }
  function has(arr, v) { return (arr || []).indexOf(v) >= 0; }

  /* ------------------------------------------------------------------ intro */
  function renderIntro() {
    app.innerHTML = '';
    app.appendChild(el('section', { class: 'hero' },
      el('p', { class: 'eyebrow', text: 'Swisspro Sustainability Wizard' }),
      el('h1', { text: 'What does filtered water instead of bottled water mean for your hotel?' }),
      el('p', { class: 'lead', text: 'Nine quick answers. You get the bottles, plastic and CO2e avoided, the money and staff time saved, the payback, and the Swisspro unit that fits.' }),
      el('div', { class: 'actions' },
        el('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: function () { state.view = 'wizard'; state.step = 0; save(); render(); } }, 'Start'),
        Object.keys(state.answers).length ? el('button', { class: 'btn btn-secondary btn-lg', type: 'button', onclick: function () { state.view = 'wizard'; save(); render(); } }, 'Continue') : null
      ),
      el('p', { class: 'small muted', text: 'About one minute.' })
    ));
  }

  /* ------------------------------------------------------------------ wizard */
  function renderStep() {
    app.innerHTML = '';
    var steps = visibleSteps();
    if (state.step >= steps.length) state.step = steps.length - 1;
    var step = steps[state.step];
    var a = state.answers;

    app.appendChild(el('div', { class: 'progress' },
      el('span', { text: 'Step ' + (state.step + 1) + ' of ' + steps.length }),
      el('div', { class: 'progress-bar' }, el('span', { style: 'width:' + Math.round((state.step + 1) / steps.length * 100) + '%' }))));

    var card = el('section', { class: 'card step', 'aria-labelledby': 'step-title' });
    card.appendChild(el('h2', { id: 'step-title', text: step.title }));
    if (step.intro) card.appendChild(el('p', { class: 'intro', text: step.intro }));
    var singleAuto = step.fields.length === 1 && step.fields[0].type === 'single';

    step.fields.forEach(function (f) {
      if (f.showIf && !f.showIf(a)) return;
      var wrap = el('div', { class: 'field', 'data-field': f.id });
      if (f.label) wrap.appendChild(el('div', { class: 'field-label', id: 'lbl-' + f.id, text: f.label }));
      if (f.type === 'single' || f.type === 'multi') {
        var opts = fieldOptions(f);
        var listMode = opts.some(function (o) { return o.desc && o.desc.length > 40; });
        var group = el('div', { class: 'options' + (listMode ? ' options-list' : ''), role: f.type === 'single' ? 'radiogroup' : 'group', 'aria-labelledby': f.label ? 'lbl-' + f.id : 'step-title' });
        opts.forEach(function (o) {
          var selected = f.type === 'single' ? a[f.id] === o.id : has(a[f.id], o.id);
          group.appendChild(el('button', { type: 'button', class: 'opt' + (selected ? ' selected' : ''), role: f.type === 'single' ? 'radio' : 'checkbox', 'aria-checked': selected ? 'true' : 'false', 'data-opt': o.id,
            onclick: function () {
              if (f.type === 'single') a[f.id] = o.id;
              else { var cur = (a[f.id] || []).slice(); if (has(cur, o.id)) cur.splice(cur.indexOf(o.id), 1); else cur.push(o.id); a[f.id] = cur; }
              save();
              if (f.type === 'single' && singleAuto) setTimeout(next, 160); else renderStep();
            } },
            el('span', { class: 'opt-label', text: o.label }),
            o.desc ? el('span', { class: 'opt-desc', text: o.desc }) : null));
        });
        wrap.appendChild(group);
      } else if (f.type === 'number' || f.type === 'text' || f.type === 'email') {
        wrap.appendChild(el('input', { class: 'input', type: f.type, id: 'in-' + f.id, placeholder: f.placeholder || '', value: a[f.id] != null ? a[f.id] : '', min: f.min, max: f.max, step: f.step, inputmode: f.type === 'number' ? 'decimal' : null, 'aria-labelledby': 'lbl-' + f.id,
          oninput: function (e) { a[f.id] = e.target.value; save(); } }));
        if (f.chips) {
          var chips = el('div', { class: 'chips' });
          f.chips.forEach(function (c) { chips.appendChild(el('button', { type: 'button', class: 'chip' + (String(a[f.id]) === String(c) ? ' selected' : ''), onclick: function () { a[f.id] = String(c); save(); renderStep(); } }, String(c))); });
          wrap.appendChild(chips);
        }
      }
      wrap.appendChild(el('div', { class: 'error', id: 'err-' + f.id, hidden: true }));
      card.appendChild(wrap);
    });

    card.appendChild(el('div', { class: 'nav-row' },
      el('button', { type: 'button', class: 'btn btn-secondary', onclick: back }, state.step === 0 ? 'Intro' : 'Back'),
      el('button', { type: 'button', class: 'btn btn-primary', onclick: next }, state.step === steps.length - 1 ? 'See my results' : 'Next')));
    app.appendChild(card);
    document.getElementById('restart-top').hidden = false;
  }

  function validate(step) {
    var a = state.answers, ok = true, first = null;
    step.fields.forEach(function (f) {
      if (f.showIf && !f.showIf(a)) return;
      var msg = '';
      if (f.type === 'single' && f.required && !a[f.id]) msg = 'Please choose an option.';
      if (f.type === 'multi' && f.required && !(a[f.id] && a[f.id].length)) msg = 'Please select at least one option.';
      if (f.type === 'number') {
        var v = Number(a[f.id]);
        if (f.required && (a[f.id] == null || a[f.id] === '' || !isFinite(v))) msg = 'Please enter a number.';
        else if (a[f.id] !== '' && a[f.id] != null && isFinite(v) && ((f.min != null && v < f.min) || (f.max != null && v > f.max))) msg = 'Please enter a value between ' + f.min + ' and ' + f.max + '.';
      }
      var e = document.getElementById('err-' + f.id);
      if (e) { e.textContent = msg; e.hidden = !msg; }
      if (msg) { ok = false; if (!first) first = f.id; }
    });
    if (first) { var node = document.querySelector('[data-field="' + first + '"]'); if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    return ok;
  }
  function next() {
    var steps = visibleSteps();
    if (!validate(steps[state.step])) return;
    if (state.step >= steps.length - 1) { state.view = 'results'; save(); render(); scrollTop(); return; }
    state.step += 1; save(); renderStep(); scrollTop();
  }
  function back() {
    if (state.step === 0) { state.view = 'intro'; save(); render(); return; }
    state.step -= 1; save(); renderStep(); scrollTop();
  }
  function restart() {
    if (document.getElementById('restart-confirm')) return;
    var bar = el('div', { class: 'card notice', id: 'restart-confirm', role: 'alertdialog', 'aria-label': 'Confirm start over' },
      el('p', { style: 'margin:0 0 10px', text: 'Clear your answers and start over?' }),
      el('div', { class: 'actions', style: 'margin:0' },
        el('button', { type: 'button', class: 'btn btn-primary', onclick: function () { state = { view: 'intro', step: 0, answers: {}, overrides: {}, proposal: {} }; save(); render(); scrollTop(); } }, 'Yes, start over'),
        el('button', { type: 'button', class: 'btn btn-secondary', onclick: function () { bar.remove(); } }, 'Keep my answers')));
    app.insertBefore(bar, app.firstChild);
    bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ------------------------------------------------------------------ pricing from the price list */
  function listToLocal(inputs) {
    // price list currency (assumed SGD) -> USD -> local
    var listCode = PL.pricelist.currency.value;
    var from = Object.keys(F.countries).map(function (k) { return F.countries[k]; }).filter(function (c) { return c.currency === listCode; })[0];
    var usdPerList = from ? from.fx.value : 1;
    return function (v) { return v * usdPerList / inputs.usdPerLocal; };
  }

  function pricing(rec, inputs) {
    var o = state.overrides, toLocal = listToLocal(inputs), SV = PL.pricelist.servicing;
    var inRoomUnits = rec.unitPlan.inRoom, stations = rec.unitPlan.stations, units = inRoomUnits + stations;
    var reading = o.serviceReading || SV.defaultReading;
    var months = o.changeMonths != null ? Number(o.changeMonths) : SV.changeIntervalMonths.value;
    var inRoomPerYear = PL.inRoomServicePerYear(reading, months);
    var stationPerYear = PL.stationServicePerYear();
    var servicingListPerYear = inRoomUnits * inRoomPerYear + stations * stationPerYear;
    var servicingLocal = o.annualService != null ? Number(o.annualService) : toLocal(servicingListPerYear);
    var lines = [], unpriced = [], capexList = 0;
    rec.solutions.forEach(function (sol) {
      var n = sol.area === 'inRoom' ? inRoomUnits : stations;
      if (sol.exactMatch && sol.products.length) { var p = sol.products[0]; lines.push({ area: sol.areaLabel, product: p.label, units: n, unitPrice: p.price, list: p.price * n, local: toLocal(p.price * n) }); capexList += p.price * n; }
      else unpriced.push({ area: sol.areaLabel, units: n });
    });
    var capexLocal = null, capexSource = 'none';
    if (o.capex != null && Number(o.capex) > 0) { capexLocal = Number(o.capex); capexSource = 'user'; }
    else if (lines.length && !unpriced.length) { capexLocal = toLocal(capexList); capexSource = 'pricelist'; }
    return { units: units, inRoomUnits: inRoomUnits, stations: stations, reading: reading, months: months, inRoomPerYear: inRoomPerYear, stationPerYear: stationPerYear,
      servicingListPerYear: servicingListPerYear, servicingLocal: servicingLocal, servicingSource: o.annualService != null ? 'user' : 'pricelist',
      capexLocal: capexLocal, capexSource: capexSource, capexListPartial: capexList, lines: lines, unpriced: unpriced, toLocal: toLocal };
  }

  /* ------------------------------------------------------------------ results */
  function compute() {
    var n = M.normalise(F, state.answers, state.overrides);
    var calc = E.calculate(F, n.inputs);
    var rec = R.recommend(state.answers, n.inputs, F, PL);
    var pr = pricing(rec, n.inputs);
    var inp = Object.assign({}, n.inputs, { capex: pr.capexLocal, annualService: pr.servicingLocal });
    calc.payback = E.payback(inp, calc.spend, calc.labour);
    calc.inputs = inp;
    return { n: n, calc: calc, rec: rec, pr: pr };
  }

  function basis(parts) { var d = el('div', { class: 'basis' }); parts.forEach(function (p, i) { if (i) d.appendChild(document.createTextNode(' x ')); d.appendChild(document.createTextNode(p.text + ' ')); if (p.tag) d.appendChild(p.tag); }); return d; }
  function money(ctx, v) { return fmt.money(ctx.n.inputs.symbol, v, ctx.n.inputs.decimals); }
  function usd(ctx, local) { return ctx.n.inputs.currency === 'USD' ? '' : ' (US$' + fmt.int(local * ctx.n.inputs.usdPerLocal) + ')'; }
  function sizeLabel(ml) { return ml >= 1000 ? fmt.dec(ml / 1000, 1) + ' L' : ml + ' ml'; }

  function renderResults() {
    var ctx = compute();
    var a = state.answers, n = ctx.n, c = ctx.calc, rec = ctx.rec, prov = n.provenance, inp = n.inputs;
    app.innerHTML = '';
    var root = el('div', { class: 'results' });
    root.appendChild(el('header', { class: 'results-head' },
      el('p', { class: 'eyebrow', text: 'Your result' }),
      el('h2', { text: fmt.int(inp.rooms) + ' rooms in ' + n.country.name + (state.proposal.hotel ? ', ' + state.proposal.hotel : '') }),
      el('div', { class: 'summary-chips' },
        el('span', { text: fmt.pct(inp.occupancy) + ' occupancy' }), el('span', { text: rec.segment.current }),
        inp.bottlesPerRoomNight ? el('span', { text: inp.bottlesPerRoomNight + ' x ' + sizeLabel(inp.bottleSizeMl) + ' per night' }) : null,
        el('span', { text: rec.segment.areas.join(', ') }))));

    var tiles = el('div', { class: 'tiles' });
    function tile(label, value, unit, sub, tags) {
      var t = el('div', { class: 'tile' }, el('div', { class: 'label', text: label }), el('div', { class: 'value' + (String(value).length > 9 ? ' value-long' : ''), text: value }, unit ? el('span', { class: 'unit', text: ' ' + unit }) : null), sub ? el('div', { class: 'sub', text: sub }) : null);
      if (tags && tags.length) { var b = el('div', { class: 'basis' }); tags.forEach(function (x) { b.appendChild(x); }); t.appendChild(b); }
      return t;
    }
    tiles.appendChild(tile('Bottles avoided per year', fmt.int(c.bottles.total), null, fmt.int(c.env.litres) + ' litres'));
    tiles.appendChild(tile('Plastic avoided per year', c.env.packagingKg != null ? fmt.int(c.env.packagingKg) : 'none', c.env.packagingKg != null ? 'kg' : null, c.env.packagingKg != null ? fmt.dec(c.env.bottleWeightG, 1) + ' g per bottle' : 'Glass bottles'));
    tiles.appendChild(tile('CO2e avoided per year', c.env.quantified ? fmt.dec(c.env.co2eKg / 1000, 1) : '-', c.env.quantified ? 't' : null, c.env.quantified ? fmt.int(c.env.co2eCarKm) + ' km by car' : 'Not estimated'));
    tiles.appendChild(tile('Bottled-water spend avoided per year', inp.pricePerBottle > 0 ? money(ctx, c.spend.annualLocal) : '-', null, inp.pricePerBottle > 0 ? fmt.money(inp.symbol, inp.pricePerBottle, inp.decimals === 0 ? 0 : 2) + ' per bottle' + usd(ctx, c.spend.annualLocal) : 'No price set'));
    tiles.appendChild(tile('Staff time freed per year', fmt.int(c.labour.hours), 'hours', c.labour.quantified ? 'worth ' + money(ctx, c.labour.costLocal) : null));
    root.appendChild(tiles);

    root.appendChild(renderPayback(ctx));
    root.appendChild(renderSolution(ctx));
    root.appendChild(renderMore(ctx));
    root.appendChild(renderAdjust(ctx));
    root.appendChild(renderProposal(ctx));
    app.appendChild(root);
    document.getElementById('restart-top').hidden = false;
  }

  function renderPayback(ctx) {
    var c = ctx.calc, inp = ctx.n.inputs, pr = ctx.pr, o = state.overrides, SV = PL.pricelist.servicing, cur = PL.pricelist.currency.value;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'Payback' }));
    var grid = el('div', { class: 'adjust adjust-4' });
    grid.appendChild(el('div', {}, el('label', { for: 'ov-capex', text: 'Investment (' + inp.currency + ')' }),
      el('input', { class: 'input', id: 'ov-capex', type: 'number', min: 0, step: 1, value: o.capex != null ? o.capex : (pr.capexLocal != null ? Math.round(pr.capexLocal) : ''), placeholder: 'from your proposal', onchange: function (e) { o.capex = e.target.value === '' ? null : Number(e.target.value); save(); renderResults(); } })));
    var sel = el('select', { class: 'input', id: 'ov-reading', onchange: function (e) { o.serviceReading = e.target.value; delete o.annualService; save(); renderResults(); } });
    var SHORT = { perChange: 'Per filter change', perYear: 'Per year', perContract2y: 'Per 2-year contract' };
    SV.readings.forEach(function (r) { var opt = el('option', { value: r.id, text: SHORT[r.id] || r.label }); if (r.id === pr.reading) opt.selected = true; sel.appendChild(opt); });
    grid.appendChild(el('div', {}, el('label', { for: 'ov-reading', text: 'Service price 85.00 is' }), sel));
    grid.appendChild(el('div', {}, el('label', { for: 'ov-months', text: 'Months between changes' }), el('input', { class: 'input', id: 'ov-months', type: 'number', min: 1, max: 36, step: 1, value: pr.months, disabled: pr.reading === 'perChange' ? null : 'disabled', onchange: function (e) { o.changeMonths = Number(e.target.value) || SV.changeIntervalMonths.value; delete o.annualService; save(); renderResults(); } })));
    grid.appendChild(el('div', {}, el('label', { for: 'ov-service', text: 'Service per year (' + inp.currency + ')' }),
      el('input', { class: 'input', id: 'ov-service', type: 'number', min: 0, step: 1, value: Math.round(pr.servicingLocal), onchange: function (e) { o.annualService = e.target.value === '' ? null : Number(e.target.value); save(); renderResults(); } })));
    card.appendChild(grid);
    if (pr.unpriced.length) card.appendChild(el('p', { class: 'notice', text: 'No listed unit for ' + pr.unpriced.map(function (u) { return u.area; }).join(' and ') + '. Enter the investment from your proposal.' }));
    if (c.payback.available) {
      var pb = c.payback;
      var t = el('table', { class: 'kv kv-wide' });
      function row(k, v, strong) { t.appendChild(el('tr', { class: strong ? 'strong' : null }, el('th', { text: k }), el('td', { text: v }))); }
      row('Bottled-water spend avoided per year', money(ctx, c.spend.annualLocal));
      row('Service contract per year', money(ctx, pb.annualService));
      row('Staff time freed per year', c.labour.quantified ? money(ctx, c.labour.costLocal) : '-');
      row('Investment', money(ctx, pb.capex) + usd(ctx, pb.capex));
      row('Cash payback', fmt.years(pb.cashPaybackYears), true);
      row('Payback including staff time', fmt.years(pb.fullPaybackYears), true);
      row('Five-year net saving, cash', money(ctx, pb.fiveYearNetCash));
      row('Five-year net saving incl. staff time', money(ctx, pb.fiveYearNetFull));
      card.appendChild(t);
      if (pb.cashSavingsPerYear <= 0) card.appendChild(el('p', { class: 'notice', text: 'At this bottle price the service contract costs more than the water it replaces.' }));
    } else {
      card.appendChild(el('p', { class: 'muted small', text: 'Enter the investment to see the payback.' }));
    }
    return card;
  }

  function renderSolution(ctx) {
    var rec = ctx.rec, cur = PL.pricelist.currency.value;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'Swisspro units that fit' }));
    rec.solutions.forEach(function (s) {
      var units = s.area === 'inRoom' ? rec.unitPlan.inRoom : rec.unitPlan.stations;
      var box = el('div', { class: 'product' });
      box.appendChild(el('div', { class: 'product-head' }, el('h4', { text: s.title }), el('span', { class: 'muted small', text: fmt.int(units) + (units === 1 ? ' unit' : ' units') + ' for ' + s.covers.join(', ') })));
      var ul = el('ul', { class: 'lines' });
      s.products.forEach(function (p, i) { ul.appendChild(el('li', { class: i === 0 && s.exactMatch ? 'pick' : null }, el('span', { class: 'line-name' }, el('strong', { text: p.label }), el('span', { class: 'muted small', text: ' ' + p.name })), el('span', { class: 'line-price', text: p.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' ' + cur }))); });
      box.appendChild(ul);
      if (!s.exactMatch && s.notes.length) box.appendChild(el('p', { class: 'small muted', text: s.notes.join(' ') }));
      card.appendChild(box);
    });
    return card;
  }

  function renderMore(ctx) {
    var c = ctx.calc, inp = ctx.n.inputs, rec = ctx.rec;
    var d = el('details', { class: 'card fine' }, el('summary', { text: 'Logistics and per-room figures' }));
    var t = el('table', { class: 'kv' });
    function row(k, v) { t.appendChild(el('tr', {}, el('th', { text: k }), el('td', { text: v }))); }
    row('Cartons per year', fmt.int(c.logistics.cartonsPerYear));
    row('Pallets per year', fmt.dec(c.logistics.palletsPerYear, 0));
    row('Deliveries per year', fmt.int(c.logistics.deliveriesPerYear));
    row('Store area at peak', fmt.dec(c.logistics.storageM2, 1) + ' m2');
    row('Weight carried by staff per year', fmt.int(c.logistics.tonnesHandled) + ' t');
    row('Staff time as full-time equivalents', fmt.dec(c.labour.fteEquivalent, 2) + ' FTE');
    if (inp.rooms > 0) { row('Bottles per room per year', fmt.int(c.bottles.roomBottles / inp.rooms)); if (inp.pricePerBottle > 0) row('Spend per room per year', money(ctx, c.spend.annualLocal / inp.rooms)); }
    d.appendChild(t);
    return d;
  }

  function renderAdjust(ctx) {
    var inp = ctx.n.inputs, c = ctx.calc, prov = ctx.n.provenance, o = state.overrides;
    var card = el('details', { class: 'card fine adjust-card' }, el('summary', { text: 'Adjust the assumptions' }));
    var grid = el('div', { class: 'adjust', style: 'margin-top:12px' });
    function field(id, label, value, step, p, extra) {
      var d = el('div', {});
      d.appendChild(el('label', { for: 'ov-' + id, text: label }));
      d.appendChild(el('input', Object.assign({ class: 'input', id: 'ov-' + id, type: 'number', step: step, min: 0, value: value, onchange: function (e) { if (e.target.value === '') delete o[id]; else o[id] = Number(e.target.value); if (id === 'occupancy' && o[id] != null) o[id] = o[id] / 100; save(); renderResults(); } }, extra || {})));
      return d;
    }
    grid.appendChild(field('occupancy', 'Occupancy (%)', Math.round(inp.occupancy * 1000) / 10, 1, prov.occupancy, { max: 100 }));
    grid.appendChild(field('bottlesPerRoomNight', 'Bottles per room and night', inp.bottlesPerRoomNight, 0.5, prov.bottlesPerRoomNight));
    grid.appendChild(field('pricePerBottle', 'Price per bottle (' + inp.currency + ')', Math.round(inp.pricePerBottle * 1000) / 1000, 0.01, prov.pricePerBottle));
    grid.appendChild(field('otherBottlesPerDay', 'Bottles outside rooms per day', inp.otherBottlesPerDay, 1, null));
    if (c.env.packagingKg != null) grid.appendChild(field('bottleWeightG', 'Bottle weight (g)', Math.round(c.env.bottleWeightG * 100) / 100, 0.1, inp.bottleWeightOverrideG != null ? { kind: 'user' } : (inp.bottleSizeMl === 500 ? F.factors.pet_bottle_weight_500ml_g : { kind: 'derived' })));
    grid.appendChild(field('minutesPerRoomPerDay', 'Housekeeping minutes per room and day', inp.minutesPerRoomPerDay, 0.5, prov.minutesPerRoomPerDay));
    grid.appendChild(field('minutesPerCarton', 'Minutes per carton', inp.minutesPerCarton, 0.5, prov.minutesPerCarton));
    grid.appendChild(field('wageHourly', 'Hourly labour cost (' + inp.currency + ')', Math.round(inp.wageHourly * 100) / 100, 0.1, prov.wageHourly));
    grid.appendChild(field('stockWeeks', 'Weeks of stock on site', inp.stockWeeks, 1, prov.stockWeeks));
    card.appendChild(grid);
    card.appendChild(el('div', { class: 'actions' }, el('button', { type: 'button', class: 'btn btn-ghost', onclick: function () { var keep = { capex: o.capex, annualService: o.annualService, serviceReading: o.serviceReading, changeMonths: o.changeMonths }; state.overrides = {}; Object.keys(keep).forEach(function (k) { if (keep[k] != null) state.overrides[k] = keep[k]; }); save(); renderResults(); } }, 'Reset')));
    return card;
  }

  function renderSources(ctx) {
    var cc = ctx.n.country, prov = ctx.n.provenance;
    var card = el('details', { class: 'card fine' }, el('summary', { text: 'Where the numbers come from' }));
    var list = el('ul', { class: 'sources-list', style: 'margin-top:12px' });
    function item(label, p) {
      var li = el('li', {}, tag(p), ' ', el('strong', { text: label + ': ' }), p.label || '');
      var s = p.source; if (s && s.url) li.appendChild(el('span', {}, ' ', el('a', { href: s.url, rel: 'noopener', text: s.publisher || 'source' })));
      else if (p.url) li.appendChild(el('span', {}, ' ', el('a', { href: p.url, rel: 'noopener', text: 'source' })));
      return li;
    }
    list.appendChild(item('Occupancy', prov.occupancy));
    list.appendChild(item('Bottles per room-night', prov.bottlesPerRoomNight));
    list.appendChild(item('Price per bottle', prov.pricePerBottle));
    list.appendChild(item('Labour cost', prov.wageHourly));
    list.appendChild(item('Handling time', Object.assign({}, prov.minutesPerRoomPerDay, { label: ctx.n.inputs.minutesPerRoomPerDay + ' min per room and day, ' + ctx.n.inputs.minutesPerCarton + ' min per carton' })));
    ['pet_bottle_weight_500ml_g', 'co2e_kg_per_kg_pet', 'glass_co2e', 'co2e_kg_per_car_km', 'bottles_per_carton', 'bottles_per_pallet_500ml'].forEach(function (k) {
      var f = F.factors[k]; list.appendChild(item(f.label, { kind: f.kind, status: f.status, label: (typeof f.value === 'number' ? (Math.round(f.value * 1000) / 1000) + ' ' : '') + (f.unit || ''), source: f.source }));
    });
    if (cc.fx.source) list.appendChild(item('Exchange rate', { kind: cc.fx.kind, status: cc.fx.status, label: cc.fx.source.quote, source: cc.fx.source }));
    list.appendChild(item('Products and prices', { kind: 'sourced', label: PL.pricelist.source.title + ', ' + PL.pricelist.source.dated + ', excl. GST, currency assumed ' + PL.pricelist.currency.value }));
    card.appendChild(list);
    card.appendChild(el('p', { class: 'small muted' }, '"Unverified" means the page could not be opened when this version was built; see ', el('a', { href: 'sources.html', text: 'all sources and assumptions' }), '.'));
    return card;
  }

  /* ------------------------------------------------------------------ proposal request */
  function summaryText(ctx) {
    var a = state.answers, p = state.proposal, c = ctx.calc, rec = ctx.rec, inp = ctx.n.inputs, sym = inp.symbol;
    var L = [];
    L.push('SWISSPRO SUSTAINABILITY WIZARD, PROPOSAL REQUEST (' + new Date().toISOString().slice(0, 10) + ')');
    L.push('Hotel: ' + (p.hotel || '-') + ' | Contact: ' + (p.name || '-') + ' | Email: ' + (p.email || '-'));
    L.push('Market: ' + ctx.n.country.name + ' | Rooms: ' + fmt.int(inp.rooms) + ' | Occupancy: ' + fmt.pct(inp.occupancy) + ' | Today: ' + rec.segment.current + (inp.bottlesPerRoomNight ? ' | ' + inp.bottlesPerRoomNight + ' x ' + inp.bottleSizeMl + ' ml per room-night' : ''));
    L.push('Areas: ' + rec.segment.areas.join(', ') + (rec.segment.temps ? ' | Water in the room: ' + rec.segment.temps : ''));
    var extra = []; if (p.source) extra.push('Water supply: ' + (R.LABELS.source[p.source] || p.source)); if (p.halal) extra.push('Halal certificate requested'); if (p.timing) extra.push('Timing: ' + R.LABELS.timing[p.timing]); if (p.approval) extra.push('Approval: ' + R.LABELS.approval[p.approval]);
    if (extra.length) L.push(extra.join(' | '));
    L.push('');
    L.push('INDICATIVE RESULTS PER YEAR');
    L.push('- Bottles avoided: ' + fmt.int(c.bottles.total) + ' (' + fmt.int(c.env.litres) + ' L)');
    if (c.env.packagingKg != null) L.push('- Plastic avoided: ' + fmt.int(c.env.packagingKg) + ' kg');
    if (c.env.quantified) L.push('- CO2e avoided: ' + fmt.dec(c.env.co2eKg / 1000, 1) + ' t');
    L.push('- Bottled-water spend avoided: ' + (inp.pricePerBottle > 0 ? fmt.money(sym, c.spend.annualLocal, 0) + ' at ' + fmt.money(sym, inp.pricePerBottle, 2) + ' per bottle' : 'n/a'));
    L.push('- Staff time freed: ' + fmt.int(c.labour.hours) + ' h' + (c.labour.quantified ? ' = ' + fmt.money(sym, c.labour.costLocal, 0) : ''));
    L.push('- Service contract: ' + fmt.money(sym, ctx.pr.servicingLocal, 0) + ' per year (85.00 line read as ' + ctx.pr.reading + (ctx.pr.reading === 'perChange' ? ', change every ' + ctx.pr.months + ' months' : '') + '; stations 350.00 per year)');
    if (c.payback.available) L.push('- Payback: cash ' + fmt.years(c.payback.cashPaybackYears) + ', incl. staff time ' + fmt.years(c.payback.fullPaybackYears) + ' on ' + fmt.money(sym, c.payback.capex, 0) + ' (' + ctx.pr.capexSource + ')');
    L.push('');
    L.push('UNITS');
    rec.solutions.forEach(function (s) { L.push('- ' + s.areaLabel + ' (' + (s.area === 'inRoom' ? rec.unitPlan.inRoom : rec.unitPlan.stations) + ' units): ' + s.title + (s.products.length ? (s.exactMatch ? '; price list: ' : '; no exact line, section: ') + s.products.map(function (x) { return x.label + ' ' + x.price.toFixed(2); }).join(' / ') : '')); });
    L.push('');
    L.push('Assumptions and sources: ' + location.href.split('#')[0].replace(/index\.html$/, '') + 'sources.html');
    return L.join('\n');
  }

  function renderProposal(ctx) {
    var p = state.proposal;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'Request a proposal' }));

    var grid = el('div', { class: 'adjust' });
    Q.proposalFields.forEach(function (f) {
      var d = el('div', {});
      d.appendChild(el('label', { for: 'pf-' + f.id, text: f.label }));
      if (f.type === 'select') {
        var sel = el('select', { class: 'input', id: 'pf-' + f.id, onchange: function (e) { p[f.id] = e.target.value; save(); } });
        f.options.forEach(function (o) { var opt = el('option', { value: o.id, text: o.label }); if ((p[f.id] || '') === o.id) opt.selected = true; sel.appendChild(opt); });
        d.appendChild(sel);
      } else {
        d.appendChild(el('input', { class: 'input', id: 'pf-' + f.id, type: f.type, placeholder: f.placeholder || '', value: p[f.id] || '', oninput: function (e) { p[f.id] = e.target.value; save(); } }));
      }
      grid.appendChild(d);
    });
    card.appendChild(grid);
    var ta = el('textarea', { class: 'copy-area', readonly: 'readonly', 'aria-label': 'Summary text' });
    function refreshText() { ta.value = summaryText(compute()); return ta.value; }
    refreshText();
    function copyText(btn, text) { var done = function () { btn.textContent = 'Copied'; }; try { navigator.clipboard.writeText(text).then(done, function () { ta.select(); document.execCommand('copy'); done(); }); } catch (e) { ta.select(); document.execCommand('copy'); done(); } }
    var actions = el('div', { class: 'actions', style: 'margin-top:14px' },
      el('a', { class: 'btn btn-primary', href: '#', onclick: function (e) { e.preventDefault(); var txt = refreshText(); var subject = 'Proposal request via the Sustainability Wizard' + (p.hotel ? ': ' + p.hotel : ''); window.location.href = 'mailto:' + PL.leadEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(txt); } }, ARTIFACT ? 'Open email draft' : 'Email the request to Swisspro'),
      el('button', { type: 'button', class: 'btn btn-secondary', onclick: function () { copyText(this, refreshText()); } }, 'Copy the summary'),
      el('button', { type: 'button', class: 'btn btn-secondary', onclick: function () { copyText(this, PL.leadEmail); } }, 'Copy Swisspro\'s email address'),
      ARTIFACT ? null : el('button', { type: 'button', class: 'btn btn-secondary', onclick: function () { window.print(); } }, 'Print or save as PDF'),
      el('button', { type: 'button', class: 'btn btn-ghost', onclick: function () { state.view = 'wizard'; state.step = 0; save(); render(); scrollTop(); } }, 'Change my answers'),
      el('button', { type: 'button', class: 'btn btn-ghost', onclick: restart }, 'Start over'));
    card.appendChild(actions);
    if (ARTIFACT) card.appendChild(el('p', { class: 'small muted', text: 'In this preview the email button may do nothing; copy the summary instead.' }));
    card.appendChild(el('details', {}, el('summary', { text: 'Show the summary text' }), ta));
    return card;
  }

  /* ------------------------------------------------------------------ router */
  function render() {
    document.getElementById('restart-top').hidden = state.view === 'intro';
    if (state.view === 'wizard') renderStep();
    else if (state.view === 'results') renderResults();
    else renderIntro();
  }
  document.getElementById('restart-top').addEventListener('click', restart);
  window.SW.app = { state: function () { return state; }, compute: compute, summaryText: summaryText, render: render };
  render();
})();
