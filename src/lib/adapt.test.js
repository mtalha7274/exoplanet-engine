import { describe, it, expect } from 'vitest'
import { adaptRows, isRawArchiveRow } from './pipeline.js'

const rawRow = {
  pl_name: 'Test b',
  hostname: 'Test',
  ra: 10,
  dec: 20,
  sy_dist: 30,
  pl_rade: 1.2,
  pl_eqt: 250,
  st_teff: 5000
}

describe('isRawArchiveRow', () => {
  it('recognizes a NASA archive row by its column names', () => {
    expect(isRawArchiveRow(rawRow)).toBe(true)
  })

  it('rejects an already-derived row', () => {
    expect(isRawArchiveRow({ name: 'Test b', x: 1, y: 2, z: 3 })).toBe(false)
  })
})

describe('adaptRows', () => {
  it('derives a raw NASA archive export', () => {
    const [p] = adaptRows([rawRow])
    expect(p.name).toBe('Test b')
    expect(p.cls).toBe('temperate-rocky')
    expect(typeof p.x).toBe('number')
    expect(p.starColor).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('passes through a snapshot that is already derived', () => {
    const derived = adaptRows([rawRow])
    expect(adaptRows(derived)).toEqual(derived)
  })

  it('re-derives a derived row that is missing positions', () => {
    const stale = [{ name: 'Old b', host: 'Old', ra: 10, dec: 20, dist: 30, rade: 1.2, eqt: 250, teff: 5000 }]
    const [p] = adaptRows(stale)
    expect(typeof p.x).toBe('number')
    expect(p.cls).toBe('temperate-rocky')
    expect(p.starColor).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('drops raw rows without usable coordinates', () => {
    expect(adaptRows([{ ...rawRow, ra: null }])).toHaveLength(0)
  })

  it('handles an empty file', () => {
    expect(adaptRows([])).toEqual([])
  })

  it('rejects anything that is not an array', () => {
    expect(() => adaptRows(null)).toThrow(/array/i)
    expect(() => adaptRows({ data: [] })).toThrow(/array/i)
  })

  it('rejects rows in an unrecognized shape', () => {
    expect(() => adaptRows([{ foo: 1 }])).toThrow(/unrecognized/i)
  })
})
