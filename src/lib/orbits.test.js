import { describe, it, expect } from 'vitest'
import { orbitRadius, orbitSpeed, displayRadius, starDisplayRadius, STAR_BASE } from './orbits.js'

describe('orbitRadius', () => {
  it('grows with semi-major axis', () => {
    expect(orbitRadius(1, 0)).toBeGreaterThan(orbitRadius(0.05, 0))
    expect(orbitRadius(30, 0)).toBeGreaterThan(orbitRadius(1, 0))
  })

  it('falls back to index spacing when semi-major axis is missing', () => {
    const r0 = orbitRadius(null, 0)
    const r1 = orbitRadius(null, 1)
    const r2 = orbitRadius(null, 2)
    expect(r1).toBeGreaterThan(r0)
    expect(r2).toBeGreaterThan(r1)
  })

  it('never dips below the base radius', () => {
    expect(orbitRadius(0.0001, 0)).toBeGreaterThanOrEqual(5.5)
    expect(orbitRadius(null, 0)).toBeGreaterThanOrEqual(5.5)
  })

  it('accepts a custom base so orbits clear a large star', () => {
    expect(orbitRadius(0.01, 0, 12)).toBeGreaterThanOrEqual(12)
  })
})

describe('orbitSpeed', () => {
  it('is inversely related to orbital period', () => {
    expect(orbitSpeed(400)).toBeLessThan(orbitSpeed(40))
  })

  it('is capped for ultra-short periods', () => {
    expect(orbitSpeed(0.5)).toBe(2)
  })

  it('uses a slow default when period is missing or invalid', () => {
    expect(orbitSpeed(null)).toBe(0.1)
    expect(orbitSpeed(0)).toBe(0.1)
    expect(orbitSpeed(-5)).toBe(0.1)
  })
})

describe('displayRadius', () => {
  it('defaults when radius is unknown', () => {
    expect(displayRadius(null)).toBeCloseTo(0.16, 5)
  })

  it('grows sublinearly with real radius', () => {
    expect(displayRadius(10)).toBeGreaterThan(displayRadius(1))
    expect(displayRadius(30)).toBeLessThan(displayRadius(1) * 4)
  })
})

describe('starDisplayRadius', () => {
  it('uses a sun-like default when stellar radius is unknown', () => {
    expect(starDisplayRadius(null)).toBeCloseTo(STAR_BASE, 5)
  })

  it('grows with stellar radius', () => {
    expect(starDisplayRadius(10)).toBeGreaterThan(starDisplayRadius(1))
  })

  it('clamps dwarfs and giants into a usable range', () => {
    expect(starDisplayRadius(0.05)).toBeGreaterThanOrEqual(0.9)
    expect(starDisplayRadius(400)).toBeLessThanOrEqual(4.2)
  })
})

describe('planet to star scale', () => {
  const star = starDisplayRadius(1)

  it('draws an earth-sized world far smaller than its sun-like host', () => {
    expect(displayRadius(1)).toBeLessThan(star * 0.2)
  })

  it('draws a jupiter-sized world clearly smaller than its host', () => {
    expect(displayRadius(11)).toBeLessThan(star * 0.35)
  })

  it('keeps even the largest planet below the smallest star', () => {
    expect(displayRadius(30)).toBeLessThan(starDisplayRadius(0.05))
  })

  it('keeps planets large enough to stay visible', () => {
    expect(displayRadius(1)).toBeGreaterThan(0.1)
  })
})
