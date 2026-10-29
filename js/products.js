/* Swisspro product families as described on swissprowater.com (accessed 2026-10-29 via search excerpts).
 * Only features that appear on Swisspro's own pages are listed. Prices are NOT here: see pricing.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.products = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var P = {
    smart_tap: {
      id: 'smart_tap', name: 'SMART series - separate drinking-water tap', family: 'tap',
      areas: ['rooms'], temps: ['ambient'], finishes: ['chrome'], footprint: 'small',
      summary: 'A dedicated filtered-water tap with the 3-stage filter hidden under the counter. No electricity. Fits a minibar counter or a vanity where a second tap is acceptable.',
      facts: ['Separate drinking tap, chrome-plated brass (Swisspro shop listing)', 'Under-sink 3-stage filtration, no electricity (swissprowater.com/products/smart/)', '0.2-micron ceramic stage: Swisspro states it removes over 99.99% of microorganisms and bacteria (SAN/SMART pages)'],
      url: 'https://swissprowater.com/products/smart/'
    },
    san_tap: {
      id: 'san_tap', name: 'SAN series - all-in-one mixer with filtered outlet', family: 'tap',
      areas: ['rooms', 'boh'], temps: ['ambient'], finishes: ['chrome'], footprint: 'none',
      summary: 'Replaces the existing mixer tap: washing water and filtered drinking water from one fitting, so no extra hole is drilled. Suits bathroom vanities and pantry sinks.',
      facts: ['All-in-one kitchen mixer with a separate filtered-water outlet, no drilling (swissprowater.com/products/san/)', '3rd stage 0.2-micron ceramic filter that can be cleaned and reused'],
      url: 'https://swissprowater.com/products/san/'
    },
    minibar_station: {
      id: 'minibar_station', name: 'Minibar hot & cold station (CLIMA Piso V2 under-counter)', family: 'dispenser',
      areas: ['rooms'], temps: ['hot', 'cold', 'ambient'], finishes: ['white'], footprint: 'medium',
      summary: 'Self-serve hot and chilled filtered water at the minibar counter. The hotel\'s own glass carafe or bottle sits next to it. This is the set-up Swisspro installed at Fairmont Singapore (400+ rooms, 2019) and Pan Pacific Orchard (200+ rooms, 2023).',
      facts: ['Guestroom page: "minibar-mounted hot and cold station"', 'CLIMA Piso V2: undercounter, hot 5 L / cold 3 L tanks, ambient direct (swissprowater.com/products/clima-piso-v2/)', 'Fairmont South Tower minibar station: 400+ rooms, completed 2019; Pan Pacific Orchard: 200+ rooms, completed 2023'],
      url: 'https://swissprowater.com/projects/fairmont-south-tower-minibar-station/'
    },
    vida: {
      id: 'vida', name: 'CLIMA Vida compact countertop dispenser (Vida S with sparkling)', family: 'dispenser',
      areas: ['rooms', 'meetings', 'boh'], temps: ['hot', 'cold', 'ambient', 'sparkling'], finishes: ['black', 'white'], footprint: 'medium',
      summary: 'Compact countertop unit in black or white for rooms and small pantries; the Vida S version adds sparkling water.',
      facts: ['Hot up to 12 L/hr, cold up to 20 L/hr; black or white (swissprowater.com/products/clima-vida/)', 'CLIMA Vida S: hot, cold and sparkling (listed on the CLIMA Mesa V2 page)'],
      url: 'https://swissprowater.com/products/clima-vida/'
    },
    fontana: {
      id: 'fontana', name: 'FONTANA built-in dispenser (ambient, hot, cold, sparkling)', family: 'dispenser',
      areas: ['rooms', 'fnb'], temps: ['ambient', 'hot', 'cold', 'sparkling'], finishes: ['stainless'], footprint: 'built-in',
      summary: 'Built into the joinery of suites or a bar: four water types from one outlet with the filter concealed. The premium alternative to imported sparkling water.',
      facts: ['Built-in dispenser for ambient, hot, cold and sparkling water; 2-stage SuperSwiss filtration (0.2-micron ceramic + activated carbon block); 45 x 60 cm (swissprowater.com/products/fontana/)', 'Guestroom page: "sparkling water dispensers for suites"'],
      url: 'https://swissprowater.com/products/fontana/'
    },
    grande: {
      id: 'grande', name: 'CLIMA Grande heavy-duty dispenser', family: 'dispenser',
      areas: ['fnb', 'boh', 'meetings'], temps: ['hot', 'cold', 'ambient'], finishes: ['white'], footprint: 'large',
      summary: 'High-volume unit for kitchens, stewarding and banquet back-of-house: fills carafes and glass bottles quickly.',
      facts: ['Water capacity hot 15 L, cold 4 L, ambient 10 L; 29 L tank; 3-stage filtration with 0.2-micron ceramic stage (swissprowater.com/products/clima-grande/)'],
      url: 'https://swissprowater.com/products/clima-grande/'
    },
    mesa: {
      id: 'mesa', name: 'CLIMA Mesa V2 countertop / floor-standing dispenser', family: 'dispenser',
      areas: ['boh', 'meetings', 'public'], temps: ['hot', 'cold', 'ambient'], finishes: ['white'], footprint: 'medium',
      summary: 'Countertop or floor-standing hot/cold/ambient unit for staff areas, meeting-room pantries and gyms.',
      facts: ['Floor standing, white; hot 5 L, cold 1.7 L, ambient direct from mains; 6.7 L tank (swissprowater.com/products/clima-mesa-v2/)'],
      url: 'https://swissprowater.com/products/clima-mesa-v2/'
    },
    self_serve_station: {
      id: 'self_serve_station', name: 'Self-serve water station (hot, cold, still & sparkling)', family: 'station',
      areas: ['fnb', 'meetings', 'public'], temps: ['hot', 'cold', 'ambient', 'sparkling'], finishes: ['stainless'], footprint: 'large',
      summary: 'Guest-facing refill station for restaurants, pre-function areas, gyms and pools. Swisspro installed two at CLOVE buffet restaurant (Swissotel The Stamford) and a self-service station concept for Raffles City Convention Centre.',
      facts: ['CLOVE Buffet Restaurant: 2 self-serve stations providing hot, cold, still & sparkling drinking water (swissprowater.com/projects/clove-buffet-restaurant/)', 'Convention area page: "self-service filtration station outside meeting rooms"'],
      url: 'https://swissprowater.com/hospitality/convention-area/'
    },
    boh_refill: {
      id: 'boh_refill', name: 'Back-of-house refilling station for glass bottles', family: 'station',
      areas: ['meetings', 'fnb', 'boh'], temps: ['cold', 'ambient', 'sparkling'], finishes: ['stainless'], footprint: 'large',
      summary: 'A filtration unit in the banquet or stewarding area where staff fill the hotel\'s own glass bottles for ballrooms, meeting rooms and restaurants.',
      facts: ['Convention area page: "back-of-house unit for refilling glass bottles for ballrooms"'],
      url: 'https://swissprowater.com/hospitality/convention-area/'
    }
  };

  var FILTER = {
    standard: 'Swisspro 0.2-micron ceramic microfiltration + activated carbon (the filtration Swisspro lists for SAN, SMART, FONTANA and CLIMA Grande).',
    cdc: 'US CDC guidance: to remove bacteria a filter needs an absolute pore size of 0.3 micron or smaller; microfilters with absolute pore sizes of 0.1-0.4 micron are usually effective at removing bacteria; 1 micron or smaller removes Cryptosporidium and Giardia.',
    cdcUrl: 'https://www.cdc.gov/drinking-water/prevention/about-choosing-home-water-filters.html'
  };

  return { products: P, filter: FILTER };
});
