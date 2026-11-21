# Apple design language on the web: rules used in this project

Written for this project from two sources, in our own words:
- Apple Human Interface Guidelines (https://developer.apple.com/design/human-interface-guidelines),
  read through the index in raintree-technology/apple-hig-skills (MIT, snapshot of 2 Feb 2025;
  the HIG text itself is Apple's and is not copied here).
- Anthropic's frontend-design skill (vendored in `.claude/skills/frontend-design`, Apache 2.0) for the
  working method: plan tokens, check the plan against the brief, build, critique on screenshots.

The HIG targets native apps. These are the parts that carry over to a web page, and how this
project applies them.

## Principles
1. Content over chrome. No borders around panels, no shadows on panels, no decoration that carries no
   information. Panels are white on a light grey page; separation comes from space and hairlines.
2. Group related items, then align them. One column for the wizard, one grid for the result, shared
   left edges inside every panel.
3. System font, clear hierarchy by size and weight, no light weights. Large titles are tight
   (negative tracking); body text at 17px.
4. One interactive colour. Everything clickable uses it; nothing else does.
5. Match platform conventions: segmented controls for a few short, related choices; inset grouped
   lists with a checkmark for longer choices; circles on the left for multi-select rows; pill buttons;
   disclosure rows with a chevron.
6. Motion only in answer to an action (a segment moving, a chevron turning). Respect reduced motion.

## Tokens (styles.css :root)
| Token | Value | Use |
| --- | --- | --- |
| --bg | #f5f5f7 | page |
| --surface | #ffffff | panels, tiles, fields |
| --fill | #e8e8ed | segmented-control track, secondary buttons |
| --ink / --ink-2 / --ink-3 | #1d1d1f / #6e6e73 / #86868b | text, secondary text, captions |
| --line / --hair | #d2d2d7 / #e5e5ea | field borders / row separators |
| --accent | #0071e3 | the one interactive colour (placeholder until the Swisspro brand blue is read from the live site) |
| radius | panels 18px, fields 12px, segments 9px, buttons pill | radius follows hierarchy |

## Components
- Header: sticky, translucent white with blur, hairline below, wordmark left, two text links right.
- Step indicator: three equal bars with the step names under them; done steps are links.
- Segmented control: grey track, the chosen segment as a white thumb with a soft lift. Short labels
  only; "Not sure" may carry a second line.
- Inset grouped list: one bordered group, rows separated by hairlines, label left, value or note right,
  checkmark at the right edge when chosen. Long notes go under the label.
- Tiles: four equal white tiles; label, big number, caption share one row grid so numbers line up.
- Tables in panels read as grouped rows: label left, value right, hairlines between rows.
- Buttons: primary filled accent, secondary grey fill, tertiary text in accent.

## Checks before shipping
- Numbers in tiles on one baseline at every width; no option label broken mid-word.
- Only the accent is used for interactive elements; no stray colours.
- Screens checked at 1440, 1024, 390 and 360px; owner sheet prints on two A4 pages.
