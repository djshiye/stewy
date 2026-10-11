# Stewy v3 design system: "Midnight Apothecary"

Stewy is a late-night back bar. One cast-iron pot, a dark room, and the brew inside is
the only light source. Everything else is quiet, tinted, hairline chrome that stays out of
its way.

This document is the contract for the v3 redesign. It was chosen from three competing
directions (cinematic "Midnight Apothecary", hardware "Alchemist's Instrument", typographic
"Grimoire Editorial") by a three-lens judge panel, and grafts the best ideas of the other two
onto the winner.

## 1. Principles

1. **The brew lights the room.** The live, volume-weighted brew colour is the scene's
   light. It tints the surface of the brew, the bloom above the pot, the floor pool, the rim
   light on the iron, the logo's brew surface, and a derived UI accent.
2. **One hero.** The pot is the brightest, largest, most alive thing on screen. Chrome
   never competes with it: no gilding, no neon, no gradient text, no outer glows.
3. **Instrument-grade controls.** Measures are set with tactile, hardware-feeling controls
   (LED tick scales, a rotary pour dial, scrubbable measure pills), with precise tabular
   numerals and immediate score feedback.
4. **Honest data.** Every number on screen comes straight from the engine. The score
   breakdown visibly sums to the score. Nothing is invented for decoration.
5. **Restraint.** Two type families, one accent, one radius scale, one icon family. Sentence
   case everywhere. Motion only when it means something.
6. **Dark only.** The candlelit night is the brand. There is no light theme.

### Copy and terminology

- **Sentence case everywhere**, including verdict names ("Legendary elixir", "Masterful brew",
  "A fine potion", "Drinkable draught", "Murky concoction", "Cursed sludge"). Proper names of
  drinks keep their capitals ("Old Fashioned").
- **No em or en dashes, no exclamation marks.** British spelling ("flavour", "colour",
  "recognised").
