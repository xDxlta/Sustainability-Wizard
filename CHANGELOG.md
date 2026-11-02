# Changelog

## Version 2.2 (branch claude/wizard-v2), 2 November 2026

Note: the entries for the work between 2.1 and this release were written to the wrong heading by the
build script and never reached this file. They are recorded here.

### Business case gaps (this release)
- Guest rooms only in the headline payback and the lead statement (base case: basic tap per room).
- Drinking stations (restaurants and bars, meetings and events, staff areas) are a separate block with
  their own investment and service. New optional answers: bottles a day per area, with "Not sure". With
  a figure the block shows the station saving, the station payback and a combined payback for rooms and
  stations; without one it shows the station cost on its own. Stations never enter the room payback.
- When the cash case does not pay back, the lead and the top tiles show only what holds: staff hours
  freed and their value, bottles and plastic avoided, and the market's share of safely managed drinking
  water when below the world share (WHO/UNICEF JMP). No "No payback" or negative figure there; the
  business case table keeps every figure. New line under the business case: "Your proposal can include
  a service plan for your market."
- Register: `safe_water_world_2022` and `safeWater` for Malaysia, Indonesia and the Philippines.
- Owner sheet: the upgrade box and a station block without bottle figures are left out of the print so
  the sheet stays on two A4 pages.

### Business case defaults (commits 482dec1 and c32c190)
- Servicing default: one filter change per room and year at the In-Room comprehensive price (85.00,
  labour and parts), source the Westin Singapore case (Final Presentation 2024, Swisspro student team,
  p. 13 and p. 44, figures provided by Swisspro). Was: per change every 9 months (113.33 a year). Per
  2-year contract and per change every 9 months stay under Adjust.
- Base case and upgrades: the basic in-room tap (SMART Classic+, 140.00) is the base case whatever water
  type is chosen; the matching unit (for example CLIMA Versa+ 980.00) is an upgrade with its extra
  investment, extra service and own payback. The "lower-cost option" toggle is gone.
- Bottle price "Not sure": the typical price, the median of the market's references (was the lowest).
- Lead statement: the first true statement of payback within five years, payback including staff time
  freed, yearly saving, cost per occupied room-night or the benefits that hold; never a negative verdict.
  Payback including staff time freed is shown next to the cash payback.
- Five-year view: cumulative cost of bottled water against Swisspro (investment plus service), break-even
  marked, figures behind a toggle.
- Per room and month: bottled water today against Swisspro in years 1 to 3 (service plus investment over
  36 months) and from year 4 (service only), labelled as arithmetic, not an offer.
- Exact hotel figures: no preset chips for guest rooms; occupancy typed in percent with "Not sure"
  (national average); "Start again" clears the answers.
- Register: `westin_case_2024` and `service_changes_per_room_year` (kind `sourced-secondary`); the
  business case moved to `js/business.js` with acceptance tests in `test/business.test.js`.

### Earlier changes since 2.1 (not recorded at the time)
- Result page rework after three simulated hotel-manager reviews: verdict line, plain investment and
  service sentence, scope line (list currency, exchange rate, exclusions), sparkling served by a station,
  one recommended model per area, money formatting, public sources page without build notes, interview
  material moved to `docs/internal`.
- Desktop layout: step rail, label and options side by side, two-column result with the proposal form
  beside it, flat stat strip; no eyebrow labels, side stripes, shadows or drawn logo; design skill in
  `.claude/skills/swisspro-design` and brand extractor `tools/extract-brand.js`.
- Acceptance criteria and `tools/benchmark.js`: owner sheet with calculation path and CSV download,
  "Not sure" preselected where a reference exists, hotel segment and phone in the request form.
- Removed the "bottles outside the rooms" adjust field (it defaulted to 0 and changed nothing); replaced
  in this release by the optional bottles a day per area.

## Version 2.1 (branch claude/wizard-v2), 30 October 2026

