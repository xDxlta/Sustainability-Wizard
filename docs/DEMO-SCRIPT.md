# Demo script (version 2)

Run the wizard from GitHub Pages or locally (`python -m http.server 8080`, then http://localhost:8080/).
Clear the browser's site data first so the intro page appears. About six minutes.

## 1. Frame (30 s)
- Owner: "a basic sustainability wizard addressing drinking water related questions", for decision-making
  and awareness. Sales manager: multiple choice, no typing. Marriott procurement: ROI first, efficiency
  second, sustainability last; the market lacks help choosing the device and the filtration.
- Version 2 is a tool for the hotel: six steps, every question changes the result, no sales questions.

## 2. Scenario: select-service new build in Surabaya (2.5 min)
Indonesia; 250 rooms; select-service; new build; occupancy "not sure"; complimentary plastic bottles;
bottles "not sure"; 600 ml; price "not sure"; areas rooms + staff areas; about 50 bottles elsewhere;
placement "not sure"; chilled and ambient; mains; chlorine taste; Halal yes.
- Tiles: about 107,000 bottles, 1.2 t plastic, 4.6 t CO2e, about Rp227 million spend, about 890 hours.
  Point at the labels: "Sourced, unverified" (BPS occupancy, Aqua carton price), "Assumption" (2 bottles,
  1 minute per room). Explain the unverified label and VERIFY.md.
- Payback: type an investment from a proposal; the yearly service contract is pre-filled from the price-list
  line (85.00 per unit, interval 2 years as an assumption, currency SGD as an assumption). Show both paybacks.
- Set-up: in-room chilled unit at the minibar (new build: plan power and drain), drinking station for staff
  areas; "price list not loaded" label. Filtration: generic, chlorine note, Halal certificate requested.
- Case: efficiency first because bottled water is cheap; Bali bottled-water rule as local context.

## 3. Switch market (1 min)
"Change my answers": Malaysia, luxury, bought-in glass at RM2.50, sparkling. Plastic and CO2e show why they
are not estimated for glass; the argument order starts with guest experience.

## 4. Proposal request (1 min)
Fill the optional form (timing and approval are optional here, not in the flow), open the summary text,
copy it. No backend, nothing sent automatically.

## 5. Transparency (30 s)
Open "Sources and assumptions": choice rules, every factor with quote, link, date and status.

## Anticipated questions
- "Why no product names?" The price list is the only allowed source and it was not available in the build
  environment; `docs/PRICING-HOWTO.md` shows the ten-minute transcription.
- "Why unverified?" No page could be opened from the build environment; the values are excerpt-based and
  listed in VERIFY.md for checking.
- "Is the CO2 figure complete?" Bottle production only; stated on the tile.
