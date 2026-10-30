# Open items (version 2, 30 October 2026)

## Verification (see VERIFY.md)
1. Every web source is "unverified": open each URL, confirm the quote, set `status: 'opened'` in
   `js/factors.js`. First the PET emission factor (official gov.uk file), then occupancy and wages.
2. Glass factor (Garfi et al. 2016, 0.061 kg CO2e per litre): opened by the team; paste the exact wording
   into VERIFY.md and set `status: 'opened'`.
3. Put `docs/Swisspro_Price_List.pdf` into the repository and check `js/pricelist.js` against it (names,
   prices, the 9-month interval line of the residential section).

## Needs Swisspro
4. Which reading of the 85.00 In-Room servicing line is right (per change, per year, per 2-year contract):
   the wizard defaults to per change every 9 months and shows the alternatives.
5. Whether installation is included in the product prices (the wizard uses list price x units).
6. Lead email address for the proposal request (`leadEmail` in `js/pricelist.js`).
7. Halal and other certificates: the wizard asks the hotel and tells it to request the certificate.
8. Brand assets (logo, fonts, colours) for `styles.css`; privacy text if contact details are collected.

## Product decisions for the team
- Whether Singapore stays selectable on the public site.
- Whether to show the "Local rules and standards" facts while they are unverified.
- Whether the Excel skeleton and the wizard should use the same service reading (the wizard's default is
  the per-change reading).
- Translations once the English text is final.