- Flow cut to three steps and nine answers: market, rooms, occupancy; what guests find in the room today
  (rephrased), bottles per night, bottle size, price; areas, water in the room. Removed from the flow: brand
  tier, building, placement, water source, known issues, Halal (they changed only text). Water supply and
  Halal are optional fields of the proposal form; bottles outside rooms is a default (0) in the adjust panel.
- Result page reduced to five tiles, payback and the matching price-list units; logistics, argument order,
  assumptions and sources are collapsed; the water-supply and "how to present the case" cards are gone.
- Visual redesign of the whole site (tokens, type, alignment, phone width) without logic changes.

## Version 2 (branch claude/wizard-v2), October 2026

Purpose shift: the wizard is a decision-support tool for the hotel on Swisspro's website, not a sales
questionnaire. Every question stays only if its answer changes what the hotel sees.

### Removed
- Questions on ownership model, approval authority, time frame, decision drivers, finish colour and
  counter space, and the contact step: they served lead sorting, not the hotel's result.
- The lead score (points, Hot/Warm/Nurture) in the UI, the summary and the code.
- Product names, features and filter ratings taken from Swisspro's website and online shop
  (SAN, SMART, CLIMA, FONTANA, "0.2 micron", NSF/Halal claims): none of these pages could be opened,
  and the brief makes the Hospitality price list the only product source.
- Residential retail prices as a payback "ballpark".
- The assumption that Halal certification is required in Malaysia.

### Changed
- Flow cut from 10 steps / 30 fields to 6 steps / 17 fields; "Not sure" on every numeric question backed
  by a market reference value; only the room count is typed.
- Markets ordered Malaysia, Indonesia, Philippines, Singapore; all test scenarios and the worked example
  are in the first three.
- Products and prices now come only from `js/pricelist.js`: the Hospitality section of the price list
  (PDF dated 16 Sep 2026, prices excl. GST), transcribed verbatim on 30 Oct 2026 from the lines the project
  team provided: 4 In-Room and 8 F&B / Drinking Station products, 3 In-Room and 2 F&B servicing lines.
  A line matches when its section equals the solution's area and its printed water types cover every
  requested one; the lowest-priced match sets the investment, all matches are listed. In-room sparkling has
  no matching line (the list prints sparkling only for the CLIMA Vida S station), so that case asks for a
  proposal figure.
- Service contract: the 85.00 In-Room line states no interval, so the result page offers three readings
  with the most conservative as default: per filter change every 9 months (113.33 per unit and year; the
  9 months come from the residential section as reported by the team), per unit and year (85.00), per unit
  and 2-year contract (42.50). Drinking stations use the quarterly line (350.00 per station and year).
  Currency SGD stays a labelled assumption.
- Filtration is described generically; the specification is confirmed in the proposal after a water test.
- Every sourced value carries a verification status. Because no page could be opened, all are
  "unverified" in the register, in the UI and in VERIFY.md; one choice rule per disputed factor
  (occupancy, wage, bottle price, exchange rate, PET factor, bottle weight) is stated once.
- Glass bottles: CO2e uses 0.061 kg CO2e per litre (Garfi et al. 2016, glass scenario), opened and reported
  by the project team on 30 Oct 2026 and labelled "opened by the team" until the wording is pasted into
  VERIFY.md; plastic stays unquantified for glass.
- Approval thresholds from the Marriott interview appear only as a neutral note under the payback.
- Timing and approval are optional fields of the "request a proposal" form.
- Logistics details (pallets, storage area, deliveries, tonnes, FTE, per-room figures) moved behind
  "Show more".
- Intro copy, step texts and result texts rewritten; no dashes used as punctuation.

### Kept from version 1
- Pure calculation engine with the same formulas; cash payback and payback including the value of
  staff time; argument order adapting to tier and market; the single factor register; the sources page;
  the plausibility check against the Fairmont/Swissotel figure; unit tests and the headless walkthrough.

### Open
- Place `docs/Swisspro_Price_List.pdf` in the repository and check the transcription against it.
- Open and confirm every web source in VERIFY.md; set `status: 'opened'`; paste the Garfi wording.
- Confirm with Swisspro which reading of the 85.00 line is right, and the lead email address.
