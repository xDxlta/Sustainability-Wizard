/* Swisspro Sustainability Wizard - UI. Vanilla JS, no build step. */
(function () {
  'use strict';
  var F = window.SW.factors, E = window.SW.engine, P = window.SW.products, PR = window.SW.pricing,
      Q = window.SW.questions, M = window.SW.model, R = window.SW.recommend, fmt = window.SW.format;
  var STORE = 'swisspro-wizard-v1';
  var app = document.getElementById('app');
  var state = load() || { view: 'intro', step: 0, answers: {}, overrides: {} };

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
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tag(kind, text) {
    var names = { sourced: 'Sourced', 'sourced-secondary': 'Sourced (secondary)', derived: 'Derived', assumption: 'Assumption', user: 'Your input', constant: 'Constant', missing: 'Missing', config: 'Config' };
    return el('span', { class: 'tag tag-' + kind, text: text || names[kind] || kind });
  }
  function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function visibleSteps() { return Q.steps.filter(function (s) { return !s.showIf || s.showIf(state.answers); }); }
  function fieldOptions(f) { return f.dynamic === 'bottlePrices' ? M.bottlePriceOptions(F, state.answers.country) : f.options; }
  function has(arr, v) { return (arr || []).indexOf(v) >= 0; }

  /* ------------------------------------------------------------------ intro */
  function renderIntro() {
    app.innerHTML = '';
    var hero = el('section', { class: 'hero' },
      el('h1', { text: 'What would switching from bottled water to Swisspro filtered water mean for your hotel?' }),
      el('p', { class: 'lead', text: 'Answer ten multiple-choice questions - no spreadsheets needed - and get an indicative business case: bottles and plastic avoided, money and housekeeping time saved, storage freed, the payback, and the Swisspro set-up that fits each area of your property.' }),
      el('ul', { class: 'benefits' },
        el('li', {}, el('strong', { text: 'ROI first' }), 'Bottled-water spend avoided and payback, in your currency.'),
        el('li', {}, el('strong', { text: 'Operations' }), 'Housekeeping hours, pallets, deliveries and tonnes carried.'),
        el('li', {}, el('strong', { text: 'Sustainability' }), 'Plastic and CO2e avoided with published factors.'),
        el('li', {}, el('strong', { text: 'The right product' }), 'Filter grade for your water and a unit for each area, like configuring online.')
      ),
      el('div', { class: 'actions' },
        el('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: function () { state.view = 'wizard'; state.step = 0; save(); render(); } }, 'Start - about 3 minutes'),
        Object.keys(state.answers).length ? el('button', { class: 'btn btn-secondary', type: 'button', onclick: function () { state.view = 'wizard'; save(); render(); } }, 'Continue where I left off') : null
      ),
      el('p', { class: 'small muted', text: 'Every figure is labelled as sourced, derived or assumed, and you can adjust any assumption on the results page. Nothing is sent anywhere unless you choose to share your summary with Swisspro.' })
    );
    app.appendChild(hero);
  }

  /* ------------------------------------------------------------------ wizard */
  function renderStep() {
    app.innerHTML = '';
    var steps = visibleSteps();
    if (state.step >= steps.length) state.step = steps.length - 1;
    var step = steps[state.step];
    var a = state.answers;

    var prog = el('div', { class: 'progress' },
      el('span', { text: 'Step ' + (state.step + 1) + ' of ' + steps.length }),
      el('div', { class: 'progress-bar' }, el('span', { style: 'width:' + Math.round((state.step) / steps.length * 100) + '%' })));
    app.appendChild(prog);

    var card = el('section', { class: 'card step', 'aria-labelledby': 'step-title' });
    card.appendChild(el('h2', { id: 'step-title', text: step.title }));
    if (step.intro) card.appendChild(el('p', { class: 'intro', text: step.intro }));

    var errors = {};
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
          var btn = el('button', { type: 'button', class: 'opt' + (selected ? ' selected' : ''), role: f.type === 'single' ? 'radio' : 'checkbox', 'aria-checked': selected ? 'true' : 'false', 'data-opt': o.id,
            onclick: function () {
              if (f.type === 'single') { a[f.id] = o.id; }
              else {
                var cur = (a[f.id] || []).slice();
                if (o.exclusive) cur = has(cur, o.id) ? [] : [o.id];
                else { cur = cur.filter(function (x) { var ex = opts.filter(function (p) { return p.id === x; })[0]; return !(ex && ex.exclusive); }); if (has(cur, o.id)) cur.splice(cur.indexOf(o.id), 1); else cur.push(o.id); }
                a[f.id] = cur;
              }
              save();
              if (f.type === 'single' && singleAuto) { setTimeout(next, 160); } else { renderStep(); }
            } },
            el('span', { class: 'opt-label', text: o.label }),
            o.desc ? el('span', { class: 'opt-desc', text: o.desc }) : null,
            o.kind ? tag(o.kind) : null);
          group.appendChild(btn);
        });
        wrap.appendChild(group);
      } else if (f.type === 'number' || f.type === 'text' || f.type === 'email') {
        var input = el('input', { class: 'input', type: f.type, id: 'in-' + f.id, placeholder: f.placeholder || '', value: a[f.id] != null ? a[f.id] : '', min: f.min, max: f.max, step: f.step, inputmode: f.type === 'number' ? 'decimal' : null, 'aria-labelledby': 'lbl-' + f.id,
          oninput: function (e) { a[f.id] = e.target.value; save(); } });
        wrap.appendChild(input);
        if (f.chips) {
          var chips = el('div', { class: 'chips' });
          f.chips.forEach(function (c) { chips.appendChild(el('button', { type: 'button', class: 'chip' + (String(a[f.id]) === String(c) ? ' selected' : ''), onclick: function () { a[f.id] = String(c); save(); renderStep(); } }, String(c))); });
          wrap.appendChild(chips);
        }
      }
      wrap.appendChild(el('div', { class: 'error', id: 'err-' + f.id, hidden: true }));
      card.appendChild(wrap);
    });

    var nav = el('div', { class: 'nav-row' },
      el('button', { type: 'button', class: 'btn btn-secondary', onclick: back }, state.step === 0 ? 'Intro' : 'Back'),
      el('button', { type: 'button', class: 'btn btn-primary', onclick: next }, state.step === steps.length - 1 ? 'See my results' : 'Next'));
    card.appendChild(nav);
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
      if (f.type === 'email' && a[f.id] && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a[f.id])) msg = 'That email address does not look right.';
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
    if (state.step >= steps.length - 1) { state.view = 'results'; save(); render(); return; }
    state.step += 1; save(); renderStep(); scrollTop();
  }
  function back() {
    if (state.step === 0) { state.view = 'intro'; save(); render(); return; }
    state.step -= 1; save(); renderStep(); scrollTop();
  }
  function restart() {
    if (!confirm('Start over and clear your answers?')) return;
    state = { view: 'intro', step: 0, answers: {}, overrides: {} }; save(); render(); scrollTop();
  }

  /* ------------------------------------------------------------------ pricing */
  function filterSetFor(productId) { return productId === 'fontana' ? PR.retail.filterSets.superSwiss : PR.retail.filterSets.threeStage; }

  /** Builds capex/service in LOCAL currency from the hotel price list (if enabled) or the retail reference. */
  function pricingEstimate(rec, inputs) {
    var src = PR.hotel.enabled ? PR.hotel : PR.retail;
    var fromCode = src.currency;
    var fromFx = F.countries[Object.keys(F.countries).filter(function (c) { return F.countries[c].currency === fromCode; })[0]];
    var usdPerFrom = fromFx ? fromFx.fx.value : 1;
    var toLocal = function (v) { return v * usdPerFrom / inputs.usdPerLocal; };
    var lines = [], capex = 0, service = 0, unpriced = [];
    rec.areas.forEach(function (area) {
      var units = rec.unitPlan[area.id] || 0; var pid = area.products[0]; var prod = P.products[pid];
      var unitPrice = null, svc = null;
      if (PR.hotel.enabled) { var it = PR.hotel.items[pid]; if (it && it.unit != null) { unitPrice = it.unit + (it.install || 0); svc = it.serviceAnnual || 0; } }
      else { var r = PR.retail.items[pid]; if (r && r.price != null) { unitPrice = r.price; svc = filterSetFor(pid).price * F.factors.filter_sets_per_unit_per_year.value; } }
      if (unitPrice == null) { unpriced.push({ area: area.label, product: prod.name }); return; }
      lines.push({ area: area.label, product: prod.name, units: units, unitLocal: toLocal(unitPrice), capexLocal: toLocal(unitPrice * units), serviceLocal: toLocal(svc * units) });
      capex += toLocal(unitPrice * units); service += toLocal(svc * units);
    });
    return { mode: PR.hotel.enabled ? 'hotel' : 'retail', label: src.label, url: src.url, lines: lines, unpriced: unpriced, capex: lines.length ? capex : null, service: lines.length ? service : 0 };
  }

  /* ------------------------------------------------------------------ results */
  function compute() {
    var n = M.normalise(F, state.answers, state.overrides);
    var calc = E.calculate(F, n.inputs);
    var rec = R.recommend(state.answers, calc);
    var est = pricingEstimate(rec, n.inputs);
    var mode = state.overrides.pricingMode || (state.overrides.capex != null ? 'quote' : (est.capex != null ? 'estimate' : 'quote'));
    if (mode === 'estimate' && est.capex == null) mode = 'quote'; // nothing priced: show the quote inputs instead
    var inp = Object.assign({}, n.inputs);
    if (mode === 'estimate' && est.capex != null) { inp.capex = est.capex; inp.annualService = est.service; }
    else if (mode === 'quote') { inp.capex = state.overrides.capex != null ? Number(state.overrides.capex) : null; inp.annualService = state.overrides.annualService != null ? Number(state.overrides.annualService) : 0; }
    else { inp.capex = null; inp.annualService = 0; }
    calc.payback = E.payback(inp, calc.spend, calc.labour);
    calc.inputs = inp;
    return { n: n, calc: calc, rec: rec, est: est, mode: mode };
  }

  function provTag(p) { return p ? tag(p.kind === 'user' ? 'user' : p.kind) : null; }
  function basis(parts) { var d = el('div', { class: 'basis' }); parts.forEach(function (p, i) { if (i) d.appendChild(document.createTextNode(' x ')); d.appendChild(document.createTextNode(p.text + ' ')); if (p.tag) d.appendChild(p.tag); }); return d; }

  function money(ctx, v) { return fmt.money(ctx.n.inputs.symbol, v, ctx.n.inputs.decimals); }
  function usd(ctx, local) { return ctx.n.inputs.currency === 'USD' ? '' : ' (US$' + fmt.int(local * ctx.n.inputs.usdPerLocal) + ')'; }

  function renderResults() {
    var ctx = compute();
    var a = state.answers, n = ctx.n, c = ctx.calc, rec = ctx.rec, prov = n.provenance, inp = n.inputs;
    app.innerHTML = '';
    var root = el('div', { class: 'results' });

    /* header */
    root.appendChild(el('h2', { text: 'Your indicative business case' + (a.hotel ? ' - ' + a.hotel : '') }));
    root.appendChild(el('div', { class: 'summary-chips' },
      el('span', { text: n.country.name }), el('span', { text: rec.segment.tier }), el('span', { text: rec.segment.ownership }), el('span', { text: rec.segment.build }),
      el('span', { text: fmt.int(inp.rooms) + ' rooms' }), el('span', { text: fmt.pct(inp.occupancy) + ' occupancy' }), el('span', { text: rec.segment.current })));

    /* headline tiles */
    var tiles = el('div', { class: 'tiles' });
    tiles.appendChild(el('div', { class: 'tile' }, el('div', { class: 'label', text: 'Single-use bottles avoided per year' }),
      el('div', { class: 'value', text: fmt.int(c.bottles.total) }),
      el('div', { class: 'sub', text: fmt.int(c.bottles.roomBottles) + ' in guest rooms' + (c.bottles.otherBottles ? ', ' + fmt.int(c.bottles.otherBottles) + ' elsewhere' : '') + ' - ' + fmt.int(c.env.litres) + ' litres' }),
      basis([{ text: fmt.int(inp.rooms) + ' rooms', tag: tag('user') }, { text: fmt.pct(inp.occupancy) + ' occupancy', tag: provTag(prov.occupancy) }, { text: inp.bottlesPerRoomNight + ' bottles/night', tag: provTag(prov.bottlesPerRoomNight) }, { text: '365 days' }])));
    tiles.appendChild(el('div', { class: 'tile' }, el('div', { class: 'label', text: 'Plastic packaging avoided per year' }),
      el('div', { class: 'value', text: c.env.quantified ? fmt.int(c.env.packagingKg) : '-' }, el('span', { class: 'unit', text: c.env.quantified ? ' kg' : '' })),
      el('div', { class: 'sub', text: c.env.quantified ? 'at ' + fmt.dec(c.env.bottleWeightG, 1) + ' g per ' + (inp.bottleSizeMl >= 1000 ? fmt.dec(inp.bottleSizeMl / 1000, 1) + ' L' : inp.bottleSizeMl + ' ml') + ' bottle' : 'Glass bottles: no sourced weight factor, so plastic is not estimated. Reusable glass already avoids single-use packaging.' }),
      c.env.quantified ? basis([{ text: 'bottle weight', tag: tag(inp.bottleWeightOverrideG != null ? 'user' : (inp.bottleSizeMl === 500 ? 'sourced' : 'derived'), inp.bottleWeightOverrideG != null ? 'Your input' : (inp.bottleSizeMl === 500 ? 'Sourced (IBWA)' : 'Derived from 500 ml')) }]) : null));
    tiles.appendChild(el('div', { class: 'tile' }, el('div', { class: 'label', text: 'Greenhouse gas avoided per year' }),
      el('div', { class: 'value', text: c.env.quantified ? fmt.dec(c.env.co2eKg / 1000, 1) : '-' }, el('span', { class: 'unit', text: c.env.quantified ? ' t CO2e' : '' })),
      el('div', { class: 'sub', text: c.env.quantified ? 'about ' + fmt.int(c.env.co2eCarKm) + ' km driven by an average petrol car; bottle production only (transport, chilling and disposal not included)' : 'Not estimated for glass bottles.' }),
      c.env.quantified ? basis([{ text: 'PET factor ' + fmt.dec(F.factors.co2e_kg_per_kg_pet.value, 2) + ' kg CO2e/kg', tag: tag('sourced-secondary', 'UK GHG factors') }]) : null));
    tiles.appendChild(el('div', { class: 'tile' }, el('div', { class: 'label', text: 'Bottled-water spend avoided per year' }),
      el('div', { class: 'value', text: inp.pricePerBottle > 0 ? money(ctx, c.spend.annualLocal) : '-' }),
      el('div', { class: 'sub', text: inp.pricePerBottle > 0 ? 'at ' + fmt.money(inp.symbol, inp.pricePerBottle, inp.decimals === 0 ? 0 : 2) + ' per bottle' + usd(ctx, c.spend.annualLocal) : 'No price available - enter your price below.' }),
      basis([{ text: 'price per bottle', tag: provTag(prov.pricePerBottle) }, { text: 'bottles' }])));
    tiles.appendChild(el('div', { class: 'tile' }, el('div', { class: 'label', text: 'Housekeeping and stewarding time freed per year' }),
      el('div', { class: 'value', text: fmt.int(c.labour.hours) }, el('span', { class: 'unit', text: ' hours' })),
      el('div', { class: 'sub', text: fmt.dec(c.labour.fteEquivalent, 1) + ' full-time equivalents' + (c.labour.quantified ? ', worth ' + money(ctx, c.labour.costLocal) + ' at ' + fmt.money(inp.symbol, c.labour.wageHourly, 2) + '/h' : ' (enter an hourly wage below to value it)') }),
      basis([{ text: inp.minutesPerRoomPerDay + ' min per occupied room', tag: provTag(prov.minutesPerRoomPerDay) }, { text: inp.minutesPerCarton + ' min per carton', tag: provTag(prov.minutesPerCarton) }, { text: 'wage', tag: provTag(prov.wageHourly) }])));
    tiles.appendChild(el('div', { class: 'tile' }, el('div', { class: 'label', text: 'Storage, deliveries and lifting avoided per year' }),
      el('div', { class: 'value', text: fmt.dec(c.logistics.palletsPerYear, 0) }, el('span', { class: 'unit', text: ' pallets' })),
      el('div', { class: 'sub', text: fmt.int(c.logistics.cartonsPerYear) + ' cartons, ' + fmt.int(c.logistics.deliveriesPerYear) + ' deliveries, ' + fmt.dec(c.logistics.storageM2, 1) + ' m2 of store at peak (' + inp.stockWeeks + ' weeks of stock), ' + fmt.int(c.logistics.tonnesHandled) + ' tonnes carried by staff' }),
      basis([{ text: '24 per carton', tag: tag('sourced') }, { text: '1,872 per pallet', tag: tag('sourced') }, { text: '1.2 m2 per pallet', tag: tag('sourced') }, { text: 'stock weeks', tag: provTag(prov.stockWeeks) }])));
    root.appendChild(tiles);
    if (a.current === 'glass_own') root.appendChild(el('p', { class: 'notice notice-info', text: 'You already bottle in reusable glass, so the plastic figures do not apply. The case for in-room filtration here is labour (no bottle rounds, no washing cycle for room bottles), storage and 24/7 availability for guests.' }));

    /* payback */
    root.appendChild(renderPayback(ctx));

    /* recommendation */
    root.appendChild(renderRecommendation(ctx));

    /* why now */
    root.appendChild(renderWhyNow(ctx));

    /* business case order + readiness */
    root.appendChild(renderCase(ctx));

    /* adjust */
    root.appendChild(renderAdjust(ctx));

    /* sources used */
    root.appendChild(renderSources(ctx));

    /* actions */
    root.appendChild(renderActions(ctx));
    app.appendChild(root);
    document.getElementById('restart-top').hidden = false;
  }

  function renderPayback(ctx) {
    var c = ctx.calc, inp = ctx.n.inputs, est = ctx.est, mode = ctx.mode;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'Payback and five-year view' }));
    var modes = el('div', { class: 'options', role: 'radiogroup', style: 'margin-bottom:14px' });
    function modeBtn(id, label, desc, disabled) {
      return el('button', { type: 'button', class: 'opt' + (mode === id ? ' selected' : ''), role: 'radio', 'aria-checked': mode === id ? 'true' : 'false', disabled: disabled ? 'disabled' : null, onclick: function () { state.overrides.pricingMode = id; save(); renderResults(); } },
        el('span', { class: 'opt-label', text: label }), el('span', { class: 'opt-desc', text: desc }));
    }
    modes.appendChild(modeBtn('quote', 'I have a Swisspro quote', 'Enter the investment and the yearly service contract.'));
    modes.appendChild(modeBtn('estimate', est.mode === 'hotel' ? 'Use the Swisspro hotel price list' : 'Ballpark from Swisspro retail list prices', est.mode === 'hotel' ? est.label : 'Residential online-store prices (SGD), converted - NOT hotel project pricing. For orientation only.', est.capex == null));
    modes.appendChild(modeBtn('none', 'Skip the payback', 'Show savings only.'));
    card.appendChild(modes);
    if (est.capex == null && est.unpriced.length) card.appendChild(el('p', { class: 'small muted', text: 'The ballpark is unavailable because Swisspro has not published prices for the recommended units (' + est.unpriced.map(function (u) { return u.product; }).join('; ') + '). These are quoted per project.' }));

    if (mode === 'quote') {
      var row = el('div', { class: 'adjust', style: 'margin-bottom:14px' });
      row.appendChild(el('div', {}, el('label', { for: 'ov-capex', text: 'Investment incl. installation (' + inp.currency + ')' }), el('input', { class: 'input', id: 'ov-capex', type: 'number', min: 0, step: 1, value: state.overrides.capex != null ? state.overrides.capex : '', placeholder: 'from your quote', onchange: function (e) { state.overrides.capex = e.target.value === '' ? null : Number(e.target.value); save(); renderResults(); } })));
      row.appendChild(el('div', {}, el('label', { for: 'ov-service', text: 'Yearly service contract, filters included (' + inp.currency + ')' }), el('input', { class: 'input', id: 'ov-service', type: 'number', min: 0, step: 1, value: state.overrides.annualService != null ? state.overrides.annualService : '', placeholder: 'from your quote', onchange: function (e) { state.overrides.annualService = e.target.value === '' ? null : Number(e.target.value); save(); renderResults(); } })));
      card.appendChild(row);
      if (state.overrides.capex == null) card.appendChild(el('p', { class: 'notice', text: 'No quote yet? Request one below: Swisspro prices per installed point and per service contract, and the sales team will put the numbers straight into this view.' }));
    }
    if (mode === 'estimate' && est.capex != null) {
      var t = el('table', { class: 'kv' });
      est.lines.forEach(function (l) { t.appendChild(el('tr', {}, el('th', { text: l.area + ': ' + l.units + ' x ' + l.product }), el('td', { text: money(ctx, l.capexLocal) + ' + ' + money(ctx, l.serviceLocal) + '/yr' }))); });
      card.appendChild(t);
      if (est.unpriced.length) card.appendChild(el('p', { class: 'small muted', text: 'Not priced (quote required): ' + est.unpriced.map(function (u) { return u.area + ' - ' + u.product; }).join('; ') + '.' }));
      card.appendChild(el('p', { class: 'notice' }, tag(est.mode === 'hotel' ? 'config' : 'sourced', est.mode === 'hotel' ? 'Price list' : 'Retail reference'), ' ' + (est.mode === 'hotel' ? 'Prices from ' + est.label + '.' : 'These are the prices of Swisspro\'s residential products on its online store (' + PR.retail.accessed + '), with one replacement filter set per unit per year (assumption). Hotel project pricing and service contracts differ; treat this as orientation only and request a quote. ') , el('a', { href: est.url, rel: 'noopener', text: 'Source' })));
    }
    if (c.payback.available) {
      var pb = c.payback;
      var grid = el('div', { class: 'two-col' });
      var left = el('table', { class: 'kv' });
      left.appendChild(el('tr', {}, el('th', { text: 'Investment' }), el('td', { text: money(ctx, pb.capex) + usd(ctx, pb.capex) })));
      left.appendChild(el('tr', {}, el('th', { text: 'Yearly service contract' }), el('td', { text: money(ctx, pb.annualService) })));
      left.appendChild(el('tr', {}, el('th', { text: 'Bottled-water spend avoided per year' }), el('td', { text: money(ctx, c.spend.annualLocal) })));
      left.appendChild(el('tr', {}, el('th', { text: 'Housekeeping time value per year' }), el('td', { text: c.labour.quantified ? money(ctx, c.labour.costLocal) : '-' })));
      var right = el('table', { class: 'kv' });
      right.appendChild(el('tr', {}, el('th', { text: 'Cash payback (bottled-water spend only)' }), el('td', { text: fmt.years(pb.cashPaybackYears) })));
      right.appendChild(el('tr', {}, el('th', { text: 'Payback including housekeeping time' }), el('td', { text: fmt.years(pb.fullPaybackYears) })));
      right.appendChild(el('tr', {}, el('th', { text: 'Five-year net saving (cash)' }), el('td', { text: money(ctx, pb.fiveYearNetCash) })));
      right.appendChild(el('tr', {}, el('th', { text: 'Five-year net saving (incl. time)' }), el('td', { text: money(ctx, pb.fiveYearNetFull) })));
      grid.appendChild(left); grid.appendChild(right);
      card.appendChild(grid);
      card.appendChild(el('p', { class: 'small muted', text: R.approvalNote(state.answers, pb.capex * inp.usdPerLocal) }));
      if (inp.pricePerBottle === 0) card.appendChild(el('p', { class: 'notice', text: 'No bottle price is set, so the cash payback cannot be computed. Enter your price per bottle in "Adjust the assumptions".' }));
    } else if (mode !== 'none') {
      card.appendChild(el('p', { class: 'small muted', text: 'Payback appears here once an investment figure is available.' }));
    }
    return card;
  }

  function productCard(pid) {
    var p = P.products[pid];
    return el('div', { class: 'product' }, el('h4', { text: p.name }), el('p', { class: 'summary', text: p.summary }),
      el('ul', {}, p.facts.map(function (f) { return el('li', { text: f }); })),
      el('p', { class: 'small', style: 'margin:8px 0 0' }, el('a', { href: p.url, rel: 'noopener', text: 'Swisspro product page' })));
  }

  function renderRecommendation(ctx) {
    var rec = ctx.rec, a = state.answers;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'Recommended Swisspro set-up' }));
    card.appendChild(el('p', { class: 'small muted', text: rec.unitPlan.note }));
    rec.areas.forEach(function (area) {
      var units = rec.unitPlan[area.id];
      card.appendChild(el('h4', { style: 'margin:18px 0 6px', text: area.label + (units ? ' - ' + fmt.int(units) + (units === 1 ? ' unit' : ' units') : '') }));
      if (area.notes.length) card.appendChild(el('ul', { class: 'area-notes' }, area.notes.map(function (t) { return el('li', { text: t }); })));
      card.appendChild(productCard(area.products[0]));
      if (area.products.length > 1) {
        var alt = el('details', { style: 'margin:6px 0 10px' }, el('summary', { text: 'Alternatives for this area (' + (area.products.length - 1) + ')' }));
        area.products.slice(1).forEach(function (pid) { var pc = productCard(pid); pc.style.marginTop = '10px'; alt.appendChild(pc); });
        card.appendChild(alt);
      }
    });
    var f = rec.filter;
    var fc = el('div', { class: 'product', style: 'margin-top:18px;background:var(--aqua-100)' });
    fc.appendChild(el('h4', { text: 'Filter specification: ' + f.grade }));
    fc.appendChild(el('ul', {}, f.reasons.map(function (r) { return el('li', { text: r }); })));
    var flags = [];
    if (f.prefilter) flags.push('Sediment pre-filter stage recommended');
    if (f.waterTest) flags.push('Water test during the site survey');
    if (f.halal) flags.push('Halal certificate to be provided');
    flags.push(f.interval);
    fc.appendChild(el('p', { class: 'small', style: 'margin:8px 0 0', text: flags.join(' - ') }));
    if (f.halalNote) fc.appendChild(el('p', { class: 'small muted', style: 'margin:6px 0 0', text: f.halalNote }));
    fc.appendChild(el('p', { class: 'small muted', style: 'margin:6px 0 0' }, P.filter.cdc + ' ', el('a', { href: P.filter.cdcUrl, rel: 'noopener', text: 'CDC source' })));
    card.appendChild(fc);
    if (has(a.areas, 'rooms')) card.appendChild(el('p', { class: 'small muted', style: 'margin-top:12px', text: 'Placement feedback from the Marriott interview: guests dislike a drinking tap right next to the basin and water stations in corridors. The minibar counter in the room and pre-function areas for events are the preferred positions.' }));
    return card;
  }

  function renderWhyNow(ctx) {
    var a = state.answers, cc = ctx.n.country;
    var items = [];
    cc.context.forEach(function (x) { items.push(x); });
    ['certification', 'audit', 'mandate', 'safety'].forEach(function (k) { if (has(a.drivers, k)) F.triggerFacts[k].forEach(function (x) { items.push(x); }); });
    if (!items.length) return el('span');
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'Why now: rules and standards that point the same way' }));
    card.appendChild(el('ul', { class: 'sources-list' }, items.map(function (x) { return el('li', {}, x.text + ' ', x.url ? el('a', { href: x.url, rel: 'noopener', text: 'source' }) : null); })));
    return card;
  }

  function readinessLabel(tier) { return { Hot: 'High', Warm: 'Medium', Nurture: 'Early' }[tier] || tier; }

  function renderCase(ctx) {
    var rec = ctx.rec, a = state.answers;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'How to present the case internally' }));
    card.appendChild(el('p', { class: 'small muted', text: 'Ordered for a ' + rec.segment.tier.toLowerCase() + ', ' + rec.segment.ownership.toLowerCase() + ' hotel in ' + ctx.n.country.name + '. Marriott\'s APAC procurement lead ranks the drivers ROI, then efficiency and guest experience, then sustainability - "if you put it as the main criteria for change, it\'s very, very hard to convince".' }));
    card.appendChild(el('ol', { class: 'ordered' }, rec.arguments.map(function (x) { return el('li', {}, el('strong', { text: x.title }), el('div', { class: 'small', text: x.why })); })));
    var r = el('div', { style: 'margin-top:18px' });
    r.appendChild(el('h4', { style: 'margin:0 0 6px', text: 'Project readiness' }));
    r.appendChild(el('span', { class: 'readiness readiness-' + readinessLabel(rec.lead.tier), text: readinessLabel(rec.lead.tier) }));
    r.appendChild(el('span', { class: 'small muted', text: '  ' + rec.segment.timeline + ' - ' + rec.segment.approval }));
    r.appendChild(el('p', { class: 'small muted', style: 'margin:8px 0 0', text: 'Next steps with Swisspro: site survey (placement, plumbing, power), water test, specification and quote per area, then a pilot floor if you want to test guest response before the roll-out.' }));
    card.appendChild(r);
    return card;
  }

  function renderAdjust(ctx) {
    var inp = ctx.n.inputs, c = ctx.calc, prov = ctx.n.provenance, o = state.overrides;
    var card = el('section', { class: 'card adjust-card' });
    card.appendChild(el('h3', { text: 'Adjust the assumptions' }));
    card.appendChild(el('p', { class: 'small muted', text: 'Advanced users: change any input and the results update. Labels show where the current value comes from.' }));
    var grid = el('div', { class: 'adjust' });
    function field(id, label, value, step, p, extra) {
      var d = el('div', {});
      d.appendChild(el('label', { for: 'ov-' + id }, label + ' ', provTag(p) || ''));
      d.appendChild(el('input', Object.assign({ class: 'input', id: 'ov-' + id, type: 'number', step: step, min: 0, value: value, onchange: function (e) { if (e.target.value === '') delete o[id]; else o[id] = Number(e.target.value); if (id === 'occupancy' && o[id] != null) o[id] = o[id] / 100; save(); renderResults(); } }, extra || {})));
      return d;
    }
    grid.appendChild(field('occupancy', 'Occupancy (%)', Math.round(inp.occupancy * 1000) / 10, 1, prov.occupancy, { max: 100 }));
    grid.appendChild(field('bottlesPerRoomNight', 'Bottles per occupied room per night', inp.bottlesPerRoomNight, 0.5, prov.bottlesPerRoomNight));
    grid.appendChild(field('pricePerBottle', 'Price per bottle (' + inp.currency + ')', Math.round(inp.pricePerBottle * 1000) / 1000, 0.01, prov.pricePerBottle));
    if (c.env.quantified) grid.appendChild(field('bottleWeightG', 'Empty bottle weight (g)', Math.round(c.env.bottleWeightG * 100) / 100, 0.1, inp.bottleWeightOverrideG != null ? { kind: 'user' } : { kind: inp.bottleSizeMl === 500 ? 'sourced' : 'derived' }));
    grid.appendChild(field('minutesPerRoomPerDay', 'Housekeeping minutes per occupied room per day', inp.minutesPerRoomPerDay, 0.5, prov.minutesPerRoomPerDay));
    grid.appendChild(field('minutesPerCarton', 'Handling minutes per carton', inp.minutesPerCarton, 0.5, prov.minutesPerCarton));
    grid.appendChild(field('wageHourly', 'Hourly labour cost (' + inp.currency + ')', Math.round(inp.wageHourly * 100) / 100, 0.1, prov.wageHourly));
    grid.appendChild(field('stockWeeks', 'Weeks of stock kept on site', inp.stockWeeks, 1, prov.stockWeeks));
    card.appendChild(grid);
    card.appendChild(el('div', { class: 'actions' }, el('button', { type: 'button', class: 'btn btn-ghost', onclick: function () { var keep = { pricingMode: o.pricingMode, capex: o.capex, annualService: o.annualService }; state.overrides = {}; Object.keys(keep).forEach(function (k) { if (keep[k] != null) state.overrides[k] = keep[k]; }); save(); renderResults(); } }, 'Reset to reference values')));
    return card;
  }

  function renderSources(ctx) {
    var cc = ctx.n.country, prov = ctx.n.provenance;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'Where the numbers come from' }));
    var list = el('ul', { class: 'sources-list' });
    function item(label, p, f) {
      var li = el('li', {}, tag(p.kind === 'user' ? 'user' : p.kind), ' ', el('strong', { text: label + ': ' }), p.label || '');
      if (p.note) li.appendChild(el('span', { class: 'muted', text: ' ' + p.note }));
      var s = p.source || (f && f.source);
      if (s && s.url) li.appendChild(el('span', {}, ' ', el('a', { href: s.url, rel: 'noopener', text: s.publisher || 'source' })));
      else if (p.url) li.appendChild(el('span', {}, ' ', el('a', { href: p.url, rel: 'noopener', text: 'source' })));
      return li;
    }
    list.appendChild(item('Occupancy', prov.occupancy));
    list.appendChild(item('Bottles per room-night', prov.bottlesPerRoomNight));
    list.appendChild(item('Price per bottle', prov.pricePerBottle));
    list.appendChild(item('Labour cost', prov.wageHourly));
    list.appendChild(item('Handling time per room', prov.minutesPerRoomPerDay));
    list.appendChild(item('Handling time per carton', prov.minutesPerCarton));
    list.appendChild(item('Stock on hand', prov.stockWeeks));
    ['pet_bottle_weight_500ml_g', 'pet_bottle_weight_scaling', 'co2e_kg_per_kg_pet', 'co2e_kg_per_car_km', 'bottles_per_carton', 'bottles_per_pallet_500ml', 'pallet_footprint_m2', 'working_hours_per_fte_year'].forEach(function (k) {
      var f = F.factors[k]; list.appendChild(item(f.label, { kind: f.kind, label: (typeof f.value === 'number' ? (Math.round(f.value * 1000) / 1000) + ' ' : '') + (f.unit || ''), note: f.kind === 'assumption' ? f.note : null, source: f.source }));
    });
    if (cc.fx.source) list.appendChild(item('Exchange rate', { kind: cc.fx.kind, label: cc.fx.source.quote, source: cc.fx.source }));
    card.appendChild(list);
    card.appendChild(el('p', { class: 'small muted' }, 'Full registry with quotes and access dates: ', el('a', { href: 'sources.html', text: 'Sources & assumptions' }), '. Figures are indicative; a Swisspro site survey and quote confirm them.'));
    return card;
  }

  /* ------------------------------------------------------------------ summary / lead */
  function summaryText(ctx) {
    var a = state.answers, c = ctx.calc, rec = ctx.rec, inp = ctx.n.inputs, sym = inp.symbol;
    var L = [];
    L.push('SWISSPRO SUSTAINABILITY WIZARD - SUMMARY (' + new Date().toISOString().slice(0, 10) + ')');
    L.push('Hotel: ' + (a.hotel || '-') + ' | Contact: ' + (a.name || '-') + (a.role ? ', ' + a.role : '') + ' | Email: ' + (a.email || '-'));
    L.push('Market: ' + ctx.n.country.name + ' | ' + rec.segment.tier + ' | ' + rec.segment.ownership + ' | ' + rec.segment.build);
    L.push('Rooms: ' + fmt.int(inp.rooms) + ' | Occupancy: ' + fmt.pct(inp.occupancy) + ' | Today: ' + rec.segment.current + ' | ' + inp.bottlesPerRoomNight + ' x ' + inp.bottleSizeMl + ' ml per room-night');
    L.push('Areas: ' + rec.segment.areas.join(', '));
    L.push('');
    L.push('RESULTS PER YEAR');
    L.push('- Bottles avoided: ' + fmt.int(c.bottles.total) + ' (' + fmt.int(c.env.litres) + ' L)');
    if (c.env.quantified) { L.push('- Plastic avoided: ' + fmt.int(c.env.packagingKg) + ' kg'); L.push('- CO2e avoided: ' + fmt.dec(c.env.co2eKg / 1000, 1) + ' t (bottle production only)'); }
    L.push('- Bottled-water spend avoided: ' + (inp.pricePerBottle > 0 ? fmt.money(sym, c.spend.annualLocal, 0) + ' at ' + fmt.money(sym, inp.pricePerBottle, 2) + '/bottle' : 'n/a (no price)'));
    L.push('- Housekeeping time: ' + fmt.int(c.labour.hours) + ' h (' + fmt.dec(c.labour.fteEquivalent, 1) + ' FTE)' + (c.labour.quantified ? ' = ' + fmt.money(sym, c.labour.costLocal, 0) : ''));
    L.push('- Logistics: ' + fmt.dec(c.logistics.palletsPerYear, 0) + ' pallets, ' + fmt.int(c.logistics.cartonsPerYear) + ' cartons, ' + fmt.int(c.logistics.tonnesHandled) + ' t carried, ' + fmt.dec(c.logistics.storageM2, 1) + ' m2 store at peak');
    if (c.payback.available) L.push('- Payback: cash ' + fmt.years(c.payback.cashPaybackYears) + ', incl. time ' + fmt.years(c.payback.fullPaybackYears) + ' on ' + fmt.money(sym, c.payback.capex, 0) + ' investment (' + (ctx.mode === 'estimate' ? (ctx.est.mode === 'hotel' ? 'price list' : 'RETAIL BALLPARK') : 'quote') + ')');
    L.push('');
    L.push('RECOMMENDED SET-UP');
    rec.areas.forEach(function (ar) { L.push('- ' + ar.label + ' (' + (rec.unitPlan[ar.id] || '?') + ' units): ' + ar.products.map(function (p) { return P.products[p].name; }).join(' / ')); });
    L.push('- Filter: ' + rec.filter.grade + (rec.filter.prefilter ? ' + sediment pre-filter' : '') + (rec.filter.waterTest ? ' | water test needed' : '') + (rec.filter.halal ? ' | Halal certificate' : ''));
    if (has(a.areas, 'rooms')) L.push('- Room preferences: ' + [a.placement, a.temps, a.finish, a.space].join(', '));
    L.push('- Water supply: ' + a.source + (a.issues && a.issues.length ? ' | issues: ' + a.issues.join(', ') : ''));
    L.push('');
    L.push('LEAD PROFILE (for Swisspro)');
    L.push('- Readiness: ' + rec.lead.tier + ' (' + rec.lead.points + ' pts: ' + rec.lead.reasons.join('; ') + ')');
    L.push('- Drivers: ' + (a.drivers || []).join(', ') + ' | Timeline: ' + rec.segment.timeline + ' | Approval: ' + rec.segment.approval);
    L.push('- Lead with: ' + rec.arguments.map(function (x) { return x.title; }).join(' > '));
    L.push('');
    L.push('Assumptions can be reviewed at: ' + location.href.split('#')[0].replace(/index\.html$/, '') + 'sources.html');
    return L.join('\n');
  }

  function renderActions(ctx) {
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'Take it further' }));
    var txt = summaryText(ctx);
    var ta = el('textarea', { class: 'copy-area', readonly: 'readonly', 'aria-label': 'Summary text' }); ta.value = txt;
    var subject = 'Sustainability Wizard summary - ' + (state.answers.hotel || 'hotel enquiry');
    var mail = 'mailto:' + PR.leadEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(txt);
    var actions = el('div', { class: 'actions' },
      el('a', { class: 'btn btn-primary', href: mail, onclick: function () { if (PR.formEndpoint) { try { fetch(PR.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: state.answers, overrides: state.overrides, summary: txt }) }); } catch (e) { /* ignore */ } } } }, 'Request a site survey and quote'),
      el('button', { type: 'button', class: 'btn btn-secondary', onclick: function () { try { navigator.clipboard.writeText(txt); } catch (e) { ta.select(); document.execCommand('copy'); } this.textContent = 'Copied'; } }, 'Copy summary'),
      el('button', { type: 'button', class: 'btn btn-secondary', onclick: function () { window.print(); } }, 'Print / save as PDF'),
      el('button', { type: 'button', class: 'btn btn-ghost', onclick: function () { state.view = 'wizard'; state.step = 0; save(); render(); scrollTop(); } }, 'Change my answers'),
      el('button', { type: 'button', class: 'btn btn-ghost', onclick: restart }, 'Start over'));
    card.appendChild(el('p', { class: 'small muted', text: 'The request opens an email to Swisspro with the summary below; nothing is sent automatically. Swisspro uses it to prepare the site survey and a quote per area.' }));
    card.appendChild(actions);
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
