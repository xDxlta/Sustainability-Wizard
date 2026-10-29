/* Swisspro Sustainability Wizard - UI (version 2). Vanilla JS, no build step. */
(function () {
  'use strict';
  var F = window.SW.factors, E = window.SW.engine, PL = window.SW.pricelist, Q = window.SW.questions,
      M = window.SW.model, R = window.SW.recommend, fmt = window.SW.format;
  var STORE = 'swisspro-wizard-v2';
  var ARTIFACT = !!window.SW_ARTIFACT; // hosted preview frame: no print dialog, no mailto, no confirm()
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
      el('h1', { text: 'What would switching from bottled water to Swisspro filtered water mean for your hotel?' }),
      el('p', { class: 'lead', text: 'Answer a few multiple-choice questions, about two minutes, no spreadsheets. You get the bottles and plastic avoided, the money and housekeeping time saved, the payback, and the Swisspro set-up that fits your rooms and outlets.' }),
      el('ul', { class: 'benefits' },
        el('li', {}, el('strong', { text: 'Return on investment' }), 'Bottled-water spend avoided and payback, cash only and with the value of staff time.'),
        el('li', {}, el('strong', { text: 'Operations' }), 'Housekeeping hours, deliveries, pallets and storage, behind "show more".'),
        el('li', {}, el('strong', { text: 'Sustainability' }), 'Plastic and greenhouse gas avoided, with the source of every factor.'),
        el('li', {}, el('strong', { text: 'The right set-up' }), 'An in-room unit or a drinking station that matches placement, water type and water supply.')
      ),
      el('div', { class: 'actions' },
        el('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: function () { state.view = 'wizard'; state.step = 0; save(); render(); } }, 'Start, about 2 minutes'),
        Object.keys(state.answers).length ? el('button', { class: 'btn btn-secondary', type: 'button', onclick: function () { state.view = 'wizard'; save(); render(); } }, 'Continue where I left off') : null
      ),
      el('p', { class: 'small muted', text: 'Every figure is labelled as sourced, derived or assumed, and you can adjust any assumption on the result page. Nothing is sent anywhere unless you choose to request a proposal.' })
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
      el('div', { class: 'progress-bar' }, el('span', { style: 'width:' + Math.round(state.step / steps.length * 100) + '%' }))));

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
        var group = el('div', { class: 'options', role: f.type === 'single' ? 'radiogroup' : 'group', 'aria-labelledby': f.label ? 'lbl-' + f.id : 'step-title' });
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
            o.desc ? el('span', { class: 'opt-desc', text: o.desc }) : null,
            o.kind ? tag({ kind: o.kind, status: o.status }) : null));
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
    var o = state.overrides, toLocal = listToLocal(inputs);
    var units = rec.unitPlan.inRoom + rec.unitPlan.stations;
    var interval = o.serviceIntervalYears != null ? Number(o.serviceIntervalYears) : PL.pricelist.servicing.intervalYears.value;
    var servicingListPerYear = units * PL.servicingPerUnitPerYear(interval);
    var servicingLocal = o.annualService != null ? Number(o.annualService) : toLocal(servicingListPerYear);
    var capexLocal = null, capexSource = 'none', lines = [];
    if (o.capex != null && Number(o.capex) > 0) { capexLocal = Number(o.capex); capexSource = 'user'; }
    else if (PL.loaded()) {
      rec.solutions.forEach(function (s) {
        var p = s.products && s.products[0]; var n = s.area === 'inRoom' ? rec.unitPlan.inRoom : rec.unitPlan.stations;
        if (p && p.price != null) { lines.push({ title: p.name, units: n, local: toLocal(p.price * n) }); capexLocal = (capexLocal || 0) + toLocal(p.price * n); }
      });
      if (capexLocal != null) capexSource = 'pricelist';
    }
    return { units: units, interval: interval, servicingListPerYear: servicingListPerYear, servicingLocal: servicingLocal, servicingSource: o.annualService != null ? 'user' : 'pricelist', capexLocal: capexLocal, capexSource: capexSource, lines: lines, toLocal: toLocal };
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
    root.appendChild(el('h2', { text: 'Your indicative business case' + (state.proposal.hotel ? ': ' + state.proposal.hotel : '') }));
    root.appendChild(el('div', { class: 'summary-chips' },
      el('span', { text: n.country.name }), el('span', { text: rec.segment.tier }), el('span', { text: rec.segment.build }),
      el('span', { text: fmt.int(inp.rooms) + ' rooms' }), el('span', { text: fmt.pct(inp.occupancy) + ' occupancy' }), el('span', { text: rec.segment.current })));
    if (F.verification) root.appendChild(el('p', { class: 'notice small', text: 'Figures marked "unverified" rest on published values that could not be opened when this version was built; see the sources list at the end and VERIFY.md in the project.' }));

    /* tiles */
    var tiles = el('div', { class: 'tiles' });
    tiles.appendChild(el('div', { class: 'tile' }, el('div', { class: 'label', text: 'Single-use bottles avoided per year' }),
      el('div', { class: 'value', text: fmt.int(c.bottles.total) }),
      el('div', { class: 'sub', text: fmt.int(c.bottles.roomBottles) + ' in guest rooms' + (c.bottles.otherBottles ? ', ' + fmt.int(c.bottles.otherBottles) + ' elsewhere' : '') + ', ' + fmt.int(c.env.litres) + ' litres' }),
      basis([{ text: fmt.int(inp.rooms) + ' rooms', tag: tag('user') }, { text: fmt.pct(inp.occupancy) + ' occupancy', tag: tag(prov.occupancy) }, { text: inp.bottlesPerRoomNight + ' bottles per night', tag: tag(prov.bottlesPerRoomNight) }, { text: '365 days' }])));
    tiles.appendChild(el('div', { class: 'tile' }, el('div', { class: 'label', text: 'Plastic packaging avoided per year' }),
      el('div', { class: 'value', text: c.env.packagingKg != null ? fmt.int(c.env.packagingKg) : '-' }, el('span', { class: 'unit', text: c.env.packagingKg != null ? ' kg' : '' })),
      el('div', { class: 'sub', text: c.env.packagingKg != null ? 'at ' + fmt.dec(c.env.bottleWeightG, 1) + ' g per ' + sizeLabel(inp.bottleSizeMl) + ' bottle' : (inp.glassReusable ? 'Reusable glass already avoids single-use packaging.' : 'Glass bottles: no published bottle weight in the register, so not estimated.') }),
      c.env.packagingKg != null ? basis([{ text: 'bottle weight', tag: inp.bottleWeightOverrideG != null ? tag('user') : (inp.bottleSizeMl === 500 ? tag(F.factors.pet_bottle_weight_500ml_g) : tag({ kind: 'derived' }, 'Derived from 500 ml')) }]) : null));
    tiles.appendChild(el('div', { class: 'tile' }, el('div', { class: 'label', text: 'Greenhouse gas avoided per year' }),
      el('div', { class: 'value', text: c.env.quantified ? fmt.dec(c.env.co2eKg / 1000, 1) : '-' }, el('span', { class: 'unit', text: c.env.quantified ? ' t CO2e' : '' })),
      el('div', { class: 'sub', text: c.env.quantified ? 'about ' + fmt.int(c.env.co2eCarKm) + ' km in an average petrol car; bottle production only (transport, chilling and disposal not included)' : 'Not estimated for glass bottles: no source for a glass factor could be opened for this version (details under "Where the numbers come from").' }),
      c.env.quantified ? basis([{ text: 'PET factor ' + fmt.dec(F.factors.co2e_kg_per_kg_pet.value, 2) + ' kg CO2e per kg', tag: tag(F.factors.co2e_kg_per_kg_pet) }]) : null));
    tiles.appendChild(el('div', { class: 'tile' }, el('div', { class: 'label', text: 'Bottled-water spend avoided per year' }),
      el('div', { class: 'value', text: inp.pricePerBottle > 0 ? money(ctx, c.spend.annualLocal) : '-' }),
      el('div', { class: 'sub', text: inp.pricePerBottle > 0 ? 'at ' + fmt.money(inp.symbol, inp.pricePerBottle, inp.decimals === 0 ? 0 : 2) + ' per bottle' + usd(ctx, c.spend.annualLocal) : 'No bottle price set; enter one under "Adjust the assumptions".' }),
      basis([{ text: 'price per bottle', tag: tag(prov.pricePerBottle) }, { text: 'bottles' }])));
    tiles.appendChild(el('div', { class: 'tile' }, el('div', { class: 'label', text: 'Housekeeping and stewarding time freed per year' }),
      el('div', { class: 'value', text: fmt.int(c.labour.hours) }, el('span', { class: 'unit', text: ' hours' })),
      el('div', { class: 'sub', text: c.labour.quantified ? 'worth ' + money(ctx, c.labour.costLocal) + ' at ' + fmt.money(inp.symbol, c.labour.wageHourly, 2) + ' per hour' : 'Enter an hourly wage below to value it.' }),
      basis([{ text: inp.minutesPerRoomPerDay + ' min per occupied room', tag: tag(prov.minutesPerRoomPerDay) }, { text: inp.minutesPerCarton + ' min per carton', tag: tag(prov.minutesPerCarton) }, { text: 'wage', tag: tag(prov.wageHourly) }])));
    root.appendChild(tiles);
    if (a.current === 'glass_own') root.appendChild(el('p', { class: 'notice notice-info', text: 'You already bottle in reusable glass, so the plastic figure does not apply. The case for in-room filtration is labour (no bottle rounds, no washing cycle for room bottles), storage and water available at any time.' }));

    root.appendChild(renderPayback(ctx));
    root.appendChild(renderMore(ctx));
    root.appendChild(renderSolution(ctx));
    root.appendChild(renderWater(ctx));
    root.appendChild(renderCase(ctx));
    root.appendChild(renderAdjust(ctx));
    root.appendChild(renderSources(ctx));
    root.appendChild(renderProposal(ctx));
    app.appendChild(root);
    document.getElementById('restart-top').hidden = false;
  }

  function renderPayback(ctx) {
    var c = ctx.calc, inp = ctx.n.inputs, pr = ctx.pr, o = state.overrides;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'Payback' }));
    card.appendChild(el('p', { class: 'small muted', text: 'Cash payback counts only the bottled-water spend avoided; the second view adds the value of the staff time freed. Both use the yearly service contract from the price list.' }));
    var grid = el('div', { class: 'adjust', style: 'margin-bottom:14px' });
    grid.appendChild(el('div', {},
      el('label', { for: 'ov-capex' }, 'Investment for ' + fmt.int(pr.units) + ' units incl. installation (' + inp.currency + ') ', pr.capexSource === 'pricelist' ? tag({ kind: 'sourced' }, 'Price list') : (pr.capexSource === 'user' ? tag('user') : tag({ kind: 'missing' }, 'Not available'))),
      el('input', { class: 'input', id: 'ov-capex', type: 'number', min: 0, step: 1, value: o.capex != null ? o.capex : (pr.capexLocal != null ? Math.round(pr.capexLocal) : ''), placeholder: PL.loaded() ? 'from the price list' : 'from your Swisspro proposal', onchange: function (e) { o.capex = e.target.value === '' ? null : Number(e.target.value); save(); renderResults(); } })));
    grid.appendChild(el('div', {},
      el('label', { for: 'ov-interval' }, 'Replacement interval of the service contract (years) ', tag({ kind: 'assumption' })),
      el('input', { class: 'input', id: 'ov-interval', type: 'number', min: 1, max: 5, step: 1, value: pr.interval, onchange: function (e) { o.serviceIntervalYears = Number(e.target.value) || PL.pricelist.servicing.intervalYears.value; delete o.annualService; save(); renderResults(); } })));
    grid.appendChild(el('div', {},
      el('label', { for: 'ov-service' }, 'Yearly service contract, all units (' + inp.currency + ') ', pr.servicingSource === 'user' ? tag('user') : tag({ kind: 'derived' })),
      el('input', { class: 'input', id: 'ov-service', type: 'number', min: 0, step: 1, value: Math.round(pr.servicingLocal), onchange: function (e) { o.annualService = e.target.value === '' ? null : Number(e.target.value); save(); renderResults(); } })));
    card.appendChild(grid);
    card.appendChild(el('p', { class: 'small muted' },
      'Service contract: "' + PL.pricelist.servicing.name + '" at ' + PL.pricelist.servicing.price.toFixed(2) + ' per unit (price list line, ' + PL.pricelist.currency.value + ' ', tag({ kind: 'assumption' }, 'currency assumed'), '), read as one replacement per unit every ' + pr.interval + ' years ', tag({ kind: 'assumption' }), ': ' + fmt.int(pr.units) + ' units x ' + PL.pricelist.servicing.price.toFixed(2) + ' / ' + pr.interval + ' = ' + fmt.int(pr.servicingListPerYear) + ' ' + PL.pricelist.currency.value + ' per year, converted at the register\'s exchange rates ', tag({ kind: 'sourced', status: F.UNVERIFIED }), '.'));
    if (!PL.loaded()) card.appendChild(el('p', { class: 'notice', text: 'The Hospitality price list is not loaded in this version, so the investment has to come from your Swisspro proposal. Once the list is loaded, the unit prices fill in automatically.' }));
    if (c.payback.available) {
      var pb = c.payback;
      var two = el('div', { class: 'two-col' });
      var left = el('table', { class: 'kv' });
      left.appendChild(el('tr', {}, el('th', { text: 'Investment' }), el('td', { text: money(ctx, pb.capex) + usd(ctx, pb.capex) })));
      left.appendChild(el('tr', {}, el('th', { text: 'Yearly service contract' }), el('td', { text: money(ctx, pb.annualService) })));
      left.appendChild(el('tr', {}, el('th', { text: 'Bottled-water spend avoided per year' }), el('td', { text: money(ctx, c.spend.annualLocal) })));
      left.appendChild(el('tr', {}, el('th', { text: 'Value of staff time freed per year' }), el('td', { text: c.labour.quantified ? money(ctx, c.labour.costLocal) : '-' })));
      var right = el('table', { class: 'kv' });
      right.appendChild(el('tr', {}, el('th', { text: 'Cash payback' }), el('td', { text: fmt.years(pb.cashPaybackYears) })));
      right.appendChild(el('tr', {}, el('th', { text: 'Payback including staff time' }), el('td', { text: fmt.years(pb.fullPaybackYears) })));
      right.appendChild(el('tr', {}, el('th', { text: 'Five-year net saving, cash' }), el('td', { text: money(ctx, pb.fiveYearNetCash) })));
      right.appendChild(el('tr', {}, el('th', { text: 'Five-year net saving incl. staff time' }), el('td', { text: money(ctx, pb.fiveYearNetFull) })));
      two.appendChild(left); two.appendChild(right); card.appendChild(two);
      if (inp.pricePerBottle === 0) card.appendChild(el('p', { class: 'notice', text: 'No bottle price is set, so the cash payback cannot be computed. Enter a price under "Adjust the assumptions".' }));
      card.appendChild(el('p', { class: 'small muted', text: R.approvalNote(pb.capex * inp.usdPerLocal) }));
    } else {
      card.appendChild(el('p', { class: 'small muted', text: 'Enter the investment to see the payback. Yearly service contract so far: ' + money(ctx, pr.servicingLocal) + ' against ' + money(ctx, c.spend.annualLocal) + ' of bottled-water spend avoided and ' + (c.labour.quantified ? money(ctx, c.labour.costLocal) : '-') + ' of staff time per year.' }));
      card.appendChild(el('p', { class: 'small muted', text: R.approvalNote(null) }));
    }
    return card;
  }

  function renderMore(ctx) {
    var c = ctx.calc, inp = ctx.n.inputs, prov = ctx.n.provenance;
    var d = el('details', { class: 'card' }, el('summary', { text: 'Show more: logistics, storage and per-room figures' }));
    var t = el('table', { class: 'kv', style: 'margin-top:12px' });
    function row(k, v) { t.appendChild(el('tr', {}, el('th', { text: k }), el('td', { text: v }))); }
    row('Cartons handled per year', fmt.int(c.logistics.cartonsPerYear) + ' (24 per carton)');
    row('Pallets per year', fmt.dec(c.logistics.palletsPerYear, 0) + ' (1,872 bottles of 500 ml per pallet)');
    row('Deliveries per year', fmt.int(c.logistics.deliveriesPerYear) + ' at ' + inp.stockWeeks + ' weeks of stock');
    row('Store area at peak stock', fmt.dec(c.logistics.storageM2, 1) + ' m2 of pallet footprint, no aisles');
    row('Weight carried by staff per year', fmt.int(c.logistics.tonnesHandled) + ' tonnes');
    row('Staff time as full-time equivalents', fmt.dec(c.labour.fteEquivalent, 2) + ' FTE (2,080 h per year)');
    if (c.env.quantified) row('Greenhouse gas as car travel', fmt.int(c.env.co2eCarKm) + ' km in an average petrol car');
    if (inp.rooms > 0) { row('Bottles per room per year', fmt.int(c.bottles.roomBottles / inp.rooms)); if (inp.pricePerBottle > 0) row('Bottled-water spend per room per year', money(ctx, c.spend.annualLocal / inp.rooms)); }
    d.appendChild(t);
    d.appendChild(el('p', { class: 'small muted', style: 'margin-top:10px' }, 'Basis: cartons, pallets and pallet footprint ', tag({ kind: 'sourced', status: F.UNVERIFIED }), '; stock weeks ', tag(prov.stockWeeks), '; bottle weight and water density for the tonnes.'));
    return d;
  }

  function renderSolution(ctx) {
    var rec = ctx.rec, pr = ctx.pr;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'The Swisspro set-up that fits' }));
    card.appendChild(el('p', { class: 'small muted', text: rec.unitPlan.note }));
    rec.solutions.forEach(function (s) {
      var units = s.area === 'inRoom' ? rec.unitPlan.inRoom : rec.unitPlan.stations;
      var box = el('div', { class: 'product' });
      box.appendChild(el('div', { class: 'small muted', text: s.areaLabel + ' section of the price list, for: ' + s.covers.join(', ') + (units ? ' (' + fmt.int(units) + (units === 1 ? ' unit' : ' units') + ')' : '') }));
      box.appendChild(el('h4', { text: s.title }));
      box.appendChild(el('p', { class: 'summary', text: s.description }));
      if (s.requiredTemps.length) box.appendChild(el('p', { class: 'small muted', style: 'margin:6px 0 0', text: 'Water types requested: ' + s.requiredTemps.map(function (t) { return R.TEMP_LABEL[t] || t; }).join(', ') + '.' }));
      if (s.products && s.products.length) {
        var ul = el('ul', {});
        s.products.forEach(function (p) { ul.appendChild(el('li', { text: p.name + (p.price != null ? ': ' + p.price.toLocaleString('en-US') + ' ' + PL.pricelist.currency.value + ' ' + (p.unit || 'per unit') : '') })); });
        box.appendChild(ul);
      }
      box.appendChild(el('p', { class: 'small', style: 'margin:8px 0 0' }, tag({ kind: PL.loaded() ? 'sourced' : 'missing' }, PL.loaded() ? 'Price list' : 'Price list not loaded'), ' ' + s.productNote));
      if (s.notes.length) box.appendChild(el('ul', { class: 'area-notes', style: 'margin:10px 0 0' }, s.notes.map(function (t) { return el('li', { text: t }); })));
      card.appendChild(box);
    });
    if (!rec.solutions.length) card.appendChild(el('p', { class: 'muted', text: 'Select at least one area to get a recommendation.' }));
    return card;
  }

  function renderWater(ctx) {
    var f = ctx.rec.filtration;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'Your water supply and the filtration' }));
    card.appendChild(el('p', { text: f.summary }));
    if (f.notes.length) card.appendChild(el('ul', { class: 'area-notes' }, f.notes.map(function (t) { return el('li', { text: t }); })));
    var flags = [];
    if (f.flags.waterTest) flags.push('Water test before the proposal');
    if (f.flags.pretreatment) flags.push('Pre-treatment or sediment pre-filter to be sized');
    if (f.flags.halal === 'yes') flags.push('Halal certificate requested with the proposal');
    if (f.flags.halal === 'ask') flags.push('Halal certificate on request');
    if (flags.length) card.appendChild(el('p', { class: 'small', text: 'For the proposal: ' + flags.join('; ') + '.' }));
    return card;
  }

  function renderCase(ctx) {
    var rec = ctx.rec, cc = ctx.n.country;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'How to present the case internally' }));
    card.appendChild(el('p', { class: 'small muted', text: 'Ordered for a ' + rec.segment.tier.toLowerCase() + ' hotel in ' + cc.name + (rec.cheapWater ? ', where bottled water is cheap' : '') + '. Marriott\'s APAC procurement lead ranks the drivers ROI, then efficiency and guest experience, then sustainability (interview, October 2026).' }));
    card.appendChild(el('ol', { class: 'ordered' }, rec.arguments.map(function (x) { return el('li', {}, el('strong', { text: x.title }), el('div', { class: 'small', text: x.why })); })));
    if (cc.context.length) {
      card.appendChild(el('h4', { style: 'margin:18px 0 6px', text: 'Local rules and standards that point the same way' }));
      card.appendChild(el('ul', { class: 'sources-list' }, cc.context.map(function (x) { return el('li', {}, x.text + ' ', x.url ? el('a', { href: x.url, rel: 'noopener', text: 'source' }) : null, ' ', tag({ kind: 'sourced', status: x.status })); })));
    }
    return card;
  }

  function renderAdjust(ctx) {
    var inp = ctx.n.inputs, c = ctx.calc, prov = ctx.n.provenance, o = state.overrides;
    var card = el('section', { class: 'card adjust-card' });
    card.appendChild(el('h3', { text: 'Adjust the assumptions' }));
    card.appendChild(el('p', { class: 'small muted', text: 'Change any input and the results update. Labels show where the current value comes from.' }));
    var grid = el('div', { class: 'adjust' });
    function field(id, label, value, step, p, extra) {
      var d = el('div', {});
      d.appendChild(el('label', { for: 'ov-' + id }, label + ' ', tag(p)));
      d.appendChild(el('input', Object.assign({ class: 'input', id: 'ov-' + id, type: 'number', step: step, min: 0, value: value, onchange: function (e) { if (e.target.value === '') delete o[id]; else o[id] = Number(e.target.value); if (id === 'occupancy' && o[id] != null) o[id] = o[id] / 100; save(); renderResults(); } }, extra || {})));
      return d;
    }
    grid.appendChild(field('occupancy', 'Occupancy (%)', Math.round(inp.occupancy * 1000) / 10, 1, prov.occupancy, { max: 100 }));
    grid.appendChild(field('bottlesPerRoomNight', 'Bottles per occupied room per night', inp.bottlesPerRoomNight, 0.5, prov.bottlesPerRoomNight));
    grid.appendChild(field('pricePerBottle', 'Price per bottle (' + inp.currency + ')', Math.round(inp.pricePerBottle * 1000) / 1000, 0.01, prov.pricePerBottle));
    if (c.env.packagingKg != null) grid.appendChild(field('bottleWeightG', 'Empty bottle weight (g)', Math.round(c.env.bottleWeightG * 100) / 100, 0.1, inp.bottleWeightOverrideG != null ? { kind: 'user' } : (inp.bottleSizeMl === 500 ? F.factors.pet_bottle_weight_500ml_g : { kind: 'derived' })));
    grid.appendChild(field('minutesPerRoomPerDay', 'Housekeeping minutes per occupied room per day', inp.minutesPerRoomPerDay, 0.5, prov.minutesPerRoomPerDay));
    grid.appendChild(field('minutesPerCarton', 'Handling minutes per carton', inp.minutesPerCarton, 0.5, prov.minutesPerCarton));
    grid.appendChild(field('wageHourly', 'Hourly labour cost (' + inp.currency + ')', Math.round(inp.wageHourly * 100) / 100, 0.1, prov.wageHourly));
    grid.appendChild(field('stockWeeks', 'Weeks of stock kept on site', inp.stockWeeks, 1, prov.stockWeeks));
    card.appendChild(grid);
    card.appendChild(el('div', { class: 'actions' }, el('button', { type: 'button', class: 'btn btn-ghost', onclick: function () { var keep = { capex: o.capex, annualService: o.annualService, serviceIntervalYears: o.serviceIntervalYears }; state.overrides = {}; Object.keys(keep).forEach(function (k) { if (keep[k] != null) state.overrides[k] = keep[k]; }); save(); renderResults(); } }, 'Reset to reference values')));
    return card;
  }

  function renderSources(ctx) {
    var cc = ctx.n.country, prov = ctx.n.provenance;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'Where the numbers come from' }));
    card.appendChild(el('p', { class: 'small muted', text: F.verification.note }));
    var list = el('ul', { class: 'sources-list' });
    function item(label, p) {
      var li = el('li', {}, tag(p), ' ', el('strong', { text: label + ': ' }), p.label || '');
      if (p.note) li.appendChild(el('span', { class: 'muted', text: ' ' + p.note }));
      var s = p.source; if (s && s.quote) li.appendChild(el('span', { class: 'muted', text: ' Quoted: "' + s.quote + '"' }));
      if (s && s.url) li.appendChild(el('span', {}, ' ', el('a', { href: s.url, rel: 'noopener', text: s.publisher || 'source' })));
      else if (p.url) li.appendChild(el('span', {}, ' ', el('a', { href: p.url, rel: 'noopener', text: 'source' })));
      if (p.rule) li.appendChild(el('span', { class: 'muted', text: ' Choice rule: ' + p.rule }));
      return li;
    }
    list.appendChild(item('Occupancy', Object.assign({}, prov.occupancy, { rule: prov.occupancy.kind === 'user' ? null : cc.occupancy.rule })));
    list.appendChild(item('Bottles per room-night', prov.bottlesPerRoomNight));
    list.appendChild(item('Bottle size', prov.bottleSizeMl));
    list.appendChild(item('Price per bottle', Object.assign({}, prov.pricePerBottle, { rule: prov.pricePerBottle.kind === 'sourced' ? F.rules.bottlePrice : null })));
    list.appendChild(item('Labour cost', Object.assign({}, prov.wageHourly, { rule: prov.wageHourly.kind === 'user' ? null : cc.wageMonthly.rule })));
    list.appendChild(item('Handling time per room', prov.minutesPerRoomPerDay));
    list.appendChild(item('Handling time per carton', prov.minutesPerCarton));
    list.appendChild(item('Stock on hand', prov.stockWeeks));
    ['pet_bottle_weight_500ml_g', 'pet_bottle_weight_scaling', 'co2e_kg_per_kg_pet', 'co2e_kg_per_car_km', 'glass_co2e', 'bottles_per_carton', 'bottles_per_pallet_500ml', 'pallet_footprint_m2', 'working_hours_per_fte_year', 'cheap_water_threshold_usd'].forEach(function (k) {
      var f = F.factors[k]; list.appendChild(item(f.label, { kind: f.kind, status: f.status, label: (typeof f.value === 'number' ? (Math.round(f.value * 1000) / 1000) + ' ' : (f.value == null ? 'not available ' : '')) + (f.unit || ''), note: f.note, source: f.source, rule: f.rule }));
    });
    if (cc.fx.source) list.appendChild(item('Exchange rate', { kind: cc.fx.kind, status: cc.fx.status, label: cc.fx.source.quote, source: cc.fx.source, rule: cc.fx.rule }));
    list.appendChild(item('Service contract price', { kind: 'sourced', label: PL.pricelist.servicing.price.toFixed(2) + ' per unit, "' + PL.pricelist.servicing.name + '"', note: PL.pricelist.servicing.source + '. Interval: ' + PL.pricelist.servicing.intervalYears.note + ' Currency: ' + PL.pricelist.currency.note }));
    card.appendChild(list);
    card.appendChild(el('p', { class: 'small muted' }, 'Full register with quotes and access dates: ', el('a', { href: 'sources.html', text: 'Sources and assumptions' }), '. Figures are indicative; a Swisspro site survey and proposal confirm them.'));
    return card;
  }

  /* ------------------------------------------------------------------ proposal request */
  function summaryText(ctx) {
    var a = state.answers, p = state.proposal, c = ctx.calc, rec = ctx.rec, inp = ctx.n.inputs, sym = inp.symbol;
    var L = [];
    L.push('SWISSPRO SUSTAINABILITY WIZARD, PROPOSAL REQUEST (' + new Date().toISOString().slice(0, 10) + ')');
    L.push('Hotel: ' + (p.hotel || '-') + ' | Contact: ' + (p.name || '-') + ' | Email: ' + (p.email || '-'));
    L.push('Market: ' + ctx.n.country.name + ' | ' + rec.segment.tier + ' | ' + rec.segment.build);
    L.push('Rooms: ' + fmt.int(inp.rooms) + ' | Occupancy: ' + fmt.pct(inp.occupancy) + ' | Today: ' + rec.segment.current + (inp.bottlesPerRoomNight ? ' | ' + inp.bottlesPerRoomNight + ' x ' + inp.bottleSizeMl + ' ml per room-night' : ''));
    L.push('Areas: ' + rec.segment.areas.join(', '));
    if (p.timing || p.approval) L.push('Timing: ' + (R.LABELS.timing[p.timing] || 'not decided') + ' | Approval: ' + (R.LABELS.approval[p.approval] || 'not sure'));
    L.push('');
    L.push('INDICATIVE RESULTS PER YEAR');
    L.push('- Bottles avoided: ' + fmt.int(c.bottles.total) + ' (' + fmt.int(c.env.litres) + ' L)');
    if (c.env.packagingKg != null) L.push('- Plastic avoided: ' + fmt.int(c.env.packagingKg) + ' kg');
    if (c.env.quantified) L.push('- CO2e avoided: ' + fmt.dec(c.env.co2eKg / 1000, 1) + ' t (bottle production only)');
    L.push('- Bottled-water spend avoided: ' + (inp.pricePerBottle > 0 ? fmt.money(sym, c.spend.annualLocal, 0) + ' at ' + fmt.money(sym, inp.pricePerBottle, 2) + ' per bottle' : 'n/a'));
    L.push('- Staff time freed: ' + fmt.int(c.labour.hours) + ' h' + (c.labour.quantified ? ' = ' + fmt.money(sym, c.labour.costLocal, 0) : ''));
    if (c.payback.available) L.push('- Payback: cash ' + fmt.years(c.payback.cashPaybackYears) + ', incl. staff time ' + fmt.years(c.payback.fullPaybackYears) + ' on ' + fmt.money(sym, c.payback.capex, 0) + ' (' + ctx.pr.capexSource + ')');
    L.push('');
    L.push('SET-UP REQUESTED');
    rec.solutions.forEach(function (s) { L.push('- ' + s.areaLabel + ' (' + (s.area === 'inRoom' ? rec.unitPlan.inRoom : rec.unitPlan.stations) + ' units): ' + s.title + '; water types: ' + s.requiredTemps.join(', ') + (s.products && s.products.length ? '; listed: ' + s.products.map(function (x) { return x.name; }).join(' / ') : '')); });
    if (has(a.areas, 'rooms')) L.push('- Placement: ' + a.placement + ' | temperatures: ' + a.temps);
    L.push('- Water supply: ' + a.source + (a.issues && a.issues.length ? ' | issues: ' + a.issues.join(', ') : '') + ' | Halal: ' + a.halal);
    var fl = rec.filtration.flags; var want = []; if (fl.waterTest) want.push('water test'); if (fl.pretreatment) want.push('pre-treatment sizing'); if (fl.halal !== 'no') want.push('Halal certificate'); if (want.length) L.push('- For the proposal: ' + want.join(', '));
    L.push('');
    L.push('Assumptions and sources: ' + location.href.split('#')[0].replace(/index\.html$/, '') + 'sources.html');
    return L.join('\n');
  }

  function renderProposal(ctx) {
    var p = state.proposal;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'Request a proposal' }));
    card.appendChild(el('p', { class: 'small muted', text: 'Optional. Swisspro uses this summary to prepare the site survey, the water test and a proposal per area. Nothing is sent automatically.' }));
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
    card.appendChild(el('p', { class: 'small muted', text: (ARTIFACT ? 'In this preview the email button may do nothing. ' : '') + 'Send the summary to ' + PL.leadEmail + ' from your own email program if the button does not open one.' }));
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
