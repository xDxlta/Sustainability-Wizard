# Demo script for the final presentation (26 November)

Target length: 6-8 minutes of live demo inside the presentation. Run the wizard from GitHub Pages or
from a local static server (`python3 -m http.server 8080` in the project folder, then open
http://localhost:8080/). Clear the browser's site data beforehand so the intro page appears.

## 1. Frame the problem (30 s)
- Owner's brief: "a basic sustainability wizard addressing drinking water related questions" that helps
  decision-making and awareness.
- Sales manager: multiple choice, sort the leads (customer type, products, where the solution goes).
- Marriott VP Procurement APAC: ROI first, efficiency second, sustainability last; what the market lacks
  is help choosing the filter grade and the device.
- Today the sales manager calculates savings ad hoc; the website has no calculator.

## 2. Scenario A: Singapore premium hotel (3 min)
Answers: Singapore; Premium / upscale; brand-managed; existing building; 300 rooms; occupancy "not sure";
complimentary plastic bottles; "not sure - assume 2"; 500 ml; local brand by the carton; areas rooms +
restaurants + meetings; 2 outlets; 3-5 meeting rooms; about 100 bottles elsewhere; minibar counter;
hot + chilled; chrome; enough space; storage tank; no issues; no Halal; drivers cost + efficiency +
certification; GM approves; 3-12 months; leave contact fields empty.

Talking points on the results page:
- Headline tiles: about 216,000 bottles, 2.1 t plastic, 8 t CO2e, about S$78,000 bottled-water spend,
  about 1,800 housekeeping hours (0.9 FTE), 115 pallets a year. Point at the provenance tags under each
  tile: sourced (STB occupancy, IBWA bottle weight, Pere Ocean carton price) vs assumption (2 bottles,
  1 minute per room).
- Payback: choose "I have a Swisspro quote" and type an investment and service fee to show the cash
  payback and the payback including time; mention the USD 5,000 / 50,000 approval note from the interview.
  Point at the greyed-out "Ballpark from Swisspro retail list prices" option and its note: Swisspro has
  not published prices for hot & cold stations, so no ballpark is shown; the option becomes active for
  ambient taps (SMART/SAN) and FONTANA, whose online-store prices are published. This is the honest
  placeholder until the price list is loaded (docs/PRICING-HOWTO.md).
- Recommended set-up: minibar hot & cold station for rooms (Fairmont and Pan Pacific Orchard references),
  back-of-house refilling + self-serve stations for F&B and events, filter specification with the storage
  tank reason and the CDC pore-size statement, placement feedback from the interview.
- "Why now": STB roadmap target and Green Globe.
- "How to present the case internally": ROI > sustainability (because certification was selected) >
  efficiency; readiness High.
- Adjust the assumptions: move occupancy or price and watch the tiles update (the "advanced users" need
  from the interview).

## 3. Scenario B: why the arguments change by market (1.5 min)
Click "Change my answers", switch the country to Malaysia (or Indonesia), keep everything else.
- Spend drops (cheap bottled water), the argument order now starts with efficiency and water safety, the
  Halal flag appears in the filter specification, the local context shows the 2030 zero single-use
  plastics roadmap (or Bali's 2025 ban on bottled water under one litre for Indonesia).

## 4. Lead sorting for Swisspro (1 min)
Open "Show the summary text" at the bottom: segment, areas, recommended products, readiness score with
reasons, and the argument order. Click "Request a site survey and quote" to show the pre-filled email
to Swisspro. Explain: no backend, no personal data stored outside the browser, a form endpoint can be
added in one line of `js/pricing.js`.

## 5. Transparency (30 s)
Open "Sources & assumptions": every factor with its quote, link, date and label; the build note that
links must be re-opened before go-live.

## Anticipated questions
- "Where do the 2 bottles per night come from?" An assumption, labelled, supported by three case studies
  (Sheraton Brussels Airport, Topia model, Fairmont/Swissotel 1.5 million bottles over 2,030 rooms).
- "Is the CO2 figure complete?" No: bottle production only, excluding transport, chilling, disposal and
  the filter unit's electricity. Stated on the tile.
- "What about hotels with their own bottling plant?" The wizard switches the case to labour, storage and
  availability and does not claim plastic savings.
- "Can it go on the website as is?" Yes, as static files; the open items are the price list, link
  verification, the lead email address and branding assets.