- **The vessel is "the pot"** in all UI copy and actions ("Load into the pot", "Pour into the
  pot", "Drag a bottle up into the pot"). "Cauldron" is for marketing only: `index.html`
  metadata, the README and the social card.
- **The user's current drink is "your brew"** ("Your brew", "Untitled brew", "Your own brew.").
  Use "drink" for cocktails in general sentences. Never call it a "mix".
- **The score is "score"** everywhere in user-facing text, never "harmony".
- **Empty states say what to do next** in one plain sentence, and read the same way across the
  cards ("None" for a missing value, "Waiting" for a meter with nothing to measure).
- **Errors say what happened and what to try**: "That link could not be opened. Ask for it
  again, and check it was copied in full." Placeholders end with the ellipsis character.

## 2. Colour

### Neutrals (cool midnight, never pure black)
| token | value | use |
|---|---|---|
| `--ink-950` | `#07090d` | page base |
| `--ink-900` | `#0b0e14` | deepest wells, text on accent fills |
| `--ink-850` | `#10141b` | cards and panels |
| `--ink-800` | `#161b24` | raised rows, icon tiles, accent contrast reference |
| `--ink-700` | `#1e2430` | tracks, chips |
| `--ink-600` | `#2a3140` | segmented thumb, steppers |
| `--ink-500` | `#3a4254` | scrollbars, disabled outlines |
| `--tx-1` | `#f1eee8` | primary text (warm white) |
| `--tx-2` | `#a9b1bf` | secondary text |
| `--tx-3` | `#939cac` | labels and captions (12px and up only), at least 4.5:1 on every card surface |
| `--line` | `rgba(190, 205, 230, 0.09)` | hairlines |
| `--line-2` | `rgba(190, 205, 230, 0.16)` | control outlines |

### Live brew variables (written by `useBrewTheme()` on the root element)
| token | role |
|---|---|
| `--brew` | mid tone of the brew surface (the blend) |
| `--brew-hi` | lightened blend, same hue and chroma: glow, meniscus, bloom, rim light |
| `--brew-deep` | darkened blend: surface edge, wall bounce |
| `--brew-rgb` | triplet for `rgba()` washes |
| `--accent` | UI accent derived from the blend |
| `--accent-hi` | accent hover |
| `--on-accent` | text on accent fills (dark, at least 7:1) |
| `--accent-rgb` | triplet |

All brew variables are registered with `@property` as `<color>` so they interpolate: a pour
recolours the whole scene over 600 ms.

**Accent derivation.** Convert the blend to OKLCH, keep the hue, chroma =
clamp(0.7 x brewChroma, 0.07, 0.15), then raise lightness from 0.62 until contrast against
`--ink-800` is at least 7:1. Near-neutral blends (chroma below 0.035, e.g. vodka, gin, soda)
and the empty pot use the brand emerald `#3ddc97`. Implemented and unit-tested in
`src/lib/color.ts` (`brewAccent`), re-targeted to 7:1 on `--ink-800`.

**Accent rule (hard).** The accent is chrome only: primary buttons, focus rings, selected tab
underline, segmented thumb highlight, the dial's LED ring and knob notch, "in the pot" markers,
the logo's brew surface, the radar shape. The accent never colours a score, a delta, a meter
or a verdict.

### Semantic (scoring only)
| token | value | use |
|---|---|---|
| `--good` | `#5bd79a` | tier 80+, positive deltas |
| `--warn` | `#f2bd5a` | tier 56 to 79 |
| `--bad` | `#f26a5b` | tier below 56, clash markers, negative deltas |

Semantic colours only appear on: the score ring, the tier dot, the tier track marker, delta
numbers, and clash markers. Clash markers always pair colour with shape (a small minus glyph),
so a red brew accent can never be mistaken for an error. Breakdown bars are neutral
(`--tx-2`), not semantic.

## 3. Type

Two families, self-hosted with `@fontsource-variable/*` (no Google Fonts requests).

- **Geist** (variable): all UI, all numerals (`font-variant-numeric: tabular-nums`).
- **Newsreader** (variable, optical size): proper names only, the way a bar menu sets them:
  the Stewy wordmark and drink names (recipe card title, serve card title, mobile summary
  title, Grimoire entries and heading, Cellar names). Never body, labels or numbers.

| role | family | size / line | weight | tracking |
|---|---|---|---|---|
| Serve card title | Newsreader | 52 / 54 | 500 | -0.02em |
| Recipe card title | Newsreader | 40 / 44 | 500 | -0.015em |
| Mobile summary title | Newsreader | 30 / 34 | 500 | -0.015em |
| Grimoire entry name | Newsreader | 22 / 26 | 500 | -0.01em |
| Wordmark | Newsreader | 22 / 24 | 600 | -0.01em |
| Score numeral | Geist | 36 / 36 | 600 | -0.03em |
| Dial readout | Geist | 40 / 40 | 500 | -0.04em |
| Verdict | Geist | 20 / 24 | 600 | -0.015em |
| Stat value | Geist | 18 / 24 | 600 | -0.01em |
| Row name, button | Geist | 14 to 15 | 500 | 0 |
| Body | Geist | 13 to 14 / 1.5 | 400 | 0 |
| Label | Geist | 12 / 16 | 500 | 0.01em |
| Caption | Geist | 11 / 14 | 500 | 0 |

No all-caps text anywhere. Hierarchy comes from size, weight and tone (`tx-1/2/3`).
`text-wrap: balance` on titles, `pretty` on body.

## 4. Systems

**Radius (one scale, concentric rule: inner = outer minus padding).**
`--r-xs 6px` (kbd, inner chips) / `--r-sm 10px` (buttons, inputs, rows, tiles) /
`--r-md 16px` (cards, panels, toast) / `--r-lg 24px` (modals, sheets, dock) /
`--r-pill 999px` (chips, pills, segmented). Nothing else.

**Spacing (4pt).** 4, 8, 12, 16, 20, 24, 32, 48. Card padding 20 to 24. Desktop gutters 24,
mobile gutters 16.

**Elevation.** Light comes from the pot, so shadows are tinted, never pure black.
- `--sh-1`: 1px inner top highlight + 2px ambient (small controls).
- `--sh-2` (cards): inner top highlight `rgba(255,255,255,.05)`, `0 20px 40px rgba(7,9,13,.85)`,
  and a long brew-tinted shadow `0 30px 70px -40px rgba(var(--brew-rgb), .32)`.
- `--sh-3` (sheets, toast): stronger inner highlight, `0 40px 90px rgba(7,9,13,.9)`, 1px ring.

Surfaces differ by role so three zones never read as template cards: the recipe card is a
warm paper-toned dark gradient with a brew-lit top corner; the analysis panel is a cooler
instrument panel with a 1px accent hairline along its top edge; the shelf is a lit back bar.
A static film grain (SVG noise, about 6%) sits on a fixed, pointer-events-none layer over the
scene only.

**No `backdrop-filter`** anywhere on mobile. On desktop only on the fixed toast. Scrims are
flat `rgba(7, 9, 13, 0.72)`.

**Motion.** Every animation (keyframes, springs, ambient loops) moves only `transform` and
`opacity`. Hover and state feedback may fade colour, `background-color`, `border-color`,
`box-shadow`, `stroke` and `fill` with a short transition (`--t-hover`, 160 ms); these are
transitions, never loops. The one longer colour transition is the scene recolour, written
through registered `@property` variables (600 ms), and it is switched off while a measure
pill is scrubbed so each step does not restyle the tree. All motion is disabled under
`prefers-reduced-motion` (`<MotionConfig reducedMotion="user">` plus a CSS block).
- `--ease-out: cubic-bezier(.2, .8, .2, 1)` for state changes.
- `--ease-spring: cubic-bezier(.34, 1.4, .64, 1)` for things that settle (thumbs, bottle lift).
- `motion` springs: `{ type: 'spring', stiffness: 420, damping: 34 }` for UI,
  `{ stiffness: 160, damping: 22 }` for the dial knob.
- Durations: hover 160 ms, settle 350 ms, sheet enter 420 ms, scene recolour 600 ms.
- Ambient loops (swirl, bubbles, steam, motes, embers) pause while a drag is in flight and while
  the tab is hidden (`body.is-dragging`, `body.is-hidden`).
- Every animation has a reason: feedback (pour ripple, LED ticks, row enter), state change
  (scene recolour, score count-up, sheet enter), or ambience in the hero only.

**Z-index scale.** scene 0, grain 1, content 2, shelf 3, top bar 10, dock 20, toast 30,
scrim 40, sheet 50, drag ghost 60.

**Icons.** `@phosphor-icons/react`, weight `regular`, 18 px in chrome, 20 px in the dock.
No emoji anywhere in the UI.

**Touch and focus.** Under `(pointer: coarse)` every control has a hit area of at least 44 x 44
px, either the control itself or an invisible expansion of it. Keyboard focus never lands under
the fixed dock (`scroll-padding-bottom`). The first Tab stop is a "Skip to main content" link
(hidden until focused, it slides in on transform); the shelf is a labelled `<aside>`
(complementary) and the recipe, pot and analysis live in `<main id="main">`. Sheets trap focus,
skip parked radios and inert regions, and return focus to the control that opened them. Hover looks sit
only inside `@media (hover: hover)`, and touch gets a look from `:active` (the shelf bottle presses down, a Grimoire
cell tints; the Cellar rows and the measure pills have none).

## 5. Layout

### Desktop (1000 wide and up; the app shell is `100dvh`, no page scroll)
```
60  [sigil] Stewy        [ ml | cl | oz | parts ]          undo redo | Grimoire  Cellar(7)  share
    +-------------+--------------------------------------------+---------------------+
    | Your brew   |                (toast)                     |  (90)  Legendary    |
    | Negroni     |                                            |        elixir       |
    | strip       |        celestial halo (fill gauge)         |  radar | breakdown  |
    | rows with   |     ( glowing brew in the cast-iron pot )  |  55 +22 +9 +9 -4 =90|
    | measure     |                                            |  balance meter      |
    | pills       |              embers, floor pool            |  strength meter     |
    | stats x3    |                                            |  Try adding x3      |
    | [Serve][x]  |     "Drag a bottle up into the pot..."     |                     |
    +-------------+--------------------------------------------+---------------------+
224 | Spirits 14  Liqueurs 24 ...           +2 raises the score   - clashes   [search /] |
    |  bottles standing on a lit glass slab (horizontal scroll, edge fades)            |
    |  names under the slab                                                            |
    +----------------------------------------------------------------------------------+
```
Columns `336px / 1fr / 380px`, gap 24, page padding 24. The shelf is 224px tall (204px below
820px of height).

- **1000 to 1279 wide:** `300px / 1fr / 340px`, gap 16. The radar hides and the breakdown is a
  2 x 2 grid. From 1000 to 1099 the columns are `280px / 1fr / 316px` and the pot may overflow
  its column by 56px (handles and halo sit behind the side cards).
- **1280 and up, below 820px tall:** the radar is replaced by the same 2 x 2 breakdown. Below
  680px tall the two meters go next and "Start from a classic" shows two picks.
- **Short viewports (below 820px tall):** the recipe card tightens its padding and hides the sub
  line on a filled card (an empty card keeps its hint). Rows fit as described under the recipe
  card; the stats row and the Serve button stay pinned at the card bottom.
- **Big desktops:** the whole interface is scaled with `zoom` in steps, each with both a width
  and a height minimum (a 1920 x 900 window stays at 1). This landscape ladder applies from 5 : 6 up
  (`min-aspect-ratio: 5/6`); taller screens use the stacked layout and their own ladder, described
  with it below. Every step's lower bound lands near a 1500 to 1600 x 850 to 900 CSS viewport,
  the sweet spot (`--ui-zoom`):

  | From (width x height) | Factor | Reads as |
  | --- | --- | --- |
  | 1800 x 1000 | 1.2 | 1500 x 833 (1920 x 1080 reads 1600 x 900) |
  | 2200 x 1250 | 1.4 | 1571 x 893 |
  | 2560 x 1400 | 1.6 | 1600 x 875 (2560 x 1440 reads 1600 x 900) |
  | 3200 x 1800 | 2 | 1600 x 900 |

  Sheets and the toaster carry the same zoom; the shell divides its height by it, the drag ghost
  scales its child only (the ghost icon is 56px at factor 1), and the shelf tooltip stands
  outside the zoom because it positions itself in viewport pixels.

  Pointer coordinates stay in viewport pixels under zoom, so the measure pill scrub reads the zoom
  from a 100px probe and divides the drag by it (a step is 14 CSS pixels at every zoom), and the
  shelf tooltip clamps to its own measured half width plus 8px instead of a fixed 140px. WebKit
  also reports container query units (`cqw`, `cqh`) in viewport pixels inside a zoomed element, so
  the pot and the meter knobs would come out too large. `lib/cqUnits.ts` probes the engine once at
  start and, where the units are wrong, sets `data-cq-zoom` on the root; `--cq-k` in tokens.css then
  becomes the zoom and every `cq` length is divided by it.

  Safari before 26.4 (and any engine without `zoom`) implements the property the old way, so the
  scale is switched off there; see "Safari and iOS" (section 7).

### Tall desktops and portrait large tablets (1000 wide and up, 5 : 6 and taller)
```
    +--------------------------------------------------------------------------+
    |                       the pot, full width of the stage                    |
    +-------------------------------------+------------------------------------+
    | Your brew (recipe card)             | analysis card: radar beside meters |
    +-------------------------------------+------------------------------------+
    |  back bar (unchanged)                                                    |
```
iPad Pro 12.9 and Air 13 in portrait (1024 x 1366 fullscreen, about 1024 x 1266 in Safari), iPad Pro 13
(1032 x 1280 to 1300) and portrait monitors (1080 x 1920, 1440 x 2560). Three columns would squeeze the
pot into a 330px middle column and starve both cards, so the stage spans the width and the recipe and
analysis cards sit side by side below it. The trigger is
`(min-width: 1000px) and (max-aspect-ratio: 5/6)`, an aspect-ratio query rather than
`orientation: portrait`, because orientation counts a square as portrait. 5 / 6 (0.833) is the loosest
ratio that keeps 1000 x 1000, 1100 x 1100, 1280 x 1024 and 1366 x 1024 on three columns, and it catches
every Safari iPad viewport (ratios 0.79 to 0.81, which 4 / 5 missed). The shell stays `100dvh` with no
page scroll and the back bar is unchanged. The cards row is 40% of the shell, at least 520px and at most
700px, so the pot takes the rest. Its columns are `4fr / 7fr`, not half and half: the recipe card is
about 346px wide at 1000 wide and still lists six rows, the analysis card about 606 to 626px at the iPad sizes (wider on monitors). The
cards scroll inside as on short desktops.

| Viewport | Pot (was) |
| --- | --- |
| 1024 x 1266 | 456px (420px) |
| 1032 x 1300 | 497px (428px) |
| 1024 x 1366 | 576px (420px) |
| 1000 x 1200 | 377px (396px) |
| 1080 x 1920, zoom 1 | 1048px |
| 1440 x 2560, zoom 1.3 | 1060 CSS px (was 1280px, capped) |
| 2160 x 3840, zoom 2 | 1032 CSS px |

The recipe card uses the tight short-desktop header. The analysis card is a size container with a two
column body: the verdict across the top, then the radar and the meters on the left, the breakdown (one
line per part), the sum and "Try adding" on the right, and the tips across the bottom. The radar is
`min(74%, 39cqh / --cq-k)` wide (203px in the 520px card). Padding, row gaps and section padding are
tight (8, 4, 8 and 4px), a taller card spreads its rows evenly, and an empty 520px card hides its
"Waiting" lanes. The fullest brew (three suggestions, two tips, a clash) fits the 520px card without
scrolling. The 1000 to 1279 tweaks (no radar, 2 x 2 breakdown) are undone here, so the radar is back. The
1000 wide band from 1200 to 1250 tall gives a slightly smaller pot than three columns would (377px to
437px against 396px) in exchange for the radar and cards without dead space. The pour dial is a
viewport modal, so it is unaffected.

**Portrait zoom ladder.** The landscape ladder needs 1800 x 1000, so portrait monitors have their own,
keyed on the width because the stack is as wide as the screen and the pot, the cards and the text all
read from it. Every step's lower bound lands on a layout 1070 to 1111 CSS px wide (the 1.1 step on
1091); the step below ends at 1150 to 1250 for the first five steps and up to 1300 to 1440 for the last
ones (the pot tops out at about the stage width, so a wider layout only adds dead stage). The height
minimum is built in: 5 : 6 and taller means at least 1.2 x the width.

