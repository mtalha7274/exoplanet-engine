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
| `npm test` | Vitest suite (143 tests) |
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

## How it works

Positions come from real right ascension, declination, and distance. One scene unit is one parsec out to 500 pc; beyond that, distances are log-compressed so the map stays visually dense instead of mostly empty. That affects 41% of the catalog — the far half of the map is ordered correctly but not to scale. The Kepler survey field shows up as a real spike of stars in one direction, because that is genuinely where we have looked hardest.

Star colors come from a blackbody approximation of each star's effective temperature, so the palette is continuous rather than bucketed. Distances are shown in light years alongside parsecs.

Planets are drawn far smaller than their host stars — a Jupiter-sized world renders at roughly a quarter of a sun-like star's radius. That is still generous next to reality (about a tenth), but keeps small worlds visible. Clicking uses invisible larger hit spheres so tiny planets stay easy to select.

Planet appearance is deterministic: the planet's name is hashed into a seed that drives value-noise fbm over a per-class color palette, so the same world always looks the same. Survey reports are generated from a template grounded in each planet's actual measurements, cached in `localStorage`. `createSurveyClient` takes an optional `generate` function, which is the seam for wiring in an LLM later.

## Layout

```
scripts/refresh-data.mjs   NASA TAP → public/data/exoplanets.json
src/lib/                   Pure logic, fully unit-tested
src/components/            Three.js views and the detail panel
```

Every module in `src/lib/` has a matching `*.test.js`. The views are thin shells over that tested logic.
