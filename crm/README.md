# Swisspro hotel pipeline (prototype)

A second tool next to the Sustainability Wizard. The wizard brings hotels in; this tool tells Swisspro's
sales team which hotels to approach, what each is worth, how to pitch it, and records what happened so
that a prediction model can be trained later.

Open `crm/index.html` (GitHub Pages: `…/crm/`). Static files only, no server, no external request. It
also opens from a folder without a web server. Records are stored in the browser that is used.

## What is in it

| Page | What it shows |
| --- | --- |
| Hotels | All 183 Marriott hotels in Malaysia, Indonesia and the Philippines. Search by name; filter by country, tier, operating model, build stage, owner group, pipeline status and existing solution; sort by priority score, rooms and value. |
| Hotel page | The label "Already has a solution (public case)" where it applies, facts with their source, economics from the wizard's engine, the pitch text for the segment, the score breakdown, the other hotels of the same owner, the closest public cases, the pipeline record, and an attached wizard request. |
| Case archive | The 40 public cases with a link to each source; Swisspro's own projects as well while the private file is loaded. Filter by country, tier, solution and outcome. |
| Model | How many records are closed as Won and as Lost, and "Export training table". Funnel: per step, how many hotels entered, moved on, were lost or are still waiting, the conversion share (from 5 hotels) and the typical days to the next step, with "Export stage table". No win probability exists yet and none is shown. |
| Data and rules | Export and import of the pipeline records, loading the private projects file, the score rules, the reference occupancy per market. |

## Priority score (rule-based)

0 to 100, built from five rules. It is a ranking aid and **not a probability**. All weights and steps are
in one file, `crm/js/config.js`; they are a proposal of the project team.

| Component | Points | Rule as implemented |
| --- | --- | --- |
| Payback fit | 35 | Reference occupancy of the hotel's market divided by the occupancy needed for a cash payback within three years. Ratio 1.25 or more: 35. Ratio 0.5 or less: 0. In proportion in between. With a wizard request attached, the hotel's own figures are used. |
| Size | 20 | Rooms divided by 400, capped at 20. |
| Owner leverage | 20 | Hotels of the same owner group in the data (this hotel included): 1 = 4, 2 = 8, 3 to 4 = 12, 5 or more = 16. Plus 4 when another hotel of the group is at Quoted, Mock-up or Won. A private owner counts as 1 hotel, because hotels of private owners cannot be linked to each other. |
| Segment fit | 15 | Tier: Premium or Select 8, Longer Stays or Collections 5, Luxury 2. Operating model: managed 4, owner-operated 3. Build stage: existing 3, new build 1. |
| Timing | 10 | New build opening after 2026: 10. New build opening in 2026: 7. |

Missing data lowers nothing silently. The component is marked "not sourced" and scored neutral: owner
group missing 10 of 20; operating model not sourced 2 of 4; existing hotel 5 of 10 for timing, because no
renovation date is in the data. The total is the sum, rounded to a whole number.

The weights come from the brief. The steps inside each component (the ratio range 0.5 to 1.25, the
400 rooms, the owner steps, the split of the segment points, 7 points for a 2026 opening) are choices
made while building and are open for the team to change.

## Hotels that already have a solution

Four hotels of the list already replaced single-use bottles according to the public case archive: The
Westin Kuala Lumpur (case C01), Element Kuala Lumpur (C02), The St. Regis Bali Resort (C18) and Manila
Marriott Hotel (C24). They carry the label "Already has a solution (public case)" in the list and on the
hotel page, each with a link to its case, and the list has a filter for it. The label **does not change
the priority score**; the hotel page says so. A hotel is never listed as its own similar case. The
four pairs are in `crm/js/config.js` (`solved.byHotel`); add a pair there when a new case concerns a
hotel of the list.

## Economics

