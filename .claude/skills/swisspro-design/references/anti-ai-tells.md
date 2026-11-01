# Patterns that make a website look AI-generated

Compiled on 30 Oct 2026 from search results (the articles themselves could not be opened from the
build environment): Towards AI "10 Signs of AI Generated Design", Coaching Sites That Work "10 Signs
Your Website Was Designed by AI", 925 Studios "AI Slop Web Design" and "AI Slop Fonts and
Gradients", Developers Digest "AI Design Slop: 16 Patterns", Mowgli "Why Every AI-Built App Looks
the Same", Tundra AI Labs UI guide, InterfaceKit "Why AI-generated websites all look the same",
Maxiality "How to spot an AI-generated website", Falia "How to spot an AI-built website".

The sources agree on one point: no single pattern proves anything (Stripe uses purple and Inter).
The tell is a stack of defaults where nobody made a decision. The fix is a concrete choice, taken
from the brand, not swapping one default for another.

| Pattern | Why it reads as generated | What this project does instead |
|---|---|---|
| Purple or blue to purple gradient hero | The single most cited default | Flat surfaces, one brand colour read from Swisspro's site |
| Centred hero, symmetric layout | Symmetry when nobody decided | Flush left grid, facts list beside the headline |
| Small uppercase "eyebrow" label over every heading | Template habit | No eyebrows; headings stand alone |
| Three identical feature cards with icons | Most cited layout tell | No feature cards; content in tables and rows |
| Same big radius and soft shadow on every element | Uniform defaults | 4px radius, hairlines, no shadows |
| Glassmorphism, backdrop blur | LLM favourite | Not used |
| Emoji as icons | Generated UI habit | No icons unless the brand has a set |
| Coloured stripe on the left of callout boxes | Very common generated callout | Tinted band with a top rule |
| Pill chips for plain facts | Decorative default | One line of facts separated by middots |
| Fake logo (gradient square with a glyph) | Placeholder that ships | Wordmark in text until Swisspro supplies the logo |
| Inter or system font with no decision | Default typography | Brand font from the site; placeholder IBM Plex Sans |
| Vague aspirational headlines ("Build the future") | Filler copy | Headline is a sentence with the hotel's number |
| Stacks of 3 to 6 word fragments | Reads as generated even with custom CSS | Full short sentences |
| Floating 3D blobs and stock illustrations | Generic imagery | No decorative imagery |
| Every section the same rhythm (heading, sub, three cards) | Monotone structure | Sections differ by what they hold (verdict band, stat strip, table, form) |

## Checklist on screenshots

- [ ] Could this page be mistaken for a different company's page if the logo were removed? If yes,
      the brand tokens are not applied.
- [ ] Is any colour on the page not in `:root`?
- [ ] Is there more than one primary button visible at once?
- [ ] Any heading with a small label above it, any emoji, any gradient, any shadow?
- [ ] Any box with a coloured left border?
- [ ] Any sentence that would fit on any website ("Discover", "Unlock", "Seamless")?
- [ ] Do the label column and the option column line up across all questions of a step?
- [ ] At 390px: no horizontal scroll, no option with a label broken mid-word?
