export const FILTERS = [
  {
    id: 'habitable',
    label: 'Potentially Habitable',
    emoji: '🌍',
    test: p => p.rade != null && p.eqt != null && p.rade < 1.6 && p.eqt >= 180 && p.eqt <= 310
  },
  {
    id: 'hell',
    label: 'Hell Planets',
    emoji: '🔥',
    test: p => p.eqt != null && p.eqt > 1500
  },
  {
    id: 'tatooine',
    label: 'Tatooine Worlds',
    emoji: '🌗',
    test: p => p.snum != null && p.snum >= 2
  },
  {
    id: 'ice',
    label: 'Ice Worlds',
    emoji: '🧊',
    test: p => p.eqt != null && p.eqt < 150
  },
  {
    id: 'giants',
    label: 'Giants',
    emoji: '👑',
    test: p => p.rade != null && p.rade > 10
  },
  {
    id: 'ancient',
    label: 'Ancient Discoveries',
    emoji: '🕰️',
    test: p => p.discYear != null && p.discYear < 2000
  }
]

export function getFilter(id) {
  return FILTERS.find(f => f.id === id) ?? null
}

export function matchesFilter(planet, id) {
  if (!id) return true
  const f = getFilter(id)
  return f ? f.test(planet) : true
}
