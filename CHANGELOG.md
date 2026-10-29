# Changelog

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
- Products and prices now come only from `js/pricelist.js` (Hospitality section of the price list, In-Room
  vs F&B / Drinking Station). The PDF was not available in the build environment, so the module holds the
  schema and the servicing line from the brief; the wizard then describes the fitting solution type per
  area and names no model until the list is transcribed.
- Service contract: "Comprehensive SUPERSWISS Replacement, 2 or 3 Year Contract Price with labour and
  change of parts, 85.00" is used for the yearly service cost with the replacement interval (2 years) and
  the currency (SGD) as visible, adjustable assumptions.
- Filtration is described generically; the specification is confirmed in the proposal after a water test.
- Every sourced value carries a verification status. Because no page could be opened, all are
  "unverified" in the register, in the UI and in VERIFY.md; one choice rule per disputed factor
  (occupancy, wage, bottle price, exchange rate, PET factor, bottle weight) is stated once.
- Glass bottles: the CO2e tile says why no value is shown (the candidate factor from Garfi et al. 2016 could
  not be opened); the engine quantifies glass as soon as a factor is entered in the register.
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
- Transcribe the Hospitality section of `docs/Swisspro_Price_List.pdf` into `js/pricelist.js`.
- Open and confirm every source in VERIFY.md; set `status: 'opened'`.
- Enter a glass emission factor once Garfi et al. 2016 (or another source) is opened.
- Confirm the lead email address and the service-contract interval with Swisspro.
