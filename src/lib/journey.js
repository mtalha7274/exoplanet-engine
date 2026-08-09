export const JOURNEY_KEY = 'journey:path'

export function createJourney() {
  return { visits: [] }
}

export function recordVisit(journey, system) {
  if (!system) return journey
  const last = journey.visits[journey.visits.length - 1]
  if (last && last.host === system.host) return journey
  const visit = {
    host: system.host,
    x: system.x,
    y: system.y,
    z: system.z,
    planets: system.planets ? system.planets.length : 0
  }
  return { visits: [...journey.visits, visit] }
}

export function loadJourney(storage) {
  if (!storage) return createJourney()
  try {
    const raw = storage.getItem(JOURNEY_KEY)
    if (!raw) return createJourney()
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.visits)) return createJourney()
    return { visits: parsed.visits }
  } catch {
    return createJourney()
  }
}

export function saveJourney(storage, journey) {
  if (!storage) return
  try {
    storage.setItem(JOURNEY_KEY, JSON.stringify(journey))
  } catch {
    return
  }
}

export function clearJourney(storage) {
  if (!storage) return
  try {
    storage.removeItem(JOURNEY_KEY)
  } catch {
    return
  }
}

export function journeyReach(visits) {
  let far = 0
  for (const v of visits) far = Math.max(far, Math.hypot(v.x, v.z))
  return far
}

export function projectJourney(visits, size, padding = 10) {
  const centre = size / 2
  const reach = journeyReach(visits)
  const scale = reach > 0 ? (centre - padding) / reach : 0
  const sol = { host: 'SOL', x: centre, y: centre, planets: 0 }
  return [
    sol,
    ...visits.map(v => ({
      host: v.host,
      x: centre + v.x * scale,
      y: centre + v.z * scale,
      planets: v.planets
    }))
  ]
}