| From (width) | Factor | Reads as at the lower bound |
| --- | --- | --- |
| 1000 to 1199 | 1 | iPads and 1080p monitors as they are |
| 1200 to 1279 | 1.1 | 1091 wide (1200 x 1920 reads 1091 x 1745) |
| 1280 to 1299 | 1 | as it is |
| 1300 | 1.2 | 1083 wide |
| 1400 | 1.3 | 1077 wide (1440 x 2560 reads 1108 x 1969) |
| 1500 | 1.4 | 1071 wide |
| 1750 | 1.6 | 1094 wide |
| 2000 | 1.8 | 1111 wide |
| 2160 | 2 | 1080 wide (2160 x 3840 reads 1080 x 1920) |
| 2600 | 2.4 | 1083 wide |
| 3240 | 3 | 1080 wide |
| 4320 | 4 | 1080 wide |

The 1.1 step stops at 1279 so that the 1000 to 1279 shelf and Grimoire rules, which see the physical
width, still match the narrower layout it makes; 1280 to 1299 stays at 1. The trade-off: 1080 x 1920 stays
at 1 (below about 1.08 the layout would drop under 1000 CSS px), so a 1080p
monitor turned on its side reads smaller than in landscape. Sheets, the toaster, the shell, the shelf tooltip and the
drag ghost follow the zoom the same way, through one comma-separated media list in
`layout.css`; the cq correction follows `--ui-zoom` by itself (`html[data-cq-zoom]` in `tokens.css`). Because media queries see the physical width, from 1300 wide in portrait the shelf gets
the narrow-desktop treatment (legend hidden, 92px bottles, 220px search) and the Grimoire its narrow
rules (300px pane, 12px chip padding). The shelf tooltip's box (max-width 260, padding 10 / 12, lift) is
multiplied by the zoom, and the stacked `.app` clips overflow-x so the stage glow cannot scroll the page
sideways.

### Tablet (700 to 999 wide)
In portrait the pot is capped at 520px and shrinks (floor 320px) on shorter tablets so the summary row
and about three recipe rows clear the dock on the first screen: width = max(320px, (100svh - top bar -
dock - safe area - 470px) x 1.2), at most 520px. 768 x 1024 gives a 362px pot with the summary row and
three Negroni rows above the dock; 820 x 1180, 834 x 1194 and 800 x 1280 keep the 520px pot. Landscape
tablets keep the 520px cap. The stage and the
summary row span the width; the recipe card and the analysis card sit side by side below them.
Units live in the recipe card, the dock is fixed as on phones. The gauge numerals around the
pot are hidden below 1000px (they would clip).

### Mobile (below 700 wide, and the stacked layout up to 999; 390 x 844 is the design target)
```
56  [sigil] Stewy                     undo  redo  grimoire  cellar
    +-------------------------------------+
    |  pot, scaled so both handles        |
    |  stay inside the viewport           |
    +-------------------------------------+
    | (90) Negroni                 share  |   one verdict: ring + tier line
    |      Legendary elixir               |
    | Try adding [Orange bitters +2] [..] |   horizontal chip strip
    | +---------------------------------+ |
    | | Your brew     [ml cl oz parts]  | |   units live in the card on phones
    | | strip, rows, stats              | |
    | +---------------------------------+ |
    | Why it scores: breakdown, meters    |
    +=====================================+
    | DOCK (fixed, opaque, r24 top)       |
    | Spirits Liqueurs Juices ...  [srch] |
    |  bottle row (horizontal)    [Serve] |
    +-------------------------------------+
```
On short portrait phones (below 700px tall, such as 320 x 568) the pot is also capped by the
small viewport height (`svh`), so the summary row sits fully above the dock on the first screen
(taller phones are unchanged).
The dock is persistent, so the 77-bottle shelf is never scrolled past. Content gets bottom
padding equal to the dock height plus `env(safe-area-inset-bottom)`. Serve is always one tap
away in the dock. Toasts sit just above the dock and never cover the row they refer to.

