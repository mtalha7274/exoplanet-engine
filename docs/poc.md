# Exoplanet Discovery Engine — Proof of Concept

**Version:** 0.1 (Draft)
**Author:** Solo hobby project
**Status:** POC / Exploration
**Budget:** $0
**Timeline:** 2–3 weekends
**Stack philosophy:** Vibe-coded with Cursor AI / Claude Code

---

## 1. Overview

### 1.1 One-liner

An interactive galactic atlas of 5,900+ *real* confirmed exoplanets — explorable like a sci-fi star map, with procedurally generated planet renderings and AI-written "planetary survey reports" that make real astronomical data feel like Star Wars lore.

### 1.2 The Pitch

NASA's Exoplanet Archive contains thousands of confirmed worlds: lava planets, ocean worlds, gas giants orbiting two suns, planets darker than coal. But this data lives in boring CSV tables and academic dashboards. Nobody experiences it the way it deserves to be experienced.

The Exoplanet Discovery Engine turns that archive into an **explorable universe**: pan across a 3D star map, click a star, warp to its system, see an artistic rendering of each planet generated from its real physical parameters, and read an in-universe "survey report" written in the style of a sci-fi expedition log — grounded in the actual science.

### 1.3 Why It's Extraordinary

- **Technically impressive:** Real astronomical data, 3D rendering, procedural generation, AI integration.
- **Creatively weird:** Sci-fi lore generator powered by real physics.
- **Socially interesting:** Makes real astronomy accessible and emotional — every planet in the app actually exists.
- **Nobody's built this:** Exoplanet dashboards exist; an immersive sci-fi *atlas* of real worlds does not.

---

## 2. Goals & Non-Goals

### 2.1 POC Goals

| # | Goal | Success Criteria |
|---|------|------------------|
| G1 | Load real exoplanet data | App displays 5,000+ confirmed planets from the NASA Exoplanet Archive |
| G2 | Explorable 3D star map | User can pan/zoom a 3D map of host stars positioned by real coordinates |
| G3 | System view | Clicking a star shows its planets with orbits scaled from real data |
| G4 | Procedural planet renderings | Each planet gets a visual generated from its real parameters (radius, temperature, type) |
| G5 | AI survey reports | Each planet gets a generated sci-fi-style survey report grounded in its real data |
| G6 | Discovery filters | Filter by "potentially habitable," "hell planets," "circumbinary (two suns)," etc. |

### 2.2 Non-Goals (for POC)

- User accounts, saving, or social features
- Scientific-grade accuracy in visualizations (stylized > simulated)
- Mobile-native app (responsive web is enough)
- Full-galaxy photorealism or GPU-heavy effects
- Covering candidate/unconfirmed planets (confirmed only)

---

## 3. Data Sources (All Free)

### 3.1 Primary: NASA Exoplanet Archive TAP API

- **Endpoint:** `https://exoplanetarchive.ipac.caltech.edu/TAP/sync`
- **Cost / Auth:** Free, no API key required
- **Format:** SQL-like ADQL queries, returns JSON or CSV
- **Key table:** `pscomppars` (Planetary Systems Composite Parameters — one row per planet, best available values)

**Example query (top of the funnel):**

```sql
SELECT pl_name, hostname, sy_dist, ra, dec,
       pl_rade, pl_bmasse, pl_eqt, pl_orbper, pl_orbsmax,
       st_teff, st_rad, st_spectype, sy_snum, sy_pnum,
       disc_year, discoverymethod
FROM pscomppars
```

As a URL:

```
https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,hostname,sy_dist,ra,dec,pl_rade,pl_bmasse,pl_eqt,st_teff+from+pscomppars&format=json
```

### 3.2 Key Fields

| Field | Meaning | Used For |
|-------|---------|----------|
| `pl_name` | Planet name | Display, report generation |
| `hostname` | Host star name | Grouping into systems |
| `ra`, `dec`, `sy_dist` | Sky coordinates + distance (parsecs) | 3D star map positioning |
| `pl_rade` | Planet radius (Earth radii) | Rendering size, classification |
| `pl_bmasse` | Planet mass (Earth masses) | Classification, lore |
| `pl_eqt` | Equilibrium temperature (K) | Color palette, habitability, lore |
| `pl_orbper` | Orbital period (days) | System view animation |
| `pl_orbsmax` | Semi-major axis (AU) | Orbit rendering |
| `st_teff` | Star temperature (K) | Star color |
| `st_spectype` | Spectral type | Star rendering, lore |
| `sy_snum` | Number of stars in system | "Tatooine" filter |
| `disc_year`, `discoverymethod` | Discovery metadata | Survey report flavor |

