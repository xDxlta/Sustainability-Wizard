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
    bottlePrice: 'Published prices of mass-market, foodservice and premium water on retailer, wholesaler and B2B pages, all shown as options. When the hotel answers "Not sure", the typical price is used: the median of the mass-market references only (typical: true); foodservice and premium references never drive "Not sure". No source gives the full cost of a bottle in the room (delivery, storage, disposal), so only the purchase price is used; handling time is counted separately as staff time.',
    service: 'In-Room servicing line of the price list (85.00, comprehensive, labour and parts) read as one filter change per room and year, as in the Westin Singapore case computed with Swisspro (2024). The per 2-year contract and per change every 9 months readings stay selectable.',
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
      value: 0.061, unit: 'kg CO2e per litre of water in glass bottles (glass scenario of the study)', kind: 'sourced', status: 'team-opened',
      label: 'Greenhouse-gas factor for glass bottles',
      source: { publisher: 'Garfi, Cadena, Sanchez-Ramos, Ferrer (2016), Journal of Cleaner Production 137, 997-1003', title: 'Life cycle assessment of drinking water: comparing conventional water treatment, reverse osmosis and mineral water in glass and plastic bottles', url: 'https://sustainable.columbia.edu/sites/default/files/content/Documents/1-s2.0-S0959652616311234-main.pdf', quote: '(0.061 kg CO2 per litre, glass scenario; exact wording to be pasted into VERIFY.md by the team)', year: '2016', accessed: '2026-10-30', openedBy: 'project team, 30 Oct 2026' },
      note: 'Opened and read by the project team, not by the author of this register; the quoted wording is still to be added. The study models glass bottles reused 8 times, so the factor describes reusable glass; applied to bought-in single-use glass it understates the impact. Applied per litre of water, so it covers every bottle size.'
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
    minutes_per_room_per_day_default: { value: 1, unit: 'minute(s) of housekeeping time per occupied room per day', kind: 'assumption', label: 'Bottle handling time per occupied room', note: 'No published figure exists. Covers restocking bottles from the trolley, removing empties and reloading the trolley. Adjustable (0.5 to 3 min).' },
    minutes_per_carton_default: { value: 2, unit: 'minute(s) of receiving, storing and distributing time per carton', kind: 'assumption', label: 'Handling time per carton', note: 'Receiving the delivery, moving cartons to the store and up to floor pantries, opening cartons, disposing of shrink-wrap. Adjustable.' },
    bottles_per_room_night_default: {
      value: 3, unit: 'complimentary bottles per occupied room per night', kind: 'derived', status: 'team-opened', label: 'Bottles per occupied room-night',
      rule: 'Median of the public hotel cases below, in bottles per room and year, divided by 365 and by a typical occupancy of 60 to 70%: about 659 / 365 / 0.65 = 2.8, rounded to 3.',
      cases: [
        { hotel: 'The Westin Kuala Lumpur', publisher: 'Malaysian Foodie', bottlesPerYear: 400000, rooms: 443, perRoomYear: 903, quote: 'over 400,000 bottles a year', url: 'https://www.malaysianfoodie.com/2022/10/rethinking-tourism-experience-a-green-take-on-sustainability-at-marriott-bonvoy-hotels-and-resorts.html', basis: 'announcement', status: 'team-opened', accessed: '2026-10-31' },
        { hotel: 'Hard Rock Hotel Bali', publisher: 'Hard Rock Hotel Bali', bottlesPerYear: 400000, rooms: 418, perRoomYear: 957, quote: 'over 400,000 a year expected', url: 'https://hotel.hardrock.com/bali/hardrockhotelbali-new-waterbottlingplant-to-reduce-singleuse-plastic.aspx', basis: 'expected', status: 'team-opened', accessed: '2026-10-31' },
        { hotel: 'W Singapore Sentosa Cove', publisher: 'Visit Singapore (MICE venue document)', bottlesPerYear: 350000, rooms: 240, perRoomYear: 1458, quote: 'over 350,000 a year expected (rooms)', url: 'https://www.visitsingapore.com/content/dam/mice2-0/venues/w-singapore/w_singapore-sustainability.pdf', basis: 'expected', status: 'team-opened', accessed: '2026-10-31' },
        { hotel: 'Eaton Hotel Hong Kong', publisher: 'Asia Travel Tips', bottlesPerYear: 350000, rooms: 465, perRoomYear: 753, quote: 'about 350,000 a year', url: 'https://www.asiatraveltips.com/news13/189-EatonHotel.shtml', basis: 'reported', status: 'team-opened', accessed: '2026-10-31' },
        { hotel: 'Prince Hotel Da Nang', publisher: 'Thailand Business News', bottlesPerYear: 108000, rooms: 164, perRoomYear: 659, quote: 'about 108,000 a year', url: 'https://www.thailand-business-news.com/pr-news/coway-vina-installs-164-water-purifiers-at-prince-hotel-da-nang-accelerating-vietnam-hospitality-b2b-expansion', basis: 'reported', status: 'team-opened', accessed: '2026-10-31' },
        { hotel: 'Caravelle Saigon', publisher: 'Asia Travel Tips', bottlesPerYear: 200000, rooms: 333, perRoomYear: 601, quote: '200,000 a year expected', url: 'https://www.asiatraveltips.com/news19/1411-CaravelleSaigon.shtml', basis: 'expected', status: 'team-opened', accessed: '2026-10-31' },
        { hotel: 'Hyatt Regency Hong Kong Sha Tin', publisher: 'The Standard (Hong Kong)', bottlesPerYear: 312000, rooms: 562, perRoomYear: 555, quote: 'about 6,000 a week', url: 'https://www.thestandard.com.hk/news/article/62152/Hotels-welcome-green-initiative', basis: 'reported', status: 'team-opened', accessed: '2026-10-31' },
        { hotel: 'New World Saigon', publisher: 'PR Newswire Asia', bottlesPerYear: 285000, rooms: 542, perRoomYear: 526, quote: 'over 285,000 a year', url: 'https://en.prnasia.com/releases/apac/coway-vina-installs-542-water-purifiers-across-all-guest-rooms-at-new-world-saigon-hotel-to-cut-285-000-reusable-glass-bottles-annually-544294.shtml', basis: 'reported', status: 'team-opened', accessed: '2026-10-31' },
        { hotel: 'Shangri-La Mactan', publisher: 'The Philippine Star', bottlesPerYear: 250000, rooms: 530, perRoomYear: 472, quote: '250,000 a year expected', url: 'https://philstar.com/lifestyle/travel-and-tourism/2014/05/11/1321626/shangri-las-mactan-breaks-ground-water-bottling-plant', basis: 'expected', status: 'team-opened', accessed: '2026-10-31' }
      ],
      source: { publisher: 'Public hotel cases in South-East Asia and Hong Kong (9 announcements and reports)', title: 'Bottles avoided per year and room count', quote: 'about 470 to 1,460 bottles per room and year, median about 659', year: '2014 to 2026', accessed: '2026-10-31' },
      note: 'Public hotel cases imply about 470 to 1,460 bottles per room and year, median about 600 to 700, which is about 3 per occupied room-night at typical occupancy. Many figures are announcements or expectations and some include F&B. The "2 bottles" view: industry case studies describe "two bottles a night" (Aquablu, Sheraton Brussels Airport) and "two 750 ml bottles per room per day" (Topia Water model); Fairmont Singapore and Swissotel The Stamford report avoiding 1.5 million bottles a year across 2,030 rooms (about 2 per room per day). Adjustable.'
    },

    /* ------------------------------------------------------------------ presentation rules */
    safe_water_world_2022: {
      value: 0.73, unit: 'share of the world population using safely managed drinking water, 2022', kind: 'sourced', status: UNVERIFIED, label: 'Safely managed drinking water, world',
      source: { publisher: 'UNICEF DATA, WHO/UNICEF Joint Monitoring Programme (JMP)', title: 'Access to drinking water', url: 'https://data.unicef.org/topic/water-and-sanitation/drinking-water/', quote: '73 per cent of the global population used safely managed drinking water services in 2022', year: '2022', accessed: '2026-11-02' },
      note: 'Used only to decide whether a market figure is shown: a market below the world share is shown on the result page when the cash case does not pay back.'
    },
    extra_cost_per_bottle_default: { value: 0, unit: 'local currency per bottle', kind: 'assumption', label: 'Extra cost per bottle for delivery, storage and disposal', note: 'No published figure; 0 unless the hotel enters its own (for example boat transport and waste removal at island resorts). Added to the price per bottle in the savings.' },
    other_bottles_per_day_default: { value: 0, unit: 'bottles a day outside guest rooms', kind: 'assumption', label: 'Bottles used outside guest rooms per day', note: 'No published figure; 0 unless the hotel enters its own (meeting rooms, staff, outlets). Counted in bottles, plastic, CO2e and handling time, and as the saving of the drinking-station block.' },
    client_water_pretreatment_2026: {
      value: 'Written answer, 9 Nov 2026', unit: '', kind: 'client-statement', status: 'client-reported', label: 'Water supply and pre-treatment (client statement)',
      source: { publisher: 'Swisspro', title: 'Written answer to the project team', quote: 'Most hotels run on city water with low TDS; reverse osmosis is usually not needed. A proper pre-treatment has at least particle pre-filtration and activated carbon. Rooftop storage tanks must be maintained.', year: '2026', date: '2026-11-09' },
      note: 'Swisspro, written answer to the project team, 9 Nov 2026. Used for the help text under the water supply question of the proposal form, the pre-treatment line for own wells or treatment plants, and the storage-tank argument.'
    },
    westin_case_2024: {
      value: 2, unit: 'years to break even, Westin Singapore, 305 guest rooms', kind: 'sourced-secondary', label: 'Reference case: Westin Singapore (Swisspro, 2024)',
      source: { publisher: 'Final Presentation 2024, Swisspro student team', title: 'p. 13 and p. 44, figures provided by Swisspro', quote: 'Upfront investment S$42,700 (305 x S$140 simple tap); yearly filter change S$19,825 (305 x S$65 per filter, not including service, one change per room per year); plastic bottles S$40,640 a year (243,840 bottles at S$0.17); break-even in about 2 years', year: '2024' },
      note: 'Used as the source for one filter change per room and year. With the price list servicing line (85.00 with labour and parts) instead of 65.00 for the filter alone, the same case breaks even in about 2.9 years.'
    },
    service_changes_per_room_year: {
      value: 1, unit: 'filter change per guest room and year', kind: 'sourced-secondary', label: 'Filter changes per room and year',
      source: { publisher: 'Final Presentation 2024, Swisspro student team', title: 'Westin Singapore case, p. 13 and p. 44, figures provided by Swisspro', quote: 'Yearly filter change S$19,825 (305 x S$65 per filter)', year: '2024' },
      note: 'Default for the In-Room service contract: one change per room and year at the comprehensive price of the price list. Change every 9 months and per 2-year contract are selectable under Adjust the assumptions.'
    },
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
      occupancyRefs: [
        { id: 'kl5', label: 'Kuala Lumpur 5-star', value: 0.714, period: '2025', kind: 'sourced', status: 'team-checked', publisher: 'CBRE|WTW', document: 'Klang Valley Hotel Snapshot 4Q25, p. 2', publicSource: 'Property consultancy, Klang Valley hotel snapshot 4Q25', url: null },
        { id: 'kl45', label: 'Kuala Lumpur 4 to 5-star', value: 0.633, period: '1H 2025', kind: 'sourced', status: 'team-checked', publisher: 'Knight Frank Malaysia, in YTL Hospitality REIT Annual Report 2025', document: 'YTL Hospitality REIT Annual Report 2025, pp. 50 to 51', publicSource: 'Property consultancy market report in a listed hotel trust annual report 2025', url: null }
      ],
      wageMonthly: { value: 1700, unit: 'MYR per month', kind: 'sourced', status: UNVERIFIED, rule: rules.wage, label: 'National minimum wage (Minimum Wages Order 2024)',
        source: { publisher: 'Skrine (law firm) summarising the Minimum Wages Order 2024, gazetted 4 Dec 2024', url: 'https://www.skrine.com/insights/alerts/december-2024/minimum-wages-order-2024-gazetted', quote: 'Employers with fewer than five staff ... had until 1 August 2025 to move to RM1,700', year: '2025', accessed: ACCESSED },
        note: 'Statutory floor; hotel housekeeping wages are usually above it, so the labour value is conservative.' },
      bottlePrices: [
        { id: 'local', label: 'Local brand, retail carton', price: 14.60 / 24, tier: 'mass', typical: true, kind: 'sourced', status: UNVERIFIED, ref: 'Desa mineral water 24 x 500 ml, RM14.60 (Ace Water price list)', refPublic: 'Local brand 24 x 500 ml, RM14.60 per carton, retailer price list', url: 'https://acewater.my/price-list-2/', accessed: '2026-10-29' },
        { id: 'mid', label: 'National brand, foodservice shop carton', price: 15.95 / 24, tier: 'mass', typical: true, kind: 'sourced', status: UNVERIFIED, ref: 'Cactus mineral water 24 x 500 ml, RM15.95 (Food Service Malaysia)', refPublic: 'National brand 24 x 500 ml, RM15.95 per carton, foodservice shop', url: 'https://www.foodservicemalaysia.com/ourproducts/cid/277768/cat/beverage-water/', accessed: '2026-10-29' },
        { id: 'wholesale', label: 'National brand, B2B wholesale carton', price: 22.75 / 24, tier: 'mass', typical: true, kind: 'sourced', status: 'team-opened', ref: 'Cactus mineral water 24 x 500 ml, B2B wholesale Yee Lee Trading on Borong, "MYR 22.75 / Carton"', refPublic: 'National brand 24 x 500 ml, RM22.75 per carton, B2B wholesale marketplace', url: 'https://market.borong.com/v/yeelee/product/Cactus-Mineral-Water-24-x-500-ml-24-Units-Per-Carton/27577', accessed: '2026-11-08', note: 'Page undated.' },
        { id: 'dealer', label: 'National brand 550 ml, dealer price', price: 27.86 / 24, tier: 'mass', typical: true, kind: 'sourced', status: 'team-opened', ref: 'Spritzer natural mineral water 24 x 550 ml, dealer price RM27.86 (Lapasar)', refPublic: 'National brand 24 x 550 ml, RM27.86 per carton, dealer marketplace', url: 'https://mall.lapasar.com/products/spritzer-spritzer-natural-mineral-water-carton-24-x-550ml/128473', accessed: '2026-11-08', note: 'Page undated.' },
        { id: 'premium', label: 'Premium imported water, glass', price: 175.20 / 24, tier: 'premium', typical: false, kind: 'sourced', status: 'team-opened', ref: 'Acqua Panna still natural mineral water 500 ml glass, B2B wholesale Asiaeuro on Borong, "MYR 175.20 / Carton" (24 bottles)', refPublic: 'Premium imported still water 24 x 500 ml glass, RM175.20 per carton, B2B wholesale marketplace', url: 'https://market.borong.com/v/asiaeuro-wines-and-spirits/product/ACQUA-PANNA-Still-Natural-Mineral-Water-500ml-Crown-cap-KLANG-VALLEY-ONLY/139338', accessed: '2026-11-08', note: 'Page undated.' }
      ],
      safeWater: { value: 0.95, year: '2024', kind: 'sourced', status: UNVERIFIED, label: 'Safely managed drinking water', source: { publisher: 'UN-Water SDG 6 Data Portal (WHO/UNICEF JMP, indicator 6.1.1)', title: 'Malaysia', url: 'https://sdg6data.org/en/country-or-area/Malaysia', quote: 'share of the population using safely managed drinking water: 95% (2024)', year: '2024', accessed: '2026-11-02' } },
      safetyNote: { text: '95% of the population uses a safely managed drinking water service (2024).', source: 'WHO/UNICEF JMP via SDG 6 Data Portal', url: 'https://www.sdg6data.org/country-or-area/Malaysia', status: UNVERIFIED },
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
      occupancyRefs: [
        { id: 'bali', label: 'Bali, star hotels', value: 0.607, period: '2025', kind: 'sourced', status: 'team-checked', publisher: 'BPS (Statistics Indonesia), via GoodStats', document: 'Star hotel room occupancy by province, 2025', publicSource: 'Statistics Indonesia, star hotel occupancy by province 2025', url: null },
        { id: 'jakarta', label: 'DKI Jakarta, star hotels', value: 0.5343, period: '2025', kind: 'sourced', status: 'team-checked', publisher: 'BPS (Statistics Indonesia), via GoodStats', document: 'Star hotel room occupancy by province, 2025', publicSource: 'Statistics Indonesia, star hotel occupancy by province 2025', url: null },
        { id: 'eastjava', label: 'East Java, star hotels', value: 0.4930, period: '2025', kind: 'sourced', status: 'team-checked', publisher: 'BPS (Statistics Indonesia), via GoodStats', document: 'Star hotel room occupancy by province, 2025', publicSource: 'Statistics Indonesia, star hotel occupancy by province 2025', url: null },
        { id: 'riau', label: 'Riau Islands, star hotels', value: 0.5037, period: 'November 2025', kind: 'sourced', status: 'team-checked', publisher: 'BPS Kepulauan Riau', document: 'Star hotel room occupancy, November 2025', publicSource: 'Statistics Indonesia, Riau Islands office, November 2025', url: null }
      ],
      wageMonthly: { value: 2996561, unit: 'IDR per month', kind: 'sourced', status: UNVERIFIED, rule: rules.wage, label: 'Provincial minimum wage (UMP) Bali 2025',
        source: { publisher: 'Hukumonline (UMP 2025 list)', url: 'https://www.hukumonline.com/berita/a/ump-2025-se-Indonesia-lt68d3bc774d628/', quote: 'Bali Rp2.996.561 (naik Rp179.889 dibandingkan UMP 2024)', year: '2025', accessed: ACCESSED },
        note: 'Alternatives (unverified): DKI Jakarta UMP 2025 Rp5,396,761; East Java UMP 2025 Rp2,305,985; Surabaya city minimum wage (UMK) 2025 Rp4,961,753. Adjust on the result page for the hotel\'s province.' },
      bottlePrices: [
        { id: 'local', label: 'National brand 600 ml, marketplace average', price: 66718 / 24, tier: 'mass', typical: true, kind: 'sourced', status: UNVERIFIED, ref: 'Aqua 600 ml x 24, average marketplace price Rp66,718 per carton (Blibli)', refPublic: 'National brand 24 x 600 ml, Rp66,718 per carton, marketplace average, retail', url: 'https://www.blibli.com/jual/akua-600-ml-per-dus', accessed: '2026-10-29' },
        { id: 'budget', label: 'Cheapest marketplace carton', price: 51000 / 24, tier: 'mass', typical: true, kind: 'sourced', status: UNVERIFIED, ref: 'Aqua 600 ml x 24, lowest listed Rp51,000 per carton (Blibli)', refPublic: 'National brand 24 x 600 ml, Rp51,000 per carton, lowest marketplace listing, retail', url: 'https://www.blibli.com/jual/akua-600-ml-per-dus', accessed: '2026-10-29' },
        { id: 'small', label: 'National brand 330 ml, marketplace carton', price: 52500 / 24, tier: 'mass', typical: true, kind: 'sourced', status: 'team-opened', ref: 'Aqua 330 ml x 24, live marketplace listings Rp47,190 to 60,000, Rp52,500 used (Tokopedia), retail', refPublic: 'National brand 24 x 330 ml, Rp47,190 to 60,000 per carton (Rp52,500 used), marketplace, retail', url: 'https://www.tokopedia.com/find/aqua-330ml-1-dus', accessed: '2026-11-08' },
        { id: 'second', label: 'Second national brand 600 ml, marketplace carton', price: 60760 / 24, tier: 'mass', typical: true, kind: 'sourced', status: 'team-opened', ref: 'Le Minerale 600 ml x 24, Rp60,760 to 73,000, Rp60,760 used (Tokopedia), retail', refPublic: 'Second national brand 24 x 600 ml, Rp60,760 to 73,000 per carton (Rp60,760 used), marketplace, retail', url: 'https://www.tokopedia.com/find/le-minerale-600ml-1-dus', accessed: '2026-11-08' },
        { id: 'foodservice', label: 'Foodservice brand 380 ml, per bottle', price: 9000, tier: 'foodservice', typical: false, kind: 'sourced', status: 'team-opened', ref: 'Equity mineral water 380 ml, Rp9,000 per bottle (regular Rp10,000), B2B foodservice Indoguna, "The listed price is for a 380ml package"', refPublic: 'Foodservice still water 380 ml, Rp9,000 per bottle (regular Rp10,000), B2B foodservice supplier', url: 'https://shop.indoguna.co.id/en/products/equity-mineral-water-380-ml-air-minum-mineral', accessed: '2026-11-08' },
        { id: 'premium', label: 'Premium brand 380 ml', price: 270000 / 12, tier: 'premium', typical: false, kind: 'sourced', status: 'team-opened', ref: 'Equil 380 ml, Rp270,000 per 12 (aggregator price guide, retail, 30 Mar 2025)', refPublic: 'Premium still water 12 x 380 ml, Rp270,000, price guide, retail (30 Mar 2025)', url: 'https://harga.web.id/harga-1-botol-equil-air-mineral-premium.info', accessed: '2026-11-08' }
      ],
      safeWater: { value: 0.30, year: '2024', kind: 'sourced', status: UNVERIFIED, label: 'Safely managed drinking water', source: { publisher: 'UN-Water SDG 6 Data Portal (WHO/UNICEF JMP, indicator 6.1.1)', title: 'Indonesia', url: 'https://www.sdg6data.org/country-or-area/Indonesia', quote: '30% of the population uses a safely managed drinking water service (2024)', year: '2024', accessed: '2026-11-07' }, note: 'The World Bank series (JMP) gives 30.266% for 2022 (CEIC: https://ceicdata.com/en/indonesia/social-access-to-services).' },
      safetyNote: { text: '30% of the population uses a safely managed drinking water service (2024).', source: 'WHO/UNICEF JMP via SDG 6 Data Portal', url: 'https://www.sdg6data.org/country-or-area/Indonesia', status: UNVERIFIED },
      context: [
        { text: 'Bali Circular Letter 9 of 2025 (Governor Koster, April 2025) bans producing, distributing and selling single-use plastic bottled water under one litre.', url: 'https://www.socialexpat.net/bali-governor-bans-single-use-plastic-bottled-water-under-one-litre/', status: UNVERIFIED },
        { text: 'A 2024 peer-reviewed study of PDAM piped water in three Indonesian cities found "sporadic microbial contamination ... due to the depletion of residual chlorine".', url: 'https://ideas.repec.org/a/gam/jsusta/v16y2024i16p7082-d1458770.html', status: UNVERIFIED }
      ]
    },
    PH: {
      code: 'PH', name: 'the Philippines', currency: 'PHP', symbol: '₱', decimals: 2,
      fx: { value: 1 / 63.453, unit: 'USD per PHP', kind: 'sourced', status: UNVERIFIED, rule: rules.fx,
        source: { publisher: 'Bangko Sentral ng Pilipinas reference rate (via taxcalculator.com.ph)', url: 'https://taxcalculator.com.ph/exchange-rates', quote: 'US$1 = ₱63.4530 on the bulletin of 26 October 2026', year: '2026-10-26', accessed: ACCESSED } },
      occupancy: { value: 0.60, unit: 'average hotel occupancy 2025', kind: 'sourced', status: UNVERIFIED, rule: rules.occupancy,
        source: { publisher: 'Leechiu Property Consultants, reported by BusinessWorld', url: 'https://www.bworldonline.com/?p=743528', quote: 'Hotel occupancy in 2025 remained at 60%, flat year on year, and still below the 68% recorded in 2019', year: '2025', accessed: ACCESSED },
        note: 'Private consultancy figure; no official DOT/PSA national series was found. Metro Manila H1 2025: 64%.' },
      occupancyRefs: [
        { id: 'mnllux', label: 'Metro Manila luxury hotels', value: 0.86, period: 'Q1 2026', kind: 'sourced', status: 'team-checked', publisher: 'JLL', document: 'Metro Manila hotel market, Q1 2026', publicSource: 'Property consultancy, Metro Manila hotel market Q1 2026', url: null }
      ],
      wageMonthly: { value: 695 * 2080 / 12 / 8, unit: 'PHP per month (derived: ₱695 per day / 8 h x 2080 h / 12)', kind: 'derived', status: UNVERIFIED, rule: rules.wage, label: 'NCR daily minimum wage, non-agriculture (Wage Order NCR-26)',
        source: { publisher: 'Philippine News Agency', url: 'https://www.pna.gov.ph/articles/1254675', quote: 'Wage Order NCR-26 raised the non-agriculture daily minimum in Metro Manila from ₱645 to ₱695, and the ₱50 increase took effect July 18, 2025', year: '2025', accessed: ACCESSED },
        note: 'Regional wage boards outside Metro Manila are lower; a later order (NCR-28, ₱755 from September 2026) was reported.' },
      bottlePrices: [
        { id: 'local', label: 'National brand, wholesale case', price: 334.57 / 24, tier: 'mass', typical: true, refPublic: 'National brand distilled water 24 x 500 ml, ₱334.57 per case, wholesale club', kind: 'sourced', status: UNVERIFIED, ref: 'Absolute distilled water 500 ml x 24, ₱334.57 per case (MerryMart Wholesale)', url: 'https://www.merrymartwholesale.com/products/absolute-distilled-water-500ml-1-case-includes-24-pcs-500ml' },
        { id: 'mid', label: 'Second national brand, wholesale case', price: 366.17 / 24, tier: 'mass', typical: true, refPublic: 'Second national brand distilled water 24 x 500 ml, ₱366.17 per case, wholesale club', kind: 'sourced', status: UNVERIFIED, ref: 'Wilkins distilled water 500 ml x 24, ₱366.17 per case (MerryMart Wholesale)', url: 'https://www.merrymartwholesale.com/products/wilkins-distilled-500ml-1-case-includes-24pcs-500ml' }
      ],
      safeWater: { value: 0.48, year: '2022', kind: 'sourced', status: UNVERIFIED, label: 'Safely managed drinking water', source: { publisher: 'World Bank (citing WHO/UNICEF JMP)', title: 'Philippines water supply and sanitation project document', url: 'https://documents1.worldbank.org/curated/en/099060525091012191/pdf/P510359-d6d250a7-d2a8-46a2-a626-c0f00e8436f8.pdf', quote: 'as of 2022, 48 percent of the population has access to safely managed water', year: '2022', accessed: '2026-11-02' } },
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
        { id: 'local', label: 'Local brand, by the carton', price: 8.64 / 24, tier: 'mass', typical: true, kind: 'sourced', status: UNVERIFIED, ref: 'Pere Ocean natural mineral water 24 x 500 ml, S$8.64 incl. GST', refPublic: 'Local brand 24 x 500 ml, S$8.64 per carton incl. GST, brand shop', url: 'https://www.pereocean.com/pere-ocean-natural-mineral-water-500ml', accessed: '2026-10-29' },
        { id: 'premium', label: 'Premium imported brand', price: 56.40 / 24, tier: 'premium', typical: false, kind: 'sourced', status: UNVERIFIED, ref: 'Evian 24 x 500 ml, regular price S$56.40 (promotional S$34.95) at FairPrice', refPublic: 'Premium imported still water 24 x 500 ml, S$56.40 per carton (regular price), supermarket', url: 'https://www.fairprice.com.sg/category/mineral-water', accessed: '2026-10-29', note: 'Regular price used; the promotional price is not a basis for a business case.' }
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

  function derivedBottleWeightG(sizeMl) {
    return factors.pet_bottle_weight_500ml_g.value * Math.pow(sizeMl / 500, factors.pet_bottle_weight_scaling.value);
  }

  return {
    ACCESSED: ACCESSED, UNVERIFIED: UNVERIFIED, verification: verification, rules: rules,
    factors: factors, countries: countries,
    marketOrder: ['MY', 'ID', 'PH', 'SG', 'OTHER'],
    derivedBottleWeightG: derivedBottleWeightG,
    hourlyWage: function (monthly) { return monthly / (factors.working_hours_per_fte_year.value / 12); }
  };
});
