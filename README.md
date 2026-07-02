<p align="center">
  <img src="public/logo.png" alt="Stewy — the enchanted cocktail cauldron" width="560" />
</p>

# 🔮 Stewy — The Enchanted Cocktail Cauldron

A reactive, wizardly mixology playground — a modern **React + TypeScript SPA**.
Drag reagents into a see-through cauldron set over a rotating summoning circle
and a flickering hearth-fire, choose your measures, and watch a live **harmony
engine** judge your brew — as the cauldron changes colour like a real potion.

## Features

- **Drag-and-drop cauldron** — pointer-based drag (mouse & pen) with a floating
  ghost icon, or tap any reagent to pick a measure. Splashes, ripples and
  arcane sparkles on every pour. On touch screens, tapping is the flow.
- **Live colour mixing** — the liquid blends the colours of everything you add,
  weighted by volume and pigment opacity, fills as you pour, glows from
  beneath, bubbles, and breathes tinted steam.
- **Harmony engine** — a 15-dimension flavour-affinity model scores the drink
  0–100 with a themed verdict (*Legendary Elixir → Cursed Sludge*) and
  actionable suggestions ("reads sweet — add citrus", "cream + citrus can curdle").
- **Flavour radar** — a live arcane radar chart of the brew's normalised
  flavour profile.
- **Classic detection** — the engine recognises when your brew resembles one
  of the 18 classics ("✦ resembles 🍸 Margarita").
- **Red → green reagent hints** — every reagent on the shelf recolours to show
  how well it fits the current mix (legend included).
- **Toggleable measures** — switch the whole app between **ml / cl / oz /
  parts**; bitters and garnishes count in dashes / pieces.
- **Grimoire of Classics** — load 18 classic recipes (Margarita, Negroni,
  Espresso Martini, Mai Tai…) straight into the cauldron.
- **Fully responsive** — 3-column desktop layout collapses to a single-column
  mobile flow (cauldron hero → shelf → brew sheet); the recipe menu becomes a
  bottom sheet.
- **Auto-saved** — your brew persists in the browser between visits (saves
  from the old vanilla version migrate automatically).

## Tech

- **React 19 + TypeScript + Vite** — strict types, pure-function engine
  modules ([harmony.ts](src/lib/harmony.ts), [color.ts](src/lib/color.ts),
  [units.ts](src/lib/units.ts)) fully separated from the UI.
- Zero runtime dependencies beyond React — all art is parametric inline SVG
  ([Icons.tsx](src/icons/Icons.tsx)) and hand-tuned CSS animation.

```
index.html              Vite entry + SEO meta (Open Graph, JSON-LD)
public/                 brand assets (favicon, logo, og image, PWA icons),
                        robots.txt, sitemap.xml, site.webmanifest, _headers
src/
  main.tsx              bootstrap
  App.tsx               composition root: state, drag system, dialog, toasts
  store.ts              reducer + localStorage persistence
  data/                 ingredient & recipe databases (typed)
  lib/                  harmony engine, colour mixing, unit logic
  icons/Icons.tsx       parametric SVG icon factories, brand mark, circle
  components/           Header, BrewPanel, HarmonyCard, FlavorRadar,
                        Stage, Cauldron, Shelf, AmountDialog, StarField
  styles.css            medieval/arcane design system
```

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build (type-checks first, outputs `dist/`):

```bash
npm run build
npm run preview    # serve the built bundle locally
```

## Deploy to Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick this repo. **Framework preset: Vite**, **Build command: `npm run build`**,
   **Build output directory: `dist`**.
3. Deploy.

[`public/_headers`](public/_headers) ships with the build and adds security
headers (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`) plus immutable
caching for Vite's content-hashed assets.

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
