# The Swisspro Hospitality price list in the wizard

`js/pricelist.js` holds the Hospitality section of `docs/Swisspro_Price_List.pdf` (PDF dated 16 Sep 2026,
prices excl. GST, currency not printed), transcribed verbatim on 30 Oct 2026. It is the only source for
products, product names and prices.

## Structure
- `items`: one entry per PRODUCT line. `area` is the section the list prints the line under (`inRoom` =
  "PRODUCT (In-Room)", `fnb` = "PRODUCT (F&B, Drinking Station)"); `label` and `name` are the two text
  columns as printed; `price` as printed. `temps` is the reading of the words in parentheses (Hot, Cold,
  Ambient, Sparkling); SMART and SAN taps are read as "ambient"; the Triple Tap prints no water type.
- `servicing.inRoom` and `servicing.fnb`: the SERVICING lines as printed.
- `servicing.readings`: the three readings of the 85.00 line; `defaultReading` is `perChange`;
  `changeIntervalMonths` (9) comes from the residential section as reported by the team.

## Matching and pricing rules
- A product matches when its `area` equals the solution's area and its `temps` cover every water type the
  hotel asked for. Matches are listed sorted by price; the cheapest sets the investment (list price x units;
  installation is not included unless the proposal says so). If no line matches, every line of the section
  is listed and the investment has to be entered from the proposal.
- Yearly service contract = in-room units x (85.00 read as chosen) + stations x 350.00, converted from SGD
  (assumption) with the register's exchange rates; the hotel can overwrite the total.

## Editing
Correct a line only against the PDF. Change `currency` if the list prints one. If Swisspro confirms the
reading of the 85.00 line, set `defaultReading` and change the reading's `note`; set the `kind` of
`changeIntervalMonths` to `'sourced'` with `status: 'opened'` once the residential line is checked.
Run `npm test` and `node tools/walkthrough.js` after every change.
