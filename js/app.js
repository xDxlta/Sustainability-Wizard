/* Swisspro Sustainability Wizard - UI (version 2). Vanilla JS, no build step. */
(function () {
  'use strict';
  var F = window.SW.factors, E = window.SW.engine, PL = window.SW.pricelist, Q = window.SW.questions,
      M = window.SW.model, R = window.SW.recommend, B = window.SW.business, fmt = window.SW.format;
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
  function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function visibleSteps() { return Q.steps.filter(function (s) { return !s.showIf || s.showIf(state.answers); }); }
  function fieldOptions(f) { return f.dynamic === 'bottlePrices' ? M.bottlePriceOptions(F, state.answers.country) : f.options; }
  function has(arr, v) { return (arr || []).indexOf(v) >= 0; }

  /* ------------------------------------------------------------------ intro */
  function renderIntro() {
    app.innerHTML = '';
    var resume = Object.keys(state.answers).length;
    app.appendChild(el('section', { class: 'hero' },
      el('div', { class: 'hero-copy' },
        el('h1', { text: 'What does filtered water instead of bottled water mean for your hotel?' }),
        el('p', { class: 'lead', text: 'Answer nine questions about your rooms and the water you buy today. You see the bottles, plastic and CO2e avoided, what you spend now, the payback and the Swisspro set-up that fits.' }),
        el('div', { class: 'actions' },
          el('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: function () { state.view = 'wizard'; state.step = 0; save(); render(); } }, resume ? 'Start again' : 'Start'),
          resume ? el('button', { class: 'btn btn-secondary btn-lg', type: 'button', onclick: function () { state.view = 'wizard'; save(); render(); } }, 'Continue where I left off') : null)),
      el('dl', { class: 'hero-facts' },
        el('div', {}, el('dt', { text: 'Time' }), el('dd', { text: 'About one minute' })),
        el('div', {}, el('dt', { text: 'Markets' }), el('dd', { text: 'Malaysia, Indonesia, the Philippines, Singapore' })),
        el('div', {}, el('dt', { text: 'Sign-up' }), el('dd', { text: 'None. Your answers stay in this browser.' })))
    ));
  }

  /* ------------------------------------------------------------------ wizard */
  function renderStep() {
    app.innerHTML = '';
    var steps = visibleSteps();
    if (state.step >= steps.length) state.step = steps.length - 1;
    var step = steps[state.step];
    var a = state.answers;
    // "Not sure" is preselected wherever a reference value exists, so a hotel can go straight through.
    step.fields.forEach(function (f) {
      if (f.type !== 'single' || a[f.id] != null || (f.showIf && !f.showIf(a))) return;
      var d = fieldOptions(f).filter(function (o) { return o.id === 'default' || o.id === 'unknown'; })[0];
      if (d) a[f.id] = d.id;
    });
    save();

    var layout = el('div', { class: 'wizard' });
    var rail = el('nav', { class: 'rail', 'aria-label': 'Steps' });
    var ol = el('ol', {});
    steps.forEach(function (s, i) {
      var cls = i === state.step ? 'is-current' : (i < state.step ? 'is-done' : '');
      var head = i < state.step
        ? el('button', { type: 'button', class: 'rail-link', onclick: function () { state.step = i; save(); renderStep(); scrollTop(); } }, s.title)
        : el('span', { class: 'rail-link', 'aria-current': i === state.step ? 'step' : null }, s.title);
      ol.appendChild(el('li', { class: cls }, el('span', { class: 'rail-num', text: String(i + 1) }), el('div', {}, head, i < state.step ? el('span', { class: 'rail-answer', text: stepSummary(s) }) : null)));
    });
    rail.appendChild(ol);
    layout.appendChild(rail);
    layout.appendChild(el('div', { class: 'progress', 'aria-hidden': 'true' },
      el('span', { text: 'Step ' + (state.step + 1) + ' of ' + steps.length }),
      el('div', { class: 'progress-bar' }, el('span', { style: 'width:' + Math.round((state.step + 1) / steps.length * 100) + '%' }))));

    var card = el('section', { class: 'card step', 'aria-labelledby': 'step-title' });
    card.appendChild(el('h2', { id: 'step-title', text: step.title }));
    if (step.intro) card.appendChild(el('p', { class: 'intro', text: step.intro }));
    var singleAuto = step.fields.length === 1 && step.fields[0].type === 'single';

    step.fields.forEach(function (f) {
      if (f.showIf && !f.showIf(a)) return;
      var wrap = el('div', { class: 'field', 'data-field': f.id });
      var labelText = f.id === 'priceCustom' ? 'Price per bottle (' + (F.countries[a.country] || F.countries.OTHER).currency + ')' : f.label;
      if (f.label) wrap.appendChild(el('div', { class: 'field-label', id: 'lbl-' + f.id, text: labelText }));
      if (f.type === 'single' || f.type === 'multi') {
        var opts = fieldOptions(f);
        var listMode = opts.some(function (o) { return o.desc && o.desc.length > 40; });
        var longest = Math.max.apply(null, opts.map(function (o) { return o.label.length; }));
        var shape = listMode ? ' options-list' : (longest <= 12 ? ' options-row' + (opts[0].desc ? ' lead-wide' : '') : ' options-wide');
        var group = el('div', { class: 'options' + shape, style: '--n:' + opts.length + ';--rest:' + (opts.length - 1), role: f.type === 'single' ? 'radiogroup' : 'group', 'aria-labelledby': f.label ? 'lbl-' + f.id : 'step-title' });
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
        var ctl = el('div', { class: 'field-control' }); wrap.appendChild(ctl);
        ctl.appendChild(el('input', { class: 'input', type: f.type, id: 'in-' + f.id, placeholder: f.placeholder || '', value: a[f.id] != null ? a[f.id] : '', min: f.min, max: f.max, step: f.step, inputmode: f.type === 'number' ? 'decimal' : null, 'aria-labelledby': 'lbl-' + f.id,
          oninput: function (e) { a[f.id] = e.target.value; save(); } }));
        if (f.chips) {
          var chips = el('div', { class: 'chips' });
          f.chips.forEach(function (c) { chips.appendChild(el('button', { type: 'button', class: 'chip' + (String(a[f.id]) === String(c) ? ' selected' : ''), onclick: function () { a[f.id] = String(c); save(); renderStep(); } }, String(c))); });
          ctl.appendChild(chips);
        }
      }
      wrap.appendChild(el('div', { class: 'error', id: 'err-' + f.id, hidden: true }));
      card.appendChild(wrap);
    });

    card.appendChild(el('div', { class: 'nav-row' },
      el('button', { type: 'button', class: 'btn btn-secondary', onclick: back }, state.step === 0 ? 'Intro' : 'Back'),
      el('button', { type: 'button', class: 'btn btn-primary', onclick: next }, state.step === steps.length - 1 ? 'See my results' : 'Next')));
    layout.appendChild(card);
    app.appendChild(layout);
    document.getElementById('restart-top').hidden = false;
  }

  /** Short text of the answers already given in a step, for the step rail. */
  function stepSummary(step) {
    var a = state.answers, parts = [];
    step.fields.forEach(function (f) {
      if (f.showIf && !f.showIf(a)) return;
      var v = a[f.id]; if (v == null || v === '' || f.id === 'priceCustom') return;
      if (f.type === 'number') { parts.push(v + ' ' + (f.id === 'rooms' ? 'rooms' : '')); return; }
      var opts = fieldOptions(f);
      var ids = Array.isArray(v) ? v : [v];
      var labels = ids.map(function (id) { var o = opts.filter(function (x) { return x.id === id; })[0]; return o ? o.label : id; });
      if (f.id === 'priceBand' && v === 'custom') labels = [(F.countries[a.country] || F.countries.OTHER).symbol + a.priceCustom + ' per bottle'];
      if (labels.length === 1 && labels[0] === 'Not sure') labels = [(f.label || '').toLowerCase() + ' not sure'];
      parts.push(labels.join(', '));
    });
    return parts.join(' / ');
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

  /* ------------------------------------------------------------------ results */
  function compute() {
    delete state.overrides.inRoomTap; // retired toggle from version 2.2; the base case is now the basic tap
    var n = M.normalise(F, state.answers, state.overrides);
    var calc = E.calculate(F, n.inputs);
    var rec = R.recommend(state.answers, n.inputs, F, PL, state.overrides);
    var bc = B.build({ F: F, PL: PL, R: R, E: E }, state.answers, state.overrides, n.inputs, calc);
    calc.payback = bc.payback;
    calc.inputs = Object.assign({}, n.inputs, { capex: bc.capexLocal, annualService: bc.servicingLocal });
    return { n: n, calc: calc, rec: rec, pr: bc };
  }

  function money(ctx, v) { return fmt.money(ctx.n.inputs.symbol, v, ctx.n.inputs.decimals); }
  function moneyShort(ctx, v) { return fmt.moneyShort(ctx.n.inputs.symbol, v, ctx.n.inputs.decimals); }
  function sizeLabel(ml) { return ml >= 1000 ? fmt.dec(ml / 1000, 1) + ' L' : ml + ' ml'; }
  function listPrice(p) { return p.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' ' + PL.pricelist.currency.value; }
  function modelName(p) { return p.label.replace(/\s*\(.*\)$/, ''); }
  function sourcesUrl() { try { return new URL('sources.html', location.href.split('#')[0].split('?')[0]).href; } catch (e) { return 'sources.html'; } }
  function sourcesLink(text) { return el('a', { href: sourcesUrl(), target: EMBED ? '_blank' : null, rel: 'noopener', text: text }); }
  function fxDate(ctx) { var a = ctx.n.country.fx.source, b = ctx.pr.rate.from && ctx.pr.rate.from.fx.source; var d = []; if (a && a.year) d.push(a.year); if (b && b.year && d.indexOf(b.year) < 0) d.push(b.year); return d.length ? 'rates of ' + d.join(' and ') : 'reference rates'; }

  /** The strongest true statement for this hotel (see business.js leadStatement for the order). */
  function leadText(ctx) {
    var L = ctx.pr.lead, c = ctx.calc, pb = c.payback, inp = ctx.n.inputs;
    var staff = c.labour.quantified && isFinite(pb.fullPaybackYears) ? ' Including staff time freed: ' + fmt.years(pb.fullPaybackYears) + '.' : '';
    switch (L.kind) {
      case 'payback': return { tone: 'good', head: 'Pays for itself in ' + fmt.years(L.years) + ', then saves about ' + moneyShort(ctx, L.saving) + ' a year.', sub: 'Service contract included.' + staff };
      case 'payback-staff': return { tone: 'good', head: 'Pays for itself in ' + fmt.years(L.years) + ' including staff time freed.', sub: 'Cash payback ' + fmt.years(L.cashYears) + '. Service contract included in both.' };
      case 'saving': return { tone: 'neutral', head: 'Saves about ' + moneyShort(ctx, L.saving) + ' a year after the service contract.', sub: 'Cash payback ' + fmt.years(L.cashYears) + '.' + staff };
      case 'saving-staff': return { tone: 'neutral', head: 'Saves about ' + moneyShort(ctx, L.saving) + ' a year including staff time freed.', sub: 'Cash payback ' + fmt.years(L.cashYears) + '.' };
      case 'per-night': return { tone: 'neutral', head: 'Costs ' + fmt.money(inp.symbol, L.swisspro, inp.decimals === 0 ? 0 : 2) + ' per occupied room-night, against ' + fmt.money(inp.symbol, L.bottled, inp.decimals === 0 ? 0 : 2) + ' for bottled water and the staff time it takes.', sub: 'Service contract included, investment spread over ' + B.SPREAD_YEARS + ' years.' };
      default:
        if (!L.bottles) return { tone: 'neutral', head: 'Filtered water for ' + ctx.rec.segment.areas.join(', ').toLowerCase() + '.', sub: '' };
        return { tone: 'neutral', head: 'Your guest rooms use ' + fmt.int(L.bottles) + (inp.bottleMaterial === 'pet' ? ' plastic' : ' glass') + ' bottles a year' + (L.spend > 0 ? ': ' + moneyShort(ctx, L.spend) + ' of bottled water' : '') + ' and ' + fmt.int(L.hours) + ' staff hours.', sub: '' };
    }
  }

  function renderResults() {
    var ctx = compute();
    var a = state.answers, n = ctx.n, c = ctx.calc, rec = ctx.rec, prov = n.provenance, inp = n.inputs;
    app.innerHTML = '';
    var root = el('div', { class: 'results' });
    var occAssumed = prov.occupancy.kind !== 'user', bpnAssumed = prov.bottlesPerRoomNight.kind !== 'user', sizeAssumed = prov.bottleSizeMl.kind !== 'user';
    var facts = [
      fmt.pct(inp.occupancy) + ' occupancy' + (occAssumed ? ' (national average)' : ''),
      rec.segment.current,
      inp.bottlesPerRoomNight ? inp.bottlesPerRoomNight + ' x ' + sizeLabel(inp.bottleSizeMl) + ' per night' + (bpnAssumed || sizeAssumed ? ' (assumed)' : '') : null,
      inp.pricePerBottle > 0 ? fmt.money(inp.symbol, inp.pricePerBottle, inp.decimals === 0 ? 0 : 2) + ' per bottle' + (prov.pricePerBottle.kind !== 'user' ? ' (reference price)' : '') : null,
      rec.segment.areas.join(', '),
      rec.segment.temps ? rec.segment.temps + ' water in the room' : null
    ].filter(Boolean);
    root.appendChild(el('header', { class: 'results-head' },
      el('p', { class: 'print-only', text: 'Swisspro Sustainability Wizard, ' + new Date().toISOString().slice(0, 10) + '. Indicative figures.' }),
      el('h1', { text: fmt.int(inp.rooms) + ' rooms in ' + n.country.name + (state.proposal.hotel ? ', ' + state.proposal.hotel : '') }),
      el('p', { class: 'facts' }, facts.join(' \u00b7 '), ' ', el('button', { type: 'button', class: 'link-btn', onclick: function () { state.view = 'wizard'; state.step = 0; delete state.overrides.inRoomTap; save(); render(); scrollTop(); } }, 'Change'))));

    var v = leadText(ctx);
    root.appendChild(el('section', { class: 'verdict verdict-' + v.tone, id: 'lead' },
      el('p', { class: 'verdict-head', text: v.head }),
      v.sub ? el('p', { class: 'verdict-sub', text: v.sub }) : null));

    var tiles = el('div', { class: 'tiles' }), pb0 = c.payback, pr0 = ctx.pr;
    function tile(label, value, sub, cls) {
      return el('div', { class: 'tile' + (cls ? ' ' + cls : '') }, el('div', { class: 'label', text: label }), el('div', { class: 'value' + (String(value).length >= 9 ? ' value-long' : ''), text: value }), el('div', { class: 'sub', text: sub || '' }));
    }
    tiles.appendChild(tile('Cash payback', pb0.available ? fmt.cap(fmt.years(pb0.cashPaybackYears)) : '-', pb0.available ? 'service contract included' : 'Investment not in the price list'));
    tiles.appendChild(tile('Payback including staff time freed', pb0.available && c.labour.quantified ? fmt.cap(fmt.years(pb0.fullPaybackYears)) : '-', c.labour.quantified ? fmt.int(c.labour.hours) + ' staff hours a year' : ''));
    tiles.appendChild(tile('Net saving a year', pb0.available ? moneyShort(ctx, pb0.cashSavingsPerYear) : '-', 'cash, after the service contract', pb0.available && pb0.cashSavingsPerYear < 0 ? 'neg' : null));
    tiles.appendChild(tile('Investment', pb0.available ? moneyShort(ctx, pb0.capex) : '-', pr0.capexSource === 'user' ? 'your figure' : 'list price'));
    root.appendChild(tiles);
    var env = [fmt.int(c.bottles.total) + ' bottles'];
    if (c.env.packagingKg != null) env.push(fmt.int(c.env.packagingKg) + ' kg of plastic');
    if (c.env.quantified) env.push(fmt.dec(c.env.co2eKg / 1000, 1) + ' t CO2e');
    root.appendChild(el('p', { class: 'also' }, el('strong', { text: 'Also avoided each year: ' }), env.join(', ') + '.'));

    var main = el('div', { class: 'results-main' }), aside = el('aside', { class: 'results-aside' });
    main.appendChild(renderPayback(ctx));
    main.appendChild(renderFiveYear(ctx));
    main.appendChild(renderCalculation(ctx));
    main.appendChild(renderSolution(ctx));
    main.appendChild(renderMore(ctx));
    main.appendChild(renderAdjust(ctx));
    main.appendChild(renderSources(ctx));
    aside.appendChild(renderProposal(ctx));
    root.appendChild(el('div', { class: 'results-body' }, main, aside));
    app.appendChild(root);
    document.getElementById('restart-top').hidden = false;
  }

  function serviceBasis(ctx) {
    var pr = ctx.pr, cur = PL.pricelist.currency.value, parts = [];
    if (pr.servicingSource === 'user') return 'your figure';
    if (pr.inRoomUnits > 0) parts.push(fmt.int(pr.inRoomUnits) + ' in-room units x 85.00 ' + cur + (pr.reading === 'perChange' ? ' per filter change, changed every ' + pr.months + ' months' : (pr.reading === 'perYear' ? ', one filter change per room and year' : ' per unit and 2-year contract')));
    if (pr.stations > 0) parts.push(fmt.int(pr.stations) + (pr.stations === 1 ? ' station' : ' stations') + ' x 350.00 ' + cur + ' a year');
    return parts.join(' plus ');
  }
  function renderPayback(ctx) {
    var c = ctx.calc, inp = ctx.n.inputs, pr = ctx.pr, pb = c.payback, cur = PL.pricelist.currency.value;
    var card = el('section', { class: 'card', id: 'business-case' });
    card.appendChild(el('div', { class: 'card-head' }, el('h3', { text: 'Business case' }),
      ARTIFACT ? null : el('button', { type: 'button', class: 'btn btn-secondary btn-sm no-print', onclick: function () { window.print(); } }, 'Print for the owner (PDF)')));
    if (pb.available) {
      var t = el('table', { class: 'kv' });
      function row(k, v, cls) { t.appendChild(el('tr', { class: cls || null }, el('th', { text: k }), el('td', { text: v }))); }
      row('Bottled water bought today, per year', money(ctx, c.spend.annualLocal));
      row('Service contract, per year', money(ctx, -pb.annualService));
      row('Net cash saving, per year', money(ctx, pb.cashSavingsPerYear), pb.cashSavingsPerYear < 0 ? 'neg' : null);
      row('Investment', money(ctx, pb.capex));
      row('Cash payback', fmt.cap(fmt.years(pb.cashPaybackYears)), 'strong');
      if (c.labour.quantified) row('Payback including staff time freed', fmt.cap(fmt.years(pb.fullPaybackYears)), 'strong');
      row('Five-year net saving, cash', money(ctx, pb.fiveYearNetCash), pb.fiveYearNetCash < 0 ? 'neg' : null);
      card.appendChild(t);
      card.appendChild(renderPerMonth(ctx));
      card.appendChild(renderUpgrade(ctx));
    } else if (pr.unpriced.length) {
      card.appendChild(el('p', { class: 'notice', text: 'The price list has no unit for ' + pr.unpriced.map(function (u) { return u.area; }).join(' and ') + '. Enter the investment from your proposal under Adjust to see the payback.' }));
    } else {
      card.appendChild(el('p', { class: 'muted small', text: 'Enter the investment under Adjust to see the payback.' }));
    }
    var scope = pr.rate.same ? 'List prices in ' + cur + '. ' : 'List prices in ' + cur + ', converted at 1 ' + cur + ' = ' + fmt.money(inp.symbol, pr.rate.localPerList, inp.decimals === 0 ? 0 : 2) + ' (' + fxDate(ctx) + '). ';
    card.appendChild(el('p', { class: 'small muted scope', text: scope + 'Prices exclude GST, installation, freight, duties and local taxes. Your proposal sets the final prices and quantities.' }));
    return card;
  }

  /** Per room and month: the hotel's own budget view. Arithmetic, not an offer. */
  function renderPerMonth(ctx) {
    var m = ctx.pr.perRoomMonth, inp = ctx.n.inputs, d = inp.decimals === 0 ? 0 : 2;
    if (!m) return el('span', {});
    var f = function (v) { return fmt.money(inp.symbol, v, d); };
    var t = el('table', { class: 'kv permonth' },
      el('tr', {}, el('th', { text: 'Bottled water today' }), el('td', { text: f(m.today) })),
      el('tr', {}, el('th', { text: 'Swisspro, years 1 to ' + m.spreadYears + ' (service plus investment / ' + m.spreadYears * 12 + ' months)' }), el('td', { text: f(m.swisspro) })),
      el('tr', { class: 'strong' }, el('th', { text: 'Swisspro from year ' + (m.spreadYears + 1) + ' (service only)' }), el('td', { text: f(m.service) })));
    return el('div', { class: 'sub-block' }, el('h4', { text: 'Per room and month' }), t,
      el('p', { class: 'small muted', text: 'Arithmetic on the figures above, not a financing offer.' }));
  }

  /** The unit that matches the hotel's wish, priced on top of the base case. */
  function renderUpgrade(ctx) {
    var up = ctx.pr.upgrade, c = ctx.calc;
    if (!up) return el('span', {});
    var unit = up.inRoom && up.inRoom.exactMatch && up.inRoom.products[0];
    var wish = R.LABELS.temps[up.temps];
    if (!up.payback || !unit) return el('div', { class: 'alt-box' }, el('p', {}, el('strong', { text: 'Upgrade for ' + wish + ' water: ' }), 'priced in the proposal.'));
    var p = up.payback;
    return el('div', { class: 'alt-box' },
      el('p', {}, el('strong', { text: 'Upgrade for ' + wish + ' water: ' + modelName(unit) }),
        ' (' + listPrice(unit) + ' per room' + (up.temps === 'sparkling' ? ', sparkling from a drinking station' : '') + '). Extra investment ' + money(ctx, up.extraCapex) + (Math.abs(up.extraService) > 0.5 ? ', extra service ' + money(ctx, up.extraService) + ' a year' : '') +
        '. Cash payback ' + fmt.years(p.cashPaybackYears) + (c.labour.quantified ? ', including staff time freed ' + fmt.years(p.fullPaybackYears) : '') + '.'));
  }

  /** Cumulative cost over five years: bottled water against Swisspro (investment plus service). */
  function renderFiveYear(ctx) {
    var v = ctx.pr.fiveYear, inp = ctx.n.inputs;
    if (!v) return el('span', {});
    var card = el('section', { class: 'card', id: 'five-year' });
    card.appendChild(el('h3', { text: 'Five years: bottled water against Swisspro' }));
    var W = 640, H = 260, P = { l: 64, r: 16, t: 16, b: 32 };
    var max = Math.max.apply(null, v.bottled.concat(v.swisspro)) || 1;
    var step = niceStep(max / 4), top = Math.ceil(max / step) * step;
    var x = function (t) { return P.l + (W - P.l - P.r) * t / 5; }, y = function (val) { return H - P.b - (H - P.t - P.b) * val / top; };
    var NS = 'http://www.w3.org/2000/svg';
    function s(tag, attrs, text) { var n = document.createElementNS(NS, tag); Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); }); if (text != null) n.textContent = text; return n; }
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': 'Cumulative cost over five years' });
    for (var g = 0; g <= top + 1e-9; g += step) {
      svg.appendChild(s('line', { x1: P.l, x2: W - P.r, y1: y(g), y2: y(g), class: 'grid' }));
      svg.appendChild(s('text', { x: P.l - 8, y: y(g) + 4, class: 'tick', 'text-anchor': 'end' }, fmt.moneyShort(inp.symbol, g, 0)));
    }
    v.years.forEach(function (t) { svg.appendChild(s('text', { x: x(t), y: H - 10, class: 'tick', 'text-anchor': 'middle' }, t === 0 ? 'Today' : 'Year ' + t)); });
    function line(vals, cls, name) {
      svg.appendChild(s('polyline', { points: vals.map(function (val, i) { return x(i) + ',' + y(val); }).join(' '), class: 'series ' + cls }));
      vals.forEach(function (val, i) { var dot = s('circle', { cx: x(i), cy: y(val), r: 4, class: 'dot ' + cls }); dot.appendChild(s('title', {}, name + ', ' + (i === 0 ? 'today' : 'year ' + i) + ': ' + money(ctx, val))); svg.appendChild(dot); });
    }
    line(v.bottled, 's-bottled', 'Bottled water');
    line(v.swisspro, 's-swisspro', 'Swisspro');
    if (v.crossesInView) {
      var cx = x(v.crossYear), cy = y(v.swisspro[0] + (v.swisspro[5] - v.swisspro[0]) * v.crossYear / 5);
      svg.appendChild(s('line', { x1: cx, x2: cx, y1: P.t, y2: H - P.b, class: 'cross' }));
      svg.appendChild(s('text', { x: cx + (cx > W - 160 ? -6 : 6), y: P.t + 12, class: 'cross-label', 'text-anchor': cx > W - 160 ? 'end' : 'start' }, 'Break-even after ' + fmt.years(v.crossYear)));
    }
    var legend = el('div', { class: 'legend' },
      el('span', {}, el('i', { class: 'sw s-bottled' }), 'Bottled water, ' + money(ctx, v.bottled[5]) + ' after 5 years'),
      el('span', {}, el('i', { class: 'sw s-swisspro' }), 'Swisspro, investment plus service, ' + money(ctx, v.swisspro[5]) + ' after 5 years'));
    card.appendChild(legend);
    var wrap = el('div', { class: 'chart-wrap' }); wrap.appendChild(svg); card.appendChild(wrap);
    var tbl = el('table', { class: 'kv five-table' }, el('tr', {}, el('th', { text: '' }), el('td', { class: 'head', text: 'Bottled water' }), el('td', { class: 'head', text: 'Swisspro' })));
    v.years.forEach(function (t) { tbl.appendChild(el('tr', {}, el('th', { text: t === 0 ? 'Today' : 'After year ' + t }), el('td', { text: money(ctx, v.bottled[t]) }), el('td', { text: money(ctx, v.swisspro[t]) }))); });
    card.appendChild(el('details', { class: 'inline' }, el('summary', { text: 'Show the figures' }), tbl));
    return card;
  }
  function niceStep(raw) { var p = Math.pow(10, Math.floor(Math.log10(raw || 1))); var m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; }

  /** The calculation path, step by step with the hotel's numbers. Rows are reused for the CSV download. */
  function calcRows(ctx) {
    var c = ctx.calc, inp = ctx.n.inputs, pr = ctx.pr, pb = c.payback, cur = PL.pricelist.currency.value, rate = pr.rate.localPerList;
    var conv = pr.rate.same ? '' : ' x ' + fmt.dec(rate, inp.decimals === 0 ? 0 : 2) + ' (exchange rate)';
    var rows = [];
    rows.push(['Occupied room-nights a year', fmt.int(inp.rooms) + ' rooms x ' + fmt.pct(inp.occupancy) + ' x 365', fmt.int(c.bottles.occupiedRoomNights)]);
    rows.push(['Bottles a year', fmt.int(c.bottles.occupiedRoomNights) + ' x ' + inp.bottlesPerRoomNight + ' per night', fmt.int(c.bottles.total)]);
    rows.push(['Bottled water bought a year', fmt.int(c.bottles.total) + ' x ' + fmt.money(inp.symbol, inp.pricePerBottle, inp.decimals === 0 ? 0 : 2), money(ctx, c.spend.annualLocal)]);
    var inRoomTxt = pr.reading === 'perChange' ? '85.00 ' + cur + ' x 12 / ' + pr.months + ' months' : (pr.reading === 'perYear' ? '85.00 ' + cur + ' (one change a year)' : '85.00 ' + cur + ' / 2 years');
    var sv = pr.servicingSource === 'user' ? 'your figure' : [pr.inRoomUnits ? fmt.int(pr.inRoomUnits) + ' x ' + inRoomTxt : null, pr.stations ? fmt.int(pr.stations) + ' x ' + fmt.dec(pr.stationPerYear, 2) + ' ' + cur : null].filter(Boolean).join(' + ') + conv;
    rows.push(['Service contract a year', sv, money(ctx, pr.servicingLocal)]);
    if (pb.available) {
      rows.push(['Net cash saving a year', money(ctx, c.spend.annualLocal) + ' - ' + money(ctx, pb.annualService), money(ctx, pb.cashSavingsPerYear)]);
      var inv = pr.capexSource === 'user' ? 'your figure' : pr.lines.map(function (l) { return fmt.int(l.units) + ' x ' + fmt.dec(l.product.price, 2) + ' ' + cur + ' (' + modelName(l.product) + ')'; }).join(' + ') + conv;
      rows.push(['Investment', inv, money(ctx, pb.capex)]);
      rows.push(['Cash payback', isFinite(pb.cashPaybackYears) ? money(ctx, pb.capex) + ' / ' + money(ctx, pb.cashSavingsPerYear) : 'net saving is not positive', fmt.cap(fmt.years(pb.cashPaybackYears))]);
      if (c.labour.quantified) {
        rows.push(['Staff time freed a year', fmt.int(c.labour.hours) + ' h x ' + fmt.money(inp.symbol, inp.wageHourly, 2), money(ctx, c.labour.costLocal)]);
        rows.push(['Payback including staff time freed', isFinite(pb.fullPaybackYears) ? money(ctx, pb.capex) + ' / (' + money(ctx, pb.cashSavingsPerYear) + ' + ' + money(ctx, c.labour.costLocal) + ')' : 'saving is not positive', fmt.cap(fmt.years(pb.fullPaybackYears))]);
      }
      rows.push(['Five-year net saving, cash', '5 x ' + money(ctx, pb.cashSavingsPerYear) + ' - ' + money(ctx, pb.capex), money(ctx, pb.fiveYearNetCash)]);
    }
    return rows;
  }

  function renderCalculation(ctx) {
    var rows = calcRows(ctx);
    var card = el('section', { class: 'card', id: 'calculation' });
    card.appendChild(el('div', { class: 'card-head' }, el('h3', { text: 'Calculation' }),
      el('button', { type: 'button', class: 'btn btn-secondary btn-sm no-print', onclick: function () { downloadCsv(ctx); } }, 'Download for Excel (CSV)')));
    var t = el('table', { class: 'kv calc' });
    rows.forEach(function (r) { t.appendChild(el('tr', {}, el('th', { text: r[0] }), el('td', { class: 'how', text: r[1] }), el('td', { text: r[2] }))); });
    card.appendChild(t);
    return card;
  }

  function downloadCsv(ctx) {
    var inp = ctx.n.inputs, q = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
    var lines = [['Item', 'Calculation', 'Result'].map(q).join(',')];
    calcRows(ctx).forEach(function (r) { lines.push(r.map(q).join(',')); });
    lines.push('');
    lines.push(['Input', 'Value', 'Basis'].map(q).join(','));
    [['Rooms', inp.rooms, 'your answer'], ['Occupancy', fmt.pct(inp.occupancy), ctx.n.provenance.occupancy.kind === 'user' ? 'your answer' : 'national average'],
     ['Bottles per room and night', inp.bottlesPerRoomNight, ctx.n.provenance.bottlesPerRoomNight.kind === 'user' ? 'your answer' : 'assumed'],
     ['Price per bottle (' + inp.currency + ')', inp.pricePerBottle, ctx.n.provenance.pricePerBottle.kind === 'user' ? 'your answer' : 'reference price'],
     ['Hourly labour cost (' + inp.currency + ')', Math.round(inp.wageHourly * 100) / 100, ctx.n.provenance.wageHourly.kind === 'user' ? 'your figure' : 'minimum wage']
    ].forEach(function (r) { lines.push(r.map(q).join(',')); });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = el('a', { href: URL.createObjectURL(blob), download: 'swisspro-business-case.csv' });
    document.body.appendChild(a); a.click(); a.remove();
  }

  function renderSolution(ctx) {
    var pr = ctx.pr, base = pr.base, up = pr.upgrade;
    var card = el('section', { class: 'card no-print', id: 'setup' });
    card.appendChild(el('h3', { text: 'The Swisspro set-up' }));
    function unitBox(title, units, covers, p, note) {
      var box = el('div', { class: 'product' });
      box.appendChild(el('div', { class: 'product-head' }, el('h4', { text: title }), el('span', { class: 'muted small', text: fmt.int(units) + (units === 1 ? ' unit' : ' units') + (covers ? ' for ' + covers : '') })));
      box.appendChild(el('div', { class: 'pick-line' },
        el('div', { class: 'pick-name' }, el('strong', { text: modelName(p) }), el('span', { class: 'muted small', text: p.describe })),
        el('div', { class: 'pick-price' }, el('strong', { text: listPrice(p) }), el('span', { class: 'muted small', text: 'per unit, about ' + money(ctx, pr.toLocal(p.price)) }))));
      if (note) box.appendChild(el('p', { class: 'small muted', text: note }));
      return box;
    }
    base.solutions.forEach(function (s) {
      var units = s.area === 'inRoom' ? base.plan.inRoom : base.plan.stations;
      if (units <= 0) return;
      if (s.exactMatch && s.products.length) card.appendChild(unitBox(s.area === 'inRoom' ? 'Base case: filtered tap in every guest room' : s.title, units, s.area === 'inRoom' ? '' : s.covers.join(', '), s.products[0]));
    });
    if (up && up.inRoom && up.inRoom.exactMatch) {
      var notes = up.inRoom.notes.filter(function (n) { return !/lower-cost/.test(n); }).join(' ');
      card.appendChild(unitBox('Upgrade: ' + R.LABELS.temps[up.temps] + ' water in the room', up.plan.inRoom, '', up.inRoom.products[0], notes));
      up.solutions.filter(function (s) { return s.area === 'fnb' && s.requiredTemps.indexOf('sparkling') >= 0 && s.exactMatch; }).forEach(function (s) {
        card.appendChild(unitBox('Upgrade: drinking station with sparkling water', up.plan.stations, s.covers.join(', '), s.products[0]));
      });
    }
    card.appendChild(el('p', { class: 'small muted', text: 'Installation, plumbing, water testing and the service schedule are set out in the proposal.' }));
    return card;
  }

  function renderMore(ctx) {
    var c = ctx.calc, inp = ctx.n.inputs;
    var d = el('details', { class: 'card fine' }, el('summary', { text: 'Logistics and per-room figures' }));
    var t = el('table', { class: 'kv' });
    function row(k, v) { t.appendChild(el('tr', {}, el('th', { text: k }), el('td', { text: v }))); }
    row('Cartons a year', fmt.int(c.logistics.cartonsPerYear));
    row('Pallets a year', fmt.dec(c.logistics.palletsPerYear, 0));
    row('Deliveries a year', fmt.int(c.logistics.deliveriesPerYear));
    row('Store area for ' + inp.stockWeeks + ' weeks of stock', fmt.dec(c.logistics.storageM2, 1) + ' m2');
    row('Weight carried by staff a year', fmt.int(c.logistics.tonnesHandled) + ' t' + (inp.bottleMaterial === 'glass' ? ' (water only)' : ''));
    row('Staff time as full-time equivalents', fmt.dec(c.labour.fteEquivalent, 2) + ' FTE');
    if (inp.rooms > 0) {
      row('Bottles per room a year', fmt.int(c.bottles.roomBottles / inp.rooms));
      if (inp.pricePerBottle > 0) row('Bottled water per room a year', money(ctx, c.spend.annualLocal / inp.rooms));
      if (c.payback.available && inp.occupancy > 0) row('Investment and service per occupied room-night, over five years', money(ctx, (c.payback.capex + 5 * c.payback.annualService) / (5 * c.bottles.occupiedRoomNights)));
    }
    d.appendChild(t);
    return d;
  }

  function renderAdjust(ctx) {
    var inp = ctx.n.inputs, c = ctx.calc, pr = ctx.pr, o = state.overrides, SV = PL.pricelist.servicing;
    var card = el('details', { class: 'card fine adjust-card' }, el('summary', { text: 'Adjust the assumptions' }));
    function group(title) { var g = el('div', { class: 'adjust-group' }); g.appendChild(el('h4', { text: title })); var grid = el('div', { class: 'adjust' }); g.appendChild(grid); card.appendChild(g); return grid; }
    function field(grid, id, label, value, step, extra, hint) {
      var d = el('div', {});
      d.appendChild(el('label', { for: 'ov-' + id, text: label }));
      d.appendChild(el('input', Object.assign({ class: 'input', id: 'ov-' + id, type: 'number', step: step, min: 0, value: value, onchange: function (e) { if (e.target.value === '') delete o[id]; else o[id] = Number(e.target.value); if (id === 'occupancy' && o[id] != null) o[id] = o[id] / 100; save(); renderResults(); } }, extra || {})));
      if (hint) d.appendChild(el('span', { class: 'hint', text: hint }));
      grid.appendChild(d);
      return d;
    }
    var g1 = group('Your hotel');
    field(g1, 'occupancy', 'Occupancy (%)', Math.round(inp.occupancy * 1000) / 10, 1, { max: 100 }, ctx.n.provenance.occupancy.kind === 'user' ? 'Your figure' : 'National average');
    field(g1, 'bottlesPerRoomNight', 'Bottles per room and night', inp.bottlesPerRoomNight, 0.5);
    field(g1, 'pricePerBottle', 'Price per bottle (' + inp.currency + ')', Math.round(inp.pricePerBottle * 1000) / 1000, 0.01, null, ctx.n.provenance.pricePerBottle.kind === 'user' ? 'Your price' : 'Reference price');
    if (c.env.packagingKg != null) field(g1, 'bottleWeightG', 'Empty bottle weight (g)', Math.round(c.env.bottleWeightG * 100) / 100, 0.1);
    var g2 = group('Investment and service');
    field(g2, 'capex', 'Investment (' + inp.currency + ')', o.capex != null ? o.capex : (pr.capexLocal != null ? Math.round(pr.capexLocal) : ''), 1, { placeholder: 'from your proposal' }, (pr.capexSource === 'user' ? 'Your figure' : (pr.capexSource === 'pricelist' ? 'List price' : 'Not in the price list')) + (pr.capexLocal != null ? ', ' + money(ctx, pr.capexLocal) : ''));
    field(g2, 'annualService', 'Service contract per year (' + inp.currency + ')', Math.round(pr.servicingLocal), 1, null, (pr.servicingSource === 'user' ? 'Your figure' : 'List price') + ', ' + money(ctx, pr.servicingLocal));
    field(g2, 'stations', 'Drinking stations', pr.stations, 1, null, o.stations != null ? 'Your figure' : 'One per area chosen');
    field(g2, 'changeMonths', 'Months between filter changes', pr.months, 1, { max: 36, disabled: pr.reading === 'perChange' ? null : 'disabled' }, 'In-room units');
    var selWrap = el('div', {});
    selWrap.appendChild(el('label', { for: 'ov-reading', text: 'In-room service price (' + PL.pricelist.currency.value + ')' }));
    var sel = el('select', { class: 'input', id: 'ov-reading', onchange: function (e) { o.serviceReading = e.target.value; delete o.annualService; save(); renderResults(); } });
    var SHORT = { perChange: '85.00 per filter change', perYear: '85.00 per unit and year', perContract2y: '85.00 per 2-year contract' };
    SV.readings.forEach(function (r) { var opt = el('option', { value: r.id, text: SHORT[r.id] || r.label }); if (r.id === pr.reading) opt.selected = true; sel.appendChild(opt); });
    selWrap.appendChild(sel); selWrap.appendChild(el('span', { class: 'hint', text: 'Stations 350.00 ' + PL.pricelist.currency.value + ' a year' }));
    g2.appendChild(selWrap);
    var g3 = group('Staff time');
    field(g3, 'minutesPerRoomPerDay', 'Minutes per room and day, bottles', inp.minutesPerRoomPerDay, 0.5);
    field(g3, 'minutesPerCarton', 'Minutes per carton', inp.minutesPerCarton, 0.5);
    field(g3, 'newMinutesPerRoomPerDay', 'Minutes per room and day, filtered', inp.newMinutesPerRoomPerDay, 0.5);
    field(g3, 'wageHourly', 'Hourly labour cost (' + inp.currency + ')', Math.round(inp.wageHourly * 100) / 100, 0.1, null, ctx.n.provenance.wageHourly.kind === 'user' ? 'Your figure' : (ctx.n.country.wageMonthly.label || 'Minimum wage') + ', adjust for your property');
    field(g3, 'stockWeeks', 'Weeks of stock on site', inp.stockWeeks, 1);
    card.appendChild(el('div', { class: 'actions' }, el('button', { type: 'button', class: 'btn btn-ghost', onclick: function () { state.overrides = {}; save(); renderResults(); } }, 'Reset to the defaults')));
    return card;
  }

  function renderSources(ctx) {
    var cc = ctx.n.country, prov = ctx.n.provenance, inp = ctx.n.inputs, pr = ctx.pr;
    var card = el('details', { class: 'card fine' }, el('summary', { text: 'Where the numbers come from' }));
    var list = el('ul', { class: 'sources-list' });
    function item(label, text, src) {
      var li = el('li', {}, el('strong', { text: label + ': ' }), text);
      var s = src && src.url ? src : null;
      if (s) li.appendChild(el('span', {}, ' ', el('a', { href: s.url, target: '_blank', rel: 'noopener', text: s.publisher || 'source' })));
      return li;
    }
    function srcOf(p) { return p.source || (p.url ? { url: p.url, publisher: 'source' } : null); }
    list.appendChild(item('Occupancy', fmt.pct(inp.occupancy) + (prov.occupancy.kind === 'user' ? ', your figure' : ', ' + (cc.occupancy.unit || 'national average')), prov.occupancy.kind === 'user' ? null : srcOf(cc.occupancy)));
    list.appendChild(item('Bottles per room and night', inp.bottlesPerRoomNight + (prov.bottlesPerRoomNight.kind === 'user' ? ', your answer' : ', assumed when not sure')));
    if (inp.pricePerBottle > 0) list.appendChild(item('Price per bottle', fmt.money(inp.symbol, inp.pricePerBottle, inp.decimals === 0 ? 0 : 2) + (prov.pricePerBottle.kind === 'user' ? ', your price' : ', ' + (prov.pricePerBottle.note || prov.pricePerBottle.label)), prov.pricePerBottle.kind === 'user' ? null : srcOf(prov.pricePerBottle)));
    list.appendChild(item('Labour cost', fmt.money(inp.symbol, inp.wageHourly, 2) + ' an hour' + (prov.wageHourly.kind === 'user' ? ', your figure' : ', ' + (cc.wageMonthly.label || 'reference wage')), prov.wageHourly.kind === 'user' ? null : srcOf(cc.wageMonthly)));
    list.appendChild(item('Handling time', inp.minutesPerRoomPerDay + ' min per room and day, ' + inp.minutesPerCarton + ' min per carton, assumed and adjustable'));
    if (inp.bottleMaterial === 'pet') {
      list.appendChild(item('Bottle weight', fmt.dec(ctx.calc.env.bottleWeightG, 1) + ' g per empty ' + inp.bottleSizeMl + ' ml PET bottle', F.factors.pet_bottle_weight_500ml_g.source));
      list.appendChild(item('CO2e per kg of PET', F.factors.co2e_kg_per_kg_pet.value + ' kg, production only', F.factors.co2e_kg_per_kg_pet.source));
    } else {
      list.appendChild(item('CO2e for glass bottles', F.factors.glass_co2e.value + ' kg per litre, reused glass; single-use glass is higher', F.factors.glass_co2e.source));
    }
    list.appendChild(item('Car comparison', F.factors.co2e_kg_per_car_km.value + ' kg CO2e per km', F.factors.co2e_kg_per_car_km.source));
    list.appendChild(item('Cartons and pallets', F.factors.bottles_per_carton.value + ' bottles per carton, ' + fmt.int(F.factors.bottles_per_pallet_500ml.value) + ' per pallet at 500 ml', F.factors.bottles_per_pallet_500ml.source));
    list.appendChild(item('Products and prices', 'Swisspro price list, Hospitality section, ' + PL.pricelist.source.dated + ', ' + PL.pricelist.currency.value + ' excl. GST; one in-room unit per room, one drinking station per area'));
    list.appendChild(item('Service contract', serviceBasis(ctx) + (pr.servicingSource === 'user' ? '' : (pr.reading === 'perYear' ? '; one change per room and year as in the Westin Singapore case (Swisspro, 2024), other readings under Adjust' : '')), F.factors.westin_case_2024.source));
    if (!pr.rate.same) list.appendChild(item('Exchange rate', '1 ' + PL.pricelist.currency.value + ' = ' + fmt.money(inp.symbol, pr.rate.localPerList, inp.decimals === 0 ? 0 : 2) + ', ' + fxDate(ctx), cc.fx.source));
    card.appendChild(list);
    card.appendChild(el('p', { class: 'small muted' }, 'Every value, its source and the rule behind it: ', sourcesLink('sources and assumptions'), '.'));
    return card;
  }

  /* ------------------------------------------------------------------ proposal request */
  function summaryText(ctx) {
    var a = state.answers, p = state.proposal, c = ctx.calc, rec = ctx.rec, inp = ctx.n.inputs, pr = ctx.pr, sym = inp.symbol, pb = c.payback;
    var m = function (v) { return fmt.money(sym, v, 0); };
    var L = [];
    L.push('Proposal request via the Swisspro Sustainability Wizard, ' + new Date().toISOString().slice(0, 10));
    var segLabel = (Q.proposalFields.filter(function (f) { return f.id === 'segment'; })[0].options.filter(function (o) { return o.id === p.segment; })[0] || {}).label;
    L.push('Hotel: ' + (p.hotel || 'not given') + '. Segment: ' + (p.segment ? segLabel : 'not given') + '. Rooms: ' + fmt.int(inp.rooms) + '.');
    L.push('Contact: ' + (p.name || 'not given') + ', ' + (p.email || 'no email given') + (p.phone ? ', ' + p.phone : '') + '.');
    L.push('');
    L.push(fmt.int(inp.rooms) + ' rooms in ' + ctx.n.country.name + ', ' + fmt.pct(inp.occupancy) + ' occupancy' + (ctx.n.provenance.occupancy.kind === 'user' ? '' : ' (national average)') + '.');
    L.push('Today: ' + rec.segment.current + (inp.bottlesPerRoomNight ? ', ' + inp.bottlesPerRoomNight + ' x ' + sizeLabel(inp.bottleSizeMl) + ' per room and night' : '') + (inp.pricePerBottle > 0 ? ' at ' + fmt.money(sym, inp.pricePerBottle, inp.decimals === 0 ? 0 : 2) + ' per bottle' + (ctx.n.provenance.pricePerBottle.kind === 'user' ? '' : ' (reference price)') : '') + '.');
    L.push('Wanted: ' + rec.segment.areas.join(', ') + (rec.segment.temps ? '; ' + rec.segment.temps + ' water in the room' : '') + '.');
    var extra = []; if (p.source) extra.push('Water supply: ' + (R.LABELS.source[p.source] || p.source)); if (p.halal) extra.push('Halal certificate requested'); if (p.timing) extra.push('Timing: ' + R.LABELS.timing[p.timing]); if (p.approval) extra.push('Approval by: ' + R.LABELS.approval[p.approval]);
    if (extra.length) L.push(extra.join('. ') + '.');
    L.push('');
    L.push('Indicative figures per year');
    L.push('- Bottles avoided: ' + fmt.int(c.bottles.total) + ' (' + fmt.int(c.env.litres) + ' litres)');
    if (c.env.packagingKg != null) L.push('- Plastic avoided: ' + fmt.int(c.env.packagingKg) + ' kg');
    if (c.env.quantified) L.push('- CO2e avoided: ' + fmt.dec(c.env.co2eKg / 1000, 1) + ' t');
    if (inp.pricePerBottle > 0) L.push('- Bottled water bought today: ' + m(c.spend.annualLocal));
    L.push('- Service contract: ' + m(pr.servicingLocal) + ' a year (' + serviceBasis(ctx) + (pr.servicingSource === 'user' ? '' : ', list price') + ')');
    L.push('- Staff time freed: ' + fmt.int(c.labour.hours) + ' hours' + (c.labour.quantified ? ', about ' + m(c.labour.costLocal) + ', not counted in the payback' : ''));
    if (pb.available) L.push('- Investment: ' + m(pb.capex) + (pr.capexSource === 'user' ? ' (hotel figure)' : ' (list price)') + '. Cash payback: ' + fmt.cap(fmt.years(pb.cashPaybackYears)) + (c.labour.quantified ? '. Including staff time freed: ' + fmt.years(pb.fullPaybackYears) : '') + '. Five-year net saving: ' + m(pb.fiveYearNetCash) + '.');
    L.push('');
    L.push('Set-up (base case)');
    pr.lines.forEach(function (l) { L.push('- ' + fmt.int(l.units) + ' x ' + modelName(l.product) + ' at ' + listPrice(l.product) + ' per unit' + (l.area === 'inRoom' ? ' (guest rooms)' : ' (drinking stations)')); });
    if (pr.upgrade && pr.upgrade.payback && pr.upgrade.inRoom && pr.upgrade.inRoom.exactMatch) L.push('- Upgrade for ' + R.LABELS.temps[pr.upgrade.temps] + ' water: ' + modelName(pr.upgrade.inRoom.products[0]) + ', extra investment ' + m(pr.upgrade.extraCapex) + ', cash payback ' + fmt.years(pr.upgrade.payback.cashPaybackYears) + '.');
    L.push('');
    L.push((pr.rate.same ? 'List prices in ' + PL.pricelist.currency.value : 'List prices in ' + PL.pricelist.currency.value + ', converted at 1 ' + PL.pricelist.currency.value + ' = ' + fmt.money(sym, pr.rate.localPerList, inp.decimals === 0 ? 0 : 2)) + ', excl. GST, installation, freight, duties and taxes. Indicative only.');
    L.push('Sources and assumptions: ' + sourcesUrl());
    return L.join('\n');
  }

  function renderProposal(ctx) {
    var p = state.proposal;
    var card = el('section', { class: 'card', id: 'proposal' });
    card.appendChild(el('h3', { text: 'Request a proposal' }));
    card.appendChild(el('p', { class: 'muted form-intro', text: 'Swisspro replies with a proposal for your hotel. Nothing is sent until you click the button.' }));
    var grid = el('div', { class: 'adjust' });
    var REQUIRED = { name: true, hotel: true, segment: true, email: true };
    Q.proposalFields.forEach(function (f) {
      var d = el('div', {});
      d.appendChild(el('label', { for: 'pf-' + f.id, text: f.label + (REQUIRED[f.id] ? '' : ' (optional)') }));
      if (f.type === 'select') {
        var sel = el('select', { class: 'input', id: 'pf-' + f.id, onchange: function (e) { p[f.id] = e.target.value; save(); } });
        f.options.forEach(function (o) { var opt = el('option', { value: o.id, text: o.label }); if ((p[f.id] || '') === o.id) opt.selected = true; sel.appendChild(opt); });
        d.appendChild(sel);
      } else {
        d.appendChild(el('input', { class: 'input', id: 'pf-' + f.id, type: f.type, placeholder: REQUIRED[f.id] ? 'Required' : '', required: REQUIRED[f.id] ? 'required' : null, autocomplete: f.id === 'email' ? 'email' : (f.id === 'name' ? 'name' : (f.id === 'phone' ? 'tel' : 'organization')), value: p[f.id] || '', oninput: function (e) { p[f.id] = e.target.value; save(); } }));
      }
      d.appendChild(el('div', { class: 'error', id: 'perr-' + f.id, hidden: true }));
      grid.appendChild(d);
    });
    card.appendChild(grid);
    var status = el('p', { class: 'small', id: 'send-status', 'aria-live': 'polite' });
    var ta = el('textarea', { class: 'copy-area', readonly: 'readonly', 'aria-label': 'Summary text' });
    function refreshText() { ta.value = summaryText(compute()); return ta.value; }
    refreshText();
    function validContact() {
      var ok = true;
      ['name', 'hotel', 'segment', 'email'].forEach(function (k) {
        var msg = '';
        if (!p[k] || !String(p[k]).trim()) msg = k === 'segment' ? 'Please choose one.' : 'Please fill this in.';
        else if (k === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p[k])) msg = 'Please enter a valid email address.';
        var e = document.getElementById('perr-' + k); if (e) { e.textContent = msg; e.hidden = !msg; }
        if (msg) ok = false;
      });
      return ok;
    }
    function send(btn) {
      if (!validContact()) { status.textContent = ''; return; }
      var txt = refreshText(), subject = 'Proposal request via the Sustainability Wizard: ' + p.hotel;
      if (PL.leadEndpoint) {
        btn.disabled = true; status.textContent = 'Sending...';
        var body = { name: p.name, hotel: p.hotel, email: p.email, source: p.source || '', halal: p.halal || '', timing: p.timing || '', approval: p.approval || '', answers: state.answers, overrides: state.overrides, summary: txt };
        fetch(PL.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); status.textContent = 'Sent. Swisspro will reply to ' + p.email + '.'; btn.textContent = 'Request sent'; })
          .catch(function () { btn.disabled = false; status.textContent = 'The request could not be sent. Please email the summary to ' + PL.leadEmail + '.'; });
      } else {
        window.location.href = 'mailto:' + PL.leadEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(txt);
        status.textContent = 'Your email program opens with the request addressed to ' + PL.leadEmail + '. If it does not, copy the summary and email it.';
      }
    }
    function copyText(btn, text) { var done = function () { btn.textContent = 'Copied'; }; try { navigator.clipboard.writeText(text).then(done, function () { ta.select(); document.execCommand('copy'); done(); }); } catch (e) { ta.select(); document.execCommand('copy'); done(); } }
    var sendBtn = el('button', { type: 'button', class: 'btn btn-primary', onclick: function () { send(sendBtn); } }, 'Send the request to Swisspro');
    var actions = el('div', { class: 'actions', style: 'margin-top:14px' },
      sendBtn,
      el('button', { type: 'button', class: 'btn btn-secondary', onclick: function () { copyText(this, refreshText()); } }, 'Copy the summary'),
      el('button', { type: 'button', class: 'btn btn-ghost', onclick: function () { state.view = 'wizard'; state.step = 0; delete state.overrides.inRoomTap; save(); render(); scrollTop(); } }, 'Change my answers'),
      el('button', { type: 'button', class: 'btn btn-ghost', onclick: restart }, 'Start over'));
    card.appendChild(actions);
    card.appendChild(status);
    if (ARTIFACT) card.appendChild(el('p', { class: 'small muted', text: 'In this preview the email button may do nothing; copy the summary instead.' }));
    card.appendChild(el('details', { class: 'inline' }, el('summary', { text: 'Show the summary text' }), ta));
    card.appendChild(el('p', { class: 'small muted', text: 'Or email ' + PL.leadEmail + ' directly. Your answers stay in this browser; nothing is stored elsewhere until you send the request.' }));
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
