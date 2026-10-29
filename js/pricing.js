/* Swisspro pricing configuration.
 *
 * STATUS: the hotel price list was not available when this file was written. The only
 * published Swisspro prices found are the RETAIL prices of the residential range on
 * Swisspro's online store (SGD, accessed 2026-10-29). They are kept here, clearly labelled,
 * so the payback section can show a ballpark. Replace `hotel` with the price list before
 * putting the wizard on the website; the UI switches automatically when `hotel.enabled` is true.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.pricing = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    leadEmail: 'info@swisspro.sg',          // confirm with Swisspro's sales manager
    formEndpoint: '',                        // optional: a Formspree/Netlify/own endpoint that receives the lead JSON

    /* Retail reference (residential range, Swisspro Singapore online store). */
    retail: {
      enabled: true,
      currency: 'SGD',
      kind: 'sourced',
      label: 'Swisspro online-store retail prices (residential range) - NOT hotel project pricing',
      url: 'https://swisspro-singapore.myshopify.com/collections/all',
      accessed: '2026-10-29',
      items: {
        smart_tap:        { price: 1499, note: 'SMART Classic - separate drinking tap (chrome-plated brass) with water filtration' },
        san_tap:          { price: 1899, note: 'SAN Classic - all-in-one faucet (chrome-plated brass) with water filtration' },
        fontana:          { price: 5999, note: 'CLIMA Fontana - built-in dispenser with hot, cold, ambient & sparkling' },
        minibar_station:  { price: null, note: 'CLIMA Piso V2 under-counter hot & cold: no price published' },
        vida:             { price: null, note: 'CLIMA Vida: no price published' },
        grande:           { price: null, note: 'CLIMA Grande: no price published' },
        mesa:             { price: null, note: 'CLIMA Mesa: no price published' },
        self_serve_station: { price: null, note: 'Project item: quote required' },
        boh_refill:       { price: null, note: 'Project item: quote required' }
      },
      filterSets: {
        threeStage: { price: 53.00 + 149.40 + 222.00, note: '1st step CleanSwissP S$53.00 + 2nd step CarboSwiss S$149.40 + 3rd step CeraSwiss S$222.00' },
        superSwiss: { price: 252.30, note: '2-in-1 SuperSwiss filter S$252.30' }
      }
    },

    /* Hotel price list - TO BE FILLED FROM SWISSPRO'S PRICE LIST. Prices per installed unit in the listed currency.
       serviceAnnual = yearly service-contract fee per unit (filter changes included). */
    hotel: {
      enabled: false,
      currency: 'SGD',
      label: 'Swisspro hotel price list',
      validFrom: null,
      items: {
        smart_tap:          { unit: null, install: null, serviceAnnual: null },
        san_tap:            { unit: null, install: null, serviceAnnual: null },
        minibar_station:    { unit: null, install: null, serviceAnnual: null },
        vida:               { unit: null, install: null, serviceAnnual: null },
        fontana:            { unit: null, install: null, serviceAnnual: null },
        grande:             { unit: null, install: null, serviceAnnual: null },
        mesa:               { unit: null, install: null, serviceAnnual: null },
        self_serve_station: { unit: null, install: null, serviceAnnual: null },
        boh_refill:         { unit: null, install: null, serviceAnnual: null }
      }
    }
  };
});
