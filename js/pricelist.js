/* Swisspro Hospitality price list (docs/Swisspro_Price_List.pdf, PDF dated 16 Sep 2026, prices excl. GST,
 * currency not printed). The ONLY source for products, product names and prices in the wizard.
 *
 * The Hospitality lines were transcribed verbatim from the list as provided by the project team on
 * 30 Oct 2026 (the PDF itself is not in the repository). `label` and `name` are the two text columns as
 * printed; `price` as printed. `temps` and `mount` are READINGS of the printed label (the words in
 * parentheses, or "tap" for SMART/SAN) and drive the match to the hotel's answers.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.pricelist = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var AREAS = { inRoom: 'In-Room', fnb: 'F&B / Drinking Station' };

  var pricelist = {
    leadEmail: 'info@swisspro.sg', // to be confirmed by Swisspro's sales manager
    leadEndpoint: '', // optional: URL that accepts a POST with the request as JSON (see docs/EMBED.md); empty = email draft
    source: {
      title: 'Swisspro Price List, Hospitality section',
      file: 'docs/Swisspro_Price_List.pdf',
      dated: '2026-09-16',
      status: 'loaded',
      note: 'Hospitality lines transcribed verbatim on 30 Oct 2026 from the list as provided by the project team. Prices excl. GST. The PDF is not in the repository; place it at docs/Swisspro_Price_List.pdf for reference.'
    },
    currency: {
      value: 'SGD', kind: 'assumption',
      note: 'The price list does not print a currency. Singapore dollars are assumed because Swisspro Pte Ltd is based in Singapore. Change here if the list is in another currency.'
    },
    areas: AREAS,
    /* PRODUCT lines. area: 'inRoom' = "PRODUCT (In-Room)", 'fnb' = "PRODUCT (F&B, Drinking Station)". */
    items: [
      { id: 'ir_smart_plus', area: 'inRoom', label: 'SMART Classic+', name: 'SWISPRO SMART CLASSIC N PLUS (SUPERSWISS PNP)', price: 140.00, temps: ['ambient'], mount: 'tap', reading: 'no water type printed; a filtered tap gives ambient water' },
      { id: 'ir_san_plus', area: 'inRoom', label: 'SAN Classic+', name: 'SWISPRO SAN CLASSIC PLUS (SUPERSWISS PNP)', price: 350.00, temps: ['ambient'], mount: 'tap', reading: 'no water type printed; a filtered tap gives ambient water' },
      { id: 'ir_unico_plus', area: 'inRoom', label: 'CLIMA Unico+ (Hot, Ambient)', name: 'SWISPRO CLIMA UNICO PLUS (SUPERSWISS PNP)', price: 780.00, temps: ['hot', 'ambient'], mount: null },
      { id: 'ir_versa_plus', area: 'inRoom', label: 'CLIMA Versa+ (Hot, Cold)', name: 'SWISPRO CLIMA VERSA PLUS (SUPERSWISS PNP)', price: 980.00, temps: ['hot', 'cold'], mount: null },
      { id: 'fb_smart', area: 'fnb', label: 'SMART Classic', name: 'SWISPRO SMART CLASSIC N with 3 Stage', price: 350.00, temps: ['ambient'], mount: 'tap', reading: 'no water type printed; a filtered tap gives ambient water' },
      { id: 'fb_unico', area: 'fnb', label: 'CLIMA Unico (Hot, Ambient)', name: 'SWISPRO CLIMA UNICO with 3 Stage', price: 750.00, temps: ['hot', 'ambient'], mount: null },
      { id: 'fb_versa', area: 'fnb', label: 'CLIMA Versa (Hot, Cold)', name: 'SWISPRO CLIMA VERSA with 3 Stage', price: 890.00, temps: ['hot', 'cold'], mount: null },
      { id: 'fb_mesa', area: 'fnb', label: 'CLIMA Mesa (Hot, Cold, Ambient)', name: 'SWISPRO CLIMA MESAV2 with 3 Stage Filtration', price: 1299.00, temps: ['hot', 'cold', 'ambient'], mount: null },
      { id: 'fb_piso', area: 'fnb', label: 'CLIMA Piso (Hot, Cold, Ambient)', name: 'SWISPRO CLIMA PISOV2 with 3 Stage Filtration', price: 1399.00, temps: ['hot', 'cold', 'ambient'], mount: null },
      { id: 'fb_vida', area: 'fnb', label: 'CLIMA Vida (Hot, Cold, Ambient)', name: 'SWISPRO CLIMA VIDA with 3 Stage', price: 1399.00, temps: ['hot', 'cold', 'ambient'], mount: null },
      { id: 'fb_vida_s', area: 'fnb', label: 'CLIMA Vida S (Hot, Cold, Sparkling)', name: 'SWISPRO CLIMA VIDA S with 3 Stage', price: 1599.00, temps: ['hot', 'cold', 'sparkling'], mount: null },
      { id: 'fb_triple_tap', area: 'fnb', label: 'Triple Tap + Icebank (90L/hr)', name: 'Triple Tap with 3 stage', price: 5999.00, temps: [], mount: 'station', comment: 'New Product', reading: 'water types not printed; listed only when no other station fits' }
    ],
    /* SERVICING lines. */
    servicing: {
      inRoom: [
        { id: 'sv_ir_comprehensive', label: 'Comprehensive - SUPERSWISS Replacement', name: '2 or 3 Year Contract Price with labour and change of parts', price: 85.00, comment: 'Original Price average' },
        { id: 'sv_ir_alacarte', label: 'Ala-Carte - SUPERSWISS Replacement', name: 'Delivery of SUPERSWISS Replacement to site only', price: 70.00 },
        { id: 'sv_ir_upgrade', label: 'UPGRADE Comprehensive - SUPERSWISS', name: '3 Year Contract Price with labour and change of parts + free faucet', price: 90.00 }
      ],
      fnb: [
        { id: 'sv_fb_alacarte', label: '3 STAGE REPLACEMENT (Ala Carte)', name: 'Replace CleanswissP, Carboswiss, Clean/Replace Ceraswiss', price: 80.00 },
        { id: 'sv_fb_quarterly', label: '3 STAGE REPLACEMENT (Quarterly)', name: '4x Replace CleanswissP, Carboswiss, Clean/Replace Ceraswiss', price: 350.00 }
      ],
      /* The 85.00 line does not state its interval. Three readings; the first is the default (most conservative). */
      readings: [
        { id: 'perYear', label: 'One filter change per room and year', note: 'Default. One change per room and year, as in the Westin Singapore case computed with Swisspro (Final Presentation 2024, p. 13 and p. 44), at the comprehensive price with labour and parts.' },
        { id: 'perContract2y', label: 'Per unit and 2-year contract', note: 'Reads "2 or 3 Year Contract Price" as the price of the whole contract.' },
        { id: 'perChange', label: 'Per filter change (change every 9 months)', note: 'The residential section of the price list names a SUPERSWISS replacement every 9 months (reported by the project team, 30 Oct 2026, line not transcribed). Least favourable reading.' }
      ],
      defaultReading: 'perYear',
      changeIntervalMonths: { value: 9, kind: 'sourced', status: 'team-reported', note: 'Replacement interval named in the residential section of the price list, as reported by the project team on 30 Oct 2026; the line itself was not transcribed. Adjustable.' },
      fnbPerStationPerYear: { itemId: 'sv_fb_quarterly', note: 'The quarterly line states 4 replacements per year, so it is a yearly price per station.' }
    }
  };

  function loaded() { return pricelist.items.length > 0; }
  function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }

  /** Products of one area whose printed water types cover every required one (sorted by price). */
  function match(area, requiredTemps, mount) {
    return pricelist.items.filter(function (it) {
      if (it.area !== area) return false;
      var temps = it.temps || [];
      var ok = (requiredTemps || []).every(function (t) { return temps.indexOf(t) >= 0; });
      if (mount && it.mount && it.mount !== mount) ok = false;
      return ok;
    }).sort(function (a, b) { return a.price - b.price; });
  }
  function areaItems(area) { return pricelist.items.filter(function (it) { return it.area === area; }).sort(function (a, b) { return a.price - b.price; }); }

  /** In-room servicing per unit per year in the list currency for a reading. */
  function inRoomServicePerYear(readingId, changeMonths) {
    var line = byId(pricelist.servicing.inRoom, 'sv_ir_comprehensive').price;
    var months = changeMonths != null && Number(changeMonths) > 0 ? Number(changeMonths) : pricelist.servicing.changeIntervalMonths.value;
    switch (readingId || pricelist.servicing.defaultReading) {
      case 'perYear': return line;
      case 'perContract2y': return line / 2;
      default: return line * 12 / months;
    }
  }
  /** Station servicing per unit per year (the quarterly line). */
  function stationServicePerYear() { return byId(pricelist.servicing.fnb, pricelist.servicing.fnbPerStationPerYear.itemId).price; }

  return { pricelist: pricelist, leadEmail: pricelist.leadEmail, leadEndpoint: pricelist.leadEndpoint, AREAS: AREAS, loaded: loaded, match: match, areaItems: areaItems, inRoomServicePerYear: inRoomServicePerYear, stationServicePerYear: stationServicePerYear, byId: byId };
});
