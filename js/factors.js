/* Swisspro Sustainability Wizard - factor register (version 2).
 *
 * EVERY number the calculator uses lives here with a provenance label:
 *   kind: 'sourced'     a published value; `status` says whether the page was opened by the author:
 *                       'opened'      the page was opened and the quoted wording is on it
 *                       'unverified'  the page could NOT be opened from the build environment; the value and
 *                                     quote come from a search-engine excerpt and must be checked (see VERIFY.md)
 *   kind: 'derived'     arithmetic on other register values; the formula is stated
 *   kind: 'assumption'  no published source; an explicit, explained value, adjustable on the result page
 *   kind: 'constant'    physical or calendar constant
 *
 * Where sources disagree, ONE value per factor is chosen by the rule in `rules` below, stated once.
 * The wizard shows the label (and "unverified" where it applies) next to every figure.
 * Accessed: 2026-10-29. Build environment: no outbound web access, so every sourced value is 'unverified'.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.factors = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ACCESSED = '2026-10-29';
  var UNVERIFIED = 'unverified';

  var verification = {
    note: 'On 29 October 2026 the build environment could not open any external page. All sourced values were taken from search-engine excerpts of the cited pages and are marked "unverified" until someone opens the page and confirms the quoted wording. VERIFY.md lists them.'
  };

  /* One rule per factor where sources disagree (stated once, applied everywhere). */
  var rules = {
    occupancy: 'Newest official national occupancy figure for the latest full calendar year. If the official series covers only part of the year, the official year-to-date figure. If no official national series exists, the newest figure from a named consultancy.',
    wage: 'Statutory minimum wage in force in 2025 for the market. Indonesia uses the provincial minimum wage of Bali (largest leisure market); Jakarta and Surabaya alternatives are noted and adjustable.',
    bottlePrice: 'Lowest published carton price of a national brand in 500 or 600 ml bottles on a retailer or wholesaler page; higher bands and the own price are selectable.',
    fx: 'One published US-dollar rate per currency on a single reference date (26 to 28 October 2026), from the central bank where found, otherwise from a financial-data provider.',
    co2Pet: 'Newest UK Government greenhouse-gas conversion factor set (2025), "Material use: Plastics, PET (incl. forming), primary material production". The official file could not be opened, so the value quoted by a third party is used and marked unverified.',
    bottleWeight: 'Industry-association average for an empty 500 ml PET water bottle (IBWA citing Beverage Marketing Corporation, 2014 data); other sizes derived by the stated scaling rule.'
  };

  var factors = {
    /* ------------------------------------------------------------------ packaging */
    pet_bottle_weight_500ml_g: {
      value: 9.89, unit: 'g per empty 500 ml (16.9 oz) PET bottle', kind: 'sourced', status: UNVERIFIED,
      label: 'Average weight of an empty 500 ml PET water bottle', rule: rules.bottleWeight,
      source: { publisher: 'International Bottled Water Association (IBWA), citing Beverage Marketing Corporation', title: 'Bottled water container weight (2000-2014)', url: 'https://bottledwater.org/?p=652', quote: 'the average 16.9-ounce PET bottle fell 48 percent to 9.89 grams between 2000 and 2014', year: '2014 data', accessed: ACCESSED },
      note: 'US industry average and therefore a light bottle; many bottles sold in South-East Asia weigh 12 to 18 g, so the plastic figure is conservative. IBWA later revised the same series to 9.25 g.'
    },
    pet_bottle_weight_scaling: {
      value: 2 / 3, unit: 'exponent', kind: 'assumption',
      label: 'Scaling of bottle weight to other sizes',
      note: 'No sourced weights were found for 330 ml, 600 ml or 1.5 L water bottles. Their weight is derived as 9.89 g x (size / 500 ml)^(2/3), i.e. wall area grows slower than volume. Blog-grade ranges (1.5 L: 30 to 45 g) are higher than the derived 20.6 g, so the rule understates plastic for large bottles.'
    },
    co2e_kg_per_kg_pet: {
      value: 3.86158, unit: 'kg CO2e per kg PET (primary material production, incl. forming)', kind: 'sourced', status: UNVERIFIED,
      label: 'Greenhouse-gas factor for virgin PET', rule: rules.co2Pet,
      source: { publisher: 'UK Government (DESNZ/DEFRA) greenhouse-gas conversion factors, as quoted by GreenCalculus', title: 'Material use: Plastics, PET (incl. forming), primary material production', url: 'https://greencalculus.com/data/defra-emission-factors/', quote: 'PET primary production value of 3861.58251 kg CO2e per tonne, with a closed-loop figure of 2211.58251', year: '2025 factor set (third-party table)', accessed: ACCESSED },
      note: 'Official page: https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025 (not opened). Other third-party quotes of the same factor range from 3,121 to 4,032 kg CO2e/t depending on edition. Cradle-to-gate only: transport, chilling and end-of-life of the bottles and the electricity of the filtration unit are NOT included.'
    },
    co2e_kg_per_car_km: {
      value: 0.16272, unit: 'kg CO2e per km, average petrol car', kind: 'sourced', status: UNVERIFIED,
      label: 'Car-kilometre equivalence factor',
      source: { publisher: 'UK Government GHG conversion factors 2025, as quoted by GreenCalculus', title: 'Average car, petrol (kg CO2e per km)', url: 'https://greencalculus.com/guides/defra-conversion-factors-what-changed/', quote: 'Average car, petrol ... kg CO2e per km | 0.16272', year: '2025 factor set', accessed: ACCESSED },
      note: 'Used only to translate tonnes of CO2e into something tangible.'
    },
    glass_co2e: {
      value: null, unit: 'kg CO2e per bottle', kind: 'sourced', status: 'missing',
      label: 'Greenhouse-gas factor for glass bottles (reusable or bought-in)',
      source: { publisher: 'Garfi, Cadena, Sanchez-Ramos, Ferrer (2016), Journal of Cleaner Production 137, 997-1003', title: 'Life cycle assessment of drinking water: comparing conventional water treatment, reverse osmosis and mineral water in glass and plastic bottles', url: 'https://sustainable.columbia.edu/sites/default/files/content/Documents/1-s2.0-S0959652616311234-main.pdf', quote: '(per-cubic-metre global-warming results not retrievable without opening the paper)', year: '2016', accessed: ACCESSED },
      note: 'WHY MISSING: the candidate source (Garfi et al. 2016, glass bottles reused 8 times) could not be opened, and its global-warming results per m3 did not appear in any excerpt. Secondary excerpts only state that the paper found PET preferable to glass overall, so guessing a glass value would risk the wrong sign. The wizard therefore shows "not estimated" for glass and explains this; once the paper is opened, enter the kg CO2e per m3 for the glass scenario here (divided by bottles per m3).'
    },

    /* ------------------------------------------------------------------ logistics */
    bottles_per_carton: {
      value: 24, unit: 'bottles per carton (500 ml)', kind: 'sourced', status: UNVERIFIED, label: 'Bottles per carton',
      source: { publisher: 'Nestle Pure Life (water.com); Malaysian and Philippine carton listings also show 24', title: '24-bottle cartons of 500 ml water', url: 'https://www.water.com/fr-ca/product/pure-life-water-plastic-bottle-16-oz-24-pack-pallet/', quote: 'packs of 24 ... 78 cases, or 1,872 bottles, per pallet', year: 'undated listing', accessed: ACCESSED }
    },
    bottles_per_pallet_500ml: {
      value: 1872, unit: 'bottles (500 ml) per pallet', kind: 'sourced', status: UNVERIFIED, label: 'Bottles per pallet',
      source: { publisher: 'water.com (Nestle Pure Life)', title: 'Pure Life water 16.9 oz 24-pack pallet', url: 'https://www.water.com/fr-ca/product/pure-life-water-plastic-bottle-16-oz-24-pack-pallet/', quote: '78 cases, or 1,872 bottles, per pallet', year: 'undated listing', accessed: ACCESSED },
      note: 'Costco/Niagara list 1,920 (48 cases x 40). For other bottle sizes the count is scaled by volume (assumption).'
    },
    pallet_footprint_m2: {
      value: 1.2, unit: 'm2 per pallet (1200 x 1000 mm)', kind: 'sourced', status: UNVERIFIED, label: 'Pallet footprint',
      source: { publisher: 'Pallet Gauge', title: 'Pallet size comparison', url: 'https://palletgauge.com/pallet-size-comparison', quote: '1200 x 1000 mm - 1.200 m2', year: 'undated', accessed: ACCESSED }
    },
    storage_aisle_multiplier: { value: 1, unit: 'x', kind: 'assumption', label: 'Storage area multiplier', note: 'Pallet footprint only. A real store needs aisles; 1.5 to 2.5 gives a realistic floor area.' },
    stock_weeks_default: { value: 2, unit: 'weeks of bottled water kept in stock', kind: 'assumption', label: 'Stock on hand', note: 'Sets the peak number of pallets in the store and the delivery frequency. Adjustable.' },
    water_density_kg_per_l: { value: 1, unit: 'kg per litre', kind: 'constant', label: 'Density of water' },

    /* ------------------------------------------------------------------ labour */
    working_hours_per_fte_year: { value: 2080, unit: 'hours per full-time employee per year', kind: 'assumption', label: 'Hours per full-time equivalent', note: '40 hours x 52 weeks; used to convert monthly wages to hourly (2080 / 12 = 173.3 h per month) and hours to FTE. Statutory weeks in the region are 40 to 45 h.' },
    minutes_per_room_per_day_default: { value: 1, unit: 'minutes of housekeeping time per occupied room per day', kind: 'assumption', label: 'Bottle handling time per occupied room', note: 'No published figure exists. Covers restocking bottles from the trolley, removing empties and reloading the trolley. Adjustable (0.5 to 3 min).' },
    minutes_per_carton_default: { value: 2, unit: 'minutes of receiving, storing and distributing time per carton', kind: 'assumption', label: 'Handling time per carton', note: 'Receiving the delivery, moving cartons to the store and up to floor pantries, opening cartons, disposing of shrink-wrap. Adjustable.' },
    bottles_per_room_night_default: {
      value: 2, unit: 'complimentary bottles per occupied room per night', kind: 'assumption', label: 'Bottles per occupied room-night',
      note: 'Industry case studies describe "two bottles a night" (Aquablu, Sheraton Brussels Airport) and "two 750 ml bottles per room per day" (Topia Water model). Fairmont Singapore and Swissotel The Stamford report avoiding 1.5 million bottles a year across 2,030 rooms (about 2 per room per day). All three pages unverified: https://www.aquablu.com/stories/the-future-of-hospitality-embracing-sustainability-in-hotels , https://topiawater.com/case-study-streamline-200/ , https://www.swissotel-singapore-stamford.com/the-hotel/blog/sustainability-at-fairmont-singapore-swissotel-the-stamford/'
    },

    /* ------------------------------------------------------------------ presentation rules */
    cheap_water_threshold_usd: { value: 0.25, unit: 'US$ per bottle', kind: 'assumption', label: 'Threshold below which bottled water counts as cheap', note: 'Provisional rule for the argument order only: below this price per bottle the business case leads with efficiency and water safety instead of cash savings (the sales manager reported that the cost argument is weak in Malaysia and Indonesia).' }
  };

  /* --------------------------------------------------------------------- markets (focus: Malaysia, Indonesia, Philippines) */
  var countries = {
    MY: {
      code: 'MY', name: 'Malaysia', currency: 'MYR', symbol: 'RM', decimals: 2,
      fx: { value: 1 / 4.0745, unit: 'USD per MYR', kind: 'sourced', status: UNVERIFIED, rule: rules.fx,
        source: { publisher: 'Malay Mail / Bernama', url: 'https://malaymail.com/news/money/2026/10/28/ringgit-ends-higher-against-greenback-on-confidence-in-malaysias-fundamentals/241025', quote: 'rose to 4.0745/0790 against the US dollar', year: '2026-10-28', accessed: ACCESSED },
        note: 'Bank Negara Malaysia (www.bnm.gov.my) publishes the official rate; it could not be opened.' },
      occupancy: { value: 0.568, unit: 'average occupancy rate, paid accommodation, 2025', kind: 'sourced', status: UNVERIFIED, rule: rules.occupancy,
        source: { publisher: 'Tourism Malaysia', title: 'Paid Accommodation Survey performance January-December 2025 (infographic)', url: 'https://data.tourism.gov.my/frontend/pdf/Infographic_paid_accommodation_performance_jan-dec2025.pdf', quote: 'Malaysia 2025 - 56.8%, 2024 - 54.9%', year: '2025', accessed: ACCESSED } },
      wageMonthly: { value: 1700, unit: 'MYR per month', kind: 'sourced', status: UNVERIFIED, rule: rules.wage, label: 'National minimum wage (Minimum Wages Order 2024)',
        source: { publisher: 'Skrine (law firm) summarising the Minimum Wages Order 2024, gazetted 4 Dec 2024', url: 'https://www.skrine.com/insights/alerts/december-2024/minimum-wages-order-2024-gazetted', quote: 'Employers with fewer than five staff ... had until 1 August 2025 to move to RM1,700', year: '2025', accessed: ACCESSED },
        note: 'Statutory floor; hotel housekeeping wages are usually above it, so the labour value is conservative.' },
      bottlePrices: [
        { id: 'local', label: 'Local brand, bought by the carton', price: 14.60 / 24, kind: 'sourced', status: UNVERIFIED, ref: 'Desa mineral water 24 x 500 ml, RM14.60 (Ace Water price list)', url: 'https://acewater.my/price-list-2/' },
        { id: 'mid', label: 'National brand, bought by the carton', price: 15.95 / 24, kind: 'sourced', status: UNVERIFIED, ref: 'Cactus mineral water 24 x 500 ml, RM15.95 (Food Service Malaysia)', url: 'https://www.foodservicemalaysia.com/ourproducts/cid/277768/cat/beverage-water/' }
      ],
      context: [
        { text: 'Malaysia Roadmap Towards Zero Single-Use Plastics 2018-2030 sets the vision of "zero single-use plastics for a cleaner and healthier environment in Malaysia by 2030".', url: 'https://www.pmo.gov.my/wp-content/uploads/2019/07/Malaysia-Roadmap-Towards-Zero-Single-Use-Plastics-2018-2030-m-min.pdf', status: UNVERIFIED }
      ]
    },
    ID: {
      code: 'ID', name: 'Indonesia', currency: 'IDR', symbol: 'Rp', decimals: 0,
      fx: { value: 1 / 18147.4, unit: 'USD per IDR', kind: 'sourced', status: UNVERIFIED, rule: rules.fx,
        source: { publisher: 'Morningstar currencies', url: 'https://www.morningstar.com/markets/currencies', quote: 'Indonesian Rupiah USD-IDR 18,147.4000 as of October 26', year: '2026-10-26', accessed: ACCESSED },
        note: 'Bank Indonesia (www.bi.go.id) publishes the official JISDOR rate; it could not be opened.' },
      occupancy: { value: 0.4866, unit: 'star-rated hotel room occupancy (TPK), Jan-Nov 2025 cumulative', kind: 'sourced', status: UNVERIFIED, rule: rules.occupancy,
        source: { publisher: 'BPS - Statistics Indonesia, reported by Bisnis.com', url: 'https://ekonomi.bisnis.com/read/20260105/12/1941619/okupansi-hotel-berbintang-masih-turun-107-yoy-per-november-2025', quote: 'Secara kumulatif Januari hingga November 2025, BPS mencatat TPK hotel bintang sebesar 48,66%', year: '2025 (Jan-Nov)', accessed: ACCESSED },
        note: 'Full-year 2025 figure not retrievable; December 2025 alone was 56.12% (BPS release 2 Feb 2026).' },
      wageMonthly: { value: 2996561, unit: 'IDR per month', kind: 'sourced', status: UNVERIFIED, rule: rules.wage, label: 'Provincial minimum wage (UMP) Bali 2025',
        source: { publisher: 'Hukumonline (UMP 2025 list)', url: 'https://www.hukumonline.com/berita/a/ump-2025-se-Indonesia-lt68d3bc774d628/', quote: 'Bali Rp2.996.561 (naik Rp179.889 dibandingkan UMP 2024)', year: '2025', accessed: ACCESSED },
        note: 'Alternatives (unverified): DKI Jakarta UMP 2025 Rp5,396,761; East Java UMP 2025 Rp2,305,985; Surabaya city minimum wage (UMK) 2025 Rp4,961,753. Adjust on the result page for the hotel\'s province.' },
      bottlePrices: [
        { id: 'local', label: 'National brand (Aqua 600 ml), bought by the carton', price: 66718 / 24, kind: 'sourced', status: UNVERIFIED, ref: 'Aqua 600 ml x 24, average marketplace price Rp66,718 per carton (Blibli)', url: 'https://www.blibli.com/jual/akua-600-ml-per-dus' },
        { id: 'budget', label: 'Cheapest marketplace carton', price: 51000 / 24, kind: 'sourced', status: UNVERIFIED, ref: 'Aqua 600 ml x 24, lowest listed Rp51,000 per carton (Blibli)', url: 'https://www.blibli.com/jual/akua-600-ml-per-dus' }
      ],
      context: [
        { text: 'Bali Circular Letter 9 of 2025 (Governor Koster, April 2025) bans producing, distributing and selling single-use plastic bottled water under one litre.', url: 'https://www.socialexpat.net/bali-governor-bans-single-use-plastic-bottled-water-under-one-litre/', status: UNVERIFIED },
        { text: 'A 2024 peer-reviewed study of PDAM piped water in three Indonesian cities found "sporadic microbial contamination ... due to the depletion of residual chlorine".', url: 'https://ideas.repec.org/a/gam/jsusta/v16y2024i16p7082-d1458770.html', status: UNVERIFIED }
      ]
    },
    PH: {
      code: 'PH', name: 'Philippines', currency: 'PHP', symbol: '₱', decimals: 2,
      fx: { value: 1 / 63.453, unit: 'USD per PHP', kind: 'sourced', status: UNVERIFIED, rule: rules.fx,
        source: { publisher: 'Bangko Sentral ng Pilipinas reference rate (via taxcalculator.com.ph)', url: 'https://taxcalculator.com.ph/exchange-rates', quote: 'US$1 = ₱63.4530 on the bulletin of 26 October 2026', year: '2026-10-26', accessed: ACCESSED } },
      occupancy: { value: 0.60, unit: 'average hotel occupancy 2025', kind: 'sourced', status: UNVERIFIED, rule: rules.occupancy,
        source: { publisher: 'Leechiu Property Consultants, reported by BusinessWorld', url: 'https://www.bworldonline.com/?p=743528', quote: 'Hotel occupancy in 2025 remained at 60%, flat year on year, and still below the 68% recorded in 2019', year: '2025', accessed: ACCESSED },
        note: 'Private consultancy figure; no official DOT/PSA national series was found. Metro Manila H1 2025: 64%.' },
      wageMonthly: { value: 695 * 2080 / 12 / 8, unit: 'PHP per month (derived: ₱695 per day / 8 h x 2080 h / 12)', kind: 'derived', status: UNVERIFIED, rule: rules.wage, label: 'NCR daily minimum wage, non-agriculture (Wage Order NCR-26)',
        source: { publisher: 'Philippine News Agency', url: 'https://www.pna.gov.ph/articles/1254675', quote: 'Wage Order NCR-26 raised the non-agriculture daily minimum in Metro Manila from ₱645 to ₱695, and the ₱50 increase took effect July 18, 2025', year: '2025', accessed: ACCESSED },
        note: 'Regional wage boards outside Metro Manila are lower; a later order (NCR-28, ₱755 from September 2026) was reported.' },
      bottlePrices: [
        { id: 'local', label: 'National brand (Absolute), bought by the case', price: 334.57 / 24, kind: 'sourced', status: UNVERIFIED, ref: 'Absolute distilled water 500 ml x 24, ₱334.57 per case (MerryMart Wholesale)', url: 'https://www.merrymartwholesale.com/products/absolute-distilled-water-500ml-1-case-includes-24-pcs-500ml' },
        { id: 'mid', label: 'National brand (Wilkins), bought by the case', price: 366.17 / 24, kind: 'sourced', status: UNVERIFIED, ref: 'Wilkins distilled water 500 ml x 24, ₱366.17 per case (MerryMart Wholesale)', url: 'https://www.merrymartwholesale.com/products/wilkins-distilled-500ml-1-case-includes-24pcs-500ml' }
      ],
      context: [
        { text: 'Republic Act 11898 (Extended Producer Responsibility Act of 2022) obliges large enterprises to recover plastic packaging: 50% of the 2025 footprint, rising to 80% from 2028.', url: 'https://lawphil.net/statutes/repacts/ra2022/ra_11898_2022.html', status: UNVERIFIED },
        { text: 'Boracay (Malay, Aklan) Municipal Ordinance No. 386 s. 2018 "prohibits the use of single-use or disposable plastic items by hotels, resorts, restaurants and establishments in the accommodation business".', url: 'https://denr.gov.ph/news-events/denr-backs-ordinance-banning-single-use-plastics-in-boracay/', status: UNVERIFIED }
      ]
    },
    SG: {
      code: 'SG', name: 'Singapore', currency: 'SGD', symbol: 'S$', decimals: 2,
      fx: { value: 1 / 1.28025, unit: 'USD per SGD', kind: 'sourced', status: UNVERIFIED, rule: rules.fx,
        source: { publisher: 'MTFX (historical USD/SGD)', url: 'https://www.mtfxgroup.com/tools/historical-currency-exchange-rates/usd-to-sgd-rate/', quote: '1 USD = 1.28025 SGD on October 26, 2026', year: '2026-10-26', accessed: ACCESSED },
        note: 'Also used to convert the price list (assumed SGD) into the other currencies.' },
      occupancy: { value: 0.819, unit: 'average hotel occupancy 2025', kind: 'sourced', status: UNVERIFIED, rule: rules.occupancy,
        source: { publisher: 'Singapore Tourism Board', title: 'Record Singapore tourism receipts from January to September 2025 (media release, 3 Feb 2026)', url: 'https://www.stb.gov.sg/about-stb/media-publications/media-centre/record-singapore-tourism-receipts-from-january-to-september-2025/', quote: 'hotel occupancy of 81.9% for 2025, up from 81.4% in 2024', year: '2025', accessed: ACCESSED } },
      wageMonthly: { value: 1910, unit: 'SGD per month, basic wage', kind: 'sourced', status: UNVERIFIED, rule: rules.wage, label: 'Progressive Wage Model, General/Indoor Cleaner (proxy for room attendant)',
        source: { publisher: 'Ministry of Manpower Singapore', title: 'Progressive Wage Model - cleaning sector', url: 'https://www.mom.gov.sg/employment-practices/progressive-wage-model/cleaning-sector', quote: 'General Cleaner Indoor Cleaner ... $1,910 (from 1 July 2025)', year: '2025-26', accessed: ACCESSED },
        note: 'Singapore has no general minimum wage; the cleaning-sector PWM floor is the lowest defensible proxy. MOM median gross wage of a hotel housekeeper (June 2024): S$3,233 per month.' },
      bottlePrices: [
        { id: 'local', label: 'Local brand, bought by the carton', price: 8.64 / 24, kind: 'sourced', status: UNVERIFIED, ref: 'Pere Ocean natural mineral water 24 x 500 ml, S$8.64 incl. GST', url: 'https://www.pereocean.com/pere-ocean-natural-mineral-water-500ml' },
        { id: 'premium', label: 'Premium imported brand', price: 34.95 / 24, kind: 'sourced', status: UNVERIFIED, ref: 'Evian 24 x 500 ml, S$34.95 (promotional; regular S$56.40) at FairPrice', url: 'https://www.fairprice.com.sg/category/mineral-water' }
      ],
      context: [
        { text: 'Singapore\'s Hotel Sustainability Roadmap (STB/SHA, 2022) targets 60% of hotel room stock holding an internationally recognised sustainability certification by 2025, and its measures list an in-room filtration tap.', url: 'https://www.stb.gov.sg/about-stb/media-publications/media-centre/launch-of-the-hotel-sustainability-roadmap-by-stb-and-sha/', status: UNVERIFIED }
      ]
    },
    OTHER: {
      code: 'OTHER', name: 'Other Asia-Pacific market', currency: 'USD', symbol: 'US$', decimals: 2,
      fx: { value: 1, unit: 'USD per USD', kind: 'constant' },
      occupancy: { value: (0.568 + 0.4866 + 0.60 + 0.819) / 4, unit: 'average of the four listed markets', kind: 'derived', note: 'Simple average of the Malaysia, Indonesia, Philippines and Singapore figures.' },
      wageMonthly: { value: 0, unit: 'USD per month', kind: 'assumption', label: 'No wage reference: enter your own', note: 'Labour is shown in hours only until a wage is entered.' },
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
      'A tap at the bathroom vanity next to the basin and water stations in corridors are both disliked by guests.'
    ]
  };

  function derivedBottleWeightG(sizeMl) {
    return factors.pet_bottle_weight_500ml_g.value * Math.pow(sizeMl / 500, factors.pet_bottle_weight_scaling.value);
  }

  return {
    ACCESSED: ACCESSED, UNVERIFIED: UNVERIFIED, verification: verification, rules: rules,
    factors: factors, countries: countries, interview: interview,
    marketOrder: ['MY', 'ID', 'PH', 'SG', 'OTHER'],
    derivedBottleWeightG: derivedBottleWeightG,
    hourlyWage: function (monthly) { return monthly / (factors.working_hours_per_fte_year.value / 12); }
  };
});
