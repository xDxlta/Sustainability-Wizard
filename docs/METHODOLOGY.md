# Methodology

The wizard turns ten multiple-choice answers into an indicative business case. All arithmetic lives in
`js/engine.js` (pure functions, unit-tested); all numbers live in `js/factors.js` with a provenance label.

## Provenance labels (version 2)
| Label | Meaning |
|---|---|
| Sourced | A published value whose page was opened and whose quoted wording is on it. |
| Sourced, unverified | The page could not be opened when this version was built; value and quote come from a search-engine excerpt and are listed in VERIFY.md. Every sourced value carries this label in version 2. |
| Derived | Arithmetic on other register values; the formula is stated. |
| Assumption | No published source. Explicit, explained and editable on the result page. |
| Your input | Entered or changed by the user. |

Where sources disagree, one value per factor is chosen by a rule stated once in `js/factors.js` (`rules`): newest official national occupancy figure (official year-to-date if the year is incomplete, named consultancy if no official series); statutory minimum wage 2025 (Bali for Indonesia); lowest published national-brand carton price; one USD rate per currency on a single reference date; newest UK Government PET factor; IBWA 500 ml bottle weight.

## Formulas
Let R = rooms, O = occupancy, B = bottles per occupied room-night, D = 365, X = bottles used outside rooms per day.

1. Occupied room-nights `N = R x O x D`
2. Bottles avoided per year `Q = N x B + X x D`
3. Litres `= Q x size / 1000`
4. Plastic avoided `= Q x w(size) / 1000` kg, where `w(500) = 9.89 g` (IBWA/BMC) and `w(s) = 9.89 x (s/500)^(2/3)` for other sizes (assumption).
   Glass bottles: no opened source for a weight, so not quantified; reusable glass already avoids single-use packaging.
5. CO2e avoided `= plastic kg x 3.86 kg CO2e/kg` (UK GHG factor, PET primary production incl. forming, unverified). Cradle-to-gate only: transport, chilling, disposal and the filter unit's electricity are excluded.
   Car-km equivalence `= CO2e / 0.16272 kg/km`. Glass: `bottles x glass factor` once `factors.glass_co2e` holds a value; until then "not estimated" with the reason (Garfi et al. 2016 could not be opened).
6. Bottled-water spend avoided `= Q x price per bottle` (local currency; sourced carton prices or the user's own).
7. Housekeeping time `= N x minutes per room / 60 + (Q / 24) x minutes per carton / 60` hours; value `= hours x hourly wage`, where hourly wage = monthly reference wage / (2080/12).
8. Logistics: cartons `= Q / 24`; pallets `= Q / (1872 x 500/size)`; peak pallets `= pallets x stock weeks / 52`; store area `= peak pallets x 1.2 m2 x aisle multiplier`; deliveries `= 52 / stock weeks`; tonnes carried `= Q x (size/1000 + w/1000) / 1000`.
9. Service contract per year `= units x 85.00 / interval years`, converted from the list currency (SGD, assumption) with the register's exchange rates; interval 2 years is an adjustable assumption. Units `= rooms (in-room) + one station per other area` (assumption).
10. Payback: cash savings `= spend avoided - annual service`; full savings `= cash savings + labour value`; payback years `= investment / savings`; five-year net `= 5 x savings - investment`. The investment comes from the price list (once loaded) or from the hotel's proposal.

## Conservative choices
- Lightest documented bottle weight (US average); regional bottles are heavier.
- Cheapest sourced carton price when the user does not know the price.
- Statutory minimum or PWM floor wages, no employer on-costs.
- Only guest-room bottles are counted unless the user adds a figure for other areas.
- No credit for transport, chilling, disposal or the Fairmont-style marketing value.

## Argument order and solution fit
`js/recommend.js` orders the arguments ROI > efficiency > sustainability > safety by default (Marriott interview), switches to efficiency and safety first where the bottle price is below US$0.25 (provisional threshold, labelled assumption), to guest experience first for luxury, and to safety first for wells or reported microbial issues. There is no lead score in version 2.

Solutions are described per price-list area: In-Room (tap for ambient; chilled or hot-and-chilled unit at the minibar; still, chilled and sparkling unit for suites) and F&B / Drinking Station (self-serve station, back-of-house filling point). Models and prices come only from `js/pricelist.js`; the filtration is described generically and confirmed in the proposal after a water test where the supply answers call for one. Halal is asked, never assumed.

## Validation
- 2,030 rooms at 81.9% occupancy and 2 bottles per room-night gives about 1.2 million bottles a year; Fairmont Singapore and Swissotel The Stamford report avoiding 1.5 million (hotel website).
- 34 unit tests (`npm test`) cover the formulas, defaults, overrides, register integrity and recommendation rules; `node tools/walkthrough.js` drives the UI end-to-end in headless Chromium for three scenarios (Kuala Lumpur luxury 150 rooms existing, Surabaya select-service 250 rooms new build, Manila premium 300 rooms existing) on desktop and mobile, and fails on console errors, forbidden texts (filter ratings, lead score) or a missing "unverified" label.

## Known limitations
- The Hospitality price list was not available; the wizard names no model until it is transcribed, and the investment comes from the hotel's proposal.
- No source could be opened from the build environment; every sourced value is unverified (VERIFY.md).
- Glass bottles have no CO2e value until a glass factor is entered.