### Phone landscape (up to 999 wide and 500 tall)
Two columns: the pot sits in a sticky left column as tall as the screen (46vw wide) while the
summary, recipe and analysis scroll on the right. The top bar is sticky at 48px. The dock moves
into the right column and shrinks to 148px (the shelf head and tabs are 44px tall inside it,
so the coarse-pointer hit area is not clipped). Sheets stay
bottom sheets here; the pour dial scrolls inside its sheet because its minimum size plus chips
and preview exceed the height. The Grimoire has its own landscape layout (see its section). The side
safe areas are handled here too; see "Safari and iOS".

## 6. Components

### Top bar (60px desktop, 56px mobile, 48px phone landscape, one row at every width)
Sigil (`BrandMark`, its brew surface takes `--accent`), the Newsreader wordmark, a centred
segmented unit control (sliding thumb, spring) on desktop, then undo, redo (disabled when
there is nothing to redo), a hairline divider, Grimoire and Cellar (with count) ghost
buttons, and share. On mobile: icons only, units move into the recipe card, share moves to
the summary row.

### Stage and pot (the hero)
- **Viewpoint and object.** Opaque cast iron seen from slightly above (rim ellipse about
  rx 236 / ry 68 in a 720-wide viewBox): a bulbous belly, rolled lip, riveted hoop, engraved
  moon-and-star sigil on the belly, two shaded metal ring handles, three legs with form and
  contact shadows. Iron texture (subtle hammered grain) lives in a static layer.
- **Lighting.** Light comes from the brew: the rim and lip glow in `--brew-hi`, a brew-tinted
  rim light runs down the right belly, the back inner wall shows bounce light. No cold
  blue-grey specular, no white smears. The lower belly gets an ember bounce from below.
- **Brew surface.** Off-centre radial gradient (hi, mid, deep), an irregular displaced flow
  (several varied, partial ellipse arcs at different opacities, slowly rotating inside a
  perspective-squashed group; not concentric "record grooves"), bubbles with ring and glint on
  independent timings, a bright meniscus line, and the drink's garnish floating on the
  surface (orange wheel or peel, lime wheel, mint leaves, cherry, olive) when the brew has one.
- **Fill (non-linear).** Surface depth `h = 1 - exp(-v / 75 ml)` over the usable depth, capped
  at 98%; at 200 ml and above the surface reaches the meniscus and the lip glows brighter. A
  90 ml Negroni reads full.
- **Celestial halo and fill gauge.** Behind the pot, a faint, brew-tinted celestial ring
  (moon phases and fine ticks, low alpha, slowly turning) frames the pot as enchanted. A
  slim fill gauge on its right arc marks 30 / 60 / 90 / 150 / 250 ml on the same curve, with
  the current level in `--accent`. No floating sticker moons or stars.
- **The room.** Bloom above the opening, a soft light shaft, a floor light pool in brew colour,
  an ember bed between the legs (fire is never visible through the brew), steam as
  radial-gradient ellipses (no SVG filter regions), rising motes.
- **Empty.** A dark interior with a faint emerald shimmer ring and the hint pill.
- **Label.** The stage is a section named "The pot"; the pot image describes its contents
  ("Cast-iron pot holding 93 ml of brew: Gin, Campari, Sweet vermouth").
- **Feedback.** On drop: a droplet falls into the surface, a ripple pair spreads, a few
  sparks, the scene recolours over 600 ms, the score counts up. While dragging over: the rim
  lights in `--accent` and the hint reads "Release to pour".
- **Performance.** The static iron is one SVG layer with no animation. Only the surface layer
  animates, with no filters or blend modes above animated elements. Ambient loops pause while
  dragging and while the tab is hidden.

### Recipe card (left on desktop; middle of the page on mobile)
Label "Your brew" and the count; the drink title in Newsreader (the recognised classic's
name or the user's own name, editable inline); one sub line ("Recognised classic. Stirred
over ice."); a proportional composition strip in ingredient colours; rows; a 3-cell stat grid;
the Serve button.

- **Row density.** On desktop the rows fit the room the card gives them (`useRowFit`). They step
  down through three densities, 65px (comfortable), 51px (snug) and 43px (tight), until all of
  them fit. When even tight rows do not fit, the list is cut to a whole number of rows (it
  scroll-snaps to rows, with no half row and no fade) and a "N more" strip under it is the only
  cue; click or Enter scrolls to the rest. A Negroni shows all four rows at 1280 x 720; a
  six-ingredient Mai Tai shows three with "3 more" there. In page flow (tablet and phone) rows
  are always comfortable and nothing is hidden.

- **Row.** 44px tile with the real ingredient art and a colour dot, name, descriptor
  ("Spirit, 42% ABV"), and a **measure pill**: a tactile control showing the amount in the
  active unit above a mini LED tick bar. Drag the pill horizontally (or use arrow keys) to
  scrub in unit steps (one drag is one undo entry however long it takes; arrow-key steps within 700 ms on one row fold together); click or Enter opens the Pour dial in edit mode anchored to the row.
  A remove button is visible on hover and focus on desktop and always on touch. All
  undoable. Rows enter and leave with layout animation. A sliver below the unit's precision
  reads "<0.01 oz", "<0.1 parts" or "<1 ml", never "0 oz". Arrow keys announce the new amount
  ("Gin 1.25 oz") through a status node.
- **Stats.** Volume in the active unit (parts mode shows total parts, never ml) with ml
  underneath; strength after dilution; method with time ("Stir, 30 seconds"). Each stat is a
  `dt` with a value `dd` and a second `dd` for the small line under it.
- **Actions.** Full-width accent "Serve in a rocks glass" (glass inferred) and an icon-only
  Clear. Clear is undoable.
- **Empty.** Title "Untitled brew", one line: "Drag a bottle up into the pot, or open the
  Grimoire to start from a classic." Strip hidden, three ghost rows (two on short desktop
  screens), stats read "0 oz", "0% ABV / no alcohol" and "None / add a bottle", Serve disabled.

### Analysis panel (right on desktop; below the recipe card on mobile)
- **Verdict (once).** 96px score ring in the tier colour, numeral, tier name (sentence case) as the heading,
  one playful line. A thin red / amber / green tier track with a marker under it gives the
  number context.
- **Profile radar.** 8 fixed axes that always render (so the shape never jumps): Boozy, Sweet,
  Sour, Bitter, Herbal (herbal + fresh + floral), Fruity (fruity + citrus), Spice
  (spicy + smoky + aromatic), Rich (creamy + nutty + coffee). Labels fit inside a padded
  viewBox. Shape filled with `--accent` at low alpha.
- **Breakdown (honest).** Signed contributions straight from `harmony().parts`: Pairing,
  Balance, Structure, Penalties (sweetSour + oneNote + clash + crowd). Neutral bars, signed
  numbers, and an equation strip that sums to the ring: `55 + 22 + 9 + 9 - 4 = 91` (a capped
  score says so).
