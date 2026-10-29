# Open items (version 2)

## Blocking for the product recommendation
1. **Hospitality price list.** `docs/Swisspro_Price_List.pdf` was not available in the build environment.
   Transcribe its Hospitality section into `js/pricelist.js` (see `docs/PRICING-HOWTO.md`). Until then the
   wizard describes the solution type per area and names no model or unit price.

## Verification (see VERIFY.md)
2. Every sourced value is "unverified": open each URL, confirm the quote, set `status: 'opened'`.
   First the PET emission factor (official gov.uk file), then occupancy and wages.
3. Glass emission factor: open Garfi et al. 2016 (link in VERIFY.md) and enter the glass-scenario value in
   `factors.glass_co2e`; the engine then quantifies CO2e for glass bottles automatically.

## Needs Swisspro
4. Service-contract interval (2 or 3 years) and what the 85.00 line includes; the currency of the list.
5. Lead email address for the proposal request (`leadEmail` in `js/pricelist.js`).
6. Halal and other certificates: the wizard asks the hotel and tells it to request the certificate; it
   makes no claim about Swisspro's certification.
7. Brand assets (logo, fonts, colours) for `styles.css`; privacy text if contact details are collected.

## Product decisions for the team
- Whether Singapore stays selectable on the public site.
- Whether to show the "Local rules and standards" facts while they are unverified.
- Translations once the English text is final.
