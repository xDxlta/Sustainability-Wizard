/* Swisspro Hospitality price list (docs/Swisspro_Price_List.pdf) - the ONLY source for products,
 * product names and prices in the wizard.
 *
 * STATUS 2026-10-29: the PDF was not available in the build environment. The structure below is
 * ready for the Hospitality section to be transcribed line by line (name exactly as printed, price
 * as printed, area as the list assigns it: In-Room or F&B / Drinking Station). Until `items` holds
 * at least one product, the wizard names no Swisspro model and asks for proposal figures instead.
 *
 * The one line known from the project brief is the servicing line, kept here verbatim.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.pricelist = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var AREAS = { inRoom: 'In-Room', fnb: 'F&B / Drinking Station' };

  var pricelist = {
    source: {
      title: 'Swisspro Price List, Hospitality section',
      file: 'docs/Swisspro_Price_List.pdf',
      status: 'not-loaded',
      note: 'The PDF was not available when this version was built. Transcribe the Hospitality section into `items` below; do not add products from any other source.'
    },
    currency: {
      value: 'SGD', kind: 'assumption',
      note: 'The price list does not print a currency. Singapore dollars are assumed because Swisspro Pte Ltd is based in Singapore. Change here if the list is in another currency.'
    },
    areas: AREAS,
    /* One entry per Hospitality line. Tags drive the match to the hotel's answers:
       area: 'inRoom' | 'fnb'; temps: any of 'ambient','chilled','hot','sparkling'; mount: 'tap' | 'undercounter' | 'countertop' | 'builtin' | 'station'.
       Example (REMOVE once real lines are entered):
       { id: 'ir_example', area: 'inRoom', name: '<name exactly as printed>', price: 0, unit: 'per unit', temps: ['chilled'], mount: 'undercounter', page: 0 } */
    items: [],
    servicing: {
      id: 'superswiss_contract',
      name: 'Comprehensive SUPERSWISS Replacement, 2 or 3 Year Contract Price with labour and change of parts',
      price: 85.00,
      kind: 'sourced',
      source: 'Swisspro price list, Hospitality servicing line, as quoted in the project brief (29 Oct 2026)',
      reading: { kind: 'assumption', note: 'Read as the price per unit for one comprehensive replacement visit within a 2 or 3 year contract.' },
      intervalYears: { value: 2, kind: 'assumption', min: 1, max: 5, note: 'The line says "2 or 3 Year Contract" without stating the replacement interval. 2 years is assumed (the more expensive reading). Adjustable on the result page.' }
    }
  };

  function loaded() { return pricelist.items.length > 0; }

  /** Products of one area whose tags cover the required temperatures and, if given, the mount. */
  function match(area, requiredTemps, mount) {
    return pricelist.items.filter(function (it) {
      if (it.area !== area) return false;
      var temps = it.temps || [];
      var ok = (requiredTemps || []).every(function (t) { return temps.indexOf(t) >= 0; });
      if (mount && it.mount && it.mount !== mount) ok = false;
      return ok;
    });
  }

  /** Annual servicing cost per unit in the price list currency. */
  function servicingPerUnitPerYear(intervalYears) {
    var iv = intervalYears != null ? Number(intervalYears) : pricelist.servicing.intervalYears.value;
    if (!(iv > 0)) iv = pricelist.servicing.intervalYears.value;
    return pricelist.servicing.price / iv;
  }

  return { pricelist: pricelist, AREAS: AREAS, loaded: loaded, match: match, servicingPerUnitPerYear: servicingPerUnitPerYear };
});
