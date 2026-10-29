# Open items

## Needs Swisspro
1. **Hotel price list.** Not available in the build environment. Load it into `js/pricing.js`
   (see `docs/PRICING-HOWTO.md`). Until then payback uses the user's quote or a labelled retail ballpark.
2. **Service-contract terms.** Filter change interval per product (`filter_sets_per_unit_per_year`),
   what the yearly fee includes, and the planning rules for unit counts.
3. **Lead email / endpoint.** `leadEmail` is set to info@swisspro.sg (from a directory listing); confirm
   the sales manager's address or add a form endpoint (`formEndpoint`).
4. **Certificates.** Halal (JAKIM) and NSF certificates are mentioned on Swisspro's Archify listing but could
   not be opened; attach the documents and quote them in `js/products.js`.
5. **Product facts.** Temperatures in degrees, finishes (chrome/black) per model, HRC Triple Tap details,
   flow rates for stations, and which model is used for minibar stations in the reference hotels.
6. **Branding.** Logo, fonts and colours from swissprowater.com; replace the placeholder brand mark and the
   CSS tokens in `styles.css`.
7. **Privacy notice.** If contact details are collected on the website, add the PDPA (Singapore) / local
   privacy text and a consent checkbox.

## Needs verification before go-live (links could not be opened from the build environment)
- UK Government GHG conversion factors 2025: PET material-use factor (currently 3,861.58 kg CO2e/t via a
  third-party table; other quotes 3,121-4,032) and the average-car factor.
- Green Globe indicator wording on single-use bottles (currently attributed to the interview).
- Forbes Travel Guide Responsible Hospitality water/plastic wording (2026 section overviews).
- Indonesia full-year 2025 star-hotel occupancy (currently Jan-Nov cumulative 48.66%).
- Philippines national occupancy (currently a consultancy figure, 60%).
- All bottle-price listings (marketplace prices move).
- Exchange rates (October 2026 snapshot).
Hosts to allow if the verification is done in the same cloud environment: www.gov.uk,
assets.publishing.service.gov.uk, bottledwater.org, www.stb.gov.sg, data.tourism.gov.my, www.bps.go.id,
www.mom.gov.sg, www.greenglobe.com, www.forbestravelguide.com, swissprowater.com.

## Product decisions for the team
- Whether to show the retail ballpark on the public website at all, or only in a sales-manager mode.
- Whether to add a "sales mode" (URL flag) that shows the lead score and the raw inputs.
- Whether to add 19 L cooler-bottle economics (currently only counted via "bottles outside rooms").
- Translations (Bahasa, Thai, Chinese) once the English text is final.
- Analytics (page views, completion rate) if Swisspro wants to measure the funnel.
