# Methodology

The wizard turns ten multiple-choice answers into an indicative business case. All arithmetic lives in
`js/engine.js` (pure functions, unit-tested); all numbers live in `js/factors.js` with a provenance label.

## Provenance labels
| Label | Meaning |
|---|---|
| Sourced | Read from the cited page (via a search-engine excerpt of it; re-open the link before go-live). |
| Sourced (secondary) | The official publication could not be read; a third party's quote of it is used. Only the UK GHG factors carry this label. |
| Derived | Arithmetic on sourced values; the formula is stated in the registry. |
| Assumption | No published source. Explicit, explained and editable on the results page. |
| Your input | Entered or changed by the user. |

## Formulas
Let R = rooms, O = occupancy, B = bottles per occupied room-night, D = 365, X = bottles used outside rooms per day.

1. Occupied room-nights `N = R x O x D`
2. Bottles avoided per year `Q = N x B + X x D`
3. Litres `= Q x size / 1000`
4. Plastic avoided `= Q x w(size) / 1000` kg, where `w(500) = 9.89 g` (IBWA/BMC) and `w(s) = 9.89 x (s/500)^(2/3)` for other sizes (assumption).
   Glass bottles: not quantified (no sourced factor); reusable glass already avoids single-use packaging.
5. CO2e avoided `= plastic kg x 3.86 kg CO2e/kg` (UK GHG factor, PET primary production incl. forming). Cradle-to-gate only: transport, chilling, disposal and the filter unit's electricity are excluded.
   Car-km equivalence `= CO2e / 0.16272 kg/km`.
6. Bottled-water spend avoided `= Q x price per bottle` (local currency; sourced carton prices or the user's own).
7. Housekeeping time `= N x minutes per room / 60 + (Q / 24) x minutes per carton / 60` hours; value `= hours x hourly wage`, where hourly wage = monthly reference wage / (2080/12).
8. Logistics: cartons `= Q / 24`; pallets `= Q / (1872 x 500/size)`; peak pallets `= pallets x stock weeks / 52`; store area `= peak pallets x 1.2 m2 x aisle multiplier`; deliveries `= 52 / stock weeks`; tonnes carried `= Q x (size/1000 + w/1000) / 1000`.
9. Payback: cash savings `= spend avoided - annual service`; full savings `= cash savings + labour value`; payback years `= investment / savings`; five-year net `= 5 x savings - investment`.

## Conservative choices
- Lightest documented bottle weight (US average); regional bottles are heavier.
- Cheapest sourced carton price when the user does not know the price.
- Statutory minimum or PWM floor wages, no employer on-costs.
- Only guest-room bottles are counted unless the user adds a figure for other areas.
- No credit for transport, chilling, disposal or the Fairmont-style marketing value.

## Lead sorting
`js/recommend.js` scores readiness from drivers (certification, audits, mandate, renovation), timeline, approval authority, size, current supply and contact details; tiers Hot (11+), Warm (7-10), Nurture. It orders the arguments ROI > efficiency > sustainability by default (Marriott interview), switches to efficiency/safety first in cheap-bottled-water markets (Malaysia, Indonesia) and to guest experience first for luxury, and promotes compliance when a certification, audit or mandate driver is selected.

## Product fit
Rules map placement, temperatures, finish and space to Swisspro families described on swissprowater.com: SMART/SAN taps (ambient), minibar hot & cold station (CLIMA Piso V2 under-counter; Fairmont and Pan Pacific Orchard references), CLIMA Vida (compact, black), FONTANA (built-in, sparkling), CLIMA Grande/Mesa (back of house), self-serve stations and back-of-house refilling for F&B and events. Filter specification defaults to 0.2-micron absolute microfiltration + activated carbon, with pre-filter and water-test flags driven by the water-supply answers, and a Halal flag for Malaysia or on request.

## Validation
- 2,030 rooms at 81.9% occupancy and 2 bottles per room-night gives about 1.2 million bottles a year; Fairmont Singapore and Swissotel The Stamford report avoiding 1.5 million (hotel website).
- 32 unit tests (`npm test`) cover the formulas, defaults, overrides and recommendation rules; `node tools/walkthrough.js` drives the UI end-to-end in headless Chromium for three scenarios on desktop and mobile.

## Known limitations
- The hotel price list was not available; payback uses either the user's quote or Swisspro's published residential retail prices as a labelled ballpark.
- Several sources (UK GHG factors, Green Globe wording, Indonesia full-year occupancy) could not be opened directly; see `docs/OPEN-ITEMS.md`.
