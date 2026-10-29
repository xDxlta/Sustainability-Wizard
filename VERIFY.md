# VERIFY.md: every factor, its value, URL, quoted wording, and whether the page was opened

Status on 29 October 2026: the build environment could not open any external page (every host was
denied by the network policy). Therefore **no sourced value in this version has been verified by
opening its page**. Each row below says "opened: no". The quoted wording is what a search-engine
excerpt of the page returned; it must be checked against the page before the wizard goes live.
The wizard labels these values "Sourced, unverified" in the UI and in `js/factors.js`.

Choice rules where sources disagree (applied once per factor): see `js/factors.js` (`rules`) and the
"Choice rule" column.

| Factor | Value used | URL | Quoted wording (from excerpt) | Opened | Choice rule / note |
| --- | --- | --- | --- | --- | --- |
| Empty 500 ml PET bottle weight | 9.89 g | https://bottledwater.org/?p=652 | "the average 16.9-ounce PET bottle fell 48 percent to 9.89 grams between 2000 and 2014" | no | IBWA/BMC 2014 average; a 2015 IBWA release revised the series to 9.25 g |
| PET emission factor | 3,861.58 kg CO2e/t | https://greencalculus.com/data/defra-emission-factors/ (official: https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025) | "PET primary production value of 3861.58251 kg CO2e per tonne, with a closed-loop figure of 2211.58251" | no | Newest UK Government set (2025), PET primary incl. forming; other third-party quotes 3,121 to 4,032 |
| Average petrol car | 0.16272 kg CO2e/km | https://greencalculus.com/guides/defra-conversion-factors-what-changed/ | "Average car, petrol ... kg CO2e per km \| 0.16272" | no | 2025 set |
| Glass bottle emission factor | none (missing) | https://sustainable.columbia.edu/sites/default/files/content/Documents/1-s2.0-S0959652616311234-main.pdf (Garfi et al. 2016, J. Cleaner Production 137, 997-1003) | per-m3 global-warming results not retrievable without opening the paper; excerpts only report inventories (glass bottles reused 8 times; 154 kg/m3 material, 4,900 MJ/m3 energy for glass vs 130 kg/m3, 1,000 MJ/m3 for PET) | no | Left missing on purpose; see factors.js glass_co2e.note |
| Bottles per carton | 24 | https://www.water.com/fr-ca/product/pure-life-water-plastic-bottle-16-oz-24-pack-pallet/ | "packs of 24 ... 78 cases, or 1,872 bottles, per pallet" | no | |
| Bottles per pallet (500 ml) | 1,872 | same | same | no | Costco/Niagara list 1,920 |
| Pallet footprint | 1.2 m2 | https://palletgauge.com/pallet-size-comparison | "1200 x 1000 mm - 1.200 m2" | no | |
| Occupancy Malaysia | 56.8 % (2025) | https://data.tourism.gov.my/frontend/pdf/Infographic_paid_accommodation_performance_jan-dec2025.pdf | "Malaysia 2025 - 56.8%, 2024 - 54.9%" | no | Newest official national full-year figure |
| Occupancy Indonesia | 48.66 % (Jan-Nov 2025, star hotels) | https://ekonomi.bisnis.com/read/20260105/12/1941619/okupansi-hotel-berbintang-masih-turun-107-yoy-per-november-2025 (BPS) | "Secara kumulatif Januari hingga November 2025, BPS mencatat TPK hotel bintang sebesar 48,66%" | no | Official year-to-date figure; Dec 2025 alone 56.12 % |
| Occupancy Philippines | 60 % (2025) | https://www.bworldonline.com/?p=743528 (Leechiu Property Consultants) | "Hotel occupancy in 2025 remained at 60%, flat year on year, and still below the 68% recorded in 2019" | no | No official national series found; newest named consultancy |
| Occupancy Singapore | 81.9 % (2025) | https://www.stb.gov.sg/about-stb/media-publications/media-centre/record-singapore-tourism-receipts-from-january-to-september-2025/ | "hotel occupancy of 81.9% for 2025, up from 81.4% in 2024" | no | Newest official national full-year figure |
| Wage Malaysia | RM1,700/month | https://www.skrine.com/insights/alerts/december-2024/minimum-wages-order-2024-gazetted | "Employers with fewer than five staff ... had until 1 August 2025 to move to RM1,700" | no | Statutory minimum wage 2025 |
| Wage Indonesia | Rp2,996,561/month (UMP Bali 2025) | https://www.hukumonline.com/berita/a/ump-2025-se-Indonesia-lt68d3bc774d628/ | "Bali Rp2.996.561 (naik Rp179.889 dibandingkan UMP 2024)" | no | Provincial minimum wage of the largest leisure market; Jakarta Rp5,396,761, East Java Rp2,305,985, Surabaya UMK Rp4,961,753 (all unverified) |
| Wage Philippines | PHP 695/day (NCR, from 18 Jul 2025) | https://www.pna.gov.ph/articles/1254675 | "Wage Order NCR-26 raised the non-agriculture daily minimum in Metro Manila from P645 to P695, and the P50 increase took effect July 18, 2025" | no | Statutory minimum wage of the capital region |
| Wage Singapore | S$1,910/month (PWM cleaner, from 1 Jul 2025) | https://www.mom.gov.sg/employment-practices/progressive-wage-model/cleaning-sector | "General Cleaner Indoor Cleaner ... $1,910 (from 1 July 2025)" | no | No general minimum wage; sector floor as proxy |
| Bottle price Malaysia | RM14.60 / 24 (Desa); RM15.95 / 24 (Cactus) | https://acewater.my/price-list-2/ ; https://www.foodservicemalaysia.com/ourproducts/cid/277768/cat/beverage-water/ | "RM14.60"; "RM15.95" per carton of 24 x 500 ml | no | Lowest published carton price of a national brand |
| Bottle price Indonesia | Rp66,718 / 24 (average); Rp51,000 / 24 (lowest), Aqua 600 ml | https://www.blibli.com/jual/akua-600-ml-per-dus | "Kisaran Harga Rata-Rata Akua 600 Ml Per Dus: Rp66.718"; lowest "Rp51.000" | no | same |
| Bottle price Philippines | PHP 334.57 / 24 (Absolute); PHP 366.17 / 24 (Wilkins) | https://www.merrymartwholesale.com/products/absolute-distilled-water-500ml-1-case-includes-24-pcs-500ml ; https://www.merrymartwholesale.com/products/wilkins-distilled-500ml-1-case-includes-24pcs-500ml | "P334.57 /CS"; "P366.17 /CS" | no | same |
| Bottle price Singapore | S$8.64 / 24 (Pere Ocean); S$34.95 / 24 (Evian) | https://www.pereocean.com/pere-ocean-natural-mineral-water-500ml ; https://www.fairprice.com.sg/category/mineral-water | "$8.64 including GST"; "$34.95" | no | same |
| Exchange rate MYR | 4.0745 per USD (28 Oct 2026) | https://malaymail.com/news/money/2026/10/28/ringgit-ends-higher-against-greenback-on-confidence-in-malaysias-fundamentals/241025 | "rose to 4.0745/0790 against the US dollar" | no | Central bank (BNM) page not openable; financial press used |
| Exchange rate IDR | 18,147.4 per USD (26 Oct 2026) | https://www.morningstar.com/markets/currencies | "Indonesian Rupiah USD-IDR 18,147.4000 as of October 26" | no | Bank Indonesia page not openable |
| Exchange rate PHP | 63.453 per USD (26 Oct 2026) | https://taxcalculator.com.ph/exchange-rates (BSP bulletin) | "US$1 = P63.4530 on the bulletin of 26 October 2026" | no | BSP reference rate via secondary site |
| Exchange rate SGD | 1.28025 per USD (26 Oct 2026) | https://www.mtfxgroup.com/tools/historical-currency-exchange-rates/usd-to-sgd-rate/ | "1 USD = 1.28025 SGD on October 26, 2026" | no | Also used to convert the price list (assumed SGD) |
| Bottles per room-night (support for the assumption) | 2 | https://www.aquablu.com/stories/the-future-of-hospitality-embracing-sustainability-in-hotels ; https://topiawater.com/case-study-streamline-200/ ; https://www.swissotel-singapore-stamford.com/the-hotel/blog/sustainability-at-fairmont-singapore-swissotel-the-stamford/ | "two bottles a night"; "two 750 ml bottles per room per day"; "reduced 1.5 million single-use plastic bottles per year" | no | Assumption; these pages only support it |
| Market context Malaysia | roadmap vision | https://www.pmo.gov.my/wp-content/uploads/2019/07/Malaysia-Roadmap-Towards-Zero-Single-Use-Plastics-2018-2030-m-min.pdf | "zero single-use plastics for a cleaner and healthier environment in Malaysia by 2030" | no | |
| Market context Indonesia | Bali Circular Letter 9/2025; PDAM study | https://www.socialexpat.net/bali-governor-bans-single-use-plastic-bottled-water-under-one-litre/ ; https://ideas.repec.org/a/gam/jsusta/v16y2024i16p7082-d1458770.html | "bans producing, distributing, and selling single-use plastic bottled water under one litre"; "sporadic microbial contamination was detected due to the depletion of residual chlorine" | no | |
| Market context Philippines | RA 11898; Boracay Ordinance 386 | https://lawphil.net/statutes/repacts/ra2022/ra_11898_2022.html ; https://denr.gov.ph/news-events/denr-backs-ordinance-banning-single-use-plastics-in-boracay/ | "50% for the footprint generated in 2025, 60% for 2026, 70% for 2027, and 80% from 2028 onward" (secondary guide); "prohibits the use of single-use or disposable plastic items by hotels, resorts, restaurants and establishments in the accommodation business" | no | |
| Market context Singapore | STB roadmap | https://www.stb.gov.sg/about-stb/media-publications/media-centre/launch-of-the-hotel-sustainability-roadmap-by-stb-and-sha/ | "60% of hotel room stock in Singapore to attain internationally-recognised hotel sustainability certification by 2025" | no | |
| Service contract line | 85.00 per unit | docs/Swisspro_Price_List.pdf (Hospitality section), line quoted in the project brief | "Comprehensive SUPERSWISS Replacement, 2 or 3 Year Contract Price with labour and change of parts, 85.00" | PDF not available in the build environment; wording taken from the brief | Interval (2 years) and currency (SGD) are labelled assumptions |

## Not sourced at all (labelled assumptions, adjustable on the result page)
Bottles per room-night (2), bottle weight scaling for other sizes, housekeeping minutes per room (1), handling
minutes per carton (2), stock weeks (2), storage aisle multiplier (1), hours per FTE (2,080), service interval
(2 years), price list currency (SGD), unit counts (1 per room, 1 station per other area), cheap-water
threshold for the argument order (US$0.25 per bottle).

## How to verify
Open each URL, confirm the quoted wording, then set `status: 'opened'` on that entry in `js/factors.js`
(the UI label changes from "Sourced, unverified" to "Sourced"). Hosts that must be allowed in a cloud
environment: bottledwater.org, www.gov.uk, assets.publishing.service.gov.uk, data.tourism.gov.my,
www.bps.go.id, www.stb.gov.sg, www.mom.gov.sg, www.pna.gov.ph, www.bnm.gov.my, www.bi.go.id, www.bsp.gov.ph,
sustainable.columbia.edu, swissprowater.com, plus the retailer pages listed above.