- **Meters.** Sweet to sour-and-bitter balance meter (marker from `harmony().balance`) and a
  strength meter in three zones (light, classic, strong) using the post-dilution ABV. The two
  share a subgrid so their lanes sit on one baseline; when the meters row is under 320px wide
  (1000 to 1099 desktops, 360 phones) "after shaking" drops to a second line both columns reserve.
- **Try adding.** The top three simulated additions from `topSuggestions()` that are worth 3
  points or more, each with its art, name, amount, a `+n` delta and an add button. One name
  everywhere: "Try adding". When nothing helps by that much the card says so instead: "Nothing on the shelf
  improves this by more than a point or two." from 80, "No single addition helps much. Try adjusting the measures
  instead." below that, and on a curdled pot "Nothing on the shelf saves a split brew." (the headline tip already
  says to pick one or the other, so the line does not repeat it). On phones the card's "Try adding" is hidden and
  the chip strip under the pot is left out whole when there is nothing to add, label included.
- **Tips.** The engine's plain-language suggestions as a short list (at most three). The first is the
  line under the verdict; on phones the verdict header is hidden, so that first tip shows under the "Why it
  scores" heading, and the rest keep their own "Tips" list. The text rules are under "Score engine" below.
- **Clash gate for the classic match.** A brew is only called "Close to" a classic, and only takes
  that classic's glass and method, when it is not a clash: `resemblance()` returns nothing for a poor brew
  (`isPoorBrew`: the clash term is -19 or worse, which is one full curdle, or the score is under 40). The serve card, the recipe card line and the
  coach all read that one function, so a cream, lime and mezcal pot topped with ginger beer is a
  highball with a lime wheel, not a copper mug.
- **The egg white exception (Ramos Gin Fizz).** Cream and acid normally curdle. The one exception
  is a Ramos shape: gin as nearly all of the spirit, plain soda water as the fizz, cream or milk
  (not Irish cream) of at least 4 to 16 ml and under about a fifth of the liquid, egg white at 0.2
  to 0.66 of the dairy, and a spoon of syrup (1 to 6 percent of the liquid). Each condition fades
  in on its own ramp, so the score moves smoothly (no step larger than 6 points per 0.5 ml,
  pinned in `calibration.test.ts`). Any other spirit, mixer or missing piece still curdles, so egg white
  is never offered as a fix for a sweetened curdled pot. The classic archetype bonus also fades
  over a clash of 0 to about 28 points (`SHAPE_CLASH` 0.3 x 95) instead of switching off at exactly 0.
  Coconut cream does not curdle against mild fruit juice (pineapple, orange, tomato), so a Piña Colada
  keeps its match.
- **Radar emphasis.** Only the two strongest axes (value of at least 0.12) are set bold in
  `--tx-1`; the rest stay quiet.
- **Empty.** Ring as an empty track with a dash, "Waiting for ingredients", the radar axes only,
  and "Start from a classic" with three picks (Negroni, Daiquiri, Old Fashioned) that load
  straight into the pot.

### Score engine (`src/lib/harmony.ts`, with `coach.ts`, `tasting.ts` and `explain.ts`)
- **Fade bands.** Every gate on an amount fades in across a narrow band (`BAND`) on the line it used to
  be a hard step at: 0 at or below the low end, 1 at or above the high end. That covers the base
  alcohol share, long drinks, highballs, the sour's acid range, sparkling, the dessert and
  spirit-forward lines, the sweet and sour lines, and the curdle, cream and coffee lines, so 0.5 ml of
  anything never jumps the score. The counterweight bands are a little wider than the rest because a
  sour or bitter weight moves fast: sweet against sharpness 0.05 to 0.11, very sweet 0.07 to 0.13, sour
  against sweet and against bitter 0.07 to 0.13. The dessert's sharpness band is 0 to 0.12, coffee
  against acid 0 to 0.12 and the coffee weight 0.04 to 0.16. The sweet and sour penalties grow in
  instead of stepping to -14, -8 or -12.
