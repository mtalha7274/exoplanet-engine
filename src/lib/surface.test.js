import { describe, it, expect } from 'vitest'
import { makeSurfaceSampler } from './surface.js'

const lava = { name: 'Hell b', cls: 'lava' }
const giant = { name: 'Big b', cls: 'gas-giant' }

describe('makeSurfaceSampler', () => {
  it('returns rgb triplets within byte range', () => {
    const sample = makeSurfaceSampler(lava)
    for (const u of [0, 0.3, 0.7, 1]) {
      for (const v of [0, 0.5, 1]) {
        const [r, g, b] = sample(u, v)
        for (const c of [r, g, b]) {
          expect(c).toBeGreaterThanOrEqual(0)
          expect(c).toBeLessThanOrEqual(255)
          expect(Number.isFinite(c)).toBe(true)
        }
      }
    }
  })

  it('is deterministic per planet name', () => {
    const a = makeSurfaceSampler(lava)
    const b = makeSurfaceSampler({ ...lava })
    expect(a(0.42, 0.42)).toEqual(b(0.42, 0.42))
  })

  it('differs between planets with different names', () => {
    const a = makeSurfaceSampler({ name: 'World A', cls: 'temperate-rocky' })
    const b = makeSurfaceSampler({ name: 'World B', cls: 'temperate-rocky' })
    const samplesA = []
    const samplesB = []
    for (let i = 0; i <= 20; i++) {
      samplesA.push(a(i / 20, 0.5).join(','))
      samplesB.push(b(i / 20, 0.5).join(','))
    }
    expect(samplesA).not.toEqual(samplesB)
  })

  it('draws from the class palette family', () => {
    const sample = makeSurfaceSampler(giant)
    const [r, , b] = sample(0.5, 0.5)
    expect(r).toBeGreaterThan(b * 0.7)
  })

  it('wraps horizontally for seamless sphere mapping', () => {
    const sample = makeSurfaceSampler(lava)
    for (let i = 0; i <= 10; i++) {
      const v = i / 10
      const left = sample(0, v)
      const right = sample(1, v)
      expect(left[0]).toBeCloseTo(right[0], 6)
      expect(left[1]).toBeCloseTo(right[1], 6)
      expect(left[2]).toBeCloseTo(right[2], 6)
    }
  })
})
