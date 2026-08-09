import { useEffect, useMemo, useRef, useState } from 'react'
import SystemView from './components/SystemView.jsx'
import FlightView from './components/FlightView.jsx'
import FlightHUD from './components/FlightHUD.jsx'
import PlanetPanel from './components/PlanetPanel.jsx'
import StarPanel from './components/StarPanel.jsx'
import FilterChips from './components/FilterChips.jsx'
import Minimap from './components/Minimap.jsx'
import { loadPlanets } from './lib/data.js'
import { groupSystems } from './lib/pipeline.js'
import { createSurveyClient } from './lib/surveyClient.js'
import { FILTERS } from './lib/filters.js'
import { systemStats } from './lib/format.js'
import { filterPlanets, findSystem, pickRandom } from './lib/select.js'
import { createJourney, recordVisit, loadJourney, saveJourney, clearJourney } from './lib/journey.js'
import { SOL_SYSTEM } from './lib/homeSystem.js'
import { approachFlight } from './lib/wonder.js'

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
  const [flightKey, setFlightKey] = useState(0)
  const [telemetry, setTelemetry] = useState(IDLE_TELEMETRY)
  const [starRecord, setStarRecord] = useState(null)
  const [journey, setJourney] = useState(createJourney)
  const flightRef = useRef(null)

  const survey = useMemo(() => createSurveyClient({ storage: storage() }), [])

  useEffect(() => {
    loadPlanets().then(setPlanets).catch(err => setError(err.message))
    setJourney(loadJourney(storage()))
  }, [])

  const systems = useMemo(() => (planets ? groupSystems(planets) : []), [planets])

  const counts = useMemo(() => {
    const out = {}
    for (const f of FILTERS) out[f.id] = planets ? filterPlanets(planets, f.id).length : 0
    return out
  }, [planets])

  const system = host === SOL_SYSTEM.host ? SOL_SYSTEM : findSystem(systems, host)

  useEffect(() => {
    if (!system) return
    setJourney(previous => {
      const next = recordVisit(previous, system)
      if (next !== previous) saveJourney(storage(), next)
      return next
    })
  }, [system])

  function resetJourney() {
    clearJourney(storage())
    setJourney(createJourney())
  }

  function randomWonder() {
    if (!planets) return
    const pool = filterPlanets(planets, filter)
    const pick = pickRandom(pool)
    if (!pick) return
    const target = findSystem(systems, pick.host)
    if (!target) return
    flightRef.current = approachFlight(target)
    setFlightKey(key => key + 1)
    setTelemetry(IDLE_TELEMETRY)
    setStarRecord(null)
    setPlanet(null)
    setHost(null)
  }

  function leaveSystem() {
    setHost(null)
    setPlanet(null)
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

  function selectFlightTarget(hit) {
    if (!hit) return
    setPlanet(null)
    setStarRecord(hit.system)
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
      ) : (
        <FlightView
          key={flightKey}
          systems={systems}
          flightRef={flightRef}
          onTelemetry={setTelemetry}
          onSelectStar={selectFlightTarget}
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
        <Minimap
          visits={journey.visits}
          shipPos={telemetry.flight ? telemetry.flight.pos : null}
          onReset={resetJourney}
        />
      )}

      {!system && (
        <FlightHUD
          telemetry={telemetry}
          onInspect={selectStar}
          onEnterSystem={s => setHost(s.host)}
        />
      )}

      {system && (
        <div className="hud-system">
          <div className="hud-system-head">
            <button className="back" onClick={leaveSystem}>
              ← RESUME FLIGHT
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

      <footer className={planet || starRecord ? 'hud-bottom shifted' : 'hud-bottom'}>
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