- **Small pots.** Pots under 20 ml count as 20 ml. A band on a share of the liquid (alcohol, sparkling,
  long mixer, highball, stirred, the sour's acid range, acid, dairy, fizz) widens in a small pot from its
  free end only, the end the classics are not on, and never below zero. It spans at least 3 ml of
  liquid, 4 ml for the alcohol shares (so a 68 percent absinthe fades in gently) and 6 ml for the
  curdle bands (acid share and dairy share, and the liquid tang, a flavour weight that widens for the curdle
  only). Every other band on a flavour weight never widens,
  so a recipe halved scores as the whole one: every classic at 0.5x and 0.67x keeps its label and its
  score within a point (the Ramos at 0.5x excepted, because its cream pour is judged in absolute ml).
- **Count gates stay hard steps, by design.** More than three strong ingredients, more than two base
  spirits, more than six ingredients and a lone ingredient are discrete. None depends on an amount, so
  they are reached only by adding an ingredient.
- **Shapes and the label.** An archetype is a membership, the product of its fades. The highest membership sets
  how shaped the brew is; the bonus comes from the shape with the largest membership times bonus. The label names the shape that pays the bonus when the brew is at
  least half that shape (membership 0.5); otherwise it is the first shape, in bonus order, that the brew is at
  least half of. A full sour with a third of a spirit-forward drink reads as a sour while the
  spirit-forward part pays about 3 points before the 78 to 90 taper (a point or less at a score near 88). A full curdle or cream split in fizz (19 points of clash)
  always counts as a poor brew: it matches no classic and its tasting note names the fault.
- **Curdling.** Dairy curdles with sour or citrus from the liquid only (the tang), so a garnish slice or
  a dash of bitters does not; citrus-flavoured liqueurs (Campari, Lillet, Pimm's, triple sec) still do.
  The coffee and acid clash still counts every citrus note, garnish included. `Harmony.curdle` holds the
  points of clash that come from cream splitting against acid (0 for every classic and the Piña Colada
  grid) and `curdles(h)` is true at 5 points or more; `Harmony.coffeeAcid` and `coffeeAcidClashes(h)` do the
  same for coffee against acid. The helpers `curdleSides`, `coffeeAcidSides` and `said` also live in
  `harmony.ts`, so the tip and the tasting fault share one detection and one naming.
- **Step bounds.** The tests pin the worst step per 0.5 ml: 6 points for the classics, 7 for real-size
  random pots (30 ml or more of other liquid that carries flavour, so plain soda water does not count as
  rest), 13 for pots with 10 to 30 ml, none under 10 ml (half a millilitre can be most of the pot).
  Dairy with acid steps harder, because any real acid curdles the dairy within a few ml: 9, 13, 16 and 19
  for 90, 60, 30 and 10 ml of rest or more. A counted piece moves a classic by at most 6, a sugar cube by
  at most 17. The steepest steps left are the first millilitre of acid into a small creamy or coffee drink.
  A few pots off the test's seeds still step past the bounds, all where a flavour band starts at zero
  (coconut cream meeting triple sec, lime into crème de violette, coffee with acid); the note in
  `calibration.test.ts` keeps them in view until a design call says which verdicts may change.
- **Text rules.** Praise ("A masterpiece. Pour it and take a bow." from 90, "Beautifully balanced and
  ready to pour." from 80) needs a score of 80 or more and no bad tip. The curdle tip ("The cream splits
  against the lemon juice. Pick one or the other.") and the coffee tip ("The pineapple juice turns the
  espresso sour and harsh. Pick one or the other.") are both bad tips, so the praise goes. They lead unless a warning tip applies ("No base spirit yet", "Leans
  sweet", "Very sharp", "Quite bitter"): those are listed first, so milk with lemon juice and no spirit
  heads with "No base spirit yet" and the curdle tip is second.
  Both tips switch on at 5 points; so do the tasting note's curdle fault and the coach's no-dairy rule. With nothing to
  warn about, a weaker brew gets a plain line for its tier: 70 to 79 "A good brew with room to grow.",
  56 to 69 "Drinkable, but it does not quite come together yet.", under 56 "The flavours fight each
  other, so nothing here comes together." A poor brew's fault says "far too sweet" or "far too sharp"
  once the sweet and sour penalty reaches 4 points, and "leans too sweet" or "leans too sharp" from 1.
- **Coach and shelf.** `scoreDeltas` owns the curdled-dairy rule: on a curdled brew, dairy is held at
  zero or below (`Delta.curdles`), so the shelf shows no `+N` and the coach never offers more dairy. The
  tooltip reads "Splits against the acid already in the pot", unless adding the dairy also worsens the clash
  by 5 points or more: then the bottle gets the red clash dot and the tooltip "Clashes with the brew (curdles
  or muddies it)". Any other addition that leaves the brew curdled is held the same way (it would only
  water the acid down while the headline still says to pick one or the other), so a curdled pot has no `+N`
  and no "Try adding" until an addition ends the curdle (the card says "Nothing on the shelf saves a split brew."). The coach skips an addition worth
  under 2 points when the structure part supplies half or more of that gain; small gains from flavour
  pairing still show. In explanations, "gives the drink the shape of a proper X" appears only when the
  structure part went up; a label change with falling structure reads "blurs the shape of the drink".

### Shelf (back bar on desktop; dock on mobile)
- One scrolling tab row (8 groups with counts: Spirits 14, Liqueurs 24, Juices 8, Mixers 9,
  Syrups 9, Bitters 3, Extras 4, Garnish 6; accent underline, proper tablist with arrow-key
  roving focus), a search field ("Search 77 ingredients…") with a `/` shortcut. Search ignores
  accents and curly apostrophes. Typing searches across all
  groups and shows matching bottles in one row.
- Bottles stand on a continuous lit glass slab (bright 1px top edge, translucent body,
  tinted shadow), names (13px, `tx-2`) under the slab. Hover lifts 6px with a spring.
  Horizontal overflow has edge fades and scroll buttons on desktop. On coarse pointers the search field is
  16px (the `/` hint is hidden and the back bar field is 244px wide), so iOS does not zoom the page on
  focus.
- **Distinct silhouettes.** Eleven bottle families (vodka, gin, rum, agave, whiskey, cognac,
  absinthe, liqueur, cordial, vermouth, aperitivo) plus per-ingredient variants (cap, wax,
  label shape) so bourbon, rye and scotch, and white, dark and spiced rum, read apart.
- **One quiet indicator per bottle**, anchored on the bottle's shoulder: a small `+n` badge
  when adding it would raise the score by 2 or more, a minus-dot only when it would genuinely
  clash with the brew (curdle or muddy it), nothing otherwise (dairy on a curdled brew never earns a `+n`). Bottles already in the pot get a check and their amount under
  the name, never an error-looking badge.
- Tap or Enter opens the Pour dial (add mode). Mouse and pen can drag a bottle up into the
  pot (a ghost follows the pointer; Escape cancels the drag). The hover tooltip rises above the
  shelf so it never covers the tab row.

### Pour dial (modal 480px on desktop and tablet, bottom sheet on phones)
- Header: ingredient art, name, descriptor; a unit segmented control (changes the global
  unit).
- **Instrument.** A 270-degree ring of 64 LED segments (plain SVG lines from one
  `ledRing()` helper, no filters), engraved major ticks with numerals, a knurled outer ring, a
  machined knob face with concentric lathe grooves and an accent notch, a ghost marker at the
  committed value in edit mode, and a recessed readout (value 40px, unit, conversion line
  "37.5 ml, 3.75 cl"). Lit segments use `--accent`; this is the only glow in the product.
- Input: drag around the knob, wheel, arrow keys (Shift for fine steps), Home/End,
  PageUp/PageDown, minus and plus buttons, quick-measure chips (a radio group: 0.5, 0.75, 1,
  1.5, 2, 3 oz; 15, 22, 30, 45, 60, 90 ml; 1, 1.5, 3, 4.5, 6, 9 cl; 0.5, 1, 1.5, 2, 3 parts;
  dashes for bitters, pieces for garnishes). Amounts are capped at 1000 ml.
  `role="slider"` with `aria-valuetext` in the active unit. A soft haptic tick on mobile.
- **Preview.** "91 to 88" with a semantic delta chip and one plain-language reason generated
  by diffing `parts` ("More Campari tips the balance toward bitter.").
- **Modes.** Add: primary "Pour into the pot". Edit: "Update", "Remove", "Reset to 1 oz".

### Serve sheet (modal 1020 x 640 on desktop; 720 wide card on tablets with measures beside the method; full-height sheet on phones)
Left: the finished drink in its inferred glass at true proportions (rocks wider than tall),
with a refractive ice cube, the drawn garnish (an expressed peel, not a cartoon spiral), a
meniscus and condensation, standing on a bar top in a pool of its own colour. Right: the
Newsreader title, a pill row (tier dot and score, glass, method, ABV after dilution),
measures as menu lines with dotted leaders (active unit first, ml secondary), a tasting note
generated from the profile (a brew that clashes hard or scores under 40 gets one plain sentence
naming its main fault instead), numbered method steps, garnish, and actions: Save to the Cellar
(primary), Share link (Web Share API on touch devices, copy fallback; if the share sheet fails for any reason but
the user closing it, a toast offers "Copy link", so the copy runs inside its own tap), Copy recipe. On phones
the three actions share one row (the other two become icon buttons). Saving twice within 1.5
seconds stores one item. Footer: "Brewed in Stewy" and the date.

### Grimoire (modal 1180 x 760 on desktop; 820 wide card on tablets; full-height sheet on phones)
A recipe book, not a card grid: Newsreader heading, search ("Try gin or negroni…", name or ingredient), filter chips
(All, Stirred, Shaken, Built, Sours, Long drinks, Tiki, After dinner). A hairline-ruled
index grid (4 columns desktop, 3 tablet and phone landscape, 2 phone in portrait) with no card chrome: each classic drawn large in its
own glass with its garnish and real blended colour, the Newsreader name, three key ingredients,
the method, and a tier-coloured score dot. Selecting an entry opens its detail (desktop: a
side pane; phone: a sticky bottom bar, or a column beside the index in landscape) with the full build and an explicit "Load into the
pot" button. Loading shows an undo toast ("Loaded Negroni", or "Negroni is already in the pot"
with no Undo when nothing changes). The classic currently in the pot is marked "In the pot",
and the index opens scrolled to it, landing on a whole row (never a cut fragment under the
header); nothing is preselected, so the desktop pane starts on "Pick a classic".

- **One-line header at every desktop height.** The title with the count beside it, a 36px search and, below
  them, the chips. The count reserves the width of its widest text (8em, tabular figures), so the search
  keeps one box per window size (about 267px at 1000 wide, 291px at 1024, 320px from about 1050) while you
  type or pick a chip. The modal is 760px tall from 824px of window height up (656px at 720 tall), which
  leaves the index 640px at 900 tall: two whole rows of 315px.
