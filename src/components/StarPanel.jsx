import { classifyStar, starStats } from '../lib/starClass.js'

const KIND_TINT = {
  'neutron-star': '#a5b4fc',
  supergiant: '#fca5a5',
  'bright-giant': '#fdba74',
  giant: '#fdba74',
  subgiant: '#fde68a',
  'main-sequence': '#7dd3fc',
  'white-dwarf': '#e2e8f0',
  unknown: '#7e8ca5'
}

export default function StarPanel({ system, range, onClose, onEnterSystem }) {
  const star = classifyStar(system)
  const tint = KIND_TINT[star.kind] ?? KIND_TINT.unknown

  return (
    <aside className="panel star-panel">
      <button className="panel-close" onClick={onClose} aria-label="Close star record">×</button>

      <div className="star-hero">
        <div className="star-orb" style={{ background: system.starColor, boxShadow: `0 0 46px 10px ${system.starColor}66` }} />
        <h2>{system.host}</h2>
        <p className="panel-class" style={{ color: tint }}>{star.label.toUpperCase()}</p>
        {range?.parsecs != null && (
          <p className="panel-host">{range.parsecs.toFixed(2)} pc FROM {range.from}</p>
        )}
      </div>

      <div className="star-copy">
        <p className="star-blurb">{star.blurb}</p>
        <p className="star-blurb star-worlds" style={{ borderColor: `${tint}55` }}>{star.worlds}</p>
      </div>

      <dl className="stat-grid">
        {starStats(system).map(stat => (
          <div key={stat.label} className="stat">
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>

      {onEnterSystem && system.planets.length > 0 && (
        <button className="enter-system" onClick={() => onEnterSystem(system)}>
          ENTER SYSTEM · {system.planets.length} WORLD{system.planets.length === 1 ? '' : 'S'}
        </button>
      )}
    </aside>
  )
}
