# Stewy v3 design system: "Midnight Apothecary"

Stewy is a late-night back bar. One cast-iron cauldron, a dark room, and the brew inside is
the only light source. Everything else is quiet, tinted, hairline chrome that stays out of
its way.

This document is the contract for the v3 redesign. It was chosen from three competing
directions (cinematic "Midnight Apothecary", hardware "Alchemist's Instrument", typographic
"Grimoire Editorial") by a three-lens judge panel, and grafts the best ideas of the other two
onto the winner.

## 1. Principles

1. **The potion lights the room.** The live, volume-weighted brew colour is the scene's
   light. It tints the surface of the brew, the bloom above the pot, the floor pool, the rim
   light on the iron, the logo's brew surface, and a derived UI accent.
2. **One hero.** The cauldron is the brightest, largest, most alive thing on screen. Chrome
   never competes with it: no gilding, no neon, no gradient text, no outer glows.
3. **Instrument-grade controls.** Measures are set with tactile, hardware-feeling controls
   (LED tick scales, a rotary pour dial, scrubbable measure pills), with precise tabular
   numerals and immediate score feedback.
4. **Honest data.** Every number on screen comes straight from the engine. The score
   breakdown visibly sums to the score. Nothing is invented for decoration.
5. **Restraint.** Two type families, one accent, one radius scale, one icon family. Sentence
   case everywhere. Motion only when it means something.
6. **Dark only.** The candlelit night is the brand. There is no light theme.

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
| `--tx-3` | `#7d8696` | labels and captions (12px and up only) |
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

**Motion.** Transform and opacity only. All of it is disabled under
`prefers-reduced-motion` (`<MotionConfig reducedMotion="user">` plus a CSS block).
- `--ease-out: cubic-bezier(.2, .8, .2, 1)` for state changes.
- `--ease-spring: cubic-bezier(.34, 1.4, .64, 1)` for things that settle (thumbs, bottle lift).
- `motion` springs: `{ type: 'spring', stiffness: 420, damping: 34 }` for UI,
  `{ stiffness: 160, damping: 22 }` for the dial knob.
- Durations: hover 120 to 200 ms, settle 350 ms, sheet enter 420 ms, scene recolour 600 ms.
- Ambient loops (swirl, bubbles, steam, motes, embers) pause while a drag is in flight and while
  the tab is hidden (`body.is-dragging`, `body.is-hidden`).
- Every animation has a reason: feedback (pour ripple, LED ticks, row enter), state change
  (scene recolour, score count-up, sheet enter), or ambience in the hero only.

**Z-index scale.** scene 0, grain 1, content 2, shelf 3, top bar 10, dock 20, toast 30,
scrim 40, sheet 50, drag ghost 60.

**Icons.** `@phosphor-icons/react`, weight `regular`, 18 px in chrome, 20 px in the dock.
No emoji anywhere in the UI.

## 5. Layout

### Desktop (1000 to 1920 wide; the app shell is `100dvh`, no page scroll)
```
60  [sigil] Stewy        [ ml | cl | oz | parts ]          undo redo | Grimoire  Cellar(7)  share
    +-------------+--------------------------------------------+---------------------+
    | Your brew   |                (toast)                     |  (90)  Legendary    |
    | Negroni     |                                            |        Elixir       |
    | strip       |        celestial halo (fill gauge)         |  radar | breakdown  |
    | rows with   |     ( glowing brew in the cast-iron pot )  |  55 +22 +9 +9 -4 =90|
    | measure     |                                            |  balance meter      |
    | pills       |              embers, floor pool            |  strength meter     |
    | stats x3    |                                            |  Try adding x3      |
    | [Serve][x]  |     "Drag a bottle up into the pot..."     |                     |
    +-------------+--------------------------------------------+---------------------+
224 | Spirits 13  Liqueurs 18 ...           +2 raises the score   - clashes   [search /] |
    |  bottles standing on a lit glass slab (horizontal scroll, edge fades)            |
    |  names under the slab                                                            |
    +----------------------------------------------------------------------------------+
```
Columns `336px / 1fr / 380px`, gap 24, page padding 24. At 1000 to 1279: `300px / 1fr / 340px`,
gap 16, the radar hides and the breakdown becomes a 2 x 2 grid. On short viewports (below
820 px tall) the cards scroll internally; the stats row and the Serve button stay pinned at
the card bottom.

