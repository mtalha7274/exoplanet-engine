import { describe, it, expect } from 'vitest'
import {
  JOURNEY_KEY,
  createJourney,
  recordVisit,
  loadJourney,
  saveJourney,
  clearJourney,
  projectJourney,
  journeyReach
} from './journey.js'

const sysA = { host: 'A', x: 3, y: 0, z: 4, planets: [{}, {}] }
const sysB = { host: 'B', x: -6, y: 2, z: 8, planets: [{}] }

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: k => map.delete(k),
    _map: map
  }
}

describe('createJourney', () => {
  it('starts empty', () => {
    expect(createJourney().visits).toEqual([])
  })
})

describe('recordVisit', () => {
  it('adds a system with only what the map needs', () => {
    const [visit] = recordVisit(createJourney(), sysA).visits
    expect(visit).toEqual({ host: 'A', x: 3, y: 0, z: 4, planets: 2 })
  })

  it('keeps visits in the order they happened', () => {
    const j = recordVisit(recordVisit(createJourney(), sysA), sysB)
    expect(j.visits.map(v => v.host)).toEqual(['A', 'B'])
  })

  it('does not log the same system twice in a row', () => {
    const j = recordVisit(recordVisit(createJourney(), sysA), sysA)
    expect(j.visits).toHaveLength(1)
  })

  it('does log a system revisited after going elsewhere', () => {
    let j = recordVisit(createJourney(), sysA)
    j = recordVisit(j, sysB)
    j = recordVisit(j, sysA)
    expect(j.visits.map(v => v.host)).toEqual(['A', 'B', 'A'])
  })

  it('never mutates the journey it is handed', () => {
    const before = createJourney()
    recordVisit(before, sysA)
    expect(before.visits).toEqual([])
  })

  it('ignores a missing system', () => {
    expect(recordVisit(createJourney(), null).visits).toEqual([])
  })
})

describe('saving and resuming', () => {
  it('round-trips through storage', () => {
    const store = memoryStorage()
    const j = recordVisit(recordVisit(createJourney(), sysA), sysB)
    saveJourney(store, j)
    expect(loadJourney(store)).toEqual(j)
  })

  it('starts fresh when nothing has been saved', () => {
    expect(loadJourney(memoryStorage())).toEqual(createJourney())
  })

  it('starts fresh rather than throwing on corrupt data', () => {
    expect(loadJourney(memoryStorage({ [JOURNEY_KEY]: '{not json' }))).toEqual(createJourney())
  })

  it('starts fresh when the saved shape is wrong', () => {
    expect(loadJourney(memoryStorage({ [JOURNEY_KEY]: '{"visits":"nope"}' }))).toEqual(createJourney())
  })

  it('survives storage being unavailable entirely', () => {
    const broken = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
      removeItem: () => { throw new Error('denied') }
    }
    expect(loadJourney(broken)).toEqual(createJourney())
    expect(() => saveJourney(broken, createJourney())).not.toThrow()
    expect(() => clearJourney(broken)).not.toThrow()
  })

  it('tolerates having no storage at all', () => {
    expect(loadJourney(null)).toEqual(createJourney())
    expect(() => saveJourney(null, createJourney())).not.toThrow()
  })
})

describe('clearJourney', () => {
  it('removes the saved path so the next load starts over', () => {
    const store = memoryStorage()
    saveJourney(store, recordVisit(createJourney(), sysA))
    clearJourney(store)
    expect(loadJourney(store)).toEqual(createJourney())
  })
})

describe('projectJourney', () => {
  const size = 100

  it('puts Sol at the centre even with no visits', () => {
    const pts = projectJourney([], size)
    expect(pts).toHaveLength(1)
    expect(pts[0]).toMatchObject({ host: 'SOL', x: 50, y: 50 })
  })

  it('leads with Sol and then the visits in order', () => {
    const pts = projectJourney(recordVisit(recordVisit(createJourney(), sysA), sysB).visits, size)
    expect(pts.map(p => p.host)).toEqual(['SOL', 'A', 'B'])
  })

  it('keeps every point inside the map', () => {
    const visits = recordVisit(recordVisit(createJourney(), sysA), sysB).visits
    for (const p of projectJourney(visits, size)) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(size)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(size)
    }
  })

  it('scales so the farthest visit reaches the edge padding', () => {
    const pts = projectJourney(recordVisit(createJourney(), sysB).visits, size, 8)
    const far = pts[1]
    const reach = Math.hypot(far.x - size / 2, far.y - size / 2)
    expect(reach).toBeCloseTo(size / 2 - 8, 6)
  })

  it('carries the planet count through for drawing dots', () => {
    const pts = projectJourney(recordVisit(createJourney(), sysA).visits, size)
    expect(pts[1].planets).toBe(2)
  })
})

describe('journeyReach', () => {
  it('is zero for an untravelled journey', () => {
    expect(journeyReach([])).toBe(0)
  })

  it('reports the farthest visit from Sol in parsecs', () => {
    expect(journeyReach(recordVisit(createJourney(), sysA).visits)).toBeCloseTo(5, 9)
  })
})
