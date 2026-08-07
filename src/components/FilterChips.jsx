import { FILTERS } from '../lib/filters.js'

export default function FilterChips({ active, onChange, onRandom, counts }) {
  return (
    <div className="chips">
      {FILTERS.map(f => (
        <button
          key={f.id}
          className={active === f.id ? 'chip active' : 'chip'}
          onClick={() => onChange(active === f.id ? null : f.id)}
        >
          <span className="chip-emoji">{f.emoji}</span>
          {f.label}
          <span className="chip-count">{counts[f.id]}</span>
        </button>
      ))}
      <button className="chip random" onClick={onRandom}>
        <span className="chip-emoji">🎲</span>
        Random Wonder
      </button>
    </div>
  )
}
