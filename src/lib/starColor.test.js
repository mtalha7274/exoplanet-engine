import { describe, it, expect } from 'vitest'
import { teffToColor, teffToRgb } from './starColor.js'

function rgb(teff) {
  return teffToRgb(teff)
}

describe('teffToColor', () => {
  it('returns a neutral color when temperature is unknown', () => {
    expect(teffToColor(null)).toBe('#c0c8d8')
    expect(teffToColor(undefined)).toBe('#c0c8d8')
  })

  it('returns a six-digit hex string', () => {
    for (const t of [2500, 3800, 5800, 7500, 12000, 40000]) {
      expect(teffToColor(t)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('teffToRgb', () => {
  it('makes cool stars red-dominant', () => {
    const [r, , b] = rgb(3000)
    expect(r).toBeGreaterThan(b)
  })

  it('makes hot stars blue-dominant', () => {
    const [r, , b] = rgb(20000)
    expect(b).toBeGreaterThan(r)
  })

  it('renders sun-like stars near white', () => {
    const [r, g, b] = rgb(5800)
    const spread = Math.max(r, g, b) - Math.min(r, g, b)
    expect(spread).toBeLessThan(60)
  })

  it('increases blue monotonically with temperature', () => {
    const temps = [2500, 3000, 3500, 4200, 5000, 5800, 6500, 7500, 9000, 12000, 20000, 35000]
    for (let i = 1; i < temps.length; i++) {
      expect(rgb(temps[i])[2]).toBeGreaterThanOrEqual(rgb(temps[i - 1])[2])
    }
  })

  it('decreases red as temperature climbs past white', () => {
    expect(rgb(30000)[0]).toBeLessThan(rgb(5800)[0])
  })

  it('is continuous rather than bucketed', () => {
    const a = rgb(5000)
    const b = rgb(5050)
    expect(a).not.toEqual(b)
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(a[i] - b[i])).toBeLessThan(20)
    }
  })

  it('stays inside byte range and remains visible', () => {
    for (const t of [1500, 2500, 5800, 40000]) {
      const c = rgb(t)
      for (const channel of c) {
        expect(channel).toBeGreaterThanOrEqual(0)
        expect(channel).toBeLessThanOrEqual(255)
      }
      expect(Math.max(...c)).toBeGreaterThan(120)
    }
  })

  it('clamps absurd temperatures instead of producing NaN', () => {
    for (const t of [0, -5, 1e9]) {
      for (const channel of rgb(t)) {
        expect(Number.isFinite(channel)).toBe(true)
      }
    }
  })
})