Calculated by the wizard's own modules (`js/model.js`, `js/engine.js`, `js/business.js` with
`js/factors.js` and `js/pricelist.js`), loaded by `crm/index.html` and called in `crm/js/economics.js`.
No formula is copied. The assumptions are the wizard's: three bottles per occupied room-night, the
typical bottle price of the market, SGD 160 per room installed, SGD 85 service per room and year, cash
payback without staff time. The occupancy is the reference occupancy of the hotel's market from
`hotels_public.json`. A test checks for every hotel that the figures equal the wizard engine.

## Data dictionary

### `crm/data/hotels_public.json` (public, compiled Oct to Nov 2026 by the project team)

| Field | Meaning |
| --- | --- |
| `note` | Source of the whole list: marriott.com, owner reports, Marriott job postings. The file names no source per field. |
| `markets.<key>.occupancy_pct`, `.source` | Reference occupancy of a market in percent and its source. |
| `hotels[].id` | `h001` to `h183`. Used to match Swisspro's projects (`hotel_ids`) and the pipeline records. |
| `name`, `country`, `city`, `brand` | As published. |
| `tier` | Marriott's grouping: Luxury, Premium, Select, Longer Stays, Collections. |
| `build_stage` | `existing` or `new_build`. |
| `status` | `In Betrieb` (operating) or `Pipeline` (not open yet). Shown in English. |
| `opening` | Opening date of a new build as free text, otherwise `null`. |
| `rooms` | Number of rooms. |
| `owner_group` | Owner group (company or group name), `Private owner` for a private individual whose name is not kept, or `null` (shown as "not sourced"). |
| `operating_model` | `managed`, `owner_operated` or `not_sourced` (no public source found). |
| `market` | Key into `markets`. |

`crm/data/data.js` is the same data as a script, so the tool also opens from a folder. After changing a
JSON file run `npm run build:crm`. A test fails when the two are out of step.

### `crm/data/cases_public.json` (public, every source opened by the project team, Oct 2026)

`id`, `hotel`, `city`, `country`, `chain`, `brand`, `tier`, `build_stage`, `solution`, `vendor`, `year`,
`outcome`, `decision_maker[]`, `reasons[]`, `barriers[]`, `results`, `source_url`, `source_date`. All shown
as written. For the filters the tool groups tier, solution and outcome by the rules in
`crm/js/cases.js`; the wording of the source stays visible in each row.

### Pipeline record (stored in the browser, exported as JSON and CSV)

| Field | Values |
| --- | --- |
| `status` | Not contacted, Contacted, Replied, Meeting, Quoted, Mock-up, Won, Lost, On hold |
| `date` | Date of last change, `YYYY-MM-DD` |
| `product` | Free text |
| `quotedValue` | Number, SGD |
| `decider` | owner, owner representative, GM, engineering, procurement, chain office, consultant or contractor, unknown |
| `reason` | Only for Won or Lost: payback, price, design, guest experience, brand or sustainability goal, timing or renovation, chose bottling plant, chose competitor, no budget, no decision, other |
| `note` | Free text. Do not write names or contact details of hotel staff. |
| `history[]` | Every status with its date, written by the tool |
| `prefilled`, `projectId` | Set when the record was pre-filled from Swisspro's file and not edited since |

Export (JSON) writes one file with all records and attached wizard requests; Import (JSON) reads it back
and replaces the records in the browser. Export (CSV) writes one row per record for a spreadsheet.

### Training table (Model page, CSV)

One row per record closed as Won or Lost: hotel features, the five score components, the economics and
their basis (market reference or from the hotel), the case id where the hotel already has a solution, product, quoted value, who decides, status history,
date closed, outcome and reason. Notes are left out.

### Funnel and stage table (Model page, CSV)
Every dated status change is a step. Steps in order: Contacted, Replied, Meeting, Quoted, Mock-up, Won; a step may be skipped.
Lost and On hold end a stay without moving on.

