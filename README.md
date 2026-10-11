<p align="center">
  <img src="public/logo.png" alt="Stewy" width="480" />
</p>

# Stewy

An enchanted cocktail cauldron. Drag bottles into a cast-iron pot, watch the brew
light the room, and see exactly how the score is built.

**Live:** [stewy.pages.dev](https://stewy.pages.dev)

<p align="center">
  <img src="docs/screens/desktop.jpg" alt="Stewy on a desktop: a Negroni glowing in the cauldron, the recipe card on the left, the score breakdown on the right and the back bar below" width="100%" />
</p>

## What it does

- **The cauldron.** A cast-iron pot in a room lit by whatever is in it. The level
  follows the pour (90 ml already reads as a full drink), a ring of moon phases
  behind the pot doubles as a fill gauge, and every pour lands with a droplet,
  a ripple and a few sparks. Garnishes float on the surface.
- **The back bar.** 77 ingredients as real bottles, jars and carafes on a lit
  shelf, in tabs, with search on `/`. Each bottle tells you what it would do:
  a green `+N` when it would raise the score by 2 or more, a red dot only when it would
  actually clash (curdle, muddy). Drag one into the pot, or tap it to pour.
- **The pour dial.** A hardware-style dial with a 64-segment LED ring. Drag it,
  scroll it, use the arrow keys (Shift for fine steps) or pick a preset. It shows
  the score you would get at that measure, and why.
- **An honest score.** 0 to 100 with a verdict, and the arithmetic in plain
  sight: `55 + 18 + 8 + 9 = 90`. Pairing, balance, structure and penalties each
  have a bar, an eight-axis flavour radar shows the shape of the drink, and
  meters place it between sweet and sour, light and strong. "Try adding" only
  appears when something helps by 3 points or more.
- **It knows the classics.** 56 classics, each scoring 82 to 92. The engine
  recognises them in your pot and understands drink shapes (spirit-forward,
  sour, highball, dessert), so a Negroni and a Mojito are judged on their own terms.
- **The serve card.** Glassware, ice and garnish are inferred from what you
  brewed (a Ramos Gin Fizz is strained up, with no ice). You get the measures,
  numbered method steps, a tasting note and the strength after dilution, then save
  it to the Cellar, share a link or copy the recipe. A brew that clashes hard gets
  one plain line naming its fault instead of praise.
- **The Grimoire.** All 56 classics as an illustrated index, filterable by
  method and style, ready to load into the pot.
- **The Cellar.** Your saved brews, on this device only.
- **Share links.** A brew is encoded in the link itself. No accounts, no server.
- **Measures.** ml, cl, oz or parts across the whole app. Bitters count in
  dashes and garnishes in pieces. Measures can be scrubbed directly on the recipe card.
- **Undo everything.** Full undo and redo history, plus undo on every removal toast.
- **Any screen.** A two-column desktop, a tablet layout, a phone layout with a
  fixed dock for the shelf, a phone-landscape layout, and a scaled-up interface
  on very large displays. Touch targets are at least 44px on touch devices.
- **Installable.** A PWA that works offline after the first visit.
- **Accessible.** Every drag has a tap or keyboard equivalent, a skip link leads
  the tab order, sheets trap focus, score changes and measure steps are announced to
  screen readers, text meets 4.5:1 contrast (apart from the decorative engraving on
  the pot) and reduced motion is respected throughout.

<p align="center">
  <img src="docs/screens/phone.jpg" alt="Stewy on a phone: the cauldron fills the first screen, the score sits under it and the bottles live in a dock" width="320" />
</p>

### Keyboard

| Key | Action |
| --- | --- |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z`, `Ctrl + Y` | Redo |
| `/` | Search the shelf |
| `Tab` | First stop is "Skip to main content" |
| `G` | Open the Grimoire |
| `C` | Open the Cellar |
| `S` | Serve |
| `Esc` | Close the top sheet (in the Grimoire on a phone, step back to the index first) |
| Arrow keys on a measure | Step the amount; `Enter` opens the pour dial |

## How the score works

Every ingredient carries a flavour profile across 15 dimensions (boozy, sweet,
sour, bitter, herbal, citrus, smoky and so on). The engine builds a
volume-weighted profile of the whole drink and starts from a base of 55. Then:

- **Pairing** scores every pair of flavours against an affinity matrix
  (sweet with sour is great, smoke with cream is not).
- **Balance** rewards a sweet and sour axis that sits near the middle.
- **Structure** rewards recognisable shapes: a spirit-forward stirred drink,
  a sour, a highball, a dessert drink. A brew with no shape loses points here.
- **Penalties** cover the things no bartender would pour: too sweet or too sour
  with no counterweight, one-note drinks, pots crowded past six ingredients, and real
  clashes such as dairy with citrus, which curdles at any dilution (the one exception is a Ramos Gin Fizz, where egg white, syrup and soda carry the cream).

The calibration is pinned by tests in [`calibration.test.ts`](src/lib/calibration.test.ts):
every classic scores 80 or more, a suite of known clashes stays at 55 or less,
and random brews have a median below 70, so a high score means something.

## Tech

- **React 19, TypeScript 6, Vite 8.** The engine in [`src/lib`](src/lib)
  (harmony, coach, serve, share, colour, units) is pure functions with no DOM,
  fully separated from the UI.
- **[Motion](https://motion.dev)** for spring-based layout and sheet animation,
  **[Phosphor](https://phosphoricons.com)** for interface icons. All bottles,
  glassware, garnishes and the cauldron are hand-built parametric SVG.
- **Geist** for the interface and **Newsreader** for names, self-hosted through
  Fontsource, so the app makes no third-party requests.
- **Vitest** (node and jsdom projects), **Playwright Test** for the browser suite, and **ESLint 9**.
- **vite-plugin-pwa** for the service worker.

The design system (colour, type, spacing, motion, every component) is
documented in [DESIGN.md](DESIGN.md), including the architecture map.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit and component tests (Vitest)
npm run lint
```

### End-to-end tests

The browser suite uses Playwright Test and lives in `e2e/`. It builds the production bundle into `dist-e2e` and serves it on port 4317, then drives the real app: shelf and pour, the dial, the recipe card, analysis, Serve, the Grimoire, the Cellar, share links, undo, the phone layout, reduced motion, big-screen zoom, and a check that the console stays silent.

```bash
npm run test:e2e                                          # Chromium on this machine
npm run test:e2e:webkit                                   # WebKit in the official Playwright container
npm run test:e2e:all                                      # both, one after the other
npx playwright test --project=chromium e2e/zoom.spec.ts   # one spec
```

The app is tested in Chromium and WebKit. The WebKit run is Playwright's Linux WebKit build, which is close to Safari but is not macOS Safari or iOS Safari, so a real-device check is still worth doing before a release.

WebKit does not run on every Linux host, so `test:e2e:webkit` starts the official image `mcr.microsoft.com/playwright:v1.64.0-noble` with podman (swap in docker if you prefer; the flags are the same) and mounts the repo into it. Pull the image once with `podman pull mcr.microsoft.com/playwright:v1.64.0-noble`. Chromium needs the matching browser from `npx playwright install chromium`. Reports and traces land in `test-results/` and `playwright-report/`, which git ignores.

Production build (type-checks first, outputs `dist/`):

```bash
npm run build
npm run preview    # serve the built bundle locally
```

## Deploy to Cloudflare Pages

1. In the Cloudflare dashboard, open **Workers & Pages**, then **Create**,
   **Pages** and **Connect to Git**.
2. Pick this repo. Framework preset **Vite**, build command `npm run build`,
   build output directory `dist`.
3. Deploy.

[`public/_headers`](public/_headers) ships with the build and adds security
headers (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`) plus immutable
caching for Vite's content-hashed assets.
