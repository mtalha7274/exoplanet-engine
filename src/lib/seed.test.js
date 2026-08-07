import { describe, it, expect } from 'vitest'
import { hashString, mulberry32 } from './seed.js'

describe('hashString', () => {
  it('is deterministic', () => {
    expect(hashString('Kepler-22 b')).toBe(hashString('Kepler-22 b'))
  })

  it('differs for similar names', () => {
    expect(hashString('Kepler-22 b')).not.toBe(hashString('Kepler-22 c'))
  })

  it('returns a non-negative integer', () => {
    const h = hashString('TRAPPIST-1 e')
    expect(Number.isInteger(h)).toBe(true)
    expect(h).toBeGreaterThanOrEqual(0)
  })

  it('handles empty strings', () => {
    expect(Number.isInteger(hashString(''))).toBe(true)
  })
})

describe('mulberry32', () => {
  it('produces identical sequences for identical seeds', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 5; i++) {
      expect(a()).toBe(b())
    }
  })

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const seqA = [a(), a(), a()]
    const seqB = [b(), b(), b()]
    expect(seqA).not.toEqual(seqB)
  })

  it('stays within [0, 1)', () => {
    const rand = mulberry32(hashString('any planet'))
    for (let i = 0; i < 1000; i++) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})
