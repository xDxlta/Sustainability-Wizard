# Loading the Swisspro price list

The wizard never invents prices. Until the hotel price list is loaded it offers the user two options:
enter a Swisspro quote, or view a ballpark built from Swisspro's published residential retail prices
(clearly labelled as such). To switch the payback section to real hotel pricing:

1. Open `js/pricing.js`.
2. In `hotel`, set `enabled: true`, `currency` (e.g. `'SGD'` or `'USD'`), `label` (e.g. `'Swisspro hotel price list 2026'`) and `validFrom`.
3. For each product id fill `unit` (price per installed unit), `install` (installation per unit, or 0 if included) and `serviceAnnual` (yearly service-contract fee per unit including filter changes). Leave `null` for items that are always quoted.
   The product ids are: `smart_tap`, `san_tap`, `minibar_station`, `vida`, `fontana`, `grande`, `mesa`, `self_serve_station`, `boh_refill`.
4. If the price list uses a currency other than SGD, MYR, IDR, PHP or USD, add that currency's exchange rate as a country entry in `js/factors.js` (only `currency` and `fx` are needed).
5. Run `npm test` and open the wizard: the payback section now shows "Use the Swisspro hotel price list" and converts to the hotel's currency with the sourced exchange rates.
6. Update `filter_sets_per_unit_per_year` in `js/factors.js` if the service contract defines a different change interval, and update the note on `js/products.js` facts if the price list introduces new models.

Unit counts come from `recommend.unitPlan()` (1 per room, 1 per outlet, 1 station per 3 meeting rooms, 1 back-of-house unit per 150 rooms). Adjust these planning rules in `js/recommend.js` if Swisspro's sales team plans differently.