- Typical days to the next step start as an assumption in `crm/js/config.js` (`funnel.assumedDays`, each with its source:
  Quoted 270 days from Swisspro's "6 to 12 months without news"; the others are assumptions of the project team).
- Every logged stay updates them: exponential waiting time with a Gamma prior, the assumption counted as 2 observed steps;
  hotels still waiting count with the days waited so far (censored). Formula: median = ln 2 × (2 × m0 + total days) / (2 + moves), m0 = assumption ÷ ln 2.
- Conversion share = moved on ÷ (moved on + lost), shown only from 5 such hotels. No assumption is used for it.
- The hotel page shows, for a hotel in a step: days in the step, the expected date of the next step and the expected date of Won
  if every remaining step is passed. It is a time estimate, never a chance of winning.
- Stage table columns: `hotel_id, hotel, country, tier, rooms, score_total, step, date_entered, date_left, days, ended_by, moved_on`
  (one row per stay; `moved_on` 0 with `ended_by` "still in this step" = censored). This is the training data for time between steps.

## Swisspro's own projects: the private file

Swisspro's projects are confidential and **must never be in the repository**. The folder
`crm/data-private/` is listed in `.gitignore`; keep the file there or anywhere outside the repository.

To load it: open **Data and rules**, choose **Choose the projects file**, and pick the JSON file. It is
read in the browser only. A yellow bar on every page shows that confidential data is loaded and offers
"Remove from this browser". Without the file the tool runs on public data only.

Format:

```json
{"projects":[
 {"id":"p90","status":"Warm","project":"Sample Hotel A","customer":"Sample Owner","group":"Sample Group",
  "product":"Slim Lite","country":"Malaysia","value":40000,"install_date":"Q2 2027","rooms":250,
  "update":"Mock up request","hotel_ids":["h012"]}
]}
```

- Projects are matched to hotels through `hotel_ids`. Projects without a matching hotel (Singapore, other
  chains) appear in the case archive only.
- Swisspro's status is always shown as given. It pre-fills the pipeline status: Hot to Mock-up, Warm to
  Quoted, Cold to On hold, HIT to Won. "Closed" pre-fills nothing, because its meaning is not confirmed.
- A record you have edited is never overwritten by the file.
- The project value pre-fills the quoted value only when the project covers one hotel. The file does not
  state a currency; check the figure.
- Before a presentation with public data only, use "Remove from this browser".

## Link to the wizard

On a hotel page, under **Wizard request**, paste the request summary the wizard produces, or choose the
file written by the wizard's new button "Save the request as a file". The hotel's own occupancy, bottles
and price then replace the market reference values on that page, marked "from the hotel". A figure the
hotel did not give itself (it answered "Not sure") stays on the market reference. Only the figures are
kept; names and contact details in a request are not stored.

## Files

```
crm/index.html, crm/crm.css      page and styles (on top of the wizard's styles.css)
crm/js/config.js                 weights, rules, fixed lists, pitch texts
crm/js/score.js                  priority score
crm/js/economics.js              calls the wizard engine for one hotel
crm/js/store.js                  pipeline records, JSON and CSV
crm/js/projects.js               private projects file
crm/js/cases.js                  case archive groups, similar cases
crm/js/wizardlink.js             reads a wizard request
crm/js/winmodel.js               training table; winProbability() returns "not trained yet"
crm/js/funnel.js                 funnel steps, time between steps (assumption updated by logged steps), stage table
crm/js/app.js                    interface
crm/data/                        public data
crm/data-private/                confidential, ignored by git
test/crm.test.js                 tests
tools/build-crm-data.js          writes crm/data/data.js
tools/record-crm-demo.js         screenshots and demo video
```

Tests: `npm test`. Screenshots: `docs/screenshots/crm-list.png`, `crm-hotel.png`. Demo video:
`docs/demo/crm-demo.mp4` (89 seconds, public data; the pipeline entry and the wizard request in it are
made up for the demonstration).
