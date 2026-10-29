# Research notes: numeric factors (collected 2026-10-29)

Collection method: outbound HTTPS was blocked in the build environment, so no page could be opened
directly. Every value below was read from search-engine excerpts of the cited page and must be
re-checked against the page before the wizard goes live. The values actually used by the wizard
are in `js/factors.js`; this file records the alternatives and the reasoning.

## Packaging and emissions
| Item | Value used | Source (excerpt) | Alternatives seen |
|---|---|---|---|
| Empty 500 ml PET water bottle | 9.89 g | IBWA/BMC: "the average 16.9-ounce PET bottle fell 48 percent to 9.89 grams between 2000 and 2014" https://bottledwater.org/?p=652 ; IBWA testimony 2020 "9.89 grams vs. 23.9 grams for 16.9-ounce containers" | IBWA 2015 release revised to 9.25 g (51%); Petainer "500 ml PET bottles down from 28 g to as low as 18 g"; 2000 baseline 18.9 g, 2008 12.7 g |
| Other bottle sizes | derived, (size/500)^(2/3) | no sourced weights for 330 ml, 600 ml, 1 L, 1.5 L | blog ranges only: 1 L 20-24 g, 1.5 L 30-45 g (not citable) |
| PET greenhouse-gas factor | 3,861.58 kg CO2e/t (primary production incl. forming) | UK Government GHG conversion factors as quoted by GreenCalculus https://greencalculus.com/data/defra-emission-factors/ ; closed-loop 2,211.58 | Climatiq quotes 3,121 (2023 set), 3,855 (2024 flat file), 4,032 (2022 set). Official page https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025 not openable |
| Waste-disposal factor for PET | not used | nearest rows: average plastics landfill ~9.01 kg CO2e/t; combustion with energy recovery ~6.41 (2024) | small relative to production; excluded (conservative) |
| Car-km equivalence | 0.16272 kg CO2e/km, average petrol car | UK GHG factors 2025 via https://greencalculus.com/guides/defra-conversion-factors-what-changed/ | 2024 value 0.16450; 2026 value 0.16152 |
| Energy per litre of bottled water | not used | Gleick & Cooley 2009, ERL 4 014009: "between 5.6 and 10.2 MJ per liter" (via New Atlas) | no CO2e per litre in excerpts |
| Glass bottle weight / washing | not used | Procedia CIRP 2020 Italian reuse LCA: ~7.4 Wh electricity and 0.25 L water per bottle wash | no bottle weight found; glass impacts are not quantified in the wizard |

## Logistics
| Item | Value used | Source |
|---|---|---|
| Bottles per carton | 24 | Nestle Pure Life 24-pack pallet listing https://www.water.com/fr-ca/product/pure-life-water-plastic-bottle-16-oz-24-pack-pallet/ ; Malaysian (Cactus, Desa) and Philippine (Wilkins, Absolute) cartons are also 24 |
| Bottles per pallet (500 ml) | 1,872 (78 cases x 24) | same water.com listing; Costco/Niagara: 1,920 (48 x 40) |
| Pallet footprint | 1.2 m2 (1200 x 1000 mm) | https://palletgauge.com/pallet-size-comparison ; EUR pallet 1200 x 800 mm = 0.96 m2 |

## Hotel occupancy (latest full year)
| Market | Value used | Source |
|---|---|---|
| Singapore | 81.9% (2025) | STB media release 3 Feb 2026 https://www.stb.gov.sg/about-stb/media-publications/media-centre/record-singapore-tourism-receipts-from-january-to-september-2025/ (2024: 81.4%) |
| Malaysia | 56.8% (2025) | Tourism Malaysia paid accommodation survey Jan-Dec 2025 https://data.tourism.gov.my/frontend/pdf/Infographic_paid_accommodation_performance_jan-dec2025.pdf (2024: 54.9%) |
| Indonesia | 48.66% (Jan-Nov 2025, star hotels) | BPS via Bisnis.com https://ekonomi.bisnis.com/read/20260105/12/1941619/okupansi-hotel-berbintang-masih-turun-107-yoy-per-november-2025 ; Dec 2025 alone 56.12% (BPS release 2 Feb 2026) |
| Philippines | 60% (2025) | Leechiu Property Consultants via BusinessWorld https://www.bworldonline.com/?p=743528 ; no official DOT/PSA national series found |

