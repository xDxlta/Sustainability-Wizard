---
name: swisspro-design
description: Design rules for anything built for Swisspro's website (the Sustainability Wizard and future pages). Use before changing styles.css, page layout, components or on-page copy, and before building any new Swisspro page. Covers brand tokens and how to read them from the live site, layout grid, components, copy rules and a checklist against generic AI-built website patterns.
---

# Swisspro design

The wizard must look like a part of Swisspro's own website, not like a separate product. When the
two disagree, the live site wins.

## 1. Brand tokens: read them, never invent them

All colours, fonts, radius and the content width live in `:root` at the top of `styles.css`. The
current values are placeholders chosen to be neutral (deep blue, IBM Plex Sans, 4px radius).

To match the live site:

1. Run `node tools/extract-brand.js https://swissprowater.com https://swissprohotel.com`
   (needs Playwright; in the cloud session the hosts must be allowed in the network settings).
2. Read `tools/out/brand/brand.json` and look at the screenshots in `tools/out/brand/`.
3. Copy the values from `tools/out/brand/brand-tokens.css` into `:root` in `styles.css`. Derive
   `--brand-700` (hover, about 15% darker), `--brand-050` and `--brand-100` (tints for selected
   states and the verdict band) from `--brand`.
4. If the site serves its own font files, use the same family and drop the Google Fonts import.
5. Use the logo file from the site in the header only if Swisspro supplies it; never draw a logo.
6. Record the date and URL in the comment above `:root`.

Do not take colours from memory, a search result or a template. If the site cannot be opened, keep
the placeholders and say so.

## 2. Layout

- Content width `--wrap` (1240px unless the site uses another), side gutter `--gutter`.
- Flush left. Headlines, text and buttons start on the same left edge. Nothing centred except
  single-value tiles.
- Intro: headline and lead on the left (7 of 12 columns), a short facts list on the right.
- Wizard on desktop: step rail on the left (240px) with the answers given so far; the question card
  on the right. Inside the card each question is one row: label left (200px), options right.
  Options with short labels (numbers, sizes, percentages) sit in one row; long labels in two columns.
- Result on desktop: answer line and verdict full width, one stat strip, then two columns: the
  analysis (payback, set-up, details) and a sticky proposal form on the right (380px).
- Breakpoints: 1100px (result goes to one column), 860px (wizard rail becomes a progress bar,
  options two per row), 640px (phone spacing), 360px (one option per row).
- Check every change at 1440, 1280, 1024, 390 and 360px. No horizontal scrolling at any width.

## 3. Components

- Surfaces: white panels with a 1px hairline (`--line`). No drop shadows, no glass, no gradients.
- Radius: one value, `--radius`, on everything that has a corner.
- Buttons: one primary per view (solid brand), secondary as outline, tertiary as text link.
- Option buttons: hairline border; selected = brand border plus tint and a check mark. Short
  options in a row show no indicator circle.
- Numbers: tabular figures; money with the symbol after the sign (`-RM1,200`); short form only in
  headline places (`Rp1.2B`), full digits in tables.
- Stat strip: one bordered box divided by hairlines, not separate floating cards.
- Verdict: a tinted band with a 2px rule on top. No coloured stripe on the left side of boxes.
- Collapsible sections use `<details>` with a plus and minus sign.
- Icons: none unless Swisspro's site uses an icon set; never emoji.

## 4. Copy

- English, short sentences, plain words a hotel manager uses. No dashes as punctuation.
- Say what the number means for the hotel; no slogans ("unlock", "seamless", "revolutionise",
  "elevate", "journey", "empower").
- No labels that only explain the build (provenance tags, "unverified", file names, reading ids).
  Sources and assumptions live on `sources.html` and in the collapsed "Where the numbers come from".
- No product claims beyond what the price list prints.
- Headlines say the thing, not a teaser. A result headline is a sentence with a number.

## 5. Generic AI patterns to avoid

Read `references/anti-ai-tells.md` before any visual change and run its checklist on the
screenshots. The short version: no purple or blue to purple gradients, no centred hero with a
gradient blob, no eyebrow labels in small caps over every heading, no three identical feature
cards with icons, no emoji, no glassmorphism, no uniform big radius with soft shadows on every box,
no left accent stripe on callouts, no pill chips for plain facts, no filler copy.

## 6. Verify

1. `npm test`
2. `node tools/walkthrough.js` (three scenarios, desktop and phone, overflow and jargon checks)
3. Look at the screenshots in `docs/screenshots` and `tools/out` at full size and go through the
   checklist in `references/anti-ai-tells.md`.
4. `node tools/build-artifact.js` for the hosted preview.