### 3.3 Strategy: Snapshot, Don't Stream

For a POC, hit the API **once**, save the result as a static JSON file (~5,900 rows ≈ a few MB), and ship it with the app. Benefits:

- No CORS or rate-limit headaches
- Instant load, works offline
- One small refresh script (`npm run refresh-data`) re-pulls when desired

---

## 4. Core Features (POC Scope)

### 4.1 Galaxy View (3D Star Map)

- Three.js point cloud of host stars
- Position: convert (RA, Dec, distance) → Cartesian XYZ
- Star color derived from `st_teff` (blue-white hot → red cool)
- Hover: star name + planet count tooltip
- Click: warp/zoom transition into System View
- Controls: orbit, pan, zoom (OrbitControls)

**Note:** Distances beyond ~500 parsecs can be log-scaled so the map stays visually dense instead of mostly empty.

### 4.2 System View

- Central star (colored by temperature, scaled by `st_rad`)
- Planets on elliptical orbit paths, spacing derived from `pl_orbsmax` (log scale for usability)
- Slow ambient orbital animation (speed ∝ 1 / `pl_orbper`, heavily compressed)
- Click a planet → Planet Detail Panel

### 4.3 Procedural Planet Rendering

Deterministic generation — same planet always looks the same (seed = planet name hash).

**Classification logic (simplified):**

| Condition | Class | Visual Style |
|-----------|-------|--------------|
| radius < 1.6 R⊕, temp 180–310 K | Temperate Rocky | Blue/green marble, clouds |
| radius < 1.6 R⊕, temp > 1000 K | Lava World | Glowing cracks, dark crust |
| radius < 1.6 R⊕, temp < 180 K | Frozen Rocky | White/pale blue, ice sheen |
| 1.6–4 R⊕ | Sub-Neptune / Water World | Deep blues, thick haze bands |
| 4–10 R⊕ | Neptune-like | Banded blues/teals |
| > 10 R⊕ | Gas Giant | Jupiter-style bands, storm spots |

**Rendering approach (choose one during build):**
- **Option A (recommended):** Procedural 2D canvas texture (noise-based) mapped onto a Three.js sphere
- **Option B:** Pure shader (GLSL noise) — cooler, harder, riskier for a POC

### 4.4 AI Planetary Survey Reports

Each planet gets an in-universe survey report, generated via the Claude API from its **real parameters**.

**Prompt sketch:**

> You are the survey AI of the deep-space exploration vessel *Meridian*. Write a short planetary survey report (150–200 words) for the following real exoplanet. Use its actual data. Style: atmospheric sci-fi expedition log — evocative but scientifically grounded. Include: designation, classification, one striking physical fact, one hazard or anomaly, and a closing recommendation (colonization / research / avoid).
>
> Data: `{name, radius, mass, temp, orbital period, star type, distance, discovery year, discovery method}`

**POC behavior:**
- Generate on-demand when a planet is first opened (cache in memory/localStorage-alternative)
- Fallback: template-based report if API unavailable, e.g. *"Designation {name}. Classification: {class}. Equilibrium temperature {temp} K..."*

### 4.5 Discovery Filters ("Curated Wonders")

Preset filter chips that answer "show me something cool":

| Filter | Logic |
|--------|-------|
| 🌍 Potentially Habitable | Rocky size + temperate `pl_eqt` |
| 🔥 Hell Planets | `pl_eqt` > 1500 K |
| 🌗 Tatooine Worlds | `sy_snum` >= 2 |
| 🧊 Ice Worlds | `pl_eqt` < 150 K |
| 👑 Giants | `pl_rade` > 10 |
| 🕰️ Ancient Discoveries | `disc_year` < 2000 |
| 🎲 Random Wonder | Jump to a random planet with a dramatic camera warp |

Filtering dims non-matching stars in Galaxy View rather than removing them — the universe stays visible.

---

## 5. Architecture

### 5.1 High-Level

