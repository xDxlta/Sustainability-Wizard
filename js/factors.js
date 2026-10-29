/* Swisspro Sustainability Wizard - factor registry.
 *
 * EVERY number the calculator uses lives here with a provenance label:
 *   kind: 'sourced'            value read from the cited page (via a search-engine excerpt of that page;
 *                              direct page access was not available when this registry was built,
 *                              so each link should be re-opened once before the tool goes live)
 *   kind: 'sourced-secondary'  the official publication could not be read; value quoted by a third party
 *   kind: 'derived'            pure arithmetic on sourced values (the formula is stated)
 *   kind: 'assumption'         no source found; the value is an explicit, editable modelling assumption
 *   kind: 'constant'           physical or calendar constant
 *
 * The wizard shows the label next to every figure. Change values here, never in the UI code.
 * Accessed: 2026-10-29 unless stated otherwise.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.factors = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ACCESSED = '2026-10-29';

  var factors = {
    /* ------------------------------------------------------------------ packaging */
    pet_bottle_weight_500ml_g: {
      value: 9.89, unit: 'g per empty 500 ml (16.9 oz) PET bottle', kind: 'sourced',
      label: 'Average weight of an empty 500 ml PET water bottle',
      source: {
        publisher: 'International Bottled Water Association (IBWA), citing Beverage Marketing Corporation',
        title: 'Bottled water container weight (2000-2014)',
        url: 'https://bottledwater.org/?p=652',
        quote: 'the average 16.9-ounce PET bottle fell 48 percent to 9.89 grams between 2000 and 2014',
        year: '2014 data', accessed: ACCESSED
      },
      note: 'US industry average and therefore a LIGHT bottle. Many bottles sold in South-East Asia weigh 12-18 g, so the plastic figure is conservative. A later IBWA release revised the same series to 9.25 g; the higher-weight 9.89 g value is kept only because it is the figure quoted in IBWA testimony to the US Congress.'
    },
    pet_bottle_weight_scaling: {
      value: 2 / 3, unit: 'exponent', kind: 'assumption',
      label: 'Scaling of bottle weight to other sizes',
      note: 'No sourced weights were found for 330 ml, 600 ml, 1 L or 1.5 L water bottles. Their weight is derived from the 500 ml value as 9.89 g x (size / 500 ml)^(2/3), i.e. wall area grows slower than volume. Blog-grade ranges (1 L: 20-24 g, 1.5 L: 30-45 g) are higher than the derived 15.7 g and 20.6 g, so the derivation understates plastic for large bottles.'
    },
    co2e_kg_per_kg_pet: {
      value: 3.86158, unit: 'kg CO2e per kg PET (primary material production, incl. forming)', kind: 'sourced-secondary',
      label: 'Greenhouse-gas factor for virgin PET',
      source: {
        publisher: 'UK Government (DESNZ/DEFRA), Greenhouse gas reporting: conversion factors - as quoted by GreenCalculus',
        title: 'Material use: Plastics - PET (incl. forming), primary material production',
        url: 'https://greencalculus.com/data/defra-emission-factors/',
        quote: 'PET primary production value of 3861.58251 kg CO2e per tonne, with a closed-loop figure of 2211.58251',
        year: '2025/2026 factor set (third-party table)', accessed: ACCESSED
      },
      note: 'Official page: https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025 (could not be opened from the build environment). Other third-party quotes of the same factor range from 3,121 to 4,032 kg CO2e/t depending on edition. Cradle-to-gate only: transport, chilling and end-of-life of the bottles are NOT included, nor is the electricity of the filtration unit.'
    },
    co2e_kg_per_car_km: {
      value: 0.16272, unit: 'kg CO2e per km, average petrol car', kind: 'sourced-secondary',
      label: 'Car-kilometre equivalence factor',
      source: {
        publisher: 'UK Government GHG conversion factors 2025 - as quoted by GreenCalculus',
        title: 'Average car, petrol (kg CO2e per km)',
        url: 'https://greencalculus.com/guides/defra-conversion-factors-what-changed/',
        quote: 'Average car, petrol ... kg CO2e per km | 0.16272',
        year: '2025 factor set', accessed: ACCESSED
      },
      note: 'Used only to translate tonnes of CO2e into something tangible.'
    },

    /* ------------------------------------------------------------------ logistics */
    bottles_per_carton: {
      value: 24, unit: 'bottles per carton (500 ml)', kind: 'sourced',
      label: 'Bottles per carton',
      source: {
        publisher: 'Nestle Pure Life (water.com) / Cactus & Desa (Malaysia) / Wilkins & Absolute (Philippines) listings',
        title: '24-bottle cartons of 500 ml water',
        url: 'https://www.water.com/fr-ca/product/pure-life-water-plastic-bottle-16-oz-24-pack-pallet/',
        quote: 'packs of 24 ... 78 cases, or 1,872 bottles, per pallet',
        year: 'undated listing', accessed: ACCESSED
      }
    },
    bottles_per_pallet_500ml: {
      value: 1872, unit: 'bottles (500 ml) per pallet', kind: 'sourced',
      label: 'Bottles per pallet',
      source: {
        publisher: 'water.com (Nestle Pure Life)',
        title: 'Pure Life water 16.9 oz 24-pack pallet',
        url: 'https://www.water.com/fr-ca/product/pure-life-water-plastic-bottle-16-oz-24-pack-pallet/',
        quote: '78 cases, or 1,872 bottles, per pallet',
        year: 'undated listing', accessed: ACCESSED
      },
      note: 'Costco/Niagara list 1,920 (48 cases x 40). For other bottle sizes the count is scaled by volume (assumption).'
    },
    pallet_footprint_m2: {
      value: 1.2, unit: 'm2 per pallet (1200 x 1000 mm)', kind: 'sourced',
      label: 'Pallet footprint',
      source: {
        publisher: 'Pallet Gauge',
        title: 'Pallet size comparison',
        url: 'https://palletgauge.com/pallet-size-comparison',
        quote: '1200 x 1000 mm - 1.200 m2',
        year: 'undated', accessed: ACCESSED
      }
    },
    storage_aisle_multiplier: {
      value: 1, unit: 'x', kind: 'assumption',
      label: 'Storage area multiplier',
      note: 'Pallet footprint only. A real store needs aisles and access; set to 1.5-2.5 for a realistic floor-area figure.'
    },
    stock_weeks_default: {
      value: 2, unit: 'weeks of bottled water kept in stock', kind: 'assumption',
      label: 'Stock on hand',
      note: 'Determines the peak number of pallets in the store. Adjustable in the results page.'
    },
    water_density_kg_per_l: { value: 1, unit: 'kg per litre', kind: 'constant', label: 'Density of water' },

    /* ------------------------------------------------------------------ labour */
    working_hours_per_fte_year: {
      value: 2080, unit: 'hours per full-time employee per year', kind: 'assumption',
      label: 'Hours per full-time equivalent',
      note: '40 hours x 52 weeks. Used only to express housekeeping hours as FTEs and to convert monthly wages to hourly (2080 / 12 = 173.3 h per month). Statutory weeks in the region are 40-45 h; a longer week would lower the hourly rate slightly.'
    },
    minutes_per_room_per_day_default: {
      value: 1, unit: 'minutes of housekeeping time per occupied room per day', kind: 'assumption',
      label: 'Bottle handling time per occupied room',
      note: 'No published figure exists. Covers restocking bottles from the trolley, removing empties and reloading the trolley. Adjustable (0.5-3 min). Does not include guest requests for extra water.'
    },
    minutes_per_carton_default: {
      value: 2, unit: 'minutes of receiving / storing / distributing time per carton', kind: 'assumption',
      label: 'Handling time per carton',
      note: 'Receiving the delivery, moving cartons to the store and up to floor pantries, breaking cartons and disposing of shrink-wrap. Adjustable.'
    },
    bottles_per_room_night_default: {
      value: 2, unit: 'complimentary bottles per occupied room per night', kind: 'assumption',
      label: 'Bottles per occupied room-night',
      note: 'Industry case studies describe "two bottles a night" (Aquablu, Sheraton Brussels Airport) and "two 750 ml bottles per room per day" (Topia Water model). Fairmont Singapore and Swissotel The Stamford report avoiding 1.5 million bottles a year across 2,030 rooms (about 2 per room per day). Sources: https://www.aquablu.com/stories/the-future-of-hospitality-embracing-sustainability-in-hotels , https://topiawater.com/case-study-streamline-200/ , https://www.swissotel-singapore-stamford.com/the-hotel/blog/sustainability-at-fairmont-singapore-swissotel-the-stamford/'
    },

    /* ------------------------------------------------------------------ pricing (Swisspro) */
    filter_sets_per_unit_per_year: {
      value: 1, unit: 'replacement filter sets per unit per year', kind: 'assumption',
      label: 'Filter replacement frequency',
      note: 'Swisspro did not publish change intervals on the pages found. Replace with the service-contract terms from the price list.'
    }
  };

  /* --------------------------------------------------------------------- markets */
  var countries = {
    SG: {
      code: 'SG', name: 'Singapore', currency: 'SGD', symbol: 'S$', decimals: 2,
      fx: { value: 1 / 1.28025, unit: 'USD per SGD', kind: 'sourced',
        source: { publisher: 'MTFX (historical USD/SGD)', url: 'https://www.mtfxgroup.com/tools/historical-currency-exchange-rates/usd-to-sgd-rate/', quote: '1 USD = 1.28025 SGD on October 26, 2026', year: '2026-10-26', accessed: ACCESSED } },
      occupancy: { value: 0.819, unit: 'average hotel occupancy 2025', kind: 'sourced',
        source: { publisher: 'Singapore Tourism Board', title: 'Record Singapore tourism receipts from January to September 2025 (media release, 3 Feb 2026)', url: 'https://www.stb.gov.sg/about-stb/media-publications/media-centre/record-singapore-tourism-receipts-from-january-to-september-2025/', quote: 'hotel occupancy of 81.9% for 2025, up from 81.4% in 2024', year: '2025', accessed: ACCESSED } },
      wageMonthly: { value: 1910, unit: 'SGD per month, basic wage', kind: 'sourced',
        label: 'Progressive Wage Model, General/Indoor Cleaner (proxy for room attendant)',
        source: { publisher: 'Ministry of Manpower Singapore', title: 'Progressive Wage Model - cleaning sector', url: 'https://www.mom.gov.sg/employment-practices/progressive-wage-model/cleaning-sector', quote: 'General Cleaner Indoor Cleaner ... $1,910 (from 1 July 2025)', year: '2025-26', accessed: ACCESSED },
        note: 'Hotel room attendants are not covered by the cleaning-sector PWM; this is the lowest defensible proxy. MOM Occupational Wages June 2024 put the median gross wage of a "housekeeper (hotels and other establishments)" at S$3,233 per month.' },
      bottlePrices: [
        { id: 'local', label: 'Local brand, bought by the carton', price: 8.64 / 24, kind: 'sourced', ref: 'Pere Ocean natural mineral water 24 x 500 ml, S$8.64 incl. GST', url: 'https://www.pereocean.com/pere-ocean-natural-mineral-water-500ml' },
        { id: 'premium', label: 'Premium imported brand', price: 34.95 / 24, kind: 'sourced', ref: 'Evian 24 x 500 ml, S$34.95 (promotional; regular S$56.40) at FairPrice', url: 'https://www.fairprice.com.sg/category/mineral-water' }
      ],
      context: [
        { text: 'Singapore\'s Hotel Sustainability Roadmap (STB/SHA, 2022) targets 60% of hotel room stock holding an internationally recognised sustainability certification by 2025, and its measures list an in-room filtration tap.', url: 'https://www.stb.gov.sg/about-stb/media-publications/media-centre/launch-of-the-hotel-sustainability-roadmap-by-stb-and-sha/' }
      ]
    },
    MY: {
      code: 'MY', name: 'Malaysia', currency: 'MYR', symbol: 'RM', decimals: 2,
      fx: { value: 1 / 4.0745, unit: 'USD per MYR', kind: 'sourced',
        source: { publisher: 'Malay Mail / Bernama', url: 'https://malaymail.com/news/money/2026/10/28/ringgit-ends-higher-against-greenback-on-confidence-in-malaysias-fundamentals/241025', quote: 'rose to 4.0745/0790 against the US dollar', year: '2026-10-28', accessed: ACCESSED } },
      occupancy: { value: 0.568, unit: 'average occupancy rate, paid accommodation, 2025', kind: 'sourced',
        source: { publisher: 'Tourism Malaysia', title: 'Paid Accommodation Survey performance January-December 2025 (infographic)', url: 'https://data.tourism.gov.my/frontend/pdf/Infographic_paid_accommodation_performance_jan-dec2025.pdf', quote: 'Malaysia 2025 - 56.8%, 2024 - 54.9%', year: '2025', accessed: ACCESSED } },
      wageMonthly: { value: 1700, unit: 'MYR per month', kind: 'sourced',
        label: 'National minimum wage (Minimum Wages Order 2024)',
        source: { publisher: 'Skrine (law firm) summarising the Minimum Wages Order 2024, gazetted 4 Dec 2024', url: 'https://www.skrine.com/insights/alerts/december-2024/minimum-wages-order-2024-gazetted', quote: 'Employers with fewer than five staff ... had until 1 August 2025 to move to RM1,700', year: '2025', accessed: ACCESSED },
        note: 'Statutory floor; hotel housekeeping wages are usually above it, so the labour value is conservative.' },
      bottlePrices: [
        { id: 'local', label: 'Local brand, bought by the carton', price: 14.60 / 24, kind: 'sourced', ref: 'Desa mineral water 24 x 500 ml, RM14.60 (Ace Water price list)', url: 'https://acewater.my/price-list-2/' },
        { id: 'mid', label: 'National brand, bought by the carton', price: 15.95 / 24, kind: 'sourced', ref: 'Cactus mineral water 24 x 500 ml, RM15.95 (Food Service Malaysia)', url: 'https://www.foodservicemalaysia.com/ourproducts/cid/277768/cat/beverage-water/' }
      ],
      context: [
        { text: 'Malaysia Roadmap Towards Zero Single-Use Plastics 2018-2030 sets the vision of "zero single-use plastics for a cleaner and healthier environment in Malaysia by 2030".', url: 'https://www.pmo.gov.my/wp-content/uploads/2019/07/Malaysia-Roadmap-Towards-Zero-Single-Use-Plastics-2018-2030-m-min.pdf' },
        { text: 'Halal certification of water filtration products by JAKIM is established practice in Malaysia (e.g. Coway: "all water purifier products are certified Halal by the Department of Islamic Development Malaysia (JAKIM)").', url: 'https://www.coway.com.my/halal' }
      ]
    },
    ID: {
      code: 'ID', name: 'Indonesia', currency: 'IDR', symbol: 'Rp', decimals: 0,
      fx: { value: 1 / 18147.4, unit: 'USD per IDR', kind: 'sourced',
        source: { publisher: 'Morningstar currencies', url: 'https://www.morningstar.com/markets/currencies', quote: 'Indonesian Rupiah USD-IDR 18,147.4000 as of October 26', year: '2026-10-26', accessed: ACCESSED } },
      occupancy: { value: 0.4866, unit: 'star-rated hotel room occupancy (TPK), Jan-Nov 2025 cumulative', kind: 'sourced',
        source: { publisher: 'BPS - Statistics Indonesia, reported by Bisnis.com', url: 'https://ekonomi.bisnis.com/read/20260105/12/1941619/okupansi-hotel-berbintang-masih-turun-107-yoy-per-november-2025', quote: 'Secara kumulatif Januari hingga November 2025, BPS mencatat TPK hotel bintang sebesar 48,66%', year: '2025 (Jan-Nov)', accessed: ACCESSED },
        note: 'Full-year 2025 figure not retrievable; December 2025 alone was 56.12% (BPS release 2 Feb 2026).' },
      wageMonthly: { value: 2996561, unit: 'IDR per month', kind: 'sourced',
        label: 'Provincial minimum wage (UMP) Bali 2025',
        source: { publisher: 'Hukumonline (UMP 2025 list)', url: 'https://www.hukumonline.com/berita/a/ump-2025-se-Indonesia-lt68d3bc774d628/', quote: 'Bali Rp2.996.561 (naik Rp179.889 dibandingkan UMP 2024)', year: '2025', accessed: ACCESSED },
        note: 'Bali is used because it is the largest resort market. DKI Jakarta UMP 2025 is Rp5,396,761 (beritajakarta.id). Adjust in the results page for other provinces.' },
      bottlePrices: [
        { id: 'local', label: 'National brand (Aqua 600 ml), bought by the carton', price: 66718 / 24, kind: 'sourced', ref: 'Aqua 600 ml x 24, average marketplace price Rp66,718 per carton (Blibli)', url: 'https://www.blibli.com/jual/akua-600-ml-per-dus' },
        { id: 'budget', label: 'Cheapest marketplace carton', price: 51000 / 24, kind: 'sourced', ref: 'Aqua 600 ml x 24, lowest listed Rp51,000 per carton (Blibli)', url: 'https://www.blibli.com/jual/akua-600-ml-per-dus' }
      ],
      context: [
        { text: 'Bali Circular Letter 9 of 2025 (Governor Koster, April 2025) bans producing, distributing and selling single-use plastic bottled water under one litre.', url: 'https://www.socialexpat.net/bali-governor-bans-single-use-plastic-bottled-water-under-one-litre/' },
        { text: 'A 2024 peer-reviewed study of PDAM piped water in three Indonesian cities found "sporadic microbial contamination ... due to the depletion of residual chlorine" - a reason to specify a bacteria-retaining (0.2 micron) filter.', url: 'https://ideas.repec.org/a/gam/jsusta/v16y2024i16p7082-d1458770.html' }
      ]
    },
    PH: {
      code: 'PH', name: 'Philippines', currency: 'PHP', symbol: '₱', decimals: 2,
      fx: { value: 1 / 63.453, unit: 'USD per PHP', kind: 'sourced',
        source: { publisher: 'Bangko Sentral ng Pilipinas reference rate (via taxcalculator.com.ph)', url: 'https://taxcalculator.com.ph/exchange-rates', quote: 'US$1 = ₱63.4530 on the bulletin of 26 October 2026', year: '2026-10-26', accessed: ACCESSED } },
      occupancy: { value: 0.60, unit: 'average hotel occupancy 2025', kind: 'sourced',
        source: { publisher: 'Leechiu Property Consultants, reported by BusinessWorld', url: 'https://www.bworldonline.com/?p=743528', quote: 'Hotel occupancy in 2025 remained at 60%, flat year on year, and still below the 68% recorded in 2019', year: '2025', accessed: ACCESSED },
        note: 'Private consultancy figure; no official DOT/PSA national series was found. Metro Manila H1 2025: 64%.' },
      wageMonthly: { value: 695 * 2080 / 12 / 8, unit: 'PHP per month (derived from ₱695 per day x 8 h)', kind: 'derived',
        label: 'NCR daily minimum wage, non-agriculture (Wage Order NCR-26)',
        source: { publisher: 'Philippine News Agency', url: 'https://www.pna.gov.ph/articles/1254675', quote: 'Wage Order NCR-26 raised the non-agriculture daily minimum in Metro Manila from ₱645 to ₱695, and the ₱50 increase took effect July 18, 2025', year: '2025', accessed: ACCESSED },
        note: 'Monthly value = 695 / 8 h x 2080 h / 12. Regional wage boards outside NCR are lower.' },
      bottlePrices: [
        { id: 'local', label: 'National brand (Absolute), bought by the case', price: 334.57 / 24, kind: 'sourced', ref: 'Absolute distilled water 500 ml x 24, ₱334.57 per case (MerryMart Wholesale)', url: 'https://www.merrymartwholesale.com/products/absolute-distilled-water-500ml-1-case-includes-24-pcs-500ml' },
        { id: 'mid', label: 'National brand (Wilkins), bought by the case', price: 366.17 / 24, kind: 'sourced', ref: 'Wilkins distilled water 500 ml x 24, ₱366.17 per case (MerryMart Wholesale)', url: 'https://www.merrymartwholesale.com/products/wilkins-distilled-500ml-1-case-includes-24pcs-500ml' }
      ],
      context: [
        { text: 'Republic Act 11898 (Extended Producer Responsibility Act of 2022) obliges large enterprises to recover plastic packaging: 50% of the 2025 footprint, rising to 80% from 2028.', url: 'https://lawphil.net/statutes/repacts/ra2022/ra_11898_2022.html' },
        { text: 'Boracay (Malay, Aklan) Municipal Ordinance No. 386 s. 2018 "prohibits the use of single-use or disposable plastic items by hotels, resorts, restaurants and establishments in the accommodation business".', url: 'https://denr.gov.ph/news-events/denr-backs-ordinance-banning-single-use-plastics-in-boracay/' }
      ]
    },
    OTHER: {
      code: 'OTHER', name: 'Other Asia-Pacific market', currency: 'USD', symbol: 'US$', decimals: 2,
      fx: { value: 1, unit: 'USD per USD', kind: 'constant' },
      occupancy: { value: (0.819 + 0.568 + 0.4866 + 0.60) / 4, unit: 'average of the four core markets', kind: 'derived',
        note: 'Simple average of the Singapore, Malaysia, Indonesia and Philippines figures above.' },
      wageMonthly: { value: 0, unit: 'USD per month', kind: 'assumption', label: 'No wage reference - enter your own', note: 'Labour is shown in hours only until a wage is entered.' },
      bottlePrices: [],
      context: []
    }
  };

  /* Interview statements used as qualitative inputs (not numbers). */
  var interview = {
    source: 'Interview with Marriott International\'s VP Procurement APAC, October 2026 (project source, unpublished)',
    points: [
      'Decision drivers in order: 1) ROI ("owners challenge the payback"), 2) efficiency and guest experience (water 24/7, no waiting for housekeeping, one SKU less, no storage, no heavy trolleys), 3) sustainability ("if you put it as the main criteria for change, it\'s very, very hard to convince").',
      'Approval limits vary: some management agreements require owner approval above USD 5,000; others let the GM decide up to USD 50,000.',
      'Missing in the market: choosing the right filter grade for local water quality and volume; choosing the device (look, colour, space, temperatures).',
      'Luxury is cosmetic and guest-experience driven and may keep premium mineral water; select and premium tiers are straightforward.',
      'Triggers: Green Globe certification (no single-use bottles allowed), Forbes and LQA audits in luxury (points lost for single-use bottles), cost and efficiency; a renovation is an enabler.',
      'A tap at the bathroom vanity next to the basin and water stations in corridors are both disliked by guests.'
    ]
  };

  var swissproSources = {
    guestroom: 'https://swissprowater.com/hospitality/guestroom/',
    convention: 'https://swissprowater.com/hospitality/convention-area/',
    projects: 'https://swissprowater.com/category-projects/hospitality/',
    fairmont: 'https://swissprowater.com/projects/fairmont-south-tower-minibar-station/',
    panpacific: 'https://swissprowater.com/projects/pan-pacific-orchard-guestroom-minibar/',
    businessClass: 'https://swissprowater.com/drink-business-class-with-swisspro/',
    san: 'https://swissprowater.com/products/san/',
    smart: 'https://swissprowater.com/products/smart/',
    fontana: 'https://swissprowater.com/products/fontana/',
    vida: 'https://swissprowater.com/products/clima-vida/',
    grande: 'https://swissprowater.com/products/clima-grande/',
    mesa: 'https://swissprowater.com/products/clima-mesa-v2/',
    piso: 'https://swissprowater.com/products/clima-piso-v2/',
    shop: 'https://swisspro-singapore.myshopify.com/collections/all'
  };

  function derivedBottleWeightG(sizeMl) {
    var base = factors.pet_bottle_weight_500ml_g.value;
    var exp = factors.pet_bottle_weight_scaling.value;
    return base * Math.pow(sizeMl / 500, exp);
  }

  /* Facts shown on the results page when a driver is selected (all search-excerpt sourced, see docs/research-notes-regulation.md). */
  var triggerFacts = {
    certification: [
      { text: 'Singapore\'s Hotel Sustainability Roadmap targets 60% of hotel room stock with an internationally recognised sustainability certification by 2025 (up from under 10% in 2022).', url: 'https://www.stb.gov.sg/about-stb/media-publications/media-centre/launch-of-the-hotel-sustainability-roadmap-by-stb-and-sha/' },
      { text: 'Green Globe certification does not allow single-use bottles, according to Marriott\'s VP Procurement APAC (interview, Oct 2026). Confirm the exact indicator with your certification body.', url: 'https://www.greenglobe.com/criteria-indicators' }
    ],
    audit: [
      { text: 'Forbes Travel Guide\'s Responsible Hospitality verification "guides hotels through topics such as single-use plastics, food and water waste, local and seasonal food, recycling programs".', url: 'https://www.forbestravelguide.com/landing/press-release-sustainability-forbes-travel-guide-responsible-hospitality' },
      { text: 'Luxury audits (Forbes, LQA) deduct points for single-use bottles in rooms, according to Marriott\'s VP Procurement APAC (interview, Oct 2026).', url: null }
    ],
    mandate: [
      { text: 'Marriott International\'s Serve 360 goals: "Responsibly source 95% in our Top 10 priority categories by 2025" (the categories include bottled water) and "reduce waste-to-landfill per occupied room by 45% from 2016 to 2025".', url: 'https://serve360.marriott.com/wp-content/uploads/2021/09/2021_Serve_360_Report.pdf' }
    ],
    safety: [
      { text: 'US CDC: to remove bacteria a filter needs an absolute pore size of 0.3 micron or smaller; Swisspro\'s filtration stage is 0.2 micron.', url: 'https://www.cdc.gov/drinking-water/prevention/about-choosing-home-water-filters.html' }
    ]
  };

  return {
    ACCESSED: ACCESSED,
    triggerFacts: triggerFacts,
    factors: factors,
    countries: countries,
    interview: interview,
    swissproSources: swissproSources,
    derivedBottleWeightG: derivedBottleWeightG,
    hourlyWage: function (monthly) { return monthly / (factors.working_hours_per_fte_year.value / 12); }
  };
});
