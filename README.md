# 🔮 Stewy — The Enchanted Cocktail Cauldron

A reactive, wizardly mixology playground. Drag reagents into a see-through
cauldron set over a rotating summoning circle and a flickering hearth-fire,
choose your measures, and watch a live **harmony engine** judge your brew — as
the cauldron changes colour like a real potion.

![Stewy](assets/logo.svg)

## Features

- **Drag-and-drop cauldron** — drag any reagent from the shelf onto the cauldron
  (or tap it) and pick a measure from the popup. Splashes, ripples and arcane
  sparkles on every pour.
- **Live colour mixing** — the liquid blends the colours of everything you add,
  weighted by volume and opacity, and fills up as you pour, lit from beneath.
- **Harmony engine** — a 15-dimension flavour-affinity model scores the drink
  0–100 with a themed verdict (*Legendary Elixir → Cursed Sludge*) and
  actionable suggestions ("reads sweet — add citrus", "cream + citrus can curdle").
- **Red → green reagent hints** — every reagent on the shelf recolours to show
  how well it fits the current mix (legend included).
- **Toggleable measures** — switch the whole app between **ml / cl / oz / parts**;
  bitters and garnishes count in dashes / pieces.
- **Grimoire of Classics** — load 18 classic recipes (Margarita, Negroni,
  Espresso Martini, Mai Tai…) straight into the cauldron.
- **Fully responsive** — 3-column desktop layout collapses cleanly to a single
  column on tablet/mobile, with the recipe menu becoming a bottom sheet.
- **Auto-saved** — your brew persists in the browser between visits.

## Run it

Zero-build static site — no install step.

- **Just open it:** double-click `index.html`.
- **Or serve it** (recommended):

  ```bash
  python -m http.server 5178
  # then open http://localhost:5178
  ```

## Deploy to Cloudflare Pages

This repo is deploy-ready for **Cloudflare Pages** with no build step:

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick this repo. Set **Framework preset: None**, **Build command: (empty)**,
   **Build output directory: `/`**.
3. Deploy.

The included [`_headers`](./_headers) file adds sensible security headers
(CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`) and cache rules, which
Cloudflare Pages applies automatically.

## Project layout

```
index.html          markup + the cauldron SVG
css/styles.css      medieval/arcane theme, cauldron + fire effects
js/icons.js         parametric SVG icon factories, brand mark, summoning circle
js/ingredients.js   reagent database (colours + flavour profiles)
js/recipes.js       classic cocktail templates
js/app.js           state, drag-drop, scoring, colour mixing, UI
assets/             logo + favicon
_headers            Cloudflare Pages security + cache headers
```

## How the harmony score works

Each reagent carries a flavour profile across 15 dimensions (boozy, sweet, sour,
bitter, herbal, citrus, smoky, …). The engine builds a volume-weighted profile of
the whole drink, scores every pair of flavours against an affinity matrix
(sweet + sour = great, cream + citrus = curdle), rewards classic structure (a
base spirit balanced by acid/sweet), and penalises one-note, overcrowded, or
clashing mixes. Classic recipes land ~79–91; genuine clashes drop into the 40s–50s.

## Type & fonts

Headings use **Cinzel** / **Cinzel Decorative** and body copy uses **Spectral**,
loaded from Google Fonts (with serif fallbacks if offline).
