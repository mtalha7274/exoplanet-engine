import { describe, it, expect } from 'vitest'
import { FILTERS, getFilter, matchesFilter } from './filters.js'

describe('FILTERS', () => {
  it('contains the six curated filters', () => {
    const ids = FILTERS.map(f => f.id)
    expect(ids).toEqual(['habitable', 'hell', 'tatooine', 'ice', 'giants', 'ancient'])
  })

  it('gives every filter an emoji and a label', () => {
    for (const f of FILTERS) {
      expect(f.emoji.length).toBeGreaterThan(0)
      expect(f.label.length).toBeGreaterThan(0)
    }
  })
})

describe('filter predicates', () => {
  it('habitable requires rocky size and temperate equilibrium temperature', () => {
    const t = getFilter('habitable').test
    expect(t({ rade: 1.2, eqt: 250 })).toBe(true)
    expect(t({ rade: 2.0, eqt: 250 })).toBe(false)
    expect(t({ rade: 1.2, eqt: 400 })).toBe(false)
    expect(t({ rade: null, eqt: 250 })).toBe(false)
    expect(t({ rade: 1.2, eqt: null })).toBe(false)
  })

  it('hell planets are hotter than 1500 K', () => {
    const t = getFilter('hell').test
    expect(t({ eqt: 1600 })).toBe(true)
    expect(t({ eqt: 1500 })).toBe(false)
    expect(t({ eqt: null })).toBe(false)
  })

  it('tatooine worlds orbit multi-star systems', () => {
    const t = getFilter('tatooine').test
    expect(t({ snum: 2 })).toBe(true)
    expect(t({ snum: 3 })).toBe(true)
    expect(t({ snum: 1 })).toBe(false)
    expect(t({ snum: null })).toBe(false)
  })

  it('ice worlds are colder than 150 K', () => {
    const t = getFilter('ice').test
    expect(t({ eqt: 100 })).toBe(true)
    expect(t({ eqt: 150 })).toBe(false)
  })

  it('giants exceed 10 earth radii', () => {
    const t = getFilter('giants').test
    expect(t({ rade: 11 })).toBe(true)
    expect(t({ rade: 10 })).toBe(false)
  })

  it('ancient discoveries predate 2000', () => {
    const t = getFilter('ancient').test
    expect(t({ discYear: 1995 })).toBe(true)
    expect(t({ discYear: 2000 })).toBe(false)
    expect(t({ discYear: null })).toBe(false)
  })
})

describe('matchesFilter', () => {
  it('matches everything when no filter is active', () => {
    expect(matchesFilter({ rade: null }, null)).toBe(true)
  })

  it('delegates to the named filter', () => {
    expect(matchesFilter({ eqt: 2000 }, 'hell')).toBe(true)
    expect(matchesFilter({ eqt: 200 }, 'hell')).toBe(false)
  })

  it('returns null for unknown filter ids', () => {
    expect(getFilter('nope')).toBeNull()
  })
})
