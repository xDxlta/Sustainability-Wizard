/* Swisspro Sustainability Wizard - calculation engine.
 *
 * Pure functions only. Every number that is not pure arithmetic comes from the
 * factor registry (js/factors.js), which carries a source or an explicit
 * "assumption" label for each value. Works in the browser (classic <script>,
 * exposes window.SW.engine) and in Node (CommonJS, for the tests).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.engine = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAYS_PER_YEAR = 365; // calendar fact

  function num(v, fallback) { var n = Number(v); return isFinite(n) ? n : fallback; }

  /** Read a factor value; throws if the registry lacks it so a typo cannot silently become 0. */
  function fv(F, key) {
    if (!F || !F.factors || !F.factors[key]) throw new Error('Missing factor: ' + key);
    return F.factors[key].value;
  }

  /** Weight (g) of an empty single-use PET bottle. Uses the sourced 500 ml value and the labelled scaling rule. */
  function petBottleWeightGrams(F, sizeMl) {
    var size = Math.max(100, num(sizeMl, 500));
    if (size === 500) return fv(F, 'pet_bottle_weight_500ml_g');
    return fv(F, 'pet_bottle_weight_500ml_g') * Math.pow(size / 500, fv(F, 'pet_bottle_weight_scaling'));
  }

  /** How many bottles the property consumes per year today. */
  function annualBottles(inp) {
    var rooms = Math.max(0, num(inp.rooms, 0));
    var occ = Math.min(1, Math.max(0, num(inp.occupancy, 0)));
    var perRoomNight = Math.max(0, num(inp.bottlesPerRoomNight, 0));
    var other = Math.max(0, num(inp.otherBottlesPerDay, 0));
    var occupiedRoomNights = rooms * occ * DAYS_PER_YEAR;
    var roomBottles = occupiedRoomNights * perRoomNight;
    var otherBottles = other * DAYS_PER_YEAR;
    return { occupiedRoomNights: occupiedRoomNights, roomBottles: roomBottles, otherBottles: otherBottles, total: roomBottles + otherBottles };
  }

  /**
   * Plastic and greenhouse-gas impact of the bottles avoided.
   * Only single-use PET is quantified. Glass (reusable or bought-in) has no sourced
   * weight/emission factor in the registry, so packaging and CO2e are reported as null.
   */
  function environmentalImpact(F, inp, bottles) {
    var sizeMl = num(inp.bottleSizeMl, 500);
    var litres = bottles.total * sizeMl / 1000;
    if (inp.bottleMaterial === 'glass') {
      return { material: 'glass', bottleWeightG: null, packagingKg: null, litres: litres, co2eKg: null, co2eCarKm: null, quantified: false };
    }
    var gPerBottle = inp.bottleWeightOverrideG != null ? Math.max(0, num(inp.bottleWeightOverrideG, 0)) : petBottleWeightGrams(F, sizeMl);
    var packagingKg = bottles.total * gPerBottle / 1000;
    var co2Kg = packagingKg * fv(F, 'co2e_kg_per_kg_pet');
    return {
      material: 'pet', bottleWeightG: gPerBottle, packagingKg: packagingKg, litres: litres,
      co2eKg: co2Kg, co2eCarKm: co2Kg / fv(F, 'co2e_kg_per_car_km'), quantified: true
    };
  }

  /** Money the hotel spends on bottled water today (local currency). */
  function spend(inp, bottles) {
    var price = Math.max(0, num(inp.pricePerBottle, 0));
    var annual = bottles.total * price;
    return { pricePerBottle: price, annualLocal: annual, annualUsd: annual * num(inp.usdPerLocal, 0) };
  }

  /** Housekeeping / stewarding time spent handling bottles. */
  function labour(F, inp, bottles) {
    var minPerRoomDay = Math.max(0, num(inp.minutesPerRoomPerDay, 0));
    var roomHours = bottles.occupiedRoomNights * minPerRoomDay / 60;
    var cartons = bottles.total / fv(F, 'bottles_per_carton');
    var cartonHours = cartons * Math.max(0, num(inp.minutesPerCarton, 0)) / 60;
    var hours = roomHours + cartonHours;
    var wage = Math.max(0, num(inp.wageHourly, 0));
    var costLocal = hours * wage;
    return {
      roomHours: roomHours, cartonHours: cartonHours, hours: hours,
      fteEquivalent: hours / fv(F, 'working_hours_per_fte_year'),
      wageHourly: wage, costLocal: costLocal, costUsd: costLocal * num(inp.usdPerLocal, 0), quantified: wage > 0
    };
  }

  /** Storage, deliveries and weight carried. */
  function logistics(F, inp, bottles) {
    var sizeMl = Math.max(100, num(inp.bottleSizeMl, 500));
    var perPallet = fv(F, 'bottles_per_pallet_500ml') * (500 / sizeMl); // scaled by volume (assumption, see factor note)
    var cartons = bottles.total / fv(F, 'bottles_per_carton');
    var pallets = bottles.total / perPallet;
    var stockWeeks = Math.max(0, num(inp.stockWeeks, 0));
    var peakPallets = pallets * stockWeeks / 52;
    var gPerBottle = inp.bottleMaterial === 'glass' ? 0 : petBottleWeightGrams(F, sizeMl); // glass weight unknown: water only (understates)
    var kgPerBottle = sizeMl / 1000 * fv(F, 'water_density_kg_per_l') + gPerBottle / 1000;
    return {
      cartonsPerYear: cartons, palletsPerYear: pallets, peakPallets: peakPallets,
      storageM2: peakPallets * fv(F, 'pallet_footprint_m2') * fv(F, 'storage_aisle_multiplier'),
      deliveriesPerYear: stockWeeks > 0 && bottles.total > 0 ? 52 / stockWeeks : 0,
      tonnesHandled: bottles.total * kgPerBottle / 1000, kgPerBottle: kgPerBottle
    };
  }

  /**
   * Payback. capex and annualService are in local currency (Swisspro quote, price-list
   * config or user entry). null capex means "no price available".
   */
  function payback(inp, sp, lab) {
    var capex = inp.capex == null ? null : Math.max(0, num(inp.capex, 0));
    var service = inp.annualService == null ? 0 : Math.max(0, num(inp.annualService, 0));
    var cash = sp.annualLocal - service;
    var full = sp.annualLocal + lab.costLocal - service;
    function years(s) { return capex == null ? null : (s > 0 ? capex / s : Infinity); }
    return {
      available: capex != null, capex: capex, annualService: service,
      cashSavingsPerYear: cash, fullSavingsPerYear: full,
      cashPaybackYears: years(cash), fullPaybackYears: years(full),
      fiveYearNetCash: capex == null ? null : cash * 5 - capex,
      fiveYearNetFull: capex == null ? null : full * 5 - capex
    };
  }

  /** Run everything. `F` is the factor registry, `inp` the normalised wizard inputs. */
  function calculate(F, inp) {
    var bottles = annualBottles(inp);
    var env = environmentalImpact(F, inp, bottles);
    var sp = spend(inp, bottles);
    var lab = labour(F, inp, bottles);
    var log = logistics(F, inp, bottles);
    return { inputs: inp, bottles: bottles, env: env, spend: sp, labour: lab, logistics: log, payback: payback(inp, sp, lab) };
  }

  return {
    DAYS_PER_YEAR: DAYS_PER_YEAR, petBottleWeightGrams: petBottleWeightGrams, annualBottles: annualBottles,
    environmentalImpact: environmentalImpact, spend: spend, labour: labour, logistics: logistics, payback: payback, calculate: calculate
  };
});
