# Exoplanet Discovery Engine

An interactive galactic atlas of 6,309 real confirmed exoplanets from the NASA Exoplanet Archive — explorable as a 3D star map, with procedurally generated planet renderings and in-universe survey reports.

Full spec: [docs/poc.md](docs/poc.md).

## Quick start

```bash
npm install
npm run dev
```

The star chart ships with the repo at `public/data/exoplanets.json`, so the app works offline.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm test` | Vitest suite (200 tests) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | oxlint |
| `npm run build` | Production build into `dist/` |
| `npm run refresh-data` | Re-pull the NASA snapshot |

## Updating the data

`public/data/exoplanets.json` holds **raw NASA Exoplanet Archive rows**, exactly as the archive returns them. Nothing is pre-computed, so the file is a drop-in replacement:

```bash
npm run refresh-data      # re-pull the latest rows
```

Or replace the file by hand with any `pscomppars` export from the archive — for example:

```
https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+*+from+pscomppars&format=json
```

The app derives positions, classification, and star colors at load time (`adaptRows` in [src/lib/pipeline.js](src/lib/pipeline.js)), so a fresh download works without touching code. Only four columns are required — `pl_name`, `ra`, `dec`, `sy_dist` — and rows missing them are dropped. Everything else degrades to `UNSURVEYED` rather than breaking. For backward compatibility, an already-derived snapshot is also accepted.

## Flight mode

**FLY FROM EARTH** launches a ship from Sol at true scale — nothing is compressed, so every star sits at its measured distance. Earth is already the origin: right ascension, declination, and distance are heliocentric, so (0,0,0) is home.

| Control | Action |
| --- | --- |
| `W` / `S` | thrust / brake |
| `A` / `D` | turn left / right |
| mouse up / down | pitch (dead zone in the middle of the screen) |
| `Shift` | boost |

Holding thrust builds speed exponentially rather than stepping through fixed gears, which is what makes true scale usable: Proxima Centauri is 1.3 pc away and reachable in seconds, while the far edge of the catalog at 8,500 pc needs sustained boost. Release the keys and the ship cruises at its current speed.

Click any star to open its record. Get within 0.6 pc and an arrival prompt appears, with a link into the system view — the same orbital view the galaxy map uses. Leaving a system resumes flight exactly where you left off.

Stars are classified from temperature and radius rather than the archive's spectral-type string, which is only 37% populated against 95% for the raw measurements. Radius is compared to the expected main-sequence radius *for that temperature*, since hot stars are naturally large — a 4 R☉ B-type star is main sequence, while a 4 R☉ M-type star is a giant. The catalog yields 1,906 yellow dwarfs, 1,008 orange dwarfs, 176 orange giants, 4 white dwarfs, and 4 pulsars, including PSR B1257+12 — the neutron star whose planets were the first exoplanets ever confirmed, in 1992.

There are no true supergiants in the data. The largest host is 88.5 R☉, which classifies as a bright giant; a red supergiant would be 200 R☉ or more. The category exists in the code and is correct, but nothing in this catalog reaches it.

## How it works

Positions are stored as **true parsec coordinates** and are what flight mode uses. The galaxy map applies log compression past 500 pc only at render time, so the overview stays visually dense instead of mostly empty — that affects 41% of the catalog, ordered correctly but not to scale. Flight mode never compresses. The Kepler survey field shows up as a real spike of stars in one direction, because that is genuinely where we have looked hardest.

The ship stays at scene origin and the world moves around it. At 8,500 parsecs, float32 precision is coarser than the ship itself, so anchoring the ship at zero is what keeps it from jittering apart at the far edge of the map.

Star colors come from a blackbody approximation of each star's effective temperature, so the palette is continuous rather than bucketed. Distances are shown in light years alongside parsecs.

Planets are drawn far smaller than their host stars — a Jupiter-sized world renders at roughly a quarter of a sun-like star's radius. That is still generous next to reality (about a tenth), but keeps small worlds visible. Clicking uses invisible larger hit spheres so tiny planets stay easy to select.

Planet appearance is deterministic: the planet's name is hashed into a seed that drives value-noise fbm over a per-class color palette, so the same world always looks the same. Survey reports are generated from a template grounded in each planet's actual measurements, cached in `localStorage`. `createSurveyClient` takes an optional `generate` function, which is the seam for wiring in an LLM later.

## Layout

```
scripts/refresh-data.mjs   NASA TAP → public/data/exoplanets.json
src/lib/                   Pure logic, fully unit-tested
src/components/            Three.js views, ship, and panels
```

Every module in `src/lib/` has a matching `*.test.js`. The views are thin shells over that tested logic.
