/* Swisspro hotel pipeline tool - economics of one hotel.
 *
 * No formula lives here. The figures are produced by the wizard's own modules (js/model.js, js/engine.js,
 * js/business.js, js/recommend.js) with the wizard's factors (js/factors.js) and price list (js/pricelist.js),
 * called exactly as the wizard calls them for a hotel that answers:
 *   plastic bottles in the rooms, "Not sure" for bottles (3 per occupied room-night), bottle size and price
 *   (typical price of the market), filtered water in the guest rooms, ambient.
 * The only CRM-specific input is the occupancy: the reference occupancy of the hotel's market from
 * crm/data/hotels_public.json, or the hotel's own figures when a wizard request is attached.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.CRM = root.CRM || {}; root.CRM.economics = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var COUNTRY_CODE = { Malaysia: 'MY', Indonesia: 'ID', Philippines: 'PH', Singapore: 'SG' };

  /** The wizard answers that stand for a hotel of the list. `request` holds the hotel's own figures (or null). */
  function answersFor(hotel, market, request) {
    var r = request || {};
    var a = {
      country: COUNTRY_CODE[hotel.country] || 'OTHER',
      rooms: hotel.rooms,
      occupancy: r.occupancy != null ? r.occupancy * 100 : market.occupancy_pct, // percent, as typed into the wizard
      current: 'pet_free',
      bottlesPerRoomNight: r.bottlesPerRoomNight != null ? String(r.bottlesPerRoomNight) : 'default',
      bottleSizeMl: 'default',
      priceBand: r.pricePerBottle != null ? 'custom' : 'unknown',
      areas: ['rooms'],
      temps: 'ambient'
    };
    if (r.pricePerBottle != null) a.priceCustom = r.pricePerBottle;
    return a;
  }

  /**
   * deps: { F, PL, M, E, R, B } = the wizard's factors, pricelist, model, engine, recommend, business modules.
   * Returns null when the hotel has no room count or no market reference.
   */
  function calculate(deps, hotel, market, request) {
    if (!hotel || !(hotel.rooms > 0) || !market || !(market.occupancy_pct > 0)) return null;
    var F = deps.F, PL = deps.PL, r = request || {};
    var answers = answersFor(hotel, market, request);
    var n = deps.M.normalise(F, answers, {});
    var calc = deps.E.calculate(F, n.inputs);
    var bc = deps.B.build({ F: F, PL: PL, R: deps.R, E: deps.E }, answers, {}, n.inputs, calc);
    var rooms = bc.calcRooms, be = {};
    bc.breakEven.forEach(function (b) { if (b) be[b.years] = b; });
    var typ = n.provenance.pricePerBottle;
    return {
      answers: answers,
      currency: n.inputs.currency, symbol: n.inputs.symbol, decimals: n.inputs.decimals,
      listCurrency: bc.rate.listCode, localPerList: bc.rate.localPerList,
      occupancy: n.inputs.occupancy,
      bottlesPerRoomNight: n.inputs.bottlesPerRoomNight,
      pricePerBottle: n.inputs.pricePerBottle,
      bottlesPerYear: rooms.bottles.total,
      spendLocal: rooms.spend.annualLocal,
      spendList: rooms.spend.annualLocal / bc.rate.localPerList,
      capexLocal: bc.capexLocal, serviceLocal: bc.servicingLocal,
      installationList: bc.base.capexList,           // rooms x list price of the basic in-room tap (SGD 160)
      serviceList: bc.servicingListPerYear,          // rooms x in-room service line (SGD 85)
      unitPriceList: bc.base.lines[0] ? bc.base.lines[0].product.price : null,
      servicePerRoomList: bc.inRoomPerYear,
      cashSavingsPerYear: bc.payback.cashSavingsPerYear,
      cashPaybackYears: bc.payback.cashPaybackYears,
      breakEven: be,                                  // { 2: {years, occupancy, reached}, 3: ..., 5: ... }
      source: {
        occupancy: r.occupancy != null ? { fromHotel: true, label: 'from the hotel' } : { fromHotel: false, label: market.source },
        bottlesPerRoomNight: r.bottlesPerRoomNight != null ? { fromHotel: true, label: 'from the hotel' } : { fromHotel: false, label: 'wizard factor: 3 per occupied room-night, from public hotel cases' },
        pricePerBottle: r.pricePerBottle != null ? { fromHotel: true, label: 'from the hotel' } : { fromHotel: false, label: 'wizard factor: typical price, ' + (typ && typ.note ? typ.note.split(':')[0] : 'median of the mass-market references') }
      },
      fromHotel: r.occupancy != null || r.bottlesPerRoomNight != null || r.pricePerBottle != null
    };
  }

  return { calculate: calculate, answersFor: answersFor, COUNTRY_CODE: COUNTRY_CODE };
});
