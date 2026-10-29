# Loading the Swisspro Hospitality price list

The wizard names products and prices only from the Hospitality section of `docs/Swisspro_Price_List.pdf`.
The PDF was not available when version 2 was built, so `js/pricelist.js` holds the structure and the one
servicing line known from the project brief. To load the list:

1. Put the PDF at `docs/Swisspro_Price_List.pdf` (it is the reference for every line below).
2. Open `js/pricelist.js` and add one entry per Hospitality line to `items`:
   ```js
   { id: 'ir_01', area: 'inRoom', name: '<name exactly as printed>', price: 1234.00, unit: 'per unit',
     temps: ['chilled', 'hot'],            // water types the unit dispenses: ambient, chilled, hot, sparkling
     mount: 'undercounter',                // tap | undercounter | countertop | builtin | station (optional)
     page: 3 }                             // page of the PDF
   ```
   Use `area: 'inRoom'` for lines the list places under In-Room and `area: 'fnb'` for F&B / Drinking Station.
   Do not add products from the website, the online shop or memory.
3. Set `source.status` to `'loaded'` and, if the list prints a currency, replace the SGD assumption in `currency`.
4. If the servicing line reads differently from the brief, correct `servicing.name` and `servicing.price`;
   set `servicing.intervalYears.value` once Swisspro confirms the replacement interval (the UI keeps it
   adjustable and labelled as an assumption until the `kind` is changed to `'sourced'`).
5. Run `npm test` and the walkthrough. The result page then shows the matching lines with their prices under
   "The Swisspro set-up that fits" and pre-fills the investment in "Payback".

Matching rule (`js/recommend.js` and `pricelist.match`): a line matches when its `area` equals the solution's
area and its `temps` cover every water type the hotel asked for. If no line covers them all, every line of that
area is listed and the proposal confirms the fit.
