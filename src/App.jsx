import { useEffect, useMemo, useRef, useState } from 'react'
import GalaxyView from './components/GalaxyView.jsx'
import SystemView from './components/SystemView.jsx'
import FlightView from './components/FlightView.jsx'
import FlightHUD from './components/FlightHUD.jsx'
import PlanetPanel from './components/PlanetPanel.jsx'
import StarPanel from './components/StarPanel.jsx'
import FilterChips from './components/FilterChips.jsx'
import { loadPlanets } from './lib/data.js'
import { groupSystems } from './lib/pipeline.js'
import { createSurveyClient } from './lib/surveyClient.js'
import { FILTERS } from './lib/filters.js'
import { systemStats } from './lib/format.js'
import { filterPlanets, findSystem, pickRandom } from './lib/select.js'

const IDLE_TELEMETRY = {
  speed: 0,
  boost: false,
  distance: 0,
  nearest: null,
  nearestDistance: null,
  arrived: null,
  flight: null
}

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
  const [mode, setMode] = useState('galaxy')
  const [telemetry, setTelemetry] = useState(IDLE_TELEMETRY)
  const [starRecord, setStarRecord] = useState(null)
  const pendingPlanet = useRef(null)
  const flightRef = useRef(null)

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
  const flying = mode === 'flight' && !system

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
    setMode('galaxy')
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

  function leaveSystem() {
    setHost(null)
    setPlanet(null)
    setWarpTarget(null)
    setStarRecord(null)
  }

  function selectPlanet(next) {
    setStarRecord(null)
    setPlanet(next)
  }

  function selectStar(next) {
    setPlanet(null)
    setStarRecord(next)
  }

  function launch() {
    setHost(null)
    setPlanet(null)
    setWarpTarget(null)
    setStarRecord(null)
    setMode('flight')
  }

  function toGalaxyMap() {
    setStarRecord(null)
    setMode('galaxy')
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
          onSelectPlanet={selectPlanet}
          onSelectStar={() => selectStar(system)}
        />
      ) : flying ? (
        <FlightView
          systems={systems}
          flightRef={flightRef}
          onTelemetry={setTelemetry}
          onSelectStar={setStarRecord}
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

      {!system && (
        <div className="mode-switch">
          <button
            className={flying ? '' : 'active'}
            onClick={toGalaxyMap}
          >
            GALAXY MAP
          </button>
          <button
            className={flying ? 'active' : ''}
            onClick={launch}
          >
            FLY FROM EARTH
          </button>
        </div>
      )}

      {flying && (
        <FlightHUD
          telemetry={telemetry}
          onInspect={setStarRecord}
          onEnterSystem={s => setHost(s.host)}
        />
      )}

      {system && (
        <div className="hud-system">
          <div className="hud-system-head">
            <button className="back" onClick={leaveSystem}>
              {mode === 'flight' ? '← RESUME FLIGHT' : '← GALAXY'}
            </button>
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

      {starRecord && (
        <StarPanel
          system={starRecord}
          range={
            system
              ? { parsecs: starRecord.dist, from: 'EARTH' }
              : telemetry.nearest === starRecord
                ? { parsecs: telemetry.nearestDistance, from: 'SHIP' }
                : null
          }
          onClose={() => setStarRecord(null)}
          onEnterSystem={system ? null : s => {
            setStarRecord(null)
            setHost(s.host)
          }}
        />
      )}

      {planet && (
        <PlanetPanel planet={planet} survey={survey} onClose={() => setPlanet(null)} />
      )}

      {!flying && (
        <footer className={planet || starRecord ? 'hud-bottom shifted' : 'hud-bottom'}>
          <FilterChips
            active={filter}
            counts={counts}
            onChange={setFilter}
            onRandom={randomWonder}
          />
        </footer>
      )}
    </div>
  )
}
