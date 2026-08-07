import { describe, it, expect } from 'vitest'
import { filterPlanets, systemMatches, pickRandom, findSystem } from './select.js'

const planets = [
  { name: 'a', host: 'A', rade: 1.1, eqt: 250, snum: 1, discYear: 2015 },
  { name: 'b', host: 'A', rade: 14, eqt: 1800, snum: 1, discYear: 1999 },
  { name: 'c', host: 'B', rade: 3, eqt: 90, snum: 2, discYear: 2020 }
]

const systems = [
  { host: 'A', planets: [planets[0], planets[1]] },
  { host: 'B', planets: [planets[2]] }
]

describe('filterPlanets', () => {
  it('returns everything when no filter is active', () => {
    expect(filterPlanets(planets, null)).toHaveLength(3)
  })

  it('returns only matching planets', () => {
    expect(filterPlanets(planets, 'habitable').map(p => p.name)).toEqual(['a'])
    expect(filterPlanets(planets, 'hell').map(p => p.name)).toEqual(['b'])
    expect(filterPlanets(planets, 'ice').map(p => p.name)).toEqual(['c'])
  })
})

describe('systemMatches', () => {
  it('matches when any planet in the system matches', () => {
    expect(systemMatches(systems[0], 'hell')).toBe(true)
    expect(systemMatches(systems[1], 'hell')).toBe(false)
  })

  it('matches everything when no filter is active', () => {
    expect(systemMatches(systems[1], null)).toBe(true)
  })
})

describe('pickRandom', () => {
  it('returns null for an empty list', () => {
    expect(pickRandom([], () => 0)).toBeNull()
  })

  it('selects deterministically from the supplied random source', () => {
    expect(pickRandom(planets, () => 0).name).toBe('a')
    expect(pickRandom(planets, () => 0.99).name).toBe('c')
    expect(pickRandom(planets, () => 0.5).name).toBe('b')
  })
})

describe('findSystem', () => {
  it('finds a system by host name', () => {
    expect(findSystem(systems, 'B').host).toBe('B')
  })

  it('returns null when the host is unknown', () => {
    expect(findSystem(systems, 'Z')).toBeNull()
    expect(findSystem(systems, null)).toBeNull()
  })
})
