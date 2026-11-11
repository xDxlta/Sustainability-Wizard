/* Business case for the owner (version 2.2). Pure functions, browser and Node.
 *
 * Room case (the headline): the basic in-room tap (lowest-priced In-Room line that gives filtered
 * water) in every guest room, whatever water type the hotel asked for. The unit that matches the wish
 * (chilled, hot and chilled, sparkling) is priced as an upgrade on top with its own payback.
 * Drinking stations for restaurants, meetings and staff areas are a separate block with their own
 * investment and service. Their saving is counted only when the hotel gives bottles a day for those
 * areas; then a combined payback is shown. They never enter the room payback.
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
   *   4. otherwise the benefits that hold: staff time freed, bottles and plastic avoided, and the market's
   *      share of safely managed drinking water where it is below the world share.
   * Never a negative statement.
   */
  function leadStatement(calc, pb, capex, service, safeWater, calcAll) {
    var all = calcAll || calc;
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
    return { kind: 'benefits', bottles: all.bottles.total, outside: all.bottles.total - calc.bottles.total, spend: spend, hours: all.labour.hours, staffValue: all.labour.quantified ? all.labour.costLocal : 0, safeWater: safeWater || null };
  }

  /** True when the cash case pays back (finite payback); decides between money tiles and benefit tiles. */
  function cashPaysBack(pb) { return !!(pb && pb.available && isFinite(pb.cashPaybackYears)); }
  /** True when the cash payback falls inside the five-year view: then the top tiles lead with money. */
  function cashShort(pb) { return cashPaysBack(pb) && pb.cashPaybackYears <= VIEW_YEARS; }

  /**
   * Builds the business case. deps: { F, PL, R, E }. Returns the base case, the upgrade (if any),
   * the five-year view, the per-room-per-month view and the lead statement.
   */
  function build(deps, answers, overrides, inputs, calcAll) {
    var F = deps.F, PL = deps.PL, R = deps.R, E = deps.E, o = overrides || {};
    var rate = listRate(F, PL, inputs);
    var toLocal = function (v) { return v * rate.localPerList; };
    var roomsChosen = has(answers.areas, 'rooms');
    var stationAreas = (answers.areas || []).filter(function (x) { return x !== 'rooms'; });

    // Room case: guest-room bottles only (the engine run without bottles outside the rooms).
    var calcRooms = roomsChosen ? E.calculate(F, Object.assign({}, inputs, { otherBottlesPerDay: 0 })) : calcAll;
    var mainAnswers = roomsChosen ? Object.assign({}, answers, { areas: ['rooms'] }) : answers;
    var mainOverrides = roomsChosen ? Object.assign({}, o, { stations: null }) : o;
    delete mainOverrides.stations;

    var baseRec = R.recommend(Object.assign({}, mainAnswers, { temps: 'ambient' }), inputs, F, PL, mainOverrides);
    var basePrice = priceSolutions(baseRec.solutions, baseRec.unitPlan, toLocal);
    var baseSvc = serviceFor(PL, baseRec.unitPlan, o, toLocal);
    var capexSource = o.capex != null && Number(o.capex) > 0 ? 'user' : (basePrice.capexLocal != null ? 'pricelist' : 'none');
    var capex = capexSource === 'user' ? Number(o.capex) : basePrice.capexLocal;
    var serviceSource = o.annualService != null ? 'user' : 'pricelist';
    var service = serviceSource === 'user' ? Number(o.annualService) : baseSvc.local;
    var pb = E.payback(Object.assign({}, inputs, { capex: capex, annualService: service }), calcRooms.spend, calcRooms.labour);

    // Upgrade: the in-room unit that matches the wish, priced on top of the room case.
    var upgrade = null;
    if (roomsChosen && answers.temps && answers.temps !== 'ambient') {
      var upRec = R.recommend(mainAnswers, inputs, F, PL, mainOverrides);
      var upPrice = priceSolutions(upRec.solutions, upRec.unitPlan, toLocal);
      var upSvc = serviceFor(PL, upRec.unitPlan, o, toLocal);
      if (upPrice.capexLocal != null && basePrice.capexLocal != null) {
        var extraCapex = upPrice.capexLocal - basePrice.capexLocal, extraService = upSvc.local - baseSvc.local;
        var upCapex = capex + extraCapex, upService = service + extraService;
        upgrade = {
          temps: answers.temps, solutions: upRec.solutions, plan: upRec.unitPlan, lines: upPrice.lines,
          inRoom: upRec.solutions.filter(function (s) { return s.area === 'inRoom'; })[0],
          extraCapex: extraCapex, extraService: extraService, capex: upCapex, service: upService,
          payback: E.payback(Object.assign({}, inputs, { capex: upCapex, annualService: upService }), calcRooms.spend, calcRooms.labour)
        };
      } else if (upPrice.unpriced.length) {
        upgrade = { temps: answers.temps, solutions: upRec.solutions, plan: upRec.unitPlan, lines: upPrice.lines, unpriced: upPrice.unpriced, payback: null };
      }
    }

    // Station block: separate investment and service; saving only from bottles the hotel gave for those areas.
    var stations = null;
    if (roomsChosen && stationAreas.length) {
      var stAnswers = Object.assign({}, answers, { areas: stationAreas, temps: 'ambient' });
      var stRec = R.recommend(stAnswers, inputs, F, PL, o);
      var stPrice = priceSolutions(stRec.solutions, stRec.unitPlan, toLocal);
      var stSvcList = stRec.unitPlan.stations * PL.stationServicePerYear();
      var stCapex = stPrice.capexLocal, stService = toLocal(stSvcList);
      var stSpend = calcAll.spend.annualLocal - calcRooms.spend.annualLocal;
      var stStaff = calcAll.labour.costLocal - calcRooms.labour.costLocal;
      var stBottles = calcAll.bottles.total - calcRooms.bottles.total;
      var counted = stBottles > 0;
      stations = {
        areas: stationAreas, count: stRec.unitPlan.stations, solutions: stRec.solutions, lines: stPrice.lines, unpriced: stPrice.unpriced,
        capex: stCapex, service: stService, stationPerYear: PL.stationServicePerYear(),
        counted: counted, bottlesPerDay: inputs.otherBottlesPerDay || 0, bottles: stBottles, spend: stSpend, staffValue: stStaff,
        payback: counted && stCapex != null ? E.payback({ capex: stCapex, annualService: stService }, { annualLocal: stSpend }, { costLocal: stStaff }) : null,
        combined: counted && stCapex != null && capex != null ? E.payback({ capex: capex + stCapex, annualService: service + stService }, { annualLocal: calcAll.spend.annualLocal }, { costLocal: calcAll.labour.costLocal }) : null
      };
    }

    var view = pb.available ? fiveYear(calcRooms.spend.annualLocal, capex, service) : null;
    var month = pb.available ? perRoomMonth(inputs.rooms, calcRooms.spend.annualLocal, capex, service) : null;
    var country = F.countries[inputs.country] || F.countries.OTHER;
    var world = F.factors.safe_water_world_2022;
    var safeWater = country.safeWater && world && country.safeWater.value < world.value ? { share: country.safeWater.value, year: country.safeWater.year, world: world.value, country: country.name, source: country.safeWater.source } : null;
    return {
      rate: rate, toLocal: toLocal, calcRooms: calcRooms, calcAll: calcAll,
      base: { rec: baseRec, solutions: baseRec.solutions, plan: baseRec.unitPlan, lines: basePrice.lines, unpriced: basePrice.unpriced, capexList: basePrice.capexList },
      units: baseRec.unitPlan.inRoom + baseRec.unitPlan.stations, inRoomUnits: baseRec.unitPlan.inRoom, stations: baseRec.unitPlan.stations,
      reading: baseSvc.reading, months: baseSvc.months, inRoomPerYear: baseSvc.inRoomPerYear, stationPerYear: baseSvc.stationPerYear,
      servicingListPerYear: baseSvc.listPerYear, servicingLocal: service, servicingSource: serviceSource,
      capexLocal: capex, capexSource: capexSource, lines: basePrice.lines, unpriced: basePrice.unpriced,
      payback: pb, cashPaysBack: cashPaysBack(pb), cashShort: cashShort(pb), upgrade: upgrade, stationBlock: stations, fiveYear: view, perRoomMonth: month, safeWater: safeWater,
      lead: leadStatement(calcRooms, pb, capex == null ? 0 : capex, service, safeWater, calcAll)
    };
  }

  return { build: build, cashPaysBack: cashPaysBack, cashShort: cashShort, listRate: listRate, priceSolutions: priceSolutions, serviceFor: serviceFor, fiveYear: fiveYear, perRoomMonth: perRoomMonth, leadStatement: leadStatement, VIEW_YEARS: VIEW_YEARS, SPREAD_YEARS: SPREAD_YEARS };
});