- **The short-window breakpoint is `max-height: 823px`.** There the cell is 267px with a 128px glass
  (265px and 132px at 1000 to 1279 wide) and the type and pane tighten, so two whole rows still show from
  1000 x 720 up, including every zoom-ladder and portrait size. 823 and not 820 keeps 821 to 823 tall windows on
  two whole rows.
- **Narrow desktops.** 1000 to 1279 wide, and portrait monitors from 1300 wide (the same query as the shelf),
  get a 300px detail pane, 265px cells with a 132px glass and 12px chip padding, so the chips stay on one
  line down to 1000 wide.
- **Opening on a classic.** When no reachable row can show the classic's cell whole, the index gets room below
  the last row (`tailPadding`). In a view a little over two rows tall that lets the row above the last one reach the
  top, with the last row whole below it. In a view under two rows tall (a phone) it lets the cell's own row reach the
  top, so a last-row classic opens whole (or with its top showing, if the view is shorter than the cell). A filter
  or search clears the room. The index re-aims on every frame for the first 1.2 seconds (until the user touches
  it): cells near the view swap their estimated height for their real one, which moves the rows without
  changing the grid's height, so a resize observer would miss it and leave a fragment of a row under the header.
- **Autofocus follows the pointer.** Opening the sheet focuses the search only on desktop with
  `(hover: hover) and (pointer: fine)`. Otherwise (a phone, or an iPad in the desktop layout) the title takes
  focus, so the keyboard stays down.
- **Touch sizes.** Under `(pointer: coarse)` the search is 44px tall with 16px type, the clear button, the chips
  and the close button have 44px hit areas (an invisible `::before` on the chips and clear button, so
  their look is untouched), and cells carry `touch-action: manipulation`. `:hover` looks sit in
  `@media (hover: hover)` with `:active` feedback.
- **The close X** is centred on the title row on desktop (1000 wide and up, `--grim-mid`) and in phone landscape.
  On phones in portrait and on tablets it keeps the sheet's default spot, 16px from the top.
- **The detail pane** fades the edge that has more past it when a long build scrolls (`useScrollFade`).
- **The in-pot label and the glass scale.** "In the pot" sits 4px below the cell's top edge (12px type, 14px tall) and
  needs 3px of air under it. Every glass, in the pot or not, gives up whatever of that 21px the cell's top padding
  does not cover (`--pot-band`: 1px at 20px padding, 5px at 16px, 9px at 12px), so all the glasses in a view are
  one size and the pineapple on a Piña Colada never touches the label. (An earlier version shrank only the glass
  in the pot, which read as a drawing error beside an identical glass: 7 to 15px shorter.) The hover lift is dropped
  on the cell in the pot, where its 5px would eat the 3px of air. `grimoire.spec.ts` pins both: one size across
  the drawn glasses, and the label at least 2.5px above the glass in its cell.
- **Cost of 56 glasses.** Cells use `content-visibility: auto`, and `contain-intrinsic-block-size` is the
  cell height less its padding and bottom rule, which matches the usual one-line-name row (a two-line name
  or a three-line key draws taller, so the estimate is close, not exact, and the opening scroll re-aims as the
  real heights arrive). Each cell's glass is also drawn only
  when its cell comes within a screen of the index (one shared IntersectionObserver); an empty placeholder
  holds the place, so the cell is the same size with or without the glass, the cells in view at open are
  drawn before the first paint, and later ones fade in (opacity only). A glass, once drawn, stays drawn, and
  the cell in the pot always has its glass. Without IntersectionObserver every glass is drawn at once. This cuts the
  document by about 60 percent at open and the click-to-painted time at 4x CPU throttle by about 30
  percent (172 to 113 ms with an empty pot, 231 to 165 ms with a Negroni in it).
- **On phones** the detail opens as an overlay over the index: Tab cycles Back, Load and Close, and Escape steps
  back to the index before it closes the sheet. A pick shows the selection bar, which takes room from the
  index, so on every phone the selected cell is scrolled whole into the index, landing on a row top so no
  sliver of the row above stays under the header (the index keeps 16px of
  scroll padding below, 8px in landscape; a cell taller than the room keeps its top). A second tap on the
  selected cell opens the details.
- **Phone landscape** (`max-width: 999px`, landscape, `max-height: 500px`; the sheet is 322 to 404px tall). The
  header is one row (title and count, then the search) with the chips below, and the close button is centred
  on that row. The selection bar is a 188px column beside the index (`--side`), not a bar under it: the classic on
  top, Load under it, a left border, sliding in from the side. The column is reserved from the start: until
  something is picked it holds the desktop pane's empty state (two empty glasses at 56px, "Pick a classic" and the
  line under it, which fits even at 343px tall), and the first pick swaps it for the bar. So the index is 188px
  narrower from the first frame (still 3 columns: 182px cells at 734 wide, 219px at 844, 248px at 932) and the
  cells do not reflow under the finger. The narrower cells wrap a key line or two, which still leaves a whole cell
  in the index. Cells are shorter (a stage of `clamp(72px, 94dvh - 252px,
  120px)`, an 18px name, tighter padding) so a whole cell fits the index at every landscape height from 343px up.
  `touch.spec.ts` pins it on four of the five mobile projects (iPhone 15, iPhone SE, iPhone 15 landscape and iPad
  Pro 11 portrait; iPad landscape uses the desktop pane and skips it, and only iPhone 15 landscape has this
  layout): after the first tap, in the first row and low in the index, the cell lies inside the index, below the
  header, clear of the bar and on a row top, and a second tap reaches it and opens the details; and on a phone on
  its side the first tap leaves every cell in view and the column where it was, within 1px.
- **Phone landscape details.** The overlay (second tap) is two columns, so the build is in view at once instead of
  below the fold: the back link, the glass (72 to 112px, `clamp(72px, 100dvh - 270px, 112px)`), the name and the
  score stay on the left (sticky, one wrapper element around them, `.grim-detail__lead`, a plain block everywhere
  else), and the note, the build and the facts sit on the right, with the Load button across the foot. The note
  leaves room for the sheet's close button. A classic with a usual three or four line build shows it whole, with its
  facts, from 343px tall up; a long one scrolls the right column under the same fade as the desktop pane (the
  Ramos Gin Fizz, with seven lines, shows the build whole at 390px tall and scrolls the facts, and at 343px the
  Mai Tai and the Mojito scroll them too).

### Cellar (sheet, list layout; 560 wide)
Rows: a mini glass in the saved colour, the Newsreader name (rename inline), score dot,
saved date, actions (load, rename, delete with undo). After a delete, focus moves to the
Delete button of the brew that took its place (the previous one when it was last; the heading
when the list is empty), and Undo returns focus to the restored brew. The footer reads "Saved on this device only."
and, in Safari's own browser on macOS, iOS and iPadOS only, adds "Safari clears saved brews after 7 days without a
visit. Add Stewy to your Home Screen or Dock to keep them." (see "Safari and iOS"). Empty state: an empty glass
shelf, "Nothing saved yet. Serve a brew to keep it here.", and a button to open the Grimoire.

