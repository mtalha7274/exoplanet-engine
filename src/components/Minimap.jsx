import { projectJourney, journeyReach } from '../lib/journey.js'

const SIZE = 176
const PADDING = 14

function planetDots(point, count) {
  const shown = Math.min(count, 8)
  const dots = []
  for (let i = 0; i < shown; i++) {
    const a = (i / shown) * Math.PI * 2
    dots.push(
      <circle
        key={i}
        cx={point.x + Math.cos(a) * 6.5}
        cy={point.y + Math.sin(a) * 6.5}
        r={1.1}
        className="mini-planet"
      />
    )
  }
  return dots
}

export default function Minimap({ visits, shipPos, onReset }) {
  const points = projectJourney(visits, SIZE, PADDING)
  const centre = SIZE / 2
  const reach = journeyReach(visits)
  const scale = reach > 0 ? (centre - PADDING) / reach : 0

  let ship = null
  if (shipPos) {
    const r = Math.hypot(shipPos[0], shipPos[2])
    const limit = centre - PADDING
    const drawn = scale > 0 ? Math.min(r * scale, limit) : (r > 0 ? limit : 0)
    const k = r > 0 ? drawn / r : 0
    ship = { x: centre + shipPos[0] * k, y: centre + shipPos[2] * k }
  }

  const path = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <div className="minimap">
      <div className="minimap-head">
        <span>JOURNEY</span>
        <button onClick={onReset} title="Clear the saved path">RESET</button>
      </div>

      <svg width={SIZE} height={SIZE} className="minimap-canvas" role="img" aria-label="Journey map">
        <circle cx={centre} cy={centre} r={centre - PADDING} className="mini-ring" />
        {points.length > 1 && <polyline points={path} className="mini-path" />}
        {points.map((p, i) => (
          <g key={`${p.host}-${i}`}>
            {i > 0 && planetDots(p, p.planets)}
            <circle cx={p.x} cy={p.y} r={i === 0 ? 3.4 : 2.6} className={i === 0 ? 'mini-sol' : 'mini-visit'} />
          </g>
        ))}
        {ship && <circle cx={ship.x} cy={ship.y} r={2.2} className="mini-ship" />}
      </svg>

      <div className="minimap-foot">
        <span>{visits.length} VISITED</span>
        <span>{reach.toFixed(1)} pc REACH</span>
      </div>
    </div>
  )
}
