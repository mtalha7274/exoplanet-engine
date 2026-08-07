import { matchesFilter } from './filters.js'

export function filterPlanets(planets, id) {
  if (!id) return planets
  return planets.filter(p => matchesFilter(p, id))
}

export function systemMatches(system, id) {
  if (!id) return true
  return system.planets.some(p => matchesFilter(p, id))
}

export function pickRandom(list, rand = Math.random) {
  if (list.length === 0) return null
  const i = Math.min(list.length - 1, Math.floor(rand() * list.length))
  return list[i]
}

export function findSystem(systems, host) {
  if (!host) return null
  return systems.find(s => s.host === host) ?? null
}
