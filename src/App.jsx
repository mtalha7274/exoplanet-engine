import { useEffect, useMemo, useRef, useState } from 'react'
import GalaxyView from './components/GalaxyView.jsx'
import SystemView from './components/SystemView.jsx'
import PlanetPanel from './components/PlanetPanel.jsx'
import FilterChips from './components/FilterChips.jsx'
import { loadPlanets } from './lib/data.js'
import { groupSystems } from './lib/pipeline.js'
import { createSurveyClient } from './lib/surveyClient.js'
import { FILTERS } from './lib/filters.js'
import { systemStats } from './lib/format.js'
import { filterPlanets, findSystem, pickRandom } from './lib/select.js'

function storage() {
  try {
    window.localStorage.getItem('survey:probe')
    return window.localStorage
  } catch {
    return null
  }
}

export default function App() {
  const [planets, setPlanets] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState(null)
  const [host, setHost] = useState(null)
  const [planet, setPlanet] = useState(null)
  const [warpTarget, setWarpTarget] = useState(null)
  const pendingPlanet = useRef(null)

  const survey = useMemo(() => createSurveyClient({ storage: storage() }), [])

  useEffect(() => {
    loadPlanets().then(setPlanets).catch(err => setError(err.message))
  }, [])

  const systems = useMemo(() => (planets ? groupSystems(planets) : []), [planets])

  const counts = useMemo(() => {
    const out = {}
    for (const f of FILTERS) out[f.id] = planets ? filterPlanets(planets, f.id).length : 0
    return out
  }, [planets])

  const system = findSystem(systems, host)

  function warpTo(nextHost) {
    setHost(nextHost)
    setWarpTarget(null)
    const queued = pendingPlanet.current
    if (queued) {
      pendingPlanet.current = null
      setPlanet(queued)
    }
  }

  function randomWonder() {
    if (!planets) return
    const pool = filterPlanets(planets, filter)
    const pick = pickRandom(pool)
    if (!pick) return
    const target = findSystem(systems, pick.host)
    if (!target) return
    setPlanet(null)
    if (host === pick.host) {
      setPlanet(pick)
      return
    }
    pendingPlanet.current = pick
    if (host) {
      setHost(null)
      setWarpTarget(target)
    } else {
      setWarpTarget(target)
    }
  }

  function backToGalaxy() {
    setHost(null)
    setPlanet(null)
    setWarpTarget(null)
  }

  if (error) {
    return (
      <div className="boot">
        <h1>SIGNAL LOST</h1>
        <p>{error}</p>
        <p className="boot-hint">Run <code>npm run refresh-data</code> to rebuild the star chart.</p>
      </div>
    )
  }

  if (!planets) {
    return (
      <div className="boot">
        <h1>EXOPLANET DISCOVERY ENGINE</h1>
        <p className="boot-status">ACQUIRING STAR CHART…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="scanlines" />

      {system ? (
        <SystemView
          system={system}
          filter={filter}
          selected={planet}
          onSelectPlanet={setPlanet}
        />
      ) : (
        <GalaxyView
          systems={systems}
          filter={filter}
          onWarp={warpTo}
          warpTarget={warpTarget}
        />
      )}

      <header className="hud-top">
        <div className="brand">
          <h1>EXOPLANET DISCOVERY ENGINE</h1>
          <p>Every light is a real star. Every world is real.</p>
        </div>
        <div className="readout">
          <span>{planets.length.toLocaleString()} CONFIRMED WORLDS</span>
          <span>{systems.length.toLocaleString()} HOST SYSTEMS</span>
        </div>
      </header>

      {system && (
        <div className="hud-system">
          <div className="hud-system-head">
            <button className="back" onClick={backToGalaxy}>← GALAXY</button>
            <h2>{system.host}</h2>
          </div>
          <dl className="system-strip">
            {systemStats(system).map(stat => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {planet && (
        <PlanetPanel planet={planet} survey={survey} onClose={() => setPlanet(null)} />
      )}

      <footer className={planet ? 'hud-bottom shifted' : 'hud-bottom'}>
        <FilterChips
          active={filter}
          counts={counts}
          onChange={setFilter}
          onRandom={randomWonder}
        />
      </footer>
    </div>
  )
}
