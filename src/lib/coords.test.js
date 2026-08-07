import { describe, it, expect } from 'vitest'
import { compressDistance, raDecToXYZ, toPosition } from './coords.js'

describe('compressDistance', () => {
  it('leaves distances at or below the threshold unchanged', () => {
    expect(compressDistance(10)).toBe(10)
    expect(compressDistance(500)).toBe(500)
  })

  it('log-compresses distances beyond the threshold', () => {
    expect(compressDistance(500 * Math.E)).toBeCloseTo(1000, 6)
    expect(compressDistance(5000)).toBeLessThan(5000)
  })

  it('stays monotonically increasing', () => {
    expect(compressDistance(3000)).toBeGreaterThan(compressDistance(2000))
    expect(compressDistance(501)).toBeGreaterThan(compressDistance(500))
  })

  it('respects a custom threshold', () => {
    expect(compressDistance(100, 200)).toBe(100)
    expect(compressDistance(200 * Math.E, 200)).toBeCloseTo(400, 6)
  })
})

describe('raDecToXYZ', () => {
  it('maps ra 0 dec 0 to the positive x axis', () => {
    const p = raDecToXYZ(0, 0, 10)
    expect(p.x).toBeCloseTo(10, 6)
    expect(p.y).toBeCloseTo(0, 6)
    expect(p.z).toBeCloseTo(0, 6)
  })

  it('maps ra 90 dec 0 to the positive z axis', () => {
    const p = raDecToXYZ(90, 0, 10)
    expect(p.x).toBeCloseTo(0, 6)
    expect(p.y).toBeCloseTo(0, 6)
    expect(p.z).toBeCloseTo(10, 6)
  })

  it('maps dec 90 to the positive y axis', () => {
    const p = raDecToXYZ(45, 90, 10)
    expect(p.y).toBeCloseTo(10, 6)
  })

  it('preserves radial distance', () => {
    const p = raDecToXYZ(123, -45, 77)
    const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
    expect(r).toBeCloseTo(77, 6)
  })
})

describe('toPosition', () => {
  it('applies distance compression before projecting', () => {
    const p = toPosition(0, 0, 5000)
    expect(p.x).toBeCloseTo(compressDistance(5000), 6)
  })

  it('matches raDecToXYZ for near distances', () => {
    const a = toPosition(30, 15, 100)
    const b = raDecToXYZ(30, 15, 100)
    expect(a).toEqual(b)
  })
})