### Toasts
One at a time, 44px, `--r-md`, `--sh-3`, check icon, a plain sentence ("Removed lime juice"),
an accent Undo button, a `Ctrl Z` hint on desktop. 6 s, pauses on hover and focus.
`role="status"`. Used for remove, clear, load, delete, save, copy, shared-link open and for
errors (clipboard refused, a share link that cannot be opened, a sheet that failed to load,
which offers Reload). `Ctrl/Cmd+Z` answers a visible Undo toast first.

The share-failure toast: on touch devices the share sheet comes first, and when it fails for any reason other
than the user closing it, the toast reads "Could not open sharing on this device" with a Copy link action. The
copy runs inside that tap, not after the failed share, because Safari only allows clipboard writes during a
user gesture and the awaited share has already used it up (see `src/app/shareBrew.ts`). The action then
answers "Link copied", or the clipboard error toast if that is refused too. Closing the sheet shows nothing.

### Keyboard
`Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` and `Ctrl+Y` redo, `/` (also with Shift, for layouts
where it needs it) focus shelf search, `G` Grimoire, `C` Cellar, `S` serve, `Esc` closes the top
sheet. Letter keys stand down while a sheet is open or while typing in a field; undo and redo
stand down only in text fields. Every drag has a tap or Enter equivalent. Score changes are
announced through an `aria-live="polite"` region.

## 7. Safari and iOS

The build target is Vite's `baseline-widely-available` (Chrome and Edge 111, Firefox 114, Safari and iOS 16.4),
so Safari and iOS 16.4 is the floor. What WebKit does differently, and what the app does about it:

- **Legacy zoom guard.** WebKit before 26.4 implements CSS `zoom` the old way (`getBoundingClientRect`
  unzoomed, pointers in viewport pixels, viewport units not scaled), which broke the shell height, the drop,
  the tooltip and the pill scrub. `lib/cqUnits.ts` (`detectLegacyZoom`) measures a hidden `zoom: 2`, 50px box
  once at start; under 75px wide the root gets `data-legacy-zoom` and `tokens.css` pins `--ui-zoom` to 1 over
  every ladder rule. Those engines (and any engine without `zoom`) get the unscaled layout.
- **The cq-units fix.** Modern WebKit applies the zoom to container query units a second time, so it sets
  `data-cq-zoom` and every `cq` length is divided by the zoom (`--cq-k`). It fires only where the zoom is
  trusted, not on a legacy engine.
- **Root scroll lock.** On phones and tablets `html` clips x, so `body.is-locked` no longer reaches the viewport.
  `html:has(body.is-locked)` locks the root as well, so an open sheet keeps the page behind it still. `html` also
  has `touch-action: manipulation`, which turns double-tap zoom off (pinch still works).
- **Safe areas in landscape.** `index.html` uses `viewport-fit=cover`. The top bar and `.counter` padding use
  `max(var(--gutter), env(safe-area-inset-left / right))`, the stage bleed margins follow, the dock takes the
  right inset, the landscape pot column steps in by the left inset, and full-width sheets pad their sides
  (the close button too) in landscape. The bottom inset sits under the dock and the sheets as before.
- **`svh` for the pot.** The pot width on phones and phone landscape follows the small viewport height
  (`100svh`), so it stops resizing when Safari's toolbar collapses during a scroll.
- **The keyboard lift.** With the iOS keyboard open the layout viewport is not resized, so the dock (whose top
  row holds the shelf search) would stay behind the keys. While that search has focus, `lib/keyboardInset.ts`
  tracks `visualViewport` resize and scroll and writes `--kb` (default `0px`) on the root as
  `max(0, innerHeight - visualViewport.height - offsetTop)`; `.dock` is lifted with `translateY(-kb)`. Enter
  blurs the field on the dock and on coarse pointers, so the Search key puts the keyboard away. The listeners
  and the property go on blur.
- **16px fields.** iOS zooms the page on focus below 16px. The shelf search and the Grimoire search are 16px
  under `(pointer: coarse)` (the shelf also hides its `/` hint and widens the back bar field to 244px); the
  brew name and the Cellar rename field are larger than that already. `touch.spec.ts` pins all four at 16px
  or more.
- **Hover only on hovering pointers.** A tap on iOS leaves `:hover` stuck on the control, so every `:hover` rule
  (UI controls, shelf, recipe, dial, analysis, Cellar, Grimoire) sits inside `@media (hover: hover)`, and
  the UI controls get the same look from `:active`. Elsewhere the touch look differs or is absent: the shelf bottle
  presses down instead of lifting, a Grimoire cell only tints, and the Cellar rows and measure pills have none.
  Serve has no hover rules.
- **`touch-action: manipulation`** on `html`, buttons and the Grimoire cells.
- **The Cellar's Safari line.** Safari's browser deletes script-writable storage (where the Cellar and the pot
  live) after 7 days of use without a visit. `safariClearsStorage` in `src/cellar.ts` is true for a Macintosh,
  iPhone, iPad or iPod user agent with `Version/` and `Safari/` tokens, not in a Home Screen or Dock app, and
  not for Chrome, Chromium, Edge, Firefox, Opera, DuckDuckGo or Google app user agents. Brave on iOS cannot be
  told apart from Safari. The first brew saved in a session also calls `navigator.storage.persist()`, best
  effort and guarded.
- **The share fallback toast.** On touch, when the share sheet fails for anything but an `AbortError`, a toast
  ("Could not open sharing on this device") offers "Copy link". The copy cannot run after the awaited share,
  outside Safari's user-activation window, so it runs inside the toast action's own tap
  (`src/app/shareBrew.ts`).

## 8. Architecture

```
src/
  main.tsx                fonts, global styles, <App/>
  App.tsx                 composition: regions, sheets, wiring
  app/
    useAppModel.ts        derived data (harmony, mix, match, method, stats, glass, deltas, suggestions)
    useBrewTheme.ts       writes the brew and accent variables to :root
    useDrag.ts            pointer drag system (own pointer id, capture, click swallow, ghost, Escape)
    useToasts.ts          toast state with undo actions
    useHotkeys.ts         global shortcuts
    useMediaQuery.ts      matchMedia as state
    lazySheets.ts         lazy sheets with idle and hover prefetch, one error boundary per sheet
    clipboard.ts          copy with a readable failure
    SkipLink.tsx          the first Tab stop
  styles/                 tokens.css, base.css, layout.css
  components/
    ui/                   Button, IconButton, Segmented, Sheet, Toaster, LiveRegion, VisuallyHidden
    TopBar/  Stage/  Shelf/  Recipe/  Analysis/  Dial/  Serve/  Grimoire/  Cellar/
    Recipe/useRowFit.ts   fits rows to the card (densities, whole rows, "N more")
  icons/
    Icons.tsx             ingredient art and bottle silhouettes
    Glass.tsx             glassware with ice and garnishes
    Brand.tsx             BrandMark (live tinted)
  lib/                    pure engine (harmony, coach, serve, share, color, units), plus the two
                          Safari helpers cqUnits.ts and keyboardInset.ts
  data/                   ingredients, recipes, types
  store.ts, cellar.ts     state, history, persistence
e2e/                      Playwright Test specs and fixtures (see README, "End-to-end tests")
playwright.config.ts      Chromium and WebKit desktop projects, five mobile WebKit projects (iPhone and
                          iPad), production bundle on E2E_PORT (4317) built into E2E_OUTDIR (dist-e2e)
```

Each component folder owns its `.css` file; tokens are the only shared CSS. Components get
data through props from `App.tsx`; only `App.tsx` talks to the store.