### Mobile (below 1000 wide; 390 x 844 is the design target)
```
56  [sigil] Stewy                     undo  redo  grimoire  cellar
    +-------------------------------------+
    |  cauldron, scaled so both handles   |
    |  stay inside the viewport           |
    +-------------------------------------+
    | (90) Negroni                 share  |   one verdict: ring + tier line
    |      Legendary Elixir               |
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
The dock is persistent, so the 77-bottle shelf is never scrolled past. Content gets bottom
padding equal to the dock height plus `env(safe-area-inset-bottom)`. Serve is always one tap
away in the dock. Toasts sit just above the dock and never cover the row they refer to.

## 6. Components

### Top bar (60px desktop, 56px mobile, one row at every width)
Sigil (`BrandMark`, its brew surface takes `--accent`), the Newsreader wordmark, a centred
segmented unit control (sliding thumb, spring) on desktop, then undo, redo (disabled when
there is nothing to redo), a hairline divider, Grimoire and Cellar (with count) ghost
buttons, and share. On mobile: icons only, units move into the recipe card, share moves to
the summary row.

### Stage and cauldron (the hero)
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

- **Row.** 44px tile with the real ingredient art and a colour dot, name, descriptor
  ("Spirit, 42% ABV"), and a **measure pill**: a tactile control showing the amount in the
  active unit above a mini LED tick bar. Drag the pill horizontally (or use arrow keys) to
  scrub in unit steps; click or Enter opens the Pour dial in edit mode anchored to the row.
  A remove button is visible on hover and focus on desktop and always on touch. All
  undoable. Rows enter and leave with layout animation.
- **Stats.** Volume in the active unit (parts mode shows total parts, never ml) with ml
  underneath; strength after dilution; method with time ("Stir, 30 seconds").
- **Actions.** Full-width accent "Serve in a rocks glass" (glass inferred) and an icon-only
  Clear. Clear is undoable.
- **Empty.** Title "Untitled brew", one line: "Drag a bottle up into the pot, or open the
  Grimoire to start from a classic." Strip hidden, Serve disabled.

### Analysis panel (right on desktop; below the recipe card on mobile)
- **Verdict (once).** 96px score ring in the tier colour, numeral, tier name as the heading,
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
  strength meter in three zones (light, classic, strong) using the post-dilution ABV.
- **Try adding.** The top three simulated additions from `topSuggestions()`, each with its
  art, name, amount, a `+n` delta and an add button. One name everywhere: "Try adding".
- **Tips.** The engine's plain-language suggestions as a short list.
- **Empty.** Ring as an empty track with a dash, "Waiting for ingredients", radar axes only.

### Shelf (back bar on desktop; dock on mobile)
- One scrolling tab row (8 groups with counts, accent underline, proper tablist with
  arrow-key roving focus), a search field with a `/` shortcut. Typing searches across all
  groups and shows matching bottles in one row.
- Bottles stand on a continuous lit glass slab (bright 1px top edge, translucent body,
  tinted shadow), names (13px, `tx-2`) under the slab. Hover lifts 6px with a spring.
  Horizontal overflow has edge fades and scroll buttons on desktop.
- **Distinct silhouettes.** Eleven bottle families (vodka, gin, rum, agave, whiskey, cognac,
  absinthe, liqueur, cordial, vermouth, aperitivo) plus per-ingredient variants (cap, wax,
  label shape) so bourbon, rye and scotch, and white, dark and spiced rum, read apart.
- **One quiet indicator per bottle**, anchored on the bottle's shoulder: a small `+n` badge
  when adding it would raise the score by 2 or more, a minus-dot when it would cost 8 or
  more, nothing otherwise. Bottles already in the pot get a check and their amount under
  the name, never an error-looking badge.
- Tap or Enter opens the Pour dial (add mode). Mouse and pen can drag a bottle up into the
  pot (a ghost follows the pointer).

### Pour dial (modal 480px on desktop, bottom sheet on mobile)
- Header: ingredient art, name, descriptor; a unit segmented control (changes the global
  unit).
- **Instrument.** A 270-degree ring of 64 LED segments (plain SVG lines from one
  `ledRing()` helper, no filters), engraved major ticks with numerals, a knurled outer ring, a
  machined knob face with concentric lathe grooves and an accent notch, a ghost marker at the
  committed value in edit mode, and a recessed readout (value 40px, unit, conversion line
  "37.5 ml, 3.75 cl"). Lit segments use `--accent`; this is the only glow in the product.
- Input: drag around the knob, wheel, arrow keys (Shift for fine steps), Home/End,
  PageUp/PageDown, minus and plus buttons, quick-measure chips (a radio group: 0.25, 0.5,
  0.75, 1, 1.5, 2 oz equivalents; dashes for bitters, pieces for garnishes).
  `role="slider"` with `aria-valuetext` in the active unit. A soft haptic tick on mobile.
- **Preview.** "91 to 88" with a semantic delta chip and one plain-language reason generated
  by diffing `parts` ("More Campari tips the balance toward bitter.").
- **Modes.** Add: primary "Pour into the pot". Edit: "Update", "Remove", "Reset to 1 oz".

### Serve sheet (modal about 1020 x 640; full-height sheet on mobile)
Left: the finished drink in its inferred glass at true proportions (rocks wider than tall),
with a refractive ice cube, the drawn garnish (an expressed peel, not a cartoon spiral), a
meniscus and condensation, standing on a bar top in a pool of its own colour. Right: the
Newsreader title, a pill row (tier dot and score, glass, method, ABV after dilution),
measures as menu lines with dotted leaders (active unit first, ml secondary), a tasting note
generated from the profile, numbered method steps, garnish, and actions: Save to Cellar
(primary), Share link (Web Share API on mobile, copy fallback), Copy recipe. Footer: "Brewed
in Stewy" and the date.

### Grimoire (modal about 1180 x 760; full-height sheet on mobile)
A recipe book, not a card grid: Newsreader heading, search (name or ingredient), filter chips
(All, Stirred, Shaken, Built, Sours, Long drinks, Tiki, After dinner). A hairline-ruled
index grid (4 columns desktop, 2 phone) with no card chrome: each classic drawn large in its
own glass with its garnish and real mixed colour, the Newsreader name, three key ingredients,
the method, and a tier-coloured score dot. Selecting an entry opens its detail (desktop: a
side pane; phone: a sticky bottom bar) with the full build and an explicit "Load into the
cauldron" button. Loading shows an undo toast. The classic currently in the pot is marked
"In the pot".

### Cellar (sheet, list layout)
Rows: a mini glass in the saved colour, the Newsreader name (rename inline), score dot,
saved date, actions (load, rename, delete with undo). Empty state: an empty glass shelf,
"Nothing saved yet. Serve a brew to keep it here.", and a button to open the Grimoire.

### Toasts
One at a time, 44px, `--r-md`, `--sh-3`, check icon, a plain sentence ("Removed lime juice"),
an accent Undo button, a `Ctrl Z` hint on desktop. 6 s, pauses on hover and focus.
`role="status"`. Used for remove, clear, load, delete, save, copy, shared-link open.

### Keyboard
`Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` and `Ctrl+Y` redo, `/` focus shelf search, `G` Grimoire,
`C` Cellar, `S` serve, `Esc` closes the top sheet. Every drag has a tap or Enter equivalent.
Score changes are announced through an `aria-live="polite"` region.

## 7. Architecture

```
src/
  main.tsx                fonts, global styles, <App/>
  App.tsx                 composition: regions, sheets, wiring
  app/
    useAppModel.ts        derived data (harmony, mix, match, method, stats, glass, deltas, suggestions)
    useBrewTheme.ts       writes the brew and accent variables to :root
    useDrag.ts            pointer drag system (capture, click swallow, ghost)
    useToasts.ts          toast state with undo actions
    useHotkeys.ts         global shortcuts
  styles/                 tokens.css, base.css, layout.css
  components/
    ui/                   Button, IconButton, Segmented, Sheet, Toaster, VisuallyHidden
    TopBar/  Stage/  Shelf/  Recipe/  Analysis/  Dial/  Serve/  Grimoire/  Cellar/
  icons/
    Icons.tsx             ingredient art and bottle silhouettes
    Glass.tsx             glassware with ice and garnishes
    Brand.tsx             BrandMark (live tinted)
  lib/                    pure engine (harmony, coach, serve, share, color, units)
  data/                   ingredients, recipes, types
  store.ts, cellar.ts     state, history, persistence
```

Each component folder owns its `.css` file; tokens are the only shared CSS. Components get
data through props from `App.tsx`; only `App.tsx` talks to the store.
