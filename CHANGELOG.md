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
