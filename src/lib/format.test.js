import { describe, it, expect } from 'vitest'
import { fmtValue, planetStats, systemStats, lightYears, fmtDistance } from './format.js'

describe('lightYears', () => {
  it('converts parsecs to light years', () => {
    expect(lightYears(1)).toBeCloseTo(3.26156, 4)
    expect(lightYears(10)).toBeCloseTo(32.6156, 3)
  })

  it('passes through missing values', () => {
    expect(lightYears(null)).toBeNull()
  })
})

describe('fmtDistance', () => {
  it('shows light years alongside parsecs', () => {
    expect(fmtDistance(10)).toBe('32.6 ly · 10 pc')
  })

  it('reports unknown distances', () => {
    expect(fmtDistance(null)).toBe('UNSURVEYED')
  })
})

describe('fmtValue', () => {
  it('reports unknown for missing values', () => {
    expect(fmtValue(null, 1, 'K')).toBe('UNSURVEYED')
    expect(fmtValue(undefined, 1)).toBe('UNSURVEYED')
  })

  it('rounds to the requested precision', () => {
    expect(fmtValue(1.234, 2)).toBe('1.23')
    expect(fmtValue(1.0, 2)).toBe('1')
  })

  it('appends a unit when given', () => {
    expect(fmtValue(250, 0, 'K')).toBe('250 K')
  })

  it('formats large numbers with separators', () => {
    expect(fmtValue(24380, 0, 'K')).toBe('24,380 K')
  })
})

describe('planetStats', () => {
  const planet = {
    name: 'Kepler-22 b',
    rade: 2.1,
    masse: 9.1,
    eqt: 262,
    period: 289.86,
    smax: 0.812,
    dist: 190,
    discYear: 2011,
    discMethod: 'Transit'
  }

  it('returns label/value pairs for the detail panel', () => {
    const stats = planetStats(planet)
    const labels = stats.map(s => s.label)
    expect(labels).toContain('RADIUS')
    expect(labels).toContain('MASS')
    expect(labels).toContain('EQ. TEMP')
    expect(labels).toContain('ORBITAL PERIOD')
    expect(labels).toContain('DISTANCE')
    expect(labels).toContain('DISCOVERED')
  })

  it('reports distance in light years and parsecs', () => {
    const byLabel = Object.fromEntries(planetStats(planet).map(s => [s.label, s.value]))
    expect(byLabel['DISTANCE']).toBe('619.7 ly · 190 pc')
  })

  it('formats values with units', () => {
    const byLabel = Object.fromEntries(planetStats(planet).map(s => [s.label, s.value]))
    expect(byLabel['RADIUS']).toBe('2.1 R⊕')
    expect(byLabel['EQ. TEMP']).toBe('262 K')
    expect(byLabel['DISCOVERED']).toBe('2011 · Transit')
  })

  it('marks missing values as unsurveyed', () => {
    const byLabel = Object.fromEntries(planetStats({ name: 'x' }).map(s => [s.label, s.value]))
    expect(byLabel['RADIUS']).toBe('UNSURVEYED')
    expect(byLabel['DISCOVERED']).toBe('UNSURVEYED')
  })
})

describe('systemStats', () => {
  it('summarizes a host system', () => {
    const stats = systemStats({ host: 'TRAPPIST-1', teff: 2566, spectype: 'M8 V', dist: 12.4, snum: 1, srad: 0.12, planets: [{}, {}, {}] })
    const byLabel = Object.fromEntries(stats.map(s => [s.label, s.value]))
    expect(byLabel['SPECTRAL TYPE']).toBe('M8 V')
    expect(byLabel['STAR TEMP']).toBe('2,566 K')
    expect(byLabel['STAR RADIUS']).toBe('0.12 R☉')
    expect(byLabel['WORLDS']).toBe('3')
    expect(byLabel['STARS']).toBe('1')
  })

  it('exposes every stellar field the archive gives us', () => {
    const labels = systemStats({ host: 'x', planets: [] }).map(s => s.label)
    expect(labels).toEqual(['SPECTRAL TYPE', 'STAR TEMP', 'STAR RADIUS', 'DISTANCE', 'STARS', 'WORLDS'])
  })

  it('flags when the archive knows of more worlds than we hold', () => {
    const byLabel = Object.fromEntries(
      systemStats({ host: 'x', pnum: 5, planets: [{}, {}, {}] }).map(s => [s.label, s.value])
    )
    expect(byLabel['WORLDS']).toBe('3 of 5')
  })

  it('shows a plain count when the archive agrees', () => {
    const byLabel = Object.fromEntries(
      systemStats({ host: 'x', pnum: 3, planets: [{}, {}, {}] }).map(s => [s.label, s.value])
    )
    expect(byLabel['WORLDS']).toBe('3')
  })

  it('handles unknown spectral types', () => {
    const byLabel = Object.fromEntries(systemStats({ host: 'x', planets: [] }).map(s => [s.label, s.value]))
    expect(byLabel['SPECTRAL TYPE']).toBe('UNSURVEYED')
  })
})
