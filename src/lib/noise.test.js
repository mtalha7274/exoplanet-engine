import { describe, it, expect } from 'vitest'
import { makeValueNoise, makeFbm } from './noise.js'

function sampleGrid(fn, steps = 12) {
  const values = []
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      values.push(fn(i / steps, j / steps))
    }
  }
  return values
}

describe('makeValueNoise', () => {
  it('is deterministic for the same seed', () => {
    const a = sampleGrid(makeValueNoise(7))
    const b = sampleGrid(makeValueNoise(7))
    expect(a).toEqual(b)
  })

  it('stays within [0, 1]', () => {
    for (const v of sampleGrid(makeValueNoise(99))) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('differs between seeds', () => {
    const a = sampleGrid(makeValueNoise(1))
    const b = sampleGrid(makeValueNoise(2))
    expect(a).not.toEqual(b)
  })

  it('wraps seamlessly on the horizontal axis', () => {
    const noise = makeValueNoise(5)
    for (let i = 0; i <= 10; i++) {
      const v = i / 10
      expect(noise(0, v)).toBeCloseTo(noise(1, v), 10)
    }
  })

  it('varies across space', () => {
    const values = sampleGrid(makeValueNoise(3))
    expect(new Set(values.map(v => v.toFixed(4))).size).toBeGreaterThan(10)
  })
})

describe('makeFbm', () => {
  it('is deterministic and bounded', () => {
    const a = sampleGrid(makeFbm(11))
    const b = sampleGrid(makeFbm(11))
    expect(a).toEqual(b)
    for (const v of a) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('wraps seamlessly on the horizontal axis', () => {
    const fbm = makeFbm(21)
    for (let i = 0; i <= 10; i++) {
      const v = i / 10
      expect(fbm(0, v)).toBeCloseTo(fbm(1, v), 10)
    }
  })

  it('produces richer variation than a single octave', () => {
    const values = sampleGrid(makeFbm(13), 20)
    expect(new Set(values.map(v => v.toFixed(4))).size).toBeGreaterThan(50)
  })
})
