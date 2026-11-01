/* Business case for the owner (version 2.5). Pure functions, browser and Node.
 *
 * Base case: the basic in-room tap (lowest-priced In-Room line that gives filtered water) in every
 * guest room, plus one drinking station per other area the hotel chose, whatever water type the
 * hotel asked for in the room. The unit that matches the wish (chilled, hot and chilled, sparkling)
 * is priced as an upgrade on top: its extra investment and its own payback.
 *
 * The service contract is always part of the cash payback. Its default reading is one filter change
 * per room and year at the In-Room comprehensive price (labour and parts included); the other
 * readings stay selectable. Every number comes from js/pricelist.js, js/factors.js or the answers.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.business = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VIEW_YEARS = 5;          // length of the cumulative cost view
  var SPREAD_YEARS = 3;        // investment spread for the per-room-per-month arithmetic

  function has(arr, v) { return (arr || []).indexOf(v) >= 0; }

  /** One unit of the list currency in the hotel's currency, via the register's USD rates. */
  function listRate(F, PL, inputs) {
    var listCode = PL.pricelist.currency.value;
    var from = Object.keys(F.countries).map(function (k) { return F.countries[k]; }).filter(function (c) { return c.currency === listCode; })[0];
    var usdPerList = from ? from.fx.value : 1;
    return { localPerList: usdPerList / inputs.usdPerLocal, listCode: listCode, same: inputs.currency === listCode, from: from };
  }

  /** Investment of a set of solutions at list price (the lowest-priced matching line per area). */
  function priceSolutions(solutions, plan, toLocal) {
    var lines = [], unpriced = [], capexList = 0;
    solutions.forEach(function (sol) {
      var n = sol.area === 'inRoom' ? plan.inRoom : plan.stations;
      if (n <= 0) return;
      if (sol.exactMatch && sol.products.length) {
        var p = sol.products[0];
        lines.push({ area: sol.area, areaLabel: sol.areaLabel, title: sol.title, product: p, units: n, list: p.price * n, local: toLocal(p.price * n) });
        capexList += p.price * n;
      } else unpriced.push({ area: sol.areaLabel, units: n });
    });
    return { lines: lines, unpriced: unpriced, capexList: capexList, capexLocal: unpriced.length || !lines.length ? null : toLocal(capexList) };
  }

  /** Service contract per year for a unit plan, in list currency and local currency. */
  function serviceFor(PL, plan, overrides, toLocal) {
    var SV = PL.pricelist.servicing, o = overrides || {};
    var reading = o.serviceReading || SV.defaultReading;
    var months = o.changeMonths != null && Number(o.changeMonths) > 0 ? Number(o.changeMonths) : SV.changeIntervalMonths.value;
    var inRoomPerYear = PL.inRoomServicePerYear(reading, months), stationPerYear = PL.stationServicePerYear();
    var listPerYear = plan.inRoom * inRoomPerYear + plan.stations * stationPerYear;
    return { reading: reading, months: months, inRoomPerYear: inRoomPerYear, stationPerYear: stationPerYear, listPerYear: listPerYear, local: toLocal(listPerYear) };
  }

  /** Cumulative cost of bottled water against Swisspro (investment plus service) for years 0..VIEW_YEARS. */
  function fiveYear(spendPerYear, capex, servicePerYear) {
    var years = [], bottled = [], swisspro = [];
    for (var t = 0; t <= VIEW_YEARS; t++) { years.push(t); bottled.push(spendPerYear * t); swisspro.push(capex + servicePerYear * t); }
    var net = spendPerYear - servicePerYear;
    var cross = net > 0 ? capex / net : null;
    return { years: years, bottled: bottled, swisspro: swisspro, crossYear: cross, crossesInView: cross != null && cross <= VIEW_YEARS };
  }

  /** Per room and month: bottled water today against Swisspro service plus the investment spread over SPREAD_YEARS. Arithmetic only. */
  function perRoomMonth(rooms, spendPerYear, capex, servicePerYear) {
    if (!(rooms > 0)) return null;
    var today = spendPerYear / rooms / 12;
    var service = servicePerYear / rooms / 12;
    var investment = capex / SPREAD_YEARS / rooms / 12;
    return { today: today, service: service, investment: investment, swisspro: service + investment, spreadYears: SPREAD_YEARS };
  }

  /**
   * The strongest true statement, in this order of preference:
   *   1. payback in years if it falls inside the five-year view (cash first, else including staff time freed);
   *   2. otherwise the yearly saving (cash first, else including staff time freed);
   *   3. otherwise cost per occupied room-night if Swisspro is lower (including staff time freed);
   *   4. otherwise the facts of today's bottled water, which are true and not a verdict.
   */
  function leadStatement(calc, pb, capex, service) {
    var spend = calc.spend.annualLocal, staff = calc.labour.quantified ? calc.labour.costLocal : 0, orn = calc.bottles.occupiedRoomNights;
    if (pb.available && spend > 0) {
      if (isFinite(pb.cashPaybackYears) && pb.cashPaybackYears <= VIEW_YEARS) return { kind: 'payback', years: pb.cashPaybackYears, saving: pb.cashSavingsPerYear, fullYears: pb.fullPaybackYears };
      if (isFinite(pb.fullPaybackYears) && pb.fullPaybackYears <= VIEW_YEARS) return { kind: 'payback-staff', years: pb.fullPaybackYears, cashYears: pb.cashPaybackYears, saving: pb.fullSavingsPerYear };
      if (pb.cashSavingsPerYear > 0) return { kind: 'saving', saving: pb.cashSavingsPerYear, cashYears: pb.cashPaybackYears };
      if (pb.fullSavingsPerYear > 0) return { kind: 'saving-staff', saving: pb.fullSavingsPerYear, cashYears: pb.cashPaybackYears };
      if (orn > 0) {
        var bottledNight = (spend + staff) / orn, swissNight = (service + capex / SPREAD_YEARS) / orn;
        if (swissNight < bottledNight) return { kind: 'per-night', swisspro: swissNight, bottled: bottledNight };
      }
    }
    return { kind: 'facts', bottles: calc.bottles.total, spend: spend, hours: calc.labour.hours };
  }

  /**
   * Builds the business case. deps: { F, PL, R, E }. Returns the base case, the upgrade (if any),
   * the five-year view, the per-room-per-month view and the lead statement.
   */
  function build(deps, answers, overrides, inputs, calc) {
    var F = deps.F, PL = deps.PL, R = deps.R, E = deps.E, o = overrides || {};
    var rate = listRate(F, PL, inputs);
    var toLocal = function (v) { return v * rate.localPerList; };
    var roomsChosen = has(answers.areas, 'rooms');

    // Base case: basic tap in the room, stations for the other chosen areas.
    var baseAnswers = Object.assign({}, answers, { temps: 'ambient' });
    var baseRec = R.recommend(baseAnswers, inputs, F, PL, o);
    var basePrice = priceSolutions(baseRec.solutions, baseRec.unitPlan, toLocal);
    var baseSvc = serviceFor(PL, baseRec.unitPlan, o, toLocal);
    var capexSource = o.capex != null && Number(o.capex) > 0 ? 'user' : (basePrice.capexLocal != null ? 'pricelist' : 'none');
    var capex = capexSource === 'user' ? Number(o.capex) : basePrice.capexLocal;
    var serviceSource = o.annualService != null ? 'user' : 'pricelist';
    var service = serviceSource === 'user' ? Number(o.annualService) : baseSvc.local;
    var pb = E.payback(Object.assign({}, inputs, { capex: capex, annualService: service }), calc.spend, calc.labour);

    // Upgrade: the unit that matches the wish, priced on top of the base case.
    var upgrade = null;
    if (roomsChosen && answers.temps && answers.temps !== 'ambient') {
      var upRec = R.recommend(answers, inputs, F, PL, o);
      var upPrice = priceSolutions(upRec.solutions, upRec.unitPlan, toLocal);
      var upSvc = serviceFor(PL, upRec.unitPlan, o, toLocal);
      if (upPrice.capexLocal != null && basePrice.capexLocal != null) {
        var extraCapex = upPrice.capexLocal - basePrice.capexLocal;
        var extraService = upSvc.local - baseSvc.local;
        var upCapex = capex + extraCapex, upService = service + extraService;
        upgrade = {
          temps: answers.temps, solutions: upRec.solutions, plan: upRec.unitPlan, lines: upPrice.lines,
          inRoom: upRec.solutions.filter(function (s) { return s.area === 'inRoom'; })[0],
          extraCapex: extraCapex, extraService: extraService, capex: upCapex, service: upService,
          payback: E.payback(Object.assign({}, inputs, { capex: upCapex, annualService: upService }), calc.spend, calc.labour)
        };
      } else if (upPrice.unpriced.length) {
        upgrade = { temps: answers.temps, solutions: upRec.solutions, plan: upRec.unitPlan, lines: upPrice.lines, unpriced: upPrice.unpriced, payback: null };
      }
    }

    var view = pb.available ? fiveYear(calc.spend.annualLocal, capex, service) : null;
    var month = pb.available ? perRoomMonth(inputs.rooms, calc.spend.annualLocal, capex, service) : null;
    return {
      rate: rate, toLocal: toLocal,
      base: { rec: baseRec, solutions: baseRec.solutions, plan: baseRec.unitPlan, lines: basePrice.lines, unpriced: basePrice.unpriced, capexList: basePrice.capexList },
      units: baseRec.unitPlan.inRoom + baseRec.unitPlan.stations, inRoomUnits: baseRec.unitPlan.inRoom, stations: baseRec.unitPlan.stations,
      reading: baseSvc.reading, months: baseSvc.months, inRoomPerYear: baseSvc.inRoomPerYear, stationPerYear: baseSvc.stationPerYear,
      servicingListPerYear: baseSvc.listPerYear, servicingLocal: service, servicingSource: serviceSource,
      capexLocal: capex, capexSource: capexSource, lines: basePrice.lines, unpriced: basePrice.unpriced,
      payback: pb, upgrade: upgrade, fiveYear: view, perRoomMonth: month,
      lead: leadStatement(calc, pb, capex == null ? 0 : capex, service)
    };
  }

  return { build: build, listRate: listRate, priceSolutions: priceSolutions, serviceFor: serviceFor, fiveYear: fiveYear, perRoomMonth: perRoomMonth, leadStatement: leadStatement, VIEW_YEARS: VIEW_YEARS, SPREAD_YEARS: SPREAD_YEARS };
});
