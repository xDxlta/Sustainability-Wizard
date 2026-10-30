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
      el('p', { class: 'lead', text: 'Nine quick answers. You get the bottles, plastic and CO2e avoided, the money and staff time, the payback, and the Swisspro set-up that fits.' }),
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
      var labelText = f.id === 'priceCustom' ? 'Price per bottle (' + (F.countries[a.country] || F.countries.OTHER).currency + ')' : f.label;
      if (f.label) wrap.appendChild(el('div', { class: 'field-label', id: 'lbl-' + f.id, text: labelText }));
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
  /** One unit of the list currency (assumed SGD) in the hotel's currency, via USD. */
  function listRate(inputs) {
    var listCode = PL.pricelist.currency.value;
    var from = Object.keys(F.countries).map(function (k) { return F.countries[k]; }).filter(function (c) { return c.currency === listCode; })[0];
    var usdPerList = from ? from.fx.value : 1;
    return { localPerList: usdPerList / inputs.usdPerLocal, listCode: listCode, same: inputs.currency === listCode, from: from };
  }

  function priceSolutions(solutions, plan, toLocal) {
    var lines = [], unpriced = [], capexList = 0;
    solutions.forEach(function (sol) {
      var n = sol.area === 'inRoom' ? plan.inRoom : plan.stations;
      if (n <= 0) return;
      if (sol.exactMatch && sol.products.length) { var p = sol.products[0]; lines.push({ area: sol.area, areaLabel: sol.areaLabel, product: p, units: n, list: p.price * n, local: toLocal(p.price * n) }); capexList += p.price * n; }
      else unpriced.push({ area: sol.areaLabel, units: n });
    });
    return { lines: lines, unpriced: unpriced, capexList: capexList, capexLocal: unpriced.length || !lines.length ? null : toLocal(capexList) };
  }

  function pricing(rec, inputs) {
    var o = state.overrides, rate = listRate(inputs), SV = PL.pricelist.servicing;
    var toLocal = function (v) { return v * rate.localPerList; };
    var plan = rec.unitPlan;
    var reading = o.serviceReading || SV.defaultReading;
    var months = o.changeMonths != null ? Number(o.changeMonths) : SV.changeIntervalMonths.value;
    var inRoomPerYear = PL.inRoomServicePerYear(reading, months), stationPerYear = PL.stationServicePerYear();
    var servicingListPerYear = plan.inRoom * inRoomPerYear + plan.stations * stationPerYear;
    var servicingLocal = o.annualService != null ? Number(o.annualService) : toLocal(servicingListPerYear);
    var main = priceSolutions(rec.solutions, plan, toLocal);
    var capexLocal = null, capexSource = 'none';
    if (o.capex != null && Number(o.capex) > 0) { capexLocal = Number(o.capex); capexSource = 'user'; }
    else if (main.capexLocal != null) { capexLocal = main.capexLocal; capexSource = 'pricelist'; }
    var alt = null;
    if (rec.alternative && capexSource !== 'user') {
      var altSols = rec.solutions.map(function (s) { return s.area === 'inRoom' ? rec.alternative : s; });
      var ap = priceSolutions(altSols, plan, toLocal);
      // the in-room service line is the same for every in-room model, so only the investment changes
      if (ap.capexLocal != null) alt = { solution: rec.alternative, product: rec.alternative.products[0], capexLocal: ap.capexLocal, lines: ap.lines, servicingLocal: servicingLocal };
    }
    return { units: plan.inRoom + plan.stations, inRoomUnits: plan.inRoom, stations: plan.stations, reading: reading, months: months, inRoomPerYear: inRoomPerYear, stationPerYear: stationPerYear,
      servicingListPerYear: servicingListPerYear, servicingLocal: servicingLocal, servicingSource: o.annualService != null ? 'user' : 'pricelist',
      capexLocal: capexLocal, capexSource: capexSource, capexList: main.capexList, lines: main.lines, unpriced: main.unpriced, alt: alt, rate: rate, toLocal: toLocal };
  }

  /* ------------------------------------------------------------------ results */
  function compute() {
    var n = M.normalise(F, state.answers, state.overrides);
    var calc = E.calculate(F, n.inputs);
    var rec = R.recommend(state.answers, n.inputs, F, PL, state.overrides);
    var pr = pricing(rec, n.inputs);
    var inp = Object.assign({}, n.inputs, { capex: pr.capexLocal, annualService: pr.servicingLocal });
    calc.payback = E.payback(inp, calc.spend, calc.labour);
    if (pr.alt) pr.alt.payback = E.payback(Object.assign({}, inp, { capex: pr.alt.capexLocal, annualService: pr.alt.servicingLocal }), calc.spend, calc.labour);
    calc.inputs = inp;
    return { n: n, calc: calc, rec: rec, pr: pr };
  }

  function money(ctx, v) { return fmt.money(ctx.n.inputs.symbol, v, ctx.n.inputs.decimals); }
  function moneyShort(ctx, v) { return fmt.moneyShort(ctx.n.inputs.symbol, v, ctx.n.inputs.decimals); }
  function sizeLabel(ml) { return ml >= 1000 ? fmt.dec(ml / 1000, 1) + ' L' : ml + ' ml'; }
  function listPrice(p) { return p.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' ' + PL.pricelist.currency.value; }
  function modelName(p) { return p.label.replace(/\s*\(.*\)$/, ''); }
  function sourcesUrl() { try { return new URL('sources.html', location.href.split('#')[0].split('?')[0]).href; } catch (e) { return 'sources.html'; } }
  function sourcesLink(text) { return el('a', { href: sourcesUrl(), target: EMBED ? '_blank' : null, rel: 'noopener', text: text }); }
  function fxDate(ctx) { var a = ctx.n.country.fx.source, b = ctx.pr.rate.from && ctx.pr.rate.from.fx.source; var d = []; if (a && a.year) d.push(a.year); if (b && b.year && d.indexOf(b.year) < 0) d.push(b.year); return d.length ? 'rates of ' + d.join(' and ') : 'reference rates'; }

  /** The one sentence a hotel manager reads first. */
  function verdict(ctx) {
    var c = ctx.calc, pb = c.payback, inp = ctx.n.inputs, pr = ctx.pr;
    var v = { tone: 'neutral', head: '', sub: '', alt: null };
    var bottles = fmt.int(c.bottles.total) + ' bottles a year';
    if (inp.pricePerBottle <= 0 || c.bottles.total <= 0) {
      v.head = c.bottles.total > 0 ? 'Filtered water replaces ' + bottles + ' in your hotel.' : 'No bottled water in the rooms today, so the case is the guest experience in the areas you chose.';
      v.sub = c.bottles.total > 0 ? 'Add the price you pay per bottle under Adjust to see the money side.' : 'Add bottles outside the rooms under Adjust to count them.';
      return v;
    }
    if (!pb.available) {
      v.head = 'Filtered water replaces ' + bottles + ' and ' + moneyShort(ctx, c.spend.annualLocal) + ' of bottled water.';
      v.sub = pr.unpriced.length ? 'The price list has no unit for ' + pr.unpriced.map(function (u) { return u.area; }).join(' and ') + ', so the investment comes from your proposal. Enter it under Adjust to see the payback.' : 'Enter the investment under Adjust to see the payback.';
      return v;
    }
    var y = pb.cashPaybackYears, net = pb.cashSavingsPerYear;
    if (isFinite(y) && y <= 5) {
      v.tone = y <= 4 ? 'good' : 'neutral';
      v.head = 'Pays for itself in ' + fmt.years(y) + ' and replaces ' + bottles + '.';
      v.sub = 'After that you keep about ' + moneyShort(ctx, net) + ' a year, service contract included.';
    } else if (isFinite(y)) {
      v.head = 'Replaces ' + bottles + '. On cash alone the investment takes ' + fmt.years(y) + ' to pay back.';
      v.sub = 'The service contract (' + moneyShort(ctx, pb.annualService) + ' a year) takes most of the ' + moneyShort(ctx, c.spend.annualLocal) + ' you spend on bottled water. The case is plastic, CO2e and staff time.';
    } else {
      v.head = 'Replaces ' + bottles + '. At your bottle price the service contract costs more than the water it replaces.';
      v.sub = 'Service contract ' + moneyShort(ctx, pb.annualService) + ' a year against ' + moneyShort(ctx, c.spend.annualLocal) + ' of bottled water. The case is plastic, CO2e, staff time and the guest experience, not cash.';
    }
    if (pr.alt && pr.alt.payback && pr.alt.payback.available) {
      var ay = pr.alt.payback.cashPaybackYears;
      v.alt = 'Lower-cost option: a filtered tap in the room (' + modelName(pr.alt.product) + ') needs ' + moneyShort(ctx, pr.alt.capexLocal) + ' instead of ' + moneyShort(ctx, pb.capex) + (isFinite(ay) ? ', cash payback ' + fmt.years(ay) + '.' : '.');
    }
    return v;
  }

  function scrollToVerdict() { var h = document.querySelector('.verdict'); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function showLowerCost() { state.overrides.inRoomTap = true; save(); renderResults(); scrollToVerdict(); }
  function backToChoice() { delete state.overrides.inRoomTap; save(); renderResults(); scrollToVerdict(); }

  function renderResults() {
    var ctx = compute();
    var a = state.answers, n = ctx.n, c = ctx.calc, rec = ctx.rec, prov = n.provenance, inp = n.inputs;
    app.innerHTML = '';
    var root = el('div', { class: 'results' });
    var occAssumed = prov.occupancy.kind !== 'user', bpnAssumed = prov.bottlesPerRoomNight.kind !== 'user', sizeAssumed = prov.bottleSizeMl.kind !== 'user';
    root.appendChild(el('header', { class: 'results-head' },
      el('p', { class: 'eyebrow', text: 'Your result' }),
      el('h2', { text: fmt.int(inp.rooms) + ' rooms in ' + n.country.name + (state.proposal.hotel ? ', ' + state.proposal.hotel : '') }),
      el('div', { class: 'summary-chips' },
        el('span', { text: fmt.pct(inp.occupancy) + ' occupancy' + (occAssumed ? ', national average' : '') }),
        el('span', { text: rec.segment.current }),
        inp.bottlesPerRoomNight ? el('span', { text: inp.bottlesPerRoomNight + ' x ' + sizeLabel(inp.bottleSizeMl) + ' per night' + (bpnAssumed || sizeAssumed ? ', assumed' : '') }) : null,
        inp.pricePerBottle > 0 ? el('span', { text: fmt.money(inp.symbol, inp.pricePerBottle, inp.decimals === 0 ? 0 : 2) + ' per bottle' + (prov.pricePerBottle.kind !== 'user' ? ', reference price' : '') }) : null,
        el('span', { text: rec.segment.areas.join(', ') }),
        rec.segment.temps ? el('span', { class: rec.segment.lowerCost ? 'chip-switched' : null, text: rec.segment.lowerCost ? 'Showing the filtered tap instead of ' + rec.segment.temps + ' water in the room' : fmt.cap(rec.segment.temps) + ' water in the room' }) : null)));

    var v = verdict(ctx);
    root.appendChild(el('section', { class: 'card verdict verdict-' + v.tone },
      el('p', { class: 'verdict-head', text: v.head }),
      v.sub ? el('p', { class: 'verdict-sub', text: v.sub }) : null,
      rec.segment.lowerCost ? el('p', { class: 'verdict-alt' }, 'You are looking at the lower-cost option: a filtered tap in the room. Your original choice was ' + rec.segment.temps + ' water. ', el('button', { type: 'button', class: 'link-btn', onclick: backToChoice }, 'Back to ' + rec.segment.temps)) : null,
      v.alt ? el('p', { class: 'verdict-alt', text: v.alt }) : null));

    var tiles = el('div', { class: 'tiles' });
    function tile(label, value, unit, sub) {
      return el('div', { class: 'tile' }, el('div', { class: 'label', text: label }), el('div', { class: 'value' + (String(value).length >= 9 ? ' value-long' : ''), text: value }, unit ? el('span', { class: 'unit', text: ' ' + unit }) : null), el('div', { class: 'sub', text: sub || '' }));
    }
    tiles.appendChild(tile('Bottles avoided', fmt.int(c.bottles.total), null, fmt.int(c.env.litres) + ' litres a year'));
    if (c.env.packagingKg != null) tiles.appendChild(tile('Plastic avoided', fmt.int(c.env.packagingKg), 'kg', fmt.dec(c.env.bottleWeightG, 1) + ' g per bottle'));
    else tiles.appendChild(tile('Cartons avoided', fmt.int(c.logistics.cartonsPerYear), null, fmt.int(c.logistics.palletsPerYear) + ' pallets a year'));
    tiles.appendChild(tile('CO2e avoided', c.env.quantified ? fmt.dec(c.env.co2eKg / 1000, 1) : '-', c.env.quantified ? 't' : null, c.env.quantified ? (fmt.int(c.env.co2eCarKm) + ' km by car' + (inp.bottleMaterial === 'glass' && !inp.glassReusable ? ', at least' : '')) : 'Not estimated'));
    tiles.appendChild(tile('Bottled water bought today', inp.pricePerBottle > 0 ? moneyShort(ctx, c.spend.annualLocal) : '-', null, inp.pricePerBottle > 0 ? 'per year, before the service contract' : 'No price set'));
    tiles.appendChild(tile('Staff time freed', fmt.int(c.labour.hours), 'hours', c.labour.quantified ? 'about ' + moneyShort(ctx, c.labour.costLocal) + ' a year, not counted as cash' : 'per year'));
    root.appendChild(tiles);

    root.appendChild(renderPayback(ctx));
    root.appendChild(renderSolution(ctx));
    root.appendChild(renderMore(ctx));
    root.appendChild(renderAdjust(ctx));
    root.appendChild(renderSources(ctx));
    root.appendChild(renderProposal(ctx));
    app.appendChild(root);
    document.getElementById('restart-top').hidden = false;
  }

  function serviceBasis(ctx) {
    var pr = ctx.pr, cur = PL.pricelist.currency.value, parts = [];
    if (pr.servicingSource === 'user') return 'your figure';
    if (pr.inRoomUnits > 0) parts.push(fmt.int(pr.inRoomUnits) + ' in-room units x 85.00 ' + cur + (pr.reading === 'perChange' ? ' per filter change, changed every ' + pr.months + ' months' : (pr.reading === 'perYear' ? ' per unit and year' : ' per unit and 2-year contract')));
    if (pr.stations > 0) parts.push(fmt.int(pr.stations) + (pr.stations === 1 ? ' station' : ' stations') + ' x 350.00 ' + cur + ' a year');
    return parts.join(' plus ');
  }
  function investmentSentence(ctx) {
    var pr = ctx.pr, c = ctx.calc;
    if (pr.capexSource === 'user') return 'Investment ' + money(ctx, pr.capexLocal) + ' (your figure). Service contract ' + money(ctx, pr.servicingLocal) + ' a year for filters, labour and parts: ' + serviceBasis(ctx) + '.';
    if (pr.capexSource === 'pricelist') {
      var parts = pr.lines.map(function (l) { return fmt.int(l.units) + ' x ' + modelName(l.product) + (l.area === 'inRoom' ? ' for the rooms' : ' as drinking station' + (l.units === 1 ? '' : 's')); });
      return 'Investment ' + money(ctx, pr.capexLocal) + ' at list price: ' + parts.join(' and ') + '. Service contract ' + money(ctx, pr.servicingLocal) + ' a year for filters, labour and parts: ' + serviceBasis(ctx) + '.';
    }
    return 'Service contract ' + money(ctx, pr.servicingLocal) + ' a year for filters, labour and parts: ' + serviceBasis(ctx) + '. The investment comes from your proposal.';
  }

  function renderPayback(ctx) {
    var c = ctx.calc, inp = ctx.n.inputs, pr = ctx.pr, pb = c.payback, rec = ctx.rec, cur = PL.pricelist.currency.value;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'Investment and payback' }));
    card.appendChild(el('p', { class: 'lead-line', text: investmentSentence(ctx) }));
    if (pb.available) {
      var t = el('table', { class: 'kv kv-wide' });
      function row(k, v, cls) { t.appendChild(el('tr', { class: cls || null }, el('th', { text: k }), el('td', { text: v }))); }
      row('Bottled water bought today, per year', money(ctx, c.spend.annualLocal));
      row('Service contract, per year', money(ctx, -pb.annualService));
      row('Net cash saving, per year', money(ctx, pb.cashSavingsPerYear), pb.cashSavingsPerYear < 0 ? 'neg' : null);
      row('Investment', money(ctx, pb.capex));
      row('Cash payback', fmt.cap(fmt.years(pb.cashPaybackYears)), 'strong');
      row('Five-year net saving, cash', money(ctx, pb.fiveYearNetCash), pb.fiveYearNetCash < 0 ? 'neg' : null);
      if (c.labour.quantified) {
        row('Staff time freed, per year', money(ctx, c.labour.costLocal) + ' (not counted above)', 'soft');
        row('Payback if staff time is counted', fmt.cap(fmt.years(pb.fullPaybackYears)), 'soft');
      }
      card.appendChild(t);
      if (pr.alt && pr.alt.payback) {
        var ap = pr.alt.payback;
        card.appendChild(el('div', { class: 'alt-box' },
          el('p', {}, el('strong', { text: 'Lower-cost option: filtered tap in the room' }), ' (' + modelName(pr.alt.product) + ', ' + listPrice(pr.alt.product) + ' per room). Investment ' + money(ctx, pr.alt.capexLocal) + ', cash payback ' + fmt.years(ap.cashPaybackYears) + ', five-year net saving ' + money(ctx, ap.fiveYearNetCash) + '. Same service contract.'),
          el('button', { type: 'button', class: 'btn btn-secondary btn-sm', onclick: showLowerCost }, 'Calculate with the filtered tap')));
      }
      if (rec.segment.lowerCost) card.appendChild(el('p', { class: 'small', style: 'margin-top:12px' }, el('button', { type: 'button', class: 'link-btn', onclick: backToChoice }, 'Back to ' + rec.segment.temps + ' water in the room')));
    } else if (pr.unpriced.length) {
      card.appendChild(el('p', { class: 'notice', text: 'The price list has no unit for ' + pr.unpriced.map(function (u) { return u.area; }).join(' and ') + '. Enter the investment from your proposal under Adjust to see the payback.' }));
    } else {
      card.appendChild(el('p', { class: 'muted small', text: 'Enter the investment under Adjust to see the payback.' }));
    }
    var scope = pr.rate.same ? 'List prices in ' + cur + '. ' : 'List prices in ' + cur + ', converted at 1 ' + cur + ' = ' + fmt.money(inp.symbol, pr.rate.localPerList, inp.decimals === 0 ? 0 : 2) + ' (' + fxDate(ctx) + '). ';
    card.appendChild(el('p', { class: 'small muted scope', text: scope + 'Prices exclude GST, installation, freight, duties and local taxes. Your proposal sets the final prices and quantities.' }));
    return card;
  }

  function renderSolution(ctx) {
    var rec = ctx.rec, pr = ctx.pr;
    var card = el('section', { class: 'card' });
    card.appendChild(el('h3', { text: 'The Swisspro set-up for your answers' }));
    rec.solutions.forEach(function (s) {
      var units = s.area === 'inRoom' ? rec.unitPlan.inRoom : rec.unitPlan.stations;
      if (units <= 0) return;
      var box = el('div', { class: 'product' });
      box.appendChild(el('div', { class: 'product-head' }, el('h4', { text: s.title }), el('span', { class: 'muted small', text: fmt.int(units) + (units === 1 ? ' unit' : ' units') + ' for ' + s.covers.join(', ') })));
      if (s.exactMatch && s.products.length) {
        var p = s.products[0];
        box.appendChild(el('div', { class: 'pick-line' },
          el('div', { class: 'pick-name' }, el('strong', { text: modelName(p) }), el('span', { class: 'muted small', text: p.describe })),
          el('div', { class: 'pick-price' }, el('strong', { text: listPrice(p) }), el('span', { class: 'muted small', text: 'per unit, about ' + money(ctx, pr.toLocal(p.price)) }))));
        if (s.notes.length) box.appendChild(el('p', { class: 'small muted', text: s.notes.join(' ') }));
        var rest = s.products.slice(1);
        if (rest.length) {
          var ul = el('ul', { class: 'lines' });
          rest.forEach(function (q) { ul.appendChild(el('li', {}, el('span', { class: 'line-name' }, el('strong', { text: modelName(q) }), el('span', { class: 'muted small', text: ' ' + q.describe })), el('span', { class: 'line-price', text: listPrice(q) }))); });
          box.appendChild(el('details', { class: 'inline' }, el('summary', { text: 'Other listed units for this area' }), ul));
        }
      } else {
        box.appendChild(el('p', { class: 'small', text: 'No listed unit gives ' + s.requiredTemps.map(function (t) { return R.TEMP_LABEL[t]; }).join(' and ') + ' water here; Swisspro prices it in the proposal. Listed units for this area:' }));
        var ul2 = el('ul', { class: 'lines' });
        s.products.forEach(function (q) { ul2.appendChild(el('li', {}, el('span', { class: 'line-name' }, el('strong', { text: modelName(q) }), el('span', { class: 'muted small', text: ' ' + q.describe })), el('span', { class: 'line-price', text: listPrice(q) }))); });
        box.appendChild(ul2);
      }
      card.appendChild(box);
    });
    card.appendChild(el('p', { class: 'small muted', text: 'One unit per guest room and one drinking station per area, drinking stations adjustable below. Installation, plumbing, water testing and the service schedule are set out in the proposal.' }));
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
    field(g1, 'otherBottlesPerDay', 'Bottles outside the rooms per day', inp.otherBottlesPerDay, 1);
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
    field(g3, 'newMinutesPerRoomPerDay', 'Minutes per room and day, filtered', inp.newMinutesPerRoomPerDay, 0.5, null, state.answers.temps === 'sparkling' ? 'Not counted yet; add time for refilling sparkling water' : 'Refilling carafes, for example');
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
    list.appendChild(item('Service contract', serviceBasis(ctx) + (pr.servicingSource === 'user' ? '' : '; the filter interval is an assumption you can change')));
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
    L.push('Hotel: ' + (p.hotel || 'not given') + '. Contact: ' + (p.name || 'not given') + ', ' + (p.email || 'no email given') + '.');
    L.push('');
    L.push(fmt.int(inp.rooms) + ' rooms in ' + ctx.n.country.name + ', ' + fmt.pct(inp.occupancy) + ' occupancy' + (ctx.n.provenance.occupancy.kind === 'user' ? '' : ' (national average)') + '.');
    L.push('Today: ' + rec.segment.current + (inp.bottlesPerRoomNight ? ', ' + inp.bottlesPerRoomNight + ' x ' + sizeLabel(inp.bottleSizeMl) + ' per room and night' : '') + (inp.pricePerBottle > 0 ? ' at ' + fmt.money(sym, inp.pricePerBottle, inp.decimals === 0 ? 0 : 2) + ' per bottle' + (ctx.n.provenance.pricePerBottle.kind === 'user' ? '' : ' (reference price)') : '') + '.');
    L.push('Wanted: ' + rec.segment.areas.join(', ') + (rec.segment.temps ? '; ' + rec.segment.temps + ' water in the room' : '') + '.' + (rec.segment.lowerCost ? ' Figures below are for the lower-cost option with a filtered tap in the room.' : ''));
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
    if (pb.available) L.push('- Investment: ' + m(pb.capex) + (pr.capexSource === 'user' ? ' (hotel figure)' : ' (list price)') + '. Cash payback: ' + fmt.cap(fmt.years(pb.cashPaybackYears)) + '. Five-year net saving: ' + m(pb.fiveYearNetCash) + '.');
    L.push('');
    L.push('Set-up');
    rec.solutions.forEach(function (s) {
      var units = s.area === 'inRoom' ? rec.unitPlan.inRoom : rec.unitPlan.stations; if (units <= 0) return;
      L.push('- ' + s.title + ': ' + fmt.int(units) + (units === 1 ? ' unit' : ' units') + (s.exactMatch && s.products.length ? ', ' + modelName(s.products[0]) + ' at ' + listPrice(s.products[0]) + ' per unit' : ', to be priced in the proposal'));
    });
    L.push('');
    L.push((pr.rate.same ? 'List prices in ' + PL.pricelist.currency.value : 'List prices in ' + PL.pricelist.currency.value + ', converted at 1 ' + PL.pricelist.currency.value + ' = ' + fmt.money(sym, pr.rate.localPerList, inp.decimals === 0 ? 0 : 2)) + ', excl. GST, installation, freight, duties and taxes. Indicative only.');
    L.push('Sources and assumptions: ' + sourcesUrl());
    return L.join('\n');
  }

  function renderProposal(ctx) {
    var p = state.proposal;
    var card = el('section', { class: 'card', id: 'proposal' });
    card.appendChild(el('h3', { text: 'Request a proposal' }));
    card.appendChild(el('p', { class: 'muted', text: 'Swisspro replies with a proposal for your hotel. Nothing is sent until you click the button.' }));
    var grid = el('div', { class: 'adjust' });
    var REQUIRED = { name: true, hotel: true, email: true };
    Q.proposalFields.forEach(function (f) {
      var d = el('div', {});
      d.appendChild(el('label', { for: 'pf-' + f.id, text: f.label + (REQUIRED[f.id] ? '' : ' (optional)') }));
      if (f.type === 'select') {
        var sel = el('select', { class: 'input', id: 'pf-' + f.id, onchange: function (e) { p[f.id] = e.target.value; save(); } });
        f.options.forEach(function (o) { var opt = el('option', { value: o.id, text: o.label }); if ((p[f.id] || '') === o.id) opt.selected = true; sel.appendChild(opt); });
        d.appendChild(sel);
      } else {
        d.appendChild(el('input', { class: 'input', id: 'pf-' + f.id, type: f.type, placeholder: REQUIRED[f.id] ? 'Required' : '', required: REQUIRED[f.id] ? 'required' : null, autocomplete: f.id === 'email' ? 'email' : (f.id === 'name' ? 'name' : 'organization'), value: p[f.id] || '', oninput: function (e) { p[f.id] = e.target.value; save(); } }));
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
      ['name', 'hotel', 'email'].forEach(function (k) {
        var msg = '';
        if (!p[k] || !String(p[k]).trim()) msg = 'Please fill this in.';
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
      ARTIFACT ? null : el('button', { type: 'button', class: 'btn btn-secondary', onclick: function () { window.print(); } }, 'Print or save as PDF'),
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