## Labour cost references
| Market | Value used | Source |
|---|---|---|
| Singapore | S$1,910/month (PWM general/indoor cleaner, from 1 Jul 2025) | MOM https://www.mom.gov.sg/employment-practices/progressive-wage-model/cleaning-sector ; MOM OWS June 2024 median "housekeeper (hotels and other establishments)" S$3,233 |
| Malaysia | RM1,700/month (Minimum Wages Order 2024) | https://www.skrine.com/insights/alerts/december-2024/minimum-wages-order-2024-gazetted |
| Indonesia | Rp2,996,561/month (UMP Bali 2025) | https://www.hukumonline.com/berita/a/ump-2025-se-Indonesia-lt68d3bc774d628/ ; DKI Jakarta Rp5,396,761 https://www.beritajakarta.id/read/141340/naik-65-persen-ump-dki-jakarta-2025-ditetapkan-rp5396761 |
| Philippines | PHP 695/day (NCR non-agriculture, from 18 Jul 2025, Wage Order NCR-26) | https://www.pna.gov.ph/articles/1254675 ; later orders (NCR-28, PHP 755 from Sept 2026) exist |
Hours: 2,080 h/yr (40 h x 52) is an assumption used to convert monthly wages to hourly.

## Bottled-water price references (carton prices, not restaurant prices)
| Market | Used | Source |
|---|---|---|
| Singapore | Pere Ocean 24 x 500 ml S$8.64 incl. GST (S$0.36/bottle); Evian 24 x 500 ml S$34.95 promo (S$1.46) | https://www.pereocean.com/pere-ocean-natural-mineral-water-500ml ; https://www.fairprice.com.sg/category/mineral-water |
| Malaysia | Desa 24 x 500 ml RM14.60 (RM0.61); Cactus 24 x 500 ml RM15.95 (RM0.66) | https://acewater.my/price-list-2/ ; https://www.foodservicemalaysia.com/ourproducts/cid/277768/cat/beverage-water/ |
| Indonesia | Aqua 600 ml x 24: average Rp66,718 (Rp2,780), lowest Rp51,000 (Rp2,125) | https://www.blibli.com/jual/akua-600-ml-per-dus |
| Philippines | Absolute 24 x 500 ml PHP 334.57 (PHP 13.94); Wilkins PHP 366.17 (PHP 15.26) | https://www.merrymartwholesale.com/products/absolute-distilled-water-500ml-1-case-includes-24-pcs-500ml |
Numbeo retail references (not used, restaurant/market prices): SG 0.33 L S$1.60; KL 0.33 L RM2.05; ID 0.33 L Rp4,393; Metro Manila 0.33 L PHP 29.07.

## Exchange rates (late October 2026)
SGD 1.28025/USD (MTFX, 26 Oct); MYR 4.0745/USD (Bernama/Malay Mail, 28 Oct close); IDR 18,147.4/USD (Morningstar, 26 Oct; Bank Indonesia 28 Oct sell 18,229.69 / buy 18,048.31); PHP 63.453/USD (BSP bulletin 26 Oct).

## Bottles per room-night and labour time
- No published minutes-per-room figure for bottle handling exists; the wizard uses labelled assumptions (1 min per occupied room per day; 2 min per carton).
- "Two bottles a night" (Aquablu, Sheraton Brussels Airport, 294 rooms, 40,000+ bottles avoided in 2024); "two 750 ml bottles per room per day" (Topia Water model, 375 rooms, 70% occupancy = 191,625 bottles/yr).
- Fairmont Singapore / Swissotel The Stamford (2,030 rooms): "reduced 1.5 million single-use plastic bottles per year"; Fairmont South Tower + Raffles City Convention Centre: "7,228 kg reduction in plastic waste yearly".
  https://www.swissotel-singapore-stamford.com/the-hotel/blog/sustainability-at-fairmont-singapore-swissotel-the-stamford/ ; https://www.fairmont-singapore.com/blog/sustainability-at-fairmont-singapore/
- Swisspro's own claim: "Fairmont Singapore has done away with over 600'000 plastic bottles in a single year" https://swissprowater.com/drink-business-class-with-swisspro/
- Adelaide Marriott (CIVIQ): 45,000+ bottles saved vs forecast ~110,000/yr. IHG Dubai Festival City: on-site glass bottling replaces up to 2 million bottles/yr.