```
┌─────────────────────────────────────────────┐
│                 Browser (SPA)               │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Galaxy  │  │  System  │  │  Planet   │  │
│  │   View   │→ │   View   │→ │  Detail   │  │
│  │(Three.js)│  │(Three.js)│  │  Panel    │  │
│  └──────────┘  └──────────┘  └───────────┘  │
│        │              │             │       │
│  ┌─────┴──────────────┴─────┐  ┌────┴────┐  │
│  │   Data Store (static     │  │ Claude  │  │
│  │   exoplanets.json)       │  │   API   │  │
│  └──────────────────────────┘  └─────────┘  │
└─────────────────────────────────────────────┘
         ▲
         │ (offline refresh script)
┌────────┴─────────┐
│ NASA Exoplanet   │
│ Archive TAP API  │
└──────────────────┘
```

### 5.2 Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | React + Vite | Fast setup, AI tools know it well |
| 3D | Three.js (+ react-three-fiber optional) | Industry standard, huge example base |
| State | Plain React state / Zustand | POC-simple |
| Styling | Tailwind or plain CSS | Dark sci-fi UI, fast iteration |
| Data | Static JSON snapshot | Zero backend, zero cost |
| AI | Claude API | Survey report generation |
| Hosting | GitHub Pages / Vercel free tier | $0 |

### 5.3 Data Pipeline

```
refresh-data script (node)
  → query NASA TAP API
  → clean rows (drop planets missing ra/dec/dist)
  → derive fields: xyz position, planet class, color seed
  → write public/data/exoplanets.json
```

Pre-deriving classification and positions at snapshot time keeps runtime code dumb and fast.

---

## 6. UX Flow

1. **Landing:** Fade in to Galaxy View — thousands of stars, ambient drift, a title, and one line: *"Every light is a real star. Every world is real."*
2. **Explore:** User pans/zooms; filter chips float at the bottom.
3. **Warp:** Click a star → camera flies in → System View.
4. **Discover:** Click a planet → rendered planet + stats + "SURVEYING..." typewriter effect → AI report streams in.
5. **Wander:** "Random Wonder" button for serendipity; back button returns to galaxy.

**Tone:** dark UI, thin mono/grotesk typography, subtle scanline/HUD accents. Feels like the bridge display of an exploration vessel, not a data dashboard.

---

## 7. Build Plan (Weekend-by-Weekend)

### Weekend 1 — The Universe Exists
- [ ] Project setup (Vite + React + Three.js)
- [ ] Data refresh script → `exoplanets.json`
- [ ] RA/Dec/distance → XYZ conversion
- [ ] Galaxy View: star point cloud, colors, hover tooltips
- [ ] Basic camera controls

**Milestone:** "I can fly through a map of real stars."

### Weekend 2 — Worlds Take Shape
- [ ] Click star → System View transition
- [ ] Orbits + planet spheres from real data
- [ ] Planet classification logic
- [ ] Procedural planet textures (canvas noise)
- [ ] Planet Detail Panel with real stats

**Milestone:** "I can visit any system and see its planets rendered."

### Weekend 3 — The Universe Speaks
- [ ] Claude API integration for survey reports (+ template fallback)
- [ ] Filter chips + dimming logic
- [ ] Random Wonder warp
- [ ] Landing polish, sound-free ambient feel, deploy to Vercel/GitHub Pages

**Milestone:** "Shippable POC. Shareable link."

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing data fields (many planets lack temp/mass) | Broken visuals | Filter to planets with minimum viable fields; mark others "UNSURVEYED" (which is honestly on-theme) |
| 3D performance with ~5k points | Laggy map | Use `THREE.Points` (single draw call), not 5k meshes |
| Distance scale makes map unusable | Empty-feeling universe | Log-scale distances; prioritize aesthetics over cartographic truth |
| AI report cost/limits | Feature breaks | On-demand generation + caching + template fallback |
| Scope creep (the classic) | Never ships | Non-goals list is law; polish only in Weekend 3 |

---

## 9. Stretch Ideas (Post-POC)

- **Shareable planet cards** — poster-style PNG export of a planet + its report
- **"Sky mode"** — where is this planet in *your* night sky right now?
- **Timeline scrubber** — watch discoveries appear year by year, 1992 → today
- **Ambient soundtrack** — generative drone audio per planet class
- **Compare mode** — Earth side-by-side with any planet, to scale
- **Habitability score** — richer model (star type, flux, eccentricity)

---

## 10. Definition of Done (POC)

The POC is done when a stranger can open a URL and, within 60 seconds, without instructions:

1. Realize they're looking at real stars,
2. Fly to one,
3. See a rendered world that actually exists,
4. Read a survey report about it that gives them chills,
5. Hit "Random Wonder" at least three times because they can't stop.

---

*"The universe is under no obligation to make sense to you. But it is, apparently, under some obligation to be beautiful."*
