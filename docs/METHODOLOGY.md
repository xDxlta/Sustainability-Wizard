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
Let R = rooms, O = occupancy, B = bottles per occupied room-night, D = 365.

1. Occupied room-nights `N = R x O x D`
2. Bottles avoided per year `Q = N x B` (guest rooms only; no published figure exists for bottles used outside the rooms, so they are not counted)
3. Litres `= Q x size / 1000`
4. Plastic avoided `= Q x w(size) / 1000` kg, where `w(500) = 9.89 g` (IBWA/BMC) and `w(s) = 9.89 x (s/500)^(2/3)` for other sizes (assumption).
   Glass bottles: no opened source for a weight, so not quantified; reusable glass already avoids single-use packaging.
5. CO2e avoided `= plastic kg x 3.86 kg CO2e/kg` (UK GHG factor, PET primary production incl. forming, unverified). Cradle-to-gate only: transport, chilling, disposal and the filter unit's electricity are excluded.
   Car-km equivalence `= CO2e / 0.16272 kg/km`. Glass: `litres x 0.061 kg CO2e/L` (Garfi et al. 2016, glass scenario with bottles reused 8 times; opened by the team).
6. Bottled-water spend avoided `= Q x price per bottle` (local currency; sourced carton prices or the user's own).
7. Housekeeping time `= N x minutes per room / 60 + (Q / 24) x minutes per carton / 60` hours; value `= hours x hourly wage`, where hourly wage = monthly reference wage / (2080/12).
8. Logistics: cartons `= Q / 24`; pallets `= Q / (1872 x 500/size)`; peak pallets `= pallets x stock weeks / 52`; store area `= peak pallets x 1.2 m2 x aisle multiplier`; deliveries `= 52 / stock weeks`; tonnes carried `= Q x (size/1000 + w/1000) / 1000`.

9. Service contract per year `= in-room units x s + stations x 350.00`, where `s` is the reading of the 85.00 In-Room line (comprehensive, labour and parts): one change per room and year `= 85` (default since 2.5, source: Westin Singapore case, Final Presentation 2024, p. 13 and p. 44, figures provided by Swisspro), per 2-year contract `= 42.50`, per change every m months `= 85 x 12 / m` (m = 9: 113.33, least favourable); converted from the list currency (SGD, assumption) with the register's exchange rates. Units `= rooms (in-room) + one station per other area` (assumption). The service contract is always part of the cash payback.
10. Investment, base case `= rooms x SMART Classic+ (140.00, the lowest-priced In-Room line, a filtered tap) + stations x lowest-priced F&B line with chilled water`, whatever water type the hotel asked for in the room. Upgrade `= the In-Room line that gives the requested water (for example CLIMA Versa+ 980.00 for hot and chilled), plus a sparkling station where sparkling is asked`; shown as extra investment, extra service and its own payback below the base case.
11. Payback: cash savings `= spend avoided - annual service`; savings including staff time freed `= cash savings + labour value`; payback years `= investment / savings` (no payback when savings are not positive); five-year net `= 5 x savings - investment`. Both paybacks are shown side by side; the one including staff time is always labelled so.
12. Five-year view: cumulative cost after t years, bottled water `= t x spend`, Swisspro `= investment + t x service`; the lines cross at the cash payback.
13. Per room and month (arithmetic, not an offer): bottled water today `= spend / rooms / 12`; Swisspro in years 1 to 3 `= (service + investment / 3) / rooms / 12`; from year 4 `= service / rooms / 12`.
14. Lead statement, first that is true: cash payback within the five-year view; else payback including staff time freed within five years; else positive yearly saving (cash, then including staff time); else lower cost per occupied room-night including staff time (investment spread over 3 years); else the facts of today's bottled water (bottles, spend, staff hours). The lead never opens with a negative verdict; the full business case table below always shows the cash payback.

### Reference check: Westin Singapore (2024)
305 rooms, 243,840 bottles a year at S$0.17 (S$40,640), basic tap: investment `305 x 140 = S$42,700`. With the price-list service line (85.00 per room and year) payback `= 42,700 / (40,640 - 25,925) = 2.9 years`; with the case's filter-only figure (65.00) `= 42,700 / (40,640 - 19,825) = 2.05 years`, matching the case's "break-even in about 2 years". Both are unit tests (`test/business.test.js`).

## Defaults and how favourable they are
Every default sits within a range that can be defended from the price list, the register or the Westin case; the less favourable readings stay under "Adjust the assumptions".
- Service: one change per room and year (Westin case); per change every 9 months is selectable and was the default before 2.5.
- Room set-up: basic tap as the base case; the unit matching the requested water is an upgrade with its own payback.
- Bottle price when "Not sure": the typical price, the median of the market's references (before 2.5: the lowest). No source gives the full in-room cost of a bottle (delivery, storage, disposal), so only the purchase price is used; handling time is counted as staff time.
- Lightest documented bottle weight (US average); regional bottles are heavier, so plastic is conservative.
- Statutory minimum or PWM floor wages, no employer on-costs.
- Only guest-room bottles are counted unless the user adds a figure for other areas.
- No credit for transport, chilling, disposal or the Fairmont-style marketing value.

## Argument order and solution fit
`js/recommend.js` orders the arguments ROI > efficiency > sustainability > safety by default (Marriott interview) and efficiency > safety > ROI > sustainability where the bottle price is below US$0.25 (provisional threshold, labelled assumption). The order is shown collapsed under "More". There is no lead score.

Solutions are named per price-list area: In-Room (ambient tap; chilled or hot-and-chilled unit; chilled and sparkling) and F&B / Drinking Station. Models and prices come only from `js/pricelist.js`, matched on the section and the printed water types (see `docs/PRICING-HOWTO.md`). Filtration specification, water test and installation are confirmed in the proposal; water supply and Halal are optional fields of the proposal form.

## Validation
- 2,030 rooms at 81.9% occupancy and 2 bottles per room-night gives about 1.2 million bottles a year; Fairmont Singapore and Swissotel The Stamford report avoiding 1.5 million (hotel website).
- 41 unit tests (`npm test`) cover the Westin reproduction, the three scenarios' lead statements, the formulas, defaults, overrides, register integrity and recommendation rules; `node tools/walkthrough.js` drives the UI end-to-end in headless Chromium for three scenarios (Kuala Lumpur luxury 150 rooms existing, Surabaya select-service 250 rooms new build, Manila premium 300 rooms existing) on desktop and mobile, and fails on console errors, forbidden texts (filter ratings, lead score) or a missing "unverified" label.

## Known limitations
- The price list lines were transcribed from the team's copy; the PDF itself is not in the repository yet.
- No web source could be opened from the build environment; every such value is unverified (VERIFY.md).
- The reading of the 85.00 service line is the biggest lever on the payback and is still to be confirmed by Swisspro. At the Indonesian reference price (Rp2,452 per bottle) the service contract (85.00 per room and year) is higher than the bottle spend, so Surabaya with default answers has no cash payback; the lead then states the hotel's bottles, spend and staff hours, and the business case table shows the payback.
