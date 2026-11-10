/* Swisspro Sustainability Wizard - UI (design v3). Vanilla JS, no build step.
 * Markup and layout only: every number comes from engine.js, model.js, business.js and pricelist.js. */
(function () {
  'use strict';
  var F = window.SW.factors, E = window.SW.engine, PL = window.SW.pricelist, Q = window.SW.questions,
      M = window.SW.model, R = window.SW.recommend, B = window.SW.business, fmt = window.SW.format;
  var STORE = 'swisspro-wizard-v2';
  var ARTIFACT = !!window.SW_ARTIFACT; // hosted preview frame: no print dialog, no mailto
  var EMBED = /[?&]embed=1/.test(location.search) || document.documentElement.hasAttribute('data-embed');
  if (EMBED) document.documentElement.setAttribute('data-embed', '');
  // When embedded in Swisspro's site, tell the parent page our height so the iframe can grow with the content.
  function postHeight() { try { if (window.parent !== window) window.parent.postMessage({ swissproWizardHeight: document.documentElement.scrollHeight }, '*'); } catch (e) { /* ignore */ } }
  if (EMBED) { new MutationObserver(postHeight).observe(document.body, { childList: true, subtree: true }); window.addEventListener('load', postHeight); window.addEventListener('resize', postHeight); }
  // Bubbles pause while the page is hidden.
  document.addEventListener('visibilitychange', function () { document.documentElement.classList.toggle('anim-paused', document.hidden); });
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var app = document.getElementById('app');
  var state = load() || { view: 'intro', step: 0, answers: {}, overrides: {}, proposal: {} };
  state.proposal = state.proposal || {};
  var openState = {};          // which disclosures are open, kept across re-renders
  var countUpNext = false;     // the payback number counts up once, when the results first appear
  var cta = null;              // observers of the mobile "Request a proposal" bar

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
  var SVG = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, text) { var n = document.createElementNS(SVG, tag); Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); }); if (text != null) n.textContent = text; return n; }
  function scrollTop() { window.scrollTo(0, 0); }
  function visibleSteps() { return Q.steps.filter(function (s) { return !s.showIf || s.showIf(state.answers); }); }
  function fieldOptions(f) { return f.dynamic === 'bottlePrices' ? M.bottlePriceOptions(F, state.answers.country) : f.options; }
  function has(arr, v) { return (arr || []).indexOf(v) >= 0; }
  function country() { return F.countries[state.answers.country] || F.countries.OTHER; }
  function lower(s) { s = String(s); return s.charAt(0).toLowerCase() + s.slice(1); }
  /** A <details> that remembers whether it is open across re-renders. */
  function disclosure(key, cls, label) {
    var d = el('details', { class: cls, 'data-key': key });
    if (openState[key]) d.open = true;
    d.addEventListener('toggle', function () { openState[key] = d.open; if (EMBED) postHeight(); });
    d.appendChild(el('summary', {}, el('span', { text: label })));
    return d;
  }

  /* ------------------------------------------------------------------ water: waves and bubbles */
  /** Layered wave edge: three flat paths, no gradients. */
  function wave(cls) {
    var s = svg('svg', { class: 'wave ' + cls, viewBox: '0 0 1440 90', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' });
    s.appendChild(svg('path', { class: 'w1', d: 'M0 38 C 220 8, 470 66, 720 38 S 1210 6, 1440 36 V90 H0 Z' }));
    s.appendChild(svg('path', { class: 'w2', d: 'M0 56 C 300 82, 610 30, 900 54 S 1290 78, 1440 50 V90 H0 Z' }));
    s.appendChild(svg('path', { class: 'w3', d: 'M0 72 C 360 52, 720 92, 1080 68 S 1330 60, 1440 74 V90 H0 Z' }));
    return s;
  }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  /** Glass bubbles in three depth layers, rising behind the content of a navy panel. CSS animates them. */
  function bubbles(n, x0, x1, seed) {
    var r = rng(seed), box = el('div', { class: 'bubbles', 'aria-hidden': 'true' });
    var LAYERS = ['far', 'mid', 'near', 'mid', 'far'];
    var SPEC = { far: [14, 28, 38, 46], mid: [30, 56, 28, 36], near: [60, 96, 22, 30] };
    for (var i = 0; i < n; i++) {
      var layer = LAYERS[i % LAYERS.length], sp = SPEC[layer];
      var d = sp[0] + r() * (sp[1] - sp[0]), t = sp[2] + r() * (sp[3] - sp[2]);
      var x = x0 + (i + r()) / n * (x1 - x0);
      box.appendChild(el('span', { class: 'bubble b-' + layer, style: '--d:' + d.toFixed(0) + 'px;--x:' + x.toFixed(1) + '%;--t:' + t.toFixed(1) + 's;--delay:-' + (r() * t).toFixed(1) + 's;--s:' + (5 + r() * 4).toFixed(1) + 's;--y:' + (6 + r() * 78).toFixed(0) + '%' }, el('i', {})));
    }
    return box;
  }

  /* ------------------------------------------------------------------ intro */
  function startWizard(keep) {
    state.view = 'wizard';
    if (!keep) { state.step = 0; state.answers = {}; state.overrides = {}; }
    save(); render(); scrollTop();
  }
  function renderIntro() {
    app.innerHTML = '';
    var resume = Object.keys(state.answers).length;
    function tile(title, sub) { return el('div', { class: 'preview-tile' }, el('strong', { text: title }), el('span', { text: sub })); }
    app.appendChild(el('section', { class: 'hero' },
      bubbles(13, 52, 98, 7),
      el('div', { class: 'wrap hero-grid' },
        el('div', { class: 'hero-copy' },
          el('h1', { text: 'What would filtered water save your hotel?' }),
          el('p', { class: 'lead', text: 'Nine short questions about your rooms and the water you buy today. You get your payback, the bottles and plastic you avoid, and the Swisspro set-up that fits.' }),
          el('div', { class: 'actions' },
            el('button', { class: 'btn btn-primary', type: 'button', onclick: function () { startWizard(false); } }, 'Start the wizard'),
            resume ? el('button', { class: 'btn btn-text', type: 'button', onclick: function () { startWizard(true); } }, 'Continue where I left off') : null),
          el('p', { class: 'hero-facts' }, el('strong', { text: '1 minute' }), el('strong', { text: 'No sign-up' }), el('span', { text: 'Malaysia, Indonesia, Philippines, Singapore' }))),
        el('aside', { class: 'preview', 'aria-label': 'What you get' },
          el('h2', { text: 'What you get in about a minute' }),
          el('div', { class: 'preview-grid' },
            tile('Payback', 'in months or years'), tile('Net saving', 'a year, after service'),
            tile('Bottles and plastic', 'avoided a year'), tile('Your set-up', 'the Swisspro units that fit')))),
      wave('wave-hero')));
  }

  /* ------------------------------------------------------------------ wizard */
  var focusAfter = null; // selector to focus after a step re-render, so keyboard users keep their place
  function renderStep() {
    app.innerHTML = '';
    var steps = visibleSteps();
    if (state.step >= steps.length) state.step = steps.length - 1;
    var step = steps[state.step];
    var a = state.answers, C = country();
    // "Not sure" is preselected wherever a reference value exists, so a hotel can go straight through.
    step.fields.forEach(function (f) {
      if (f.type !== 'single' || a[f.id] != null || (f.showIf && !f.showIf(a))) return;
      var d = fieldOptions(f).filter(function (o) { return o.id === 'default' || o.id === 'unknown'; })[0];
      if (d) a[f.id] = d.id;
    });
    save();

    var layout = el('div', { class: 'wrap wizard' });
    var rail = el('nav', { class: 'rail', 'aria-label': 'Steps' }), ol = el('ol', {});
    steps.forEach(function (s, i) {
      var cls = i === state.step ? 'is-current' : (i < state.step ? 'is-done' : '');
      var head = i < state.step
        ? el('button', { type: 'button', class: 'rail-link', onclick: function () { state.step = i; save(); renderStep(); scrollTop(); } }, s.title)
        : el('span', { class: 'rail-link', 'aria-current': i === state.step ? 'step' : null }, s.title);
      ol.appendChild(el('li', { class: cls }, head, i < state.step ? el('span', { class: 'rail-answer', text: stepSummary(s) }) : null));
    });
    rail.appendChild(ol); layout.appendChild(rail);

    var card = el('section', { class: 'panel step', 'aria-labelledby': 'step-title' });
    card.appendChild(el('h2', { id: 'step-title', text: step.title }));
    function pick(f, id) {
      if (f.type === 'single') a[f.id] = id;
      else { var cur = (a[f.id] || []).slice(); if (has(cur, id)) cur.splice(cur.indexOf(id), 1); else cur.push(id); a[f.id] = cur; }
      save();
      focusAfter = f.id === 'priceBand' && id === 'custom' ? '#in-priceCustom' : '[data-field="' + f.id + '"] [data-opt="' + id + '"]';
      renderStep();
    }
    function check(f, label, checked, onclick) {
      return el('button', { type: 'button', class: 'check', role: 'checkbox', 'aria-checked': checked ? 'true' : 'false', 'data-opt': 'default', onclick: onclick }, el('i', { 'aria-hidden': 'true' }), el('span', { text: label }));
    }

    step.fields.forEach(function (f) {
      if (f.showIf && !f.showIf(a)) return;
      if (f.id === 'priceCustom') return; // the input opens inside the "Enter our price" row
      var wrap = el('div', { class: 'field', 'data-field': f.id });
      if (f.label) wrap.appendChild(el('div', { class: 'field-label', id: 'lbl-' + f.id, text: f.id === 'occupancy' ? 'Average occupancy' : f.label }));
      if (f.type === 'single' || f.type === 'multi') {
        var opts = fieldOptions(f), notSure = null;
        var longest = Math.max.apply(null, opts.filter(function (o) { return o.id !== 'default'; }).map(function (o) { return o.label.length; }));
        var asTiles = f.type === 'single' && !f.dynamic && longest <= 22;
        var role = f.type === 'single' ? 'radio' : 'checkbox';
        var group = el('div', { class: asTiles ? 'tiles-opt' : 'rows-opt', role: f.type === 'single' ? 'radiogroup' : 'group', 'aria-labelledby': f.label ? 'lbl-' + f.id : 'step-title' });
        opts.forEach(function (o) {
          var selected = f.type === 'single' ? a[f.id] === o.id : has(a[f.id], o.id);
          if (asTiles && o.id === 'default') { notSure = o; return; } // "Not sure" sits under the tiles as a checkbox
          var desc = o.desc;
          if (f.dynamic === 'bottlePrices') {
            if (o.value != null) desc = fmt.cur(C.symbol, o.value, C.decimals === 0 ? 0 : 2) + ' per bottle';
            else if (o.id === 'unknown') desc = 'We use the typical price, ' + fmt.cur(C.symbol, M.typicalPrice(C), C.decimals === 0 ? 0 : 2);
            else desc = null; // "Enter our price": the hint shows with the input
          }
          group.appendChild(el('button', { type: 'button', class: (asTiles ? 'tile-opt' : 'row-opt') + (selected ? ' selected' : ''), role: role, 'aria-checked': selected ? 'true' : 'false', 'data-opt': o.id, onclick: function () { pick(f, o.id); } },
            el('span', { class: 'opt-label', text: o.label }), desc ? el('span', { class: 'opt-desc', text: desc }) : null));
          if (f.dynamic === 'bottlePrices' && o.id === 'custom' && selected) {
            group.appendChild(el('div', { class: 'row-open' },
              el('label', { class: 'affix' }, el('span', { class: 'affix-pre', text: fmt.code(C.symbol) }),
                el('input', { class: 'input', type: 'number', id: 'in-priceCustom', min: 0, step: 0.01, inputmode: 'decimal', 'aria-label': 'Price per bottle in ' + C.currency, value: a.priceCustom != null ? a.priceCustom : '', oninput: function (e) { a.priceCustom = e.target.value; save(); } }),
                el('span', { class: 'affix-post', text: 'per bottle' })),
              el('p', { class: 'hint', text: o.desc || '' })));
          }
        });
        wrap.appendChild(group);
        if (notSure) {
          wrap.appendChild(check(f, 'Not sure (' + lower(notSure.desc || 'we use a reference') + ')', a[f.id] === 'default', function () {
            a[f.id] = a[f.id] === 'default' ? null : 'default'; save(); focusAfter = '[data-field="' + f.id + '"] .check'; renderStep();
          }));
        }
      } else if (f.type === 'number') {
        var ctl = el('div', { class: 'field-control' }); wrap.appendChild(ctl);
        var isDefault = a[f.id] === 'default';
        var value = a[f.id] != null && !isDefault ? (f.id === 'occupancy' && Number(a[f.id]) > 0 && Number(a[f.id]) <= 1 ? Math.round(Number(a[f.id]) * 1000) / 10 : a[f.id]) : '';
        var input = el('input', { class: 'input', type: 'number', id: 'in-' + f.id, value: value, min: f.min, max: f.max, step: f.step, inputmode: 'decimal', 'aria-labelledby': 'lbl-' + f.id, disabled: isDefault ? 'disabled' : null,
          oninput: function (e) { a[f.id] = e.target.value; save(); } });
        if (f.notSure) {
          ctl.classList.add('with-notsure');
          ctl.appendChild(el('label', { class: 'affix' + (isDefault ? ' is-disabled' : '') }, input, el('span', { class: 'affix-post', text: '%' })));
          ctl.appendChild(check(f, 'Not sure', isDefault, function () { a[f.id] = isDefault ? '' : 'default'; save(); focusAfter = isDefault ? '#in-' + f.id : '[data-field="' + f.id + '"] .check'; renderStep(); }));
          var refs = C.occupancyRefs || [], ref = C.occupancy.value;
          if (isDefault) {
            var sel = el('select', { class: 'input', id: 'in-occupancyRef', onchange: function (e) { a.occupancyRef = e.target.value; save(); } });
            sel.appendChild(el('option', { value: '', text: 'National average, ' + fmt.pct(ref) }));
            refs.forEach(function (r) { var opt = el('option', { value: r.id, text: r.label + ', ' + fmt.pct(Math.round(r.value * 1000) / 1000) + ' (' + r.period + ')' }); if (a.occupancyRef === r.id) opt.selected = true; sel.appendChild(opt); });
            ctl.appendChild(el('label', { class: 'closest' }, el('span', { class: 'hint', text: 'Closest match' }), sel));
          } else {
            ctl.appendChild(el('p', { class: 'hint closest', text: 'Not sure? We use a reference for your city and class.' }));
          }
        } else ctl.appendChild(input);
      }
      wrap.appendChild(el('div', { class: 'error', id: 'err-' + f.id, hidden: true }));
      card.appendChild(wrap);
    });

    card.appendChild(el('div', { class: 'nav-row' },
      el('button', { type: 'button', class: 'btn btn-text', onclick: back }, 'Back'),
      el('button', { type: 'button', class: 'btn btn-primary', onclick: next }, state.step === steps.length - 1 ? 'See my results' : 'Next')));
    layout.appendChild(card);
    app.appendChild(layout);
    document.getElementById('restart-top').hidden = false;
    if (focusAfter) { var t = document.querySelector(focusAfter); if (t) t.focus({ preventScroll: true }); focusAfter = null; }
  }

  /** Short text of the answers already given in a step, for the progress labels. */
  function stepSummary(step) {
    var a = state.answers, parts = [], C = country();
    step.fields.forEach(function (f) {
      if (f.showIf && !f.showIf(a)) return;
      var v = a[f.id]; if (v == null || v === '' || f.id === 'priceCustom') return;
      if (f.type === 'number') {
        if (f.id === 'rooms') parts.push(v + ' rooms');
        else if (f.id === 'occupancy') {
          if (v === 'default') { var r = (C.occupancyRefs || []).filter(function (x) { return x.id === a.occupancyRef; })[0]; parts.push(r ? 'occupancy: ' + r.label : 'occupancy not sure'); }
          else parts.push((Number(v) <= 1 ? Math.round(Number(v) * 100) : v) + '% occupancy');
        }
        return;
      }
      var opts = fieldOptions(f), ids = Array.isArray(v) ? v : [v];
      var labels = ids.map(function (id) { var o = opts.filter(function (x) { return x.id === id; })[0]; return o ? o.label : id; });
      if (f.id === 'priceBand' && v === 'custom') labels = [fmt.cur(C.symbol, Number(a.priceCustom) || 0, C.decimals === 0 ? 0 : 2) + ' per bottle'];
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
        if (f.notSure && a[f.id] === 'default') msg = '';
        else if (f.required && (a[f.id] == null || a[f.id] === '' || !isFinite(v))) msg = f.notSure ? 'Please enter a number or tick Not sure.' : 'Please enter a number.';
        else if (a[f.id] !== '' && a[f.id] != null && isFinite(v) && ((f.min != null && v < f.min) || (f.max != null && v > f.max))) msg = 'Please enter a value between ' + f.min + ' and ' + f.max + '.';
      }
      var e = document.getElementById('err-' + f.id);
      if (e) { e.textContent = msg; e.hidden = !msg; }
      if (msg) { ok = false; if (!first) first = f.id; }
    });
    if (first) { var node = document.querySelector('[data-field="' + first + '"]'); if (node) node.scrollIntoView({ block: 'center' }); }
    return ok;
  }
  function next() {
    var steps = visibleSteps();
    if (!validate(steps[state.step])) return;
    if (state.step >= steps.length - 1) { state.view = 'results'; countUpNext = true; save(); render(); scrollTop(); return; }
    state.step += 1; save(); renderStep(); scrollTop();
  }
  function back() {
    if (state.step === 0) { state.view = 'intro'; save(); render(); scrollTop(); return; }
    state.step -= 1; save(); renderStep(); scrollTop();
  }
  function changeAnswers() { state.view = 'wizard'; state.step = 0; delete state.overrides.inRoomTap; save(); render(); scrollTop(); }
  function restart() {
    if (document.getElementById('restart-confirm')) return;
    var bar = el('div', { class: 'wrap' }, el('div', { class: 'panel notice', id: 'restart-confirm', role: 'alertdialog', 'aria-label': 'Confirm start over' },
      el('p', { text: 'Clear your answers and start over?' }),
      el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'btn btn-primary', onclick: function () { state = { view: 'intro', step: 0, answers: {}, overrides: {}, proposal: {} }; openState = {}; save(); render(); scrollTop(); } }, 'Start over'),
        el('button', { type: 'button', class: 'btn btn-text', onclick: function () { bar.remove(); } }, 'Keep my answers'))));
    app.insertBefore(bar, app.firstChild);
    scrollTop();
  }

  /* ------------------------------------------------------------------ results: figures */
  function compute() {
    delete state.overrides.inRoomTap; // retired lower-cost toggle; the base case is the basic tap
    var n = M.normalise(F, state.answers, state.overrides);
    var calc = E.calculate(F, n.inputs);
    var rec = R.recommend(state.answers, n.inputs, F, PL, state.overrides);
    var bc = B.build({ F: F, PL: PL, R: R, E: E }, state.answers, state.overrides, n.inputs, calc);
    var rooms = bc.calcRooms; // the business case is for guest rooms; stations are a separate block
    rooms.payback = bc.payback;
    rooms.inputs = Object.assign({}, n.inputs, { capex: bc.capexLocal, annualService: bc.servicingLocal });
    return { n: n, calc: rooms, calcAll: bc.calcAll, rec: rec, pr: bc };
  }
  function money(ctx, v) { return fmt.cur(ctx.n.inputs.symbol, v, ctx.n.inputs.decimals); }           // full figure
  function moneyShort(ctx, v) { return fmt.curShort(ctx.n.inputs.symbol, v, ctx.n.inputs.decimals); } // 100,000 and above abbreviated
  function unitMoney(ctx, v) { return fmt.cur(ctx.n.inputs.symbol, v, ctx.n.inputs.decimals === 0 ? 0 : 2); }
  function listMoney(v) { return fmt.cur(PL.pricelist.currency.value, v, 2); }
  function sizeLabel(ml) { return ml >= 1000 ? fmt.dec(ml / 1000, 1) + ' L' : ml + ' ml'; }
  function modelName(p) { return p.label.replace(/\s*\(.*\)$/, ''); }
  function sourcesUrl() { try { return new URL('sources.html', location.href.split('#')[0].split('?')[0]).href; } catch (e) { return 'sources.html'; } }
  function sourcesLink(text) { return el('a', { href: sourcesUrl(), target: EMBED ? '_blank' : null, rel: 'noopener', text: text }); }
  function fxDate(ctx) { var a = ctx.n.country.fx.source, b = ctx.pr.rate.from && ctx.pr.rate.from.fx.source; var d = []; if (a && a.year) d.push(a.year); if (b && b.year && d.indexOf(b.year) < 0) d.push(b.year); return d.length ? 'rates of ' + d.join(' and ') : 'reference rates'; }
  function staffCounted(ctx) { return ctx.calc.labour.quantified && ctx.calc.labour.costLocal > 0; }

  /** The strongest true statement for this hotel, in business.js order (cash first). Shown with the business case. */
  function leadText(ctx) {
    var L = ctx.pr.lead, c = ctx.calc, pb = c.payback, inp = ctx.n.inputs;
    var staff = c.labour.quantified && isFinite(pb.fullPaybackYears) ? ' Including staff time freed: ' + fmt.years(pb.fullPaybackYears) + '.' : '';
    switch (L.kind) {
      case 'payback': return { head: 'Pays for itself in ' + fmt.years(L.years) + ', then saves about ' + moneyShort(ctx, L.saving) + ' a year.', sub: 'Service contract included.' + staff };
      case 'payback-staff': return { head: 'Pays for itself in ' + fmt.years(L.years) + ' including staff time freed.', sub: 'Cash payback ' + fmt.years(L.cashYears) + '. Service contract included in both.' };
      case 'saving': return { head: 'Saves about ' + moneyShort(ctx, L.saving) + ' a year after the service contract.', sub: 'Cash payback ' + fmt.years(L.cashYears) + '.' + staff };
      case 'saving-staff': return { head: 'Saves about ' + moneyShort(ctx, L.saving) + ' a year including staff time freed.', sub: 'Cash payback ' + fmt.years(L.cashYears) + '.' };
      case 'per-night': return { head: 'Costs ' + unitMoney(ctx, L.swisspro) + ' per occupied room-night, against ' + unitMoney(ctx, L.bottled) + ' for bottled water and the staff time it takes.', sub: 'Service contract included, investment spread over ' + B.SPREAD_YEARS + ' years.' };
      default:
        if (!L.bottles) return { head: 'Filtered water for ' + ctx.rec.segment.areas.join(', ').toLowerCase() + '.', sub: '' };
        var head = (c.labour.quantified && L.hours > 0 ? 'Frees ' + fmt.int(L.hours) + ' staff hours a year and removes ' : 'Removes ') + fmt.int(L.bottles) + (inp.bottleMaterial === 'pet' ? ' plastic' : ' glass') + ' bottles a year' + (L.outside > 0 ? ' in your hotel.' : ' from your guest rooms.');
        var sw = L.safeWater ? 'In ' + L.safeWater.country + ', ' + fmt.pct(Math.round(L.safeWater.share * 100) / 100) + ' of people use safely managed drinking water (world: ' + fmt.pct(L.safeWater.world) + '; WHO/UNICEF JMP, ' + L.safeWater.year + ').' : '';
        return { head: head, sub: sw };
    }
  }

  /** What the result hero shows: the payback including staff time when it is under 10 years, otherwise the bottles avoided. */
  function heroModel(ctx) {
    var c = ctx.calc, pb = c.payback, all = ctx.calcAll, full = pb.fullPaybackYears, cash = pb.cashPaybackYears;
    var h = { kpis: [] };
    if (pb.available && isFinite(full) && full < 10) {
      var months = full < 1 ? Math.round(full * 12) : null;
      if (months != null && months < 1) { h.num = null; h.text = 'under 1'; h.unit = 'month'; }
      else if (months != null) { h.num = months; h.decimals = 0; h.unit = months === 1 ? 'month' : 'months'; }
      else { h.num = Math.round(full * 10) / 10; h.decimals = 1; h.unit = 'years'; }
      h.lead = 'until the filters have paid for themselves' + (staffCounted(ctx) ? ', staff time included.' : '.');
      h.kind = 'payback';
    } else {
      h.num = Math.round(all.bottles.total); h.decimals = 0; h.unit = 'bottles';
      h.lead = 'avoided a year in your hotel.';
      h.kind = 'bottles';
    }
    if (!pb.available) h.cash = 'Enter the investment under Adjust the assumptions to see the payback.';
    else if (isFinite(cash)) h.cash = 'Cash payback without staff time: ' + fmt.years(cash) + '.';
    else h.cash = 'Cash payback without staff time: none at this bottle price. The business case below shows every figure.';
    h.kpis.push([pb.available ? moneyShort(ctx, pb.fullSavingsPerYear) : '-', 'net saving a year' + (staffCounted(ctx) ? ', staff time included' : '')]);
    if (h.kind === 'payback') h.kpis.push([fmt.int(all.bottles.total), 'bottles avoided a year']);
    else h.kpis.push([pb.available ? moneyShort(ctx, pb.capex) : '-', 'one-off investment']);
    if (all.env.packagingKg != null) h.kpis.push([fmt.weight(all.env.packagingKg), 'plastic avoided a year', all.env.quantified ? fmt.weight(all.env.co2eKg) + ' CO2e' : null]);
    else h.kpis.push([all.env.quantified ? fmt.weight(all.env.co2eKg) : '-', 'CO2e avoided a year' + (ctx.n.inputs.bottleMaterial === 'glass' && !ctx.n.inputs.glassReusable ? ', at least' : '')]);
    h.kpis.push([fmt.hours(all.labour.hours), 'housekeeping time freed', all.labour.quantified ? 'worth ' + moneyShort(ctx, all.labour.costLocal) + ' a year' : null]);
    return h;
  }
  function contextLine(ctx) {
    var n = ctx.n, inp = n.inputs, prov = n.provenance, rec = ctx.rec;
    var occNote = prov.occupancy.closest ? ' (' + prov.occupancy.label.replace(' (', ', ').replace(/\)$/, '') + ')' : (prov.occupancy.kind !== 'user' ? ' (national average)' : '');
    return [
      fmt.int(inp.rooms) + ' rooms in ' + n.country.name,
      fmt.pct(inp.occupancy) + ' occupancy' + occNote,
      inp.bottlesPerRoomNight ? inp.bottlesPerRoomNight + ' x ' + sizeLabel(inp.bottleSizeMl) + ' a night' + (prov.bottlesPerRoomNight.kind !== 'user' || prov.bottleSizeMl.kind !== 'user' ? ' (assumed)' : '') : rec.segment.current,
      inp.pricePerBottle > 0 ? unitMoney(ctx, inp.pricePerBottle) + ' per bottle' + (prov.pricePerBottle.kind !== 'user' ? ' (reference price)' : '') : null
    ].filter(Boolean).join(' \u00b7 ');
  }
  /** The answers that are not in the context line of the hero. */
  function answersLine(ctx) {
    var rec = ctx.rec;
    return [rec.segment.current, rec.segment.areas.join(', '), rec.segment.temps ? rec.segment.temps + ' water in the room' : null].filter(Boolean).join('; ');
  }
  function businessRows(ctx) {
    var c = ctx.calc, pb = c.payback, inp = ctx.n.inputs, rows = [];
    rows.push([inp.extraCostPerBottle > 0 ? 'Bottled water today incl. delivery, storage and disposal, a year' : 'Bottled water today, a year', moneyShort(ctx, c.spend.annualLocal)]);
    rows.push(['Swisspro service, a year', moneyShort(ctx, -pb.annualService)]);
    if (c.labour.quantified) rows.push(['Staff time freed, a year', moneyShort(ctx, c.labour.costLocal)]);
    rows.push(['Net saving, a year', moneyShort(ctx, pb.fullSavingsPerYear), 'strong']);
    rows.push(['One-off investment', moneyShort(ctx, pb.capex)]);
    return rows;
  }
  function serviceBasis(ctx) {
    var pr = ctx.pr, parts = [];
    if (pr.servicingSource === 'user') return 'your figure';
    if (pr.inRoomUnits > 0) parts.push(fmt.int(pr.inRoomUnits) + ' in-room units x ' + listMoney(85) + (pr.reading === 'perChange' ? ' per filter change, changed every ' + pr.months + ' months' : (pr.reading === 'perYear' ? ', one filter change per room and year' : ' per unit and 2-year contract')));
    if (pr.stations > 0) parts.push(fmt.int(pr.stations) + (pr.stations === 1 ? ' station' : ' stations') + ' x ' + listMoney(350) + ' a year');
    return parts.join(' plus ');
  }
  function scopeText(ctx) {
    var pr = ctx.pr, cur = PL.pricelist.currency.value;
    return (pr.rate.same ? 'List prices in ' + cur + '. ' : 'List prices in ' + cur + ', converted at 1 ' + cur + ' = ' + unitMoney(ctx, pr.rate.localPerList) + ' (' + fxDate(ctx) + '). ') +
      'Prices exclude GST, installation, freight, duties and local taxes. Your proposal sets the final prices and quantities.';
  }
  /** The calculation path, step by step with the hotel's numbers in full. Rows are reused for the CSV download and the owner sheet. */
  function calcRows(ctx) {
    var c = ctx.calc, inp = ctx.n.inputs, pr = ctx.pr, pb = c.payback, rate = pr.rate.localPerList;
    var conv = pr.rate.same ? '' : ' x ' + fmt.dec(rate, inp.decimals === 0 ? 0 : 2) + ' (exchange rate)';
    var rows = [];
    rows.push(['Occupied room-nights a year', fmt.int(inp.rooms) + ' rooms x ' + fmt.pct(inp.occupancy) + ' x 365', fmt.int(c.bottles.occupiedRoomNights)]);
    rows.push(['Bottles a year', fmt.int(c.bottles.occupiedRoomNights) + ' x ' + inp.bottlesPerRoomNight + ' a night', fmt.int(c.bottles.total)]);
    rows.push([inp.extraCostPerBottle > 0 ? 'Bottled water a year, incl. delivery, storage and disposal' : 'Bottled water bought a year', fmt.int(c.bottles.total) + ' x ' + (inp.extraCostPerBottle > 0 ? '(' + unitMoney(ctx, inp.purchasePricePerBottle) + ' + ' + unitMoney(ctx, inp.extraCostPerBottle) + ' extra)' : unitMoney(ctx, inp.pricePerBottle)), money(ctx, c.spend.annualLocal)]);
    var inRoomTxt = pr.reading === 'perChange' ? listMoney(85) + ' x 12 / ' + pr.months + ' months' : (pr.reading === 'perYear' ? listMoney(85) + ' (one change a year)' : listMoney(85) + ' / 2 years');
    var sv = pr.servicingSource === 'user' ? 'your figure' : [pr.inRoomUnits ? fmt.int(pr.inRoomUnits) + ' x ' + inRoomTxt : null, pr.stations ? fmt.int(pr.stations) + ' x ' + listMoney(pr.stationPerYear) : null].filter(Boolean).join(' + ') + conv;
    rows.push(['Service contract a year', sv, money(ctx, pr.servicingLocal)]);
    if (pb.available) {
      rows.push(['Net cash saving a year', money(ctx, c.spend.annualLocal) + ' ' + fmt.MINUS + ' ' + money(ctx, pb.annualService), money(ctx, pb.cashSavingsPerYear)]);
      var inv = pr.capexSource === 'user' ? 'your figure' : pr.lines.map(function (l) { return fmt.int(l.units) + ' x ' + listMoney(l.product.price) + ' (' + modelName(l.product) + ')'; }).join(' + ') + conv;
      rows.push(['Investment', inv, money(ctx, pb.capex)]);
      rows.push(['Cash payback', isFinite(pb.cashPaybackYears) ? money(ctx, pb.capex) + ' / ' + money(ctx, pb.cashSavingsPerYear) : 'net saving is not positive', fmt.cap(fmt.years(pb.cashPaybackYears))]);
      if (c.labour.quantified) {
        rows.push(['Staff time freed a year', fmt.hours(c.labour.hours) + ' x ' + fmt.cur(inp.symbol, inp.wageHourly, 2), money(ctx, c.labour.costLocal)]);
        rows.push(['Payback including staff time freed', isFinite(pb.fullPaybackYears) ? money(ctx, pb.capex) + ' / (' + money(ctx, pb.cashSavingsPerYear) + ' + ' + money(ctx, c.labour.costLocal) + ')' : 'saving is not positive', fmt.cap(fmt.years(pb.fullPaybackYears))]);
      }
      rows.push(['Five-year net saving, cash', '5 x ' + money(ctx, pb.cashSavingsPerYear) + ' ' + fmt.MINUS + ' ' + money(ctx, pb.capex), money(ctx, pb.fiveYearNetCash)]);
    }
    return rows;
  }
  function kv(rows, cls) {
    var t = el('table', { class: 'kv' + (cls ? ' ' + cls : '') });
    rows.forEach(function (r) { t.appendChild(el('tr', { class: r[2] || null }, el('th', { scope: 'row', text: r[0] }), el('td', { text: r[1] }))); });
    return t;
  }
  function calcTable(ctx) {
    var t = el('table', { class: 'kv calc' });
    calcRows(ctx).forEach(function (r) { t.appendChild(el('tr', {}, el('th', { scope: 'row', text: r[0] }), el('td', { class: 'how', text: r[1] }), el('td', { text: r[2] }))); });
    return t;
  }

  /* ------------------------------------------------------------------ results: page */
  function renderResults() {
    var ctx = compute();
    var c = ctx.calc, pb = c.payback, pr = ctx.pr;
    if (cta) { cta.forEach(function (o) { o.disconnect(); }); cta = null; }
    app.innerHTML = '';
    var root = el('div', { class: 'wrap results' });

    // 1. Result hero
    var h = heroModel(ctx);
    var numEl = el('span', { class: 'big-num', id: 'payback-number', text: h.num == null ? h.text : fmt.dec(h.num, h.decimals) });
    var hero = el('section', { class: 'rhero', id: 'lead' },
      bubbles(7, 56, 98, 23),
      el('div', { class: 'rhero-grid' },
        el('div', { class: 'rhero-main' },
          el('p', { class: 'context' }, contextLine(ctx) + ' ', el('button', { type: 'button', class: 'link-btn', onclick: changeAnswers }, 'Change')),
          el('i', { class: 'gold-rule', 'aria-hidden': 'true' }),
          el('p', { class: 'big' + (h.kind === 'bottles' ? ' big-count' : '') }, numEl, ' ', el('span', { class: 'big-unit', text: h.unit })),
          el('p', { class: 'rhero-lead', text: h.lead }),
          el('p', { class: 'rhero-cash', text: h.cash }),
          el('div', { class: 'actions' },
            el('button', { type: 'button', class: 'btn btn-white', onclick: function () { var f = document.getElementById('proposal'); if (f) { f.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); var i = document.getElementById('pf-name'); if (i) i.focus({ preventScroll: true }); } } }, 'Request a proposal'),
            ARTIFACT ? null : el('button', { type: 'button', class: 'btn btn-outline', onclick: function () { window.print(); } }, 'Print for the owner'))),
        el('div', { class: 'kpis' }, h.kpis.map(function (k) { return el('div', { class: 'kpi' }, el('strong', { text: k[0] }), el('span', { text: k[1] }), k[2] ? el('span', { class: 'kpi-2', text: k[2] }) : null); }))),
      wave('wave-rhero'));
    root.appendChild(hero);
    if (countUpNext && h.num != null && !REDUCED) countUp(numEl, h.num, h.decimals);
    countUpNext = false;

    var wsn = R.waterSupplyNotes(state.proposal.source);
    if (wsn.result) root.appendChild(el('p', { class: 'notice', id: 'pretreatment', text: wsn.result }));

    // 2 to 4 and 6: business case, set-up, details on the left; proposal form on the right
    var main = el('div', { class: 'results-main' }), aside = el('aside', { class: 'results-aside' });
    main.appendChild(renderBusinessCase(ctx));
    main.appendChild(renderSetup(ctx));
    var group = el('section', { class: 'panel dgroup', 'aria-label': 'Details' });
    group.appendChild(renderMore(ctx)); group.appendChild(renderAdjust(ctx)); group.appendChild(renderSources(ctx));
    main.appendChild(group);
    aside.appendChild(renderProposal(ctx));
    root.appendChild(el('div', { class: 'results-body' }, main, aside));
    root.appendChild(renderPrintSheet(ctx, h));
    app.appendChild(root);

    // Mobile: a bar with "Request a proposal" once the hero has scrolled away, until the form is in view.
    var bar = el('div', { class: 'sticky-cta', hidden: true }, el('button', { type: 'button', class: 'btn btn-primary', onclick: function () { var f = document.getElementById('proposal'); if (f) f.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); } }, 'Request a proposal'));
    app.appendChild(bar);
    if ('IntersectionObserver' in window) {
      var heroOut = false, formIn = false, upd = function () { bar.hidden = !(heroOut && !formIn); };
      var o1 = new IntersectionObserver(function (e) { heroOut = !e[0].isIntersecting; upd(); });
      var o2 = new IntersectionObserver(function (e) { formIn = e[0].isIntersecting; upd(); });
      o1.observe(hero); o2.observe(aside); cta = [o1, o2];
    }
    document.getElementById('restart-top').hidden = false;
  }
  function countUp(node, target, decimals) {
    var t0 = null, D = 600;
    function frame(ts) {
      if (t0 == null) t0 = ts;
      var k = Math.min(1, (ts - t0) / D), e = 1 - Math.pow(1 - k, 3);
      node.textContent = fmt.dec(target * e, decimals);
      if (k < 1) requestAnimationFrame(frame); else node.textContent = fmt.dec(target, decimals);
    }
    node.textContent = fmt.dec(0, decimals);
    requestAnimationFrame(frame);
  }

  function renderBusinessCase(ctx) {
    var c = ctx.calc, pr = ctx.pr, pb = c.payback, lead = leadText(ctx);
    var card = el('section', { class: 'panel', id: 'business-case' });
    card.appendChild(el('h3', { text: 'Your business case' }));
    card.appendChild(el('p', { class: 'lead-line' }, lead.head + (ctx.pr.lead.kind === 'benefits' && lead.sub ? ' ' + lead.sub : '')));
    if (pb.available) card.appendChild(kv(businessRows(ctx)));
    else if (pr.unpriced.length) card.appendChild(el('p', { class: 'notice', text: 'The price list has no unit for ' + pr.unpriced.map(function (u) { return u.area; }).join(' and ') + '. Enter the investment from your proposal under Adjust the assumptions to see the payback.' }));
    else card.appendChild(el('p', { class: 'hint', text: 'Enter the investment under Adjust the assumptions to see the payback.' }));
    if (pb.available && !pr.cashShort) card.appendChild(el('p', { class: 'plan-line', text: 'Your proposal can include a service plan for your market.' }));
    if (!pb.available) return card;

    var d = disclosure('bc', 'inline', 'Show per room, five-year view and the calculation');
    var extra = [['Cash payback', fmt.cap(fmt.years(pb.cashPaybackYears))]];
    if (c.labour.quantified) extra.push(['Payback including staff time freed', fmt.cap(fmt.years(pb.fullPaybackYears))]);
    extra.push(['Five-year net saving, cash', money(ctx, pb.fiveYearNetCash)]);
    d.appendChild(kv(extra));
    var m = pr.perRoomMonth;
    if (m) {
      d.appendChild(el('h4', { text: 'Per room and month' }));
      d.appendChild(kv([
        ['Bottled water today', unitMoney(ctx, m.today)],
        ['Swisspro, years 1 to ' + m.spreadYears + ' (service plus investment / ' + m.spreadYears * 12 + ' months)', unitMoney(ctx, m.swisspro)],
        ['Swisspro from year ' + (m.spreadYears + 1) + ' (service only)', unitMoney(ctx, m.service), 'strong']], 'permonth'));
      d.appendChild(el('p', { class: 'hint', text: 'Arithmetic on the figures above, not a financing offer.' }));
    }
    d.appendChild(renderFiveYear(ctx));
    d.appendChild(el('h4', { text: 'Calculation' }));
    d.appendChild(el('div', { id: 'calculation' }, calcTable(ctx)));
    d.appendChild(el('p', { class: 'hint scope', text: (pr.stationBlock ? 'Guest rooms only; drinking stations are listed with your set-up. ' : '') + scopeText(ctx) }));
    d.appendChild(el('div', { class: 'actions' }, el('button', { type: 'button', class: 'btn btn-text', onclick: function () { downloadCsv(ctx); } }, 'Download the calculation for Excel (CSV)')));
    card.appendChild(d);
    return card;
  }

  /** Cumulative cost over five years: bottled water against Swisspro (investment plus service), labelled at the line ends. */
  function renderFiveYear(ctx) {
    var v = ctx.pr.fiveYear, inp = ctx.n.inputs, box = el('div', { id: 'five-year' });
    if (!v) return box;
    box.appendChild(el('h4', { text: 'Five years: bottled water against Swisspro' }));
    var narrow = window.innerWidth < 700;
    var W = narrow ? 380 : 640, H = narrow ? 250 : 270, P = narrow ? { l: 56, r: 92, t: 28, b: 30 } : { l: 68, r: 118, t: 28, b: 32 };
    var max = Math.max.apply(null, v.bottled.concat(v.swisspro)) || 1;
    var step = niceStep(max / (narrow ? 3 : 4)), top = Math.ceil(max / step) * step;
    var x = function (t) { return P.l + (W - P.l - P.r) * t / 5; }, y = function (val) { return H - P.b - (H - P.t - P.b) * val / top; };
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': 'Cumulative cost over five years, bottled water against Swisspro' });
    for (var g = 0; g <= top + 1e-9; g += step) {
      s.appendChild(svg('line', { x1: P.l, x2: W - P.r, y1: y(g), y2: y(g), class: 'grid' }));
      s.appendChild(svg('text', { x: P.l - 8, y: y(g) + 4, class: 'tick', 'text-anchor': 'end' }, fmt.curShort(inp.symbol, g, 0)));
    }
    v.years.forEach(function (t) { s.appendChild(svg('text', { x: x(t), y: H - 8, class: 'tick', 'text-anchor': 'middle' }, t === 0 ? 'Today' : (narrow ? 'Y' + t : 'Year ' + t))); });
    function line(vals, cls, name) {
      s.appendChild(svg('polyline', { points: vals.map(function (val, i) { return x(i) + ',' + y(val); }).join(' '), class: 'series ' + cls }));
      vals.forEach(function (val, i) { var dot = svg('circle', { cx: x(i), cy: y(val), r: 3.5, class: 'dot ' + cls }); dot.appendChild(svg('title', {}, name + ', ' + (i === 0 ? 'today' : 'year ' + i) + ': ' + money(ctx, val))); s.appendChild(dot); });
    }
    line(v.bottled, 's-bottled', 'Bottled water');
    line(v.swisspro, 's-swisspro', 'Swisspro');
    var yb = y(v.bottled[5]), ys = y(v.swisspro[5]);
    if (Math.abs(yb - ys) < 16) { if (yb < ys) { yb -= 8; ys += 8; } else { yb += 8; ys -= 8; } }
    s.appendChild(svg('text', { x: x(5) + 10, y: yb + 4, class: 'end-label s-bottled' }, 'Bottled water'));
    s.appendChild(svg('text', { x: x(5) + 10, y: ys + 4, class: 'end-label s-swisspro' }, 'Swisspro'));
    if (v.crossesInView) {
      var cx = x(v.crossYear), cy = y(v.swisspro[0] + (v.swisspro[5] - v.swisspro[0]) * v.crossYear / 5), right = cx > (P.l + W - P.r) / 2;
      s.appendChild(svg('circle', { cx: cx, cy: cy, r: 6, class: 'cross-dot' }));
      s.appendChild(svg('text', { x: right ? cx - 10 : cx + 10, y: Math.min(H - P.b - 8, cy + 28), class: 'cross-label', 'text-anchor': right ? 'end' : 'start' }, 'paid back after ' + fmt.years(v.crossYear) + ', cash'));
    }
    var wrap = el('div', { class: 'chart-wrap' }); wrap.appendChild(s); box.appendChild(wrap);
    var tbl = el('table', { class: 'kv five-table' }, el('tr', {}, el('th', { text: '' }), el('td', { class: 'head', text: 'Bottled water' }), el('td', { class: 'head', text: 'Swisspro' })));
    v.years.forEach(function (t) { tbl.appendChild(el('tr', {}, el('th', { scope: 'row', text: t === 0 ? 'Today' : 'After year ' + t }), el('td', { text: money(ctx, v.bottled[t]) }), el('td', { text: money(ctx, v.swisspro[t]) }))); });
    var fig = disclosure('five-figures', 'inline', 'Show the figures of the chart'); fig.appendChild(tbl); box.appendChild(fig);
    return box;
  }
  function niceStep(raw) { var p = Math.pow(10, Math.floor(Math.log10(raw || 1))); var m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; }

  function downloadCsv(ctx) {
    var inp = ctx.n.inputs, q = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
    var lines = [['Item', 'Calculation', 'Result'].map(q).join(',')];
    calcRows(ctx).forEach(function (r) { lines.push(r.map(q).join(',')); });
    lines.push('');
    lines.push(['Input', 'Value', 'Basis'].map(q).join(','));
    [['Rooms', inp.rooms, 'your answer'], ['Occupancy', fmt.pct(inp.occupancy), ctx.n.provenance.occupancy.kind === 'user' ? 'your answer' : (ctx.n.provenance.occupancy.closest ? 'closest match' : 'national average')],
     ['Bottles per room and night', inp.bottlesPerRoomNight, ctx.n.provenance.bottlesPerRoomNight.kind === 'user' ? 'your answer' : 'assumed'],
     ['Price per bottle (' + inp.currency + ')', inp.pricePerBottle, ctx.n.provenance.pricePerBottle.kind === 'user' ? 'your answer' : 'reference price'],
     ['Hourly labour cost (' + inp.currency + ')', Math.round(inp.wageHourly * 100) / 100, ctx.n.provenance.wageHourly.kind === 'user' ? 'your figure' : 'minimum wage']
    ].forEach(function (r) { lines.push(r.map(q).join(',')); });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = el('a', { href: URL.createObjectURL(blob), download: 'swisspro-business-case.csv' });
    document.body.appendChild(a); a.click(); a.remove();
  }

  /** Your Swisspro set-up: the base case as the main card; upgrades and drinking stations as rows below it. */
  function renderSetup(ctx) {
    var pr = ctx.pr, base = pr.base, up = pr.upgrade, st = pr.stationBlock, c = ctx.calc;
    var card = el('section', { class: 'panel', id: 'setup' });
    card.appendChild(el('h3', { text: 'Your Swisspro set-up' }));
    function price(p, units) {
      return el('div', { class: 'setup-price' }, el('strong', { text: listMoney(p.price) + ' per unit' }), el('span', { text: fmt.int(units) + (units === 1 ? ' unit' : ' units') + ', about ' + unitMoney(ctx, pr.toLocal(p.price)) + ' each' }));
    }
    base.solutions.forEach(function (s) {
      if (s.area !== 'inRoom' || base.plan.inRoom <= 0 || !s.exactMatch || !s.products.length) return;
      var p = s.products[0];
      card.appendChild(el('div', { class: 'setup-main' },
        el('div', {}, el('span', { class: 'setup-kicker', text: 'Base case, in every guest room' }), el('h4', { text: modelName(p) }), el('p', { text: p.describe })),
        price(p, base.plan.inRoom)));
    });
    function row(id, title, name, text, p, units, cls) {
      return el('div', { class: 'setup-row' + (cls ? ' ' + cls : ''), id: id || null },
        el('div', {}, el('span', { class: 'setup-kicker', text: title }), el('h4', { text: name }), text ? el('p', { text: text }) : null),
        p ? price(p, units) : null);
    }
    if (up) {
      var unit = up.inRoom && up.inRoom.exactMatch && up.inRoom.products[0], wish = R.LABELS.temps[up.temps];
      if (!up.payback || !unit) card.appendChild(row(null, 'Upgrade for ' + wish + ' water', 'Priced in the proposal', null, null, 0, 'alt-box'));
      else {
        var p = up.payback;
        var txt = 'Extra investment ' + moneyShort(ctx, up.extraCapex) + (Math.abs(up.extraService) > 0.5 ? ', extra service ' + moneyShort(ctx, up.extraService) + ' a year' : '') + '.' +
          (isFinite(p.cashPaybackYears) ? ' Cash payback ' + fmt.years(p.cashPaybackYears) + (c.labour.quantified && isFinite(p.fullPaybackYears) ? ', including staff time freed ' + fmt.years(p.fullPaybackYears) : '') + '.' : (c.labour.quantified && isFinite(p.fullPaybackYears) ? ' Payback including staff time freed ' + fmt.years(p.fullPaybackYears) + '.' : ''));
        var notes = up.inRoom.notes.filter(function (n) { return !/lower-cost/.test(n); }).join(' ');
        card.appendChild(row(null, 'Upgrade for ' + wish + ' water in the room', modelName(unit), txt + (notes ? ' ' + notes : ''), unit, up.plan.inRoom, 'alt-box'));
        up.solutions.filter(function (s) { return s.area === 'fnb' && s.requiredTemps.indexOf('sparkling') >= 0 && s.exactMatch; }).forEach(function (s) {
          card.appendChild(row(null, 'Upgrade, drinking station with sparkling water', modelName(s.products[0]), s.covers.join(', '), s.products[0], up.plan.stations));
        });
      }
    }
    if (st) {
      var areaNames = st.areas.map(function (k) { return R.LABELS.areas[k]; }).join(', ');
      var sp = st.lines[0] ? st.lines[0].product : null;
      var t = 'For ' + lower(areaNames) + '. Investment ' + (st.capex != null ? moneyShort(ctx, st.capex) : 'in the proposal') + ', service ' + moneyShort(ctx, st.service) + ' a year. Not part of the guest-room business case.';
      if (st.counted) {
        t += ' Bottled water bought there today ' + moneyShort(ctx, st.spend) + ' a year; stations alone pay back in ' + fmt.years(st.payback.cashPaybackYears) + ', cash.';
        if (st.combined) t += ' Guest rooms and stations together: cash payback ' + fmt.years(st.combined.cashPaybackYears) + (c.labour.quantified ? ', including staff time freed ' + fmt.years(st.combined.fullPaybackYears) : '') + '.';
      } else t += ' Enter the bottles used outside guest rooms under Adjust the assumptions to see their saving.';
      card.appendChild(row('stations', st.count === 1 ? 'Drinking station' : 'Drinking stations', sp ? modelName(sp) : 'Drinking station', t, sp, st.count));
    }
    card.appendChild(el('p', { class: 'hint', text: 'Installation, plumbing, water testing and the service schedule are set out in the proposal.' }));
    return card;
  }

  function renderMore(ctx) {
    var c = ctx.calc, inp = ctx.n.inputs;
    var d = disclosure('more', 'drow', 'More');
    var args = R.argumentOrder(inp, F), note = ctx.n.country.safetyNote, ws = R.waterSupplyNotes(state.proposal.source);
    var ol = el('ol', { class: 'args' });
    args.order.forEach(function (x) {
      var li = el('li', {}, el('strong', { text: x.title + '. ' }), x.why);
      if (x.key === 'safety' && ws.argument) li.appendChild(el('span', { class: 'args-note', id: 'tank-note', text: ws.argument }));
      if (x.key === 'safety' && args.cheapWater && note) li.appendChild(el('span', { class: 'args-note' }, ctx.n.country.name + ': ' + note.text + ' ', el('a', { href: note.url, target: '_blank', rel: 'noopener', text: note.source })));
      ol.appendChild(li);
    });
    d.appendChild(el('h4', { text: 'What matters most for this hotel' }));
    d.appendChild(ol);
    d.appendChild(el('h4', { text: 'Logistics and per-room figures' }));
    var rows = [
      ['Cartons a year', fmt.int(c.logistics.cartonsPerYear)], ['Pallets a year', fmt.dec(c.logistics.palletsPerYear, 0)], ['Deliveries a year', fmt.int(c.logistics.deliveriesPerYear)],
      ['Store area for ' + inp.stockWeeks + ' weeks of stock', fmt.dec(c.logistics.storageM2, 1) + ' m2'],
      ['Weight carried by staff a year', fmt.int(c.logistics.tonnesHandled) + ' t' + (inp.bottleMaterial === 'glass' ? ' (water only)' : '')],
      ['Staff time as full-time equivalents', fmt.dec(c.labour.fteEquivalent, 2) + ' FTE']];
    if (inp.rooms > 0) {
      rows.push(['Bottles per room a year', fmt.int(c.bottles.roomBottles / inp.rooms)]);
      if (inp.pricePerBottle > 0) rows.push(['Bottled water per room a year', money(ctx, c.spend.annualLocal / inp.rooms)]);
      if (c.payback.available && inp.occupancy > 0) rows.push(['Investment and service per occupied room-night, over five years', unitMoney(ctx, (c.payback.capex + 5 * c.payback.annualService) / (5 * c.bottles.occupiedRoomNights))]);
    }
    d.appendChild(kv(rows));
    return d;
  }

  function renderAdjust(ctx) {
    var inp = ctx.n.inputs, c = ctx.calc, pr = ctx.pr, o = state.overrides, SV = PL.pricelist.servicing, cur = PL.pricelist.currency.value;
    var card = disclosure('adjust', 'drow adjust-card', 'Adjust the assumptions');
    function group(title) { card.appendChild(el('h4', { text: title })); var grid = el('div', { class: 'adjust' }); card.appendChild(grid); return grid; }
    function field(grid, id, label, value, step, extra, hint) {
      var d = el('div', {});
      d.appendChild(el('label', { for: 'ov-' + id, text: label }));
      d.appendChild(el('input', Object.assign({ class: 'input', id: 'ov-' + id, type: 'number', step: step, min: 0, value: value, onchange: function (e) { if (e.target.value === '') delete o[id]; else o[id] = Number(e.target.value); if (id === 'occupancy' && o[id] != null) o[id] = o[id] / 100; save(); renderResults(); } }, extra || {})));
      if (hint) d.appendChild(el('span', { class: 'hint', text: hint }));
      grid.appendChild(d);
    }
    var g1 = group('Your hotel');
    field(g1, 'occupancy', 'Occupancy (%)', Math.round(inp.occupancy * 1000) / 10, 1, { max: 100 }, ctx.n.provenance.occupancy.kind === 'user' ? 'Your figure' : (ctx.n.provenance.occupancy.closest ? 'Closest match: ' + ctx.n.provenance.occupancy.label : 'National average'));
    field(g1, 'bottlesPerRoomNight', 'Bottles per room and night', inp.bottlesPerRoomNight, 0.5);
    field(g1, 'pricePerBottle', 'Price per bottle (' + inp.currency + ')', Math.round(inp.purchasePricePerBottle * 1000) / 1000, 0.01, null, ctx.n.provenance.pricePerBottle.kind === 'user' ? 'Your price' : 'Reference price');
    field(g1, 'extraCostPerBottle', 'Extra cost per bottle for delivery, storage and disposal (' + inp.currency + ')', inp.extraCostPerBottle, 0.01, null, 'For example boat transport and waste removal at island resorts.');
    field(g1, 'otherBottlesPerDay', 'Bottles used outside guest rooms per day (meeting rooms, staff, outlets)', inp.otherBottlesPerDay, 1);
    if (c.env.packagingKg != null) field(g1, 'bottleWeightG', 'Empty bottle weight (g)', Math.round(c.env.bottleWeightG * 100) / 100, 0.1);
    var g2 = group('Investment and service');
    field(g2, 'capex', 'Investment (' + inp.currency + ')', o.capex != null ? o.capex : (pr.capexLocal != null ? Math.round(pr.capexLocal) : ''), 1, { placeholder: 'from your proposal' }, (pr.capexSource === 'user' ? 'Your figure' : (pr.capexSource === 'pricelist' ? 'List price' : 'Not in the price list')) + (pr.capexLocal != null ? ', ' + money(ctx, pr.capexLocal) : ''));
    field(g2, 'annualService', 'Service contract per year (' + inp.currency + ')', Math.round(pr.servicingLocal), 1, null, (pr.servicingSource === 'user' ? 'Your figure' : 'List price') + ', ' + money(ctx, pr.servicingLocal));
    field(g2, 'stations', 'Drinking stations', pr.stationBlock ? pr.stationBlock.count : pr.stations, 1, null, o.stations != null ? 'Your figure' : 'One per area chosen');
    field(g2, 'changeMonths', 'Months between filter changes', pr.months, 1, { max: 36, disabled: pr.reading === 'perChange' ? null : 'disabled' }, 'In-room units');
    var selWrap = el('div', {});
    selWrap.appendChild(el('label', { for: 'ov-reading', text: 'In-room service price' }));
    var sel = el('select', { class: 'input', id: 'ov-reading', onchange: function (e) { o.serviceReading = e.target.value; delete o.annualService; save(); renderResults(); } });
    var SHORT = { perChange: listMoney(85) + ' per filter change', perYear: listMoney(85) + ' per unit and year', perContract2y: listMoney(85) + ' per 2-year contract' };
    SV.readings.forEach(function (r) { var opt = el('option', { value: r.id, text: SHORT[r.id] || r.label }); if (r.id === pr.reading) opt.selected = true; sel.appendChild(opt); });
    selWrap.appendChild(sel); selWrap.appendChild(el('span', { class: 'hint', text: 'Stations ' + listMoney(350) + ' a year' }));
    g2.appendChild(selWrap);
    var g3 = group('Staff time');
    field(g3, 'minutesPerRoomPerDay', 'Minutes per room and day, bottles', inp.minutesPerRoomPerDay, 0.5);
    field(g3, 'minutesPerCarton', 'Minutes per carton', inp.minutesPerCarton, 0.5);
    field(g3, 'newMinutesPerRoomPerDay', 'Minutes per room and day, filtered', inp.newMinutesPerRoomPerDay, 0.5);
    field(g3, 'wageHourly', 'Hourly labour cost (' + inp.currency + ')', Math.round(inp.wageHourly * 100) / 100, 0.1, null, ctx.n.provenance.wageHourly.kind === 'user' ? 'Your figure' : (ctx.n.country.wageMonthly.label || 'Minimum wage') + ', adjust for your property');
    field(g3, 'stockWeeks', 'Weeks of stock on site', inp.stockWeeks, 1);
    card.appendChild(el('div', { class: 'actions' }, el('button', { type: 'button', class: 'btn btn-text', onclick: function () { state.overrides = {}; save(); renderResults(); } }, 'Reset to the defaults')));
    return card;
  }

  function renderSources(ctx) {
    var cc = ctx.n.country, prov = ctx.n.provenance, inp = ctx.n.inputs, pr = ctx.pr, cur = PL.pricelist.currency.value;
    var card = disclosure('sources', 'drow', 'Where the numbers come from');
    var list = el('ul', { class: 'sources-list' });
    function item(label, text, src) {
      var li = el('li', {}, el('strong', { text: label + ': ' }), text);
      if (src && src.url) li.appendChild(el('span', {}, ' ', el('a', { href: src.url, target: '_blank', rel: 'noopener', text: src.publisher || 'source' })));
      return li;
    }
    function srcOf(p) { return p.source || (p.url ? { url: p.url, publisher: 'source' } : null); }
    list.appendChild(item('Your answers', answersLine(ctx)));
    list.appendChild(item('Occupancy', fmt.pct(inp.occupancy) + (prov.occupancy.kind === 'user' ? ', your figure' : (prov.occupancy.closest ? ', closest match: ' + prov.occupancy.label + ', ' + prov.occupancy.source.publisher : ', ' + (cc.occupancy.unit || 'national average'))), prov.occupancy.kind === 'user' || prov.occupancy.closest ? null : srcOf(cc.occupancy)));
    list.appendChild(item('Bottles per room and night', inp.bottlesPerRoomNight + (prov.bottlesPerRoomNight.kind === 'user' ? ', your answer' : ', when not sure: about 3 per occupied room-night from nine public hotel cases (470 to 1,460 bottles per room and year)')));
    if (inp.otherBottlesPerDay > 0) list.appendChild(item('Bottles outside guest rooms', fmt.int(inp.otherBottlesPerDay) + ' a day, your figure'));
    if (inp.extraCostPerBottle > 0) list.appendChild(item('Extra cost per bottle', unitMoney(ctx, inp.extraCostPerBottle) + ' for delivery, storage and disposal, your figure'));
    if (inp.pricePerBottle > 0) list.appendChild(item('Price per bottle', unitMoney(ctx, inp.pricePerBottle) + (prov.pricePerBottle.kind === 'user' ? ', your price' : ', ' + (prov.pricePerBottle.note || prov.pricePerBottle.label)), prov.pricePerBottle.kind === 'user' ? null : srcOf(prov.pricePerBottle)));
    list.appendChild(item('Labour cost', fmt.cur(inp.symbol, inp.wageHourly, 2) + ' an hour' + (prov.wageHourly.kind === 'user' ? ', your figure' : ', ' + (cc.wageMonthly.label || 'reference wage')), prov.wageHourly.kind === 'user' ? null : srcOf(cc.wageMonthly)));
    list.appendChild(item('Handling time', inp.minutesPerRoomPerDay + ' min per room and day, ' + inp.minutesPerCarton + ' min per carton, assumed and adjustable'));
    if (inp.bottleMaterial === 'pet') {
      list.appendChild(item('Bottle weight', fmt.dec(ctx.calc.env.bottleWeightG, 1) + ' g per empty ' + inp.bottleSizeMl + ' ml PET bottle', F.factors.pet_bottle_weight_500ml_g.source));
      list.appendChild(item('CO2e per kg of PET', F.factors.co2e_kg_per_kg_pet.value + ' kg, production only', F.factors.co2e_kg_per_kg_pet.source));
    } else {
      list.appendChild(item('CO2e for glass bottles', F.factors.glass_co2e.value + ' kg per litre, reused glass; single-use glass is higher', F.factors.glass_co2e.source));
    }
    list.appendChild(item('Car comparison', fmt.int(ctx.calcAll.env.co2eCarKm) + ' km by car for the CO2e avoided, at ' + F.factors.co2e_kg_per_car_km.value + ' kg CO2e per km', F.factors.co2e_kg_per_car_km.source));
    list.appendChild(item('Cartons and pallets', F.factors.bottles_per_carton.value + ' bottles per carton, ' + fmt.int(F.factors.bottles_per_pallet_500ml.value) + ' per pallet at 500 ml', F.factors.bottles_per_pallet_500ml.source));
    list.appendChild(item('Products and prices', 'Swisspro price list, Hospitality section, ' + PL.pricelist.source.dated + ', ' + cur + ' excl. GST; one in-room unit per room, one drinking station per area'));
    list.appendChild(item('Service contract', serviceBasis(ctx) + (pr.servicingSource === 'user' ? '' : (pr.reading === 'perYear' ? '; one change per room and year as in the Westin Singapore case (Swisspro, 2024), other readings under Adjust the assumptions' : '')), F.factors.westin_case_2024.source));
    if (!pr.rate.same) list.appendChild(item('Exchange rate', '1 ' + cur + ' = ' + unitMoney(ctx, pr.rate.localPerList) + ', ' + fxDate(ctx), cc.fx.source));
    card.appendChild(list);
    card.appendChild(el('p', { class: 'hint' }, 'Every value, its source and the rule behind it: ', sourcesLink('sources and assumptions'), '.'));
    return card;
  }

  /* ------------------------------------------------------------------ proposal request */
  function summaryText(ctx) {
    var p = state.proposal, c = ctx.calc, rec = ctx.rec, inp = ctx.n.inputs, pr = ctx.pr, pb = c.payback;
    var m = function (v) { return fmt.cur(inp.symbol, v, 0); };
    var L = [];
    L.push('Proposal request via the Swisspro Sustainability Wizard, ' + new Date().toISOString().slice(0, 10));
    var segLabel = (Q.proposalFields.filter(function (f) { return f.id === 'segment'; })[0].options.filter(function (o) { return o.id === p.segment; })[0] || {}).label;
    L.push('Hotel: ' + (p.hotel || 'not given') + '. Segment: ' + (p.segment ? segLabel : 'not given') + '. Rooms: ' + fmt.int(inp.rooms) + '.');
    L.push('Contact: ' + (p.name || 'not given') + ', ' + (p.email || 'no email given') + (p.phone ? ', ' + p.phone : '') + '.');
    L.push('');
    L.push(fmt.int(inp.rooms) + ' rooms in ' + ctx.n.country.name + ', ' + fmt.pct(inp.occupancy) + ' occupancy' + (ctx.n.provenance.occupancy.kind === 'user' ? '' : (ctx.n.provenance.occupancy.closest ? ' (closest match: ' + ctx.n.provenance.occupancy.label + ')' : ' (national average)')) + '.');
    L.push('Today: ' + rec.segment.current + (inp.bottlesPerRoomNight ? ', ' + inp.bottlesPerRoomNight + ' x ' + sizeLabel(inp.bottleSizeMl) + ' per room and night' : '') + (inp.pricePerBottle > 0 ? ' at ' + unitMoney(ctx, inp.pricePerBottle) + ' per bottle' + (ctx.n.provenance.pricePerBottle.kind === 'user' ? '' : ' (reference price)') : '') + '.');
    L.push('Wanted: ' + rec.segment.areas.join(', ') + (rec.segment.temps ? '; ' + rec.segment.temps + ' water in the room' : '') + '.');
    var extra = []; if (p.source) extra.push('Water supply: ' + (R.LABELS.source[p.source] || p.source)); if (p.halal) extra.push('Halal certificate requested'); if (p.timing) extra.push('Timing: ' + R.LABELS.timing[p.timing]); if (p.approval) extra.push('Approval by: ' + R.LABELS.approval[p.approval]);
    if (extra.length) L.push(extra.join('. ') + '.');
    var wsNote = R.waterSupplyNotes(p.source).result; if (wsNote) L.push(wsNote);
    L.push('');
    L.push('Indicative figures per year');
    L.push('- Bottles avoided: ' + fmt.int(c.bottles.total) + ' (' + fmt.int(c.env.litres) + ' litres)');
    if (c.env.packagingKg != null) L.push('- Plastic avoided: ' + fmt.int(c.env.packagingKg) + ' kg');
    if (c.env.quantified) L.push('- CO2e avoided: ' + fmt.dec(c.env.co2eKg / 1000, 1) + ' t');
    if (inp.pricePerBottle > 0) L.push('- Bottled water bought today: ' + m(c.spend.annualLocal));
    L.push('- Service contract: ' + m(pr.servicingLocal) + ' a year (' + serviceBasis(ctx) + (pr.servicingSource === 'user' ? '' : ', list price') + ')');
    L.push('- Staff time freed: ' + fmt.int(c.labour.hours) + ' hours' + (c.labour.quantified ? ', about ' + m(c.labour.costLocal) : ''));
    if (pb.available) L.push('- Investment: ' + m(pb.capex) + (pr.capexSource === 'user' ? ' (hotel figure)' : ' (list price)') + '. Cash payback: ' + fmt.cap(fmt.years(pb.cashPaybackYears)) + (c.labour.quantified ? '. Including staff time freed: ' + fmt.years(pb.fullPaybackYears) : '') + '. Five-year net saving, cash: ' + m(pb.fiveYearNetCash) + '.');
    L.push('');
    L.push('Set-up (base case)');
    pr.lines.forEach(function (l) { L.push('- ' + fmt.int(l.units) + ' x ' + modelName(l.product) + ' at ' + listMoney(l.product.price) + ' per unit' + (l.area === 'inRoom' ? ' (guest rooms)' : ' (drinking stations)')); });
    if (pr.stationBlock) { var sb = pr.stationBlock; L.push('- Drinking stations (separate from the room payback): ' + fmt.int(sb.count) + ' x ' + (sb.lines[0] ? modelName(sb.lines[0].product) : 'station') + ', investment ' + (sb.capex != null ? m(sb.capex) : 'in the proposal') + ', service ' + m(sb.service) + ' a year' + (sb.counted && sb.combined ? '; rooms and stations together: cash payback ' + fmt.years(sb.combined.cashPaybackYears) : '; bottles in these areas not given') + '.'); }
    if (pr.upgrade && pr.upgrade.payback && pr.upgrade.inRoom && pr.upgrade.inRoom.exactMatch) L.push('- Upgrade for ' + R.LABELS.temps[pr.upgrade.temps] + ' water: ' + modelName(pr.upgrade.inRoom.products[0]) + ', extra investment ' + m(pr.upgrade.extraCapex) + ', cash payback ' + fmt.years(pr.upgrade.payback.cashPaybackYears) + '.');
    L.push('');
    L.push(scopeText(ctx).replace('Your proposal sets the final prices and quantities.', 'Indicative only.'));
    L.push('Sources and assumptions: ' + sourcesUrl());
    return L.join('\n');
  }

  function renderProposal(ctx) {
    var p = state.proposal;
    var card = el('section', { class: 'panel', id: 'proposal' });
    card.appendChild(el('h3', { text: 'Request a proposal' }));
    card.appendChild(el('p', { class: 'hint form-intro', text: 'Swisspro replies with a proposal for your hotel.' }));
    var MAIN = ['name', 'hotel', 'email', 'segment'], LABEL = { email: 'Work email' };
    function control(f) {
      var d = el('div', { class: 'pf' });
      d.appendChild(el('label', { for: 'pf-' + f.id, text: LABEL[f.id] || f.label }));
      if (f.type === 'select') {
        var sel = el('select', { class: 'input', id: 'pf-' + f.id, onchange: function (e) { p[f.id] = e.target.value; save(); if (f.rerender) { renderResults(); var again = document.getElementById('pf-' + f.id); if (again) { again.scrollIntoView({ block: 'center' }); again.focus(); } } } });
        f.options.forEach(function (o) { var opt = el('option', { value: o.id, text: o.label }); if ((p[f.id] || '') === o.id) opt.selected = true; sel.appendChild(opt); });
        d.appendChild(sel);
        if (f.help) d.appendChild(el('span', { class: 'hint', text: f.help }));
      } else {
        d.appendChild(el('input', { class: 'input', id: 'pf-' + f.id, type: f.type, required: has(MAIN, f.id) ? 'required' : null, autocomplete: f.id === 'email' ? 'email' : (f.id === 'name' ? 'name' : (f.id === 'phone' ? 'tel' : 'organization')), value: p[f.id] || '', oninput: function (e) { p[f.id] = e.target.value; save(); } }));
      }
      d.appendChild(el('div', { class: 'error', id: 'perr-' + f.id, hidden: true }));
      return d;
    }
    var byId = {}; Q.proposalFields.forEach(function (f) { byId[f.id] = f; });
    MAIN.forEach(function (id) { card.appendChild(control(byId[id])); });
    var more = disclosure('pf-more', 'inline', 'Add details (optional)');
    Q.proposalFields.forEach(function (f) { if (!has(MAIN, f.id)) more.appendChild(control(f)); });
    card.appendChild(more);

    var status = el('p', { class: 'hint', id: 'send-status', 'aria-live': 'polite' });
    var ta = el('textarea', { class: 'copy-area', readonly: 'readonly', 'aria-label': 'Summary text' });
    function refreshText() { ta.value = summaryText(compute()); return ta.value; }
    refreshText();
    function validContact() {
      var ok = true, first = null;
      MAIN.forEach(function (k) {
        var msg = '';
        if (!p[k] || !String(p[k]).trim()) msg = k === 'segment' ? 'Please choose one.' : 'Please fill this in.';
        else if (k === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p[k])) msg = 'Please enter a valid email address.';
        var e = document.getElementById('perr-' + k); if (e) { e.textContent = msg; e.hidden = !msg; }
        if (msg) { ok = false; if (!first) first = k; }
      });
      if (first) { var n = document.getElementById('pf-' + first); if (n) n.focus(); }
      return ok;
    }
    function send(btn) {
      if (!validContact()) { status.textContent = ''; return; }
      var txt = refreshText(), subject = 'Proposal request via the Sustainability Wizard: ' + p.hotel;
      if (PL.leadEndpoint) {
        btn.disabled = true; status.textContent = 'Sending the request.';
        var body = { name: p.name, hotel: p.hotel, email: p.email, segment: p.segment || '', phone: p.phone || '', source: p.source || '', halal: p.halal || '', timing: p.timing || '', approval: p.approval || '', answers: state.answers, overrides: state.overrides, summary: txt };
        fetch(PL.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); status.textContent = 'Request sent. Swisspro replies to ' + p.email + '.'; btn.textContent = 'Request sent'; })
          .catch(function () { btn.disabled = false; status.textContent = 'The request was not sent. Email the summary to ' + PL.leadEmail + '.'; });
      } else {
        window.location.href = 'mailto:' + PL.leadEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(txt);
        status.textContent = 'Your email program opens with the request addressed to ' + PL.leadEmail + '. If it does not, copy the summary and email it.';
      }
    }
    function copyText(btn, text) { var done = function () { btn.textContent = 'Summary copied'; }; try { navigator.clipboard.writeText(text).then(done, function () { ta.select(); document.execCommand('copy'); done(); }); } catch (e) { ta.select(); document.execCommand('copy'); done(); } }
    var sendBtn = el('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: function () { send(sendBtn); } }, 'Send the request to Swisspro');
    card.appendChild(sendBtn);
    card.appendChild(status);
    card.appendChild(el('div', { class: 'actions form-actions' }, el('button', { type: 'button', class: 'btn btn-text', onclick: function () { copyText(this, refreshText()); } }, 'Copy the summary')));
    if (ARTIFACT) card.appendChild(el('p', { class: 'hint', text: 'In this preview the email button may do nothing; copy the summary instead.' }));
    var st = disclosure('pf-summary', 'inline', 'Show the summary text'); st.appendChild(ta);
    st.appendChild(el('p', { class: 'hint', text: 'Or email ' + PL.leadEmail + ' directly. Your answers stay in this browser; nothing is stored elsewhere until you send the request.' }));
    card.appendChild(st);
    return card;
  }

  /* ------------------------------------------------------------------ owner sheet (print only) */
  function renderPrintSheet(ctx, h) {
    var p = state.proposal, c = ctx.calc, pb = c.payback, pr = ctx.pr, inp = ctx.n.inputs, lead = leadText(ctx), v = pr.fiveYear;
    var sheet = el('div', { class: 'print-sheet', 'aria-hidden': 'true' });
    var logo = el('img', { class: 'logo', src: 'assets/logo-swisspro-white.png', alt: 'Swisspro', height: '20' });
    logo.addEventListener('error', function () { logo.replaceWith(el('span', { class: 'logo-text', text: 'Swisspro' })); });
    sheet.appendChild(el('div', { class: 'ps-head' }, logo,
      el('div', {}, el('strong', { text: p.hotel || fmt.int(inp.rooms) + ' rooms in ' + ctx.n.country.name }), el('span', { text: 'Sustainability Wizard, ' + new Date().toISOString().slice(0, 10) + '. Indicative figures.' }))));
    sheet.appendChild(el('p', { class: 'ps-context', text: contextLine(ctx) + ' \u00b7 ' + answersLine(ctx) }));
    sheet.appendChild(el('div', { class: 'ps-top' },
      el('div', { class: 'ps-big' }, el('strong', { text: (h.num == null ? h.text : fmt.dec(h.num, h.decimals)) + ' ' + h.unit }), el('span', { text: h.lead })),
      h.kpis.map(function (k) { return el('div', { class: 'ps-kpi' }, el('strong', { text: k[0] }), el('span', { text: k[1] + (k[2] ? ', ' + k[2] : '') })); })));
    sheet.appendChild(el('p', { class: 'ps-lead', text: lead.head + (lead.sub ? ' ' + lead.sub : '') + ' ' + h.cash }));
    var note = R.waterSupplyNotes(p.source).result; if (note) sheet.appendChild(el('p', { class: 'ps-lead', text: note }));
    if (pb.available) {
      sheet.appendChild(el('h3', { text: 'Business case' }));
      sheet.appendChild(kv(businessRows(ctx)));
    }
    if (v) {
      sheet.appendChild(el('h3', { text: 'Five years: bottled water against Swisspro' }));
      var t = el('table', { class: 'kv ps-five' }, el('tr', {}, el('th', { text: 'Cumulative cost' }), v.years.map(function (y) { return el('td', { class: 'head', text: y === 0 ? 'Today' : 'Year ' + y }); })));
      t.appendChild(el('tr', {}, el('th', { scope: 'row', text: 'Bottled water' }), v.years.map(function (y) { return el('td', { text: moneyShort(ctx, v.bottled[y]) }); })));
      t.appendChild(el('tr', {}, el('th', { scope: 'row', text: 'Swisspro, investment plus service' }), v.years.map(function (y) { return el('td', { text: moneyShort(ctx, v.swisspro[y]) }); })));
      sheet.appendChild(t);
    }
    sheet.appendChild(el('h3', { text: 'Calculation' }));
    sheet.appendChild(calcTable(ctx));
    sheet.appendChild(el('p', { class: 'ps-foot', text: (pr.stationBlock ? 'Guest rooms only. ' : '') + scopeText(ctx) + ' Sources and assumptions: ' + sourcesUrl() }));
    sheet.appendChild(el('p', { class: 'ps-contact', text: 'Swisspro Pte Ltd, Singapore. ' + PL.leadEmail + ', swissprowater.com' }));
    return sheet;
  }

  /* ------------------------------------------------------------------ router */
  function render() {
    document.getElementById('restart-top').hidden = state.view === 'intro';
    if (cta) { cta.forEach(function (o) { o.disconnect(); }); cta = null; }
    if (state.view === 'wizard') renderStep();
    else if (state.view === 'results') renderResults();
    else renderIntro();
  }
  document.getElementById('restart-top').addEventListener('click', restart);
  window.SW.app = { state: function () { return state; }, compute: compute, summaryText: summaryText, render: render };
  render();
})();
