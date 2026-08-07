import { describe, it, expect } from 'vitest'
import { cleanRows, deriveRow, buildSnapshot, groupSystems } from './pipeline.js'
import { toPosition } from './coords.js'
import { teffToColor } from './starColor.js'

const raw = {
  pl_name: 'Test b',
  hostname: 'Test',
  ra: 10,
  dec: 20,
  sy_dist: 30,
  pl_rade: 1.2,
  pl_bmasse: 2,
  pl_eqt: 250,
  pl_orbper: 10,
  pl_orbsmax: 0.1,
  st_teff: 5000,
  st_rad: 1,
  st_spectype: 'G8 V',
  sy_snum: 1,
  sy_pnum: 2,
  disc_year: 2019,
  discoverymethod: 'Transit'
}

describe('cleanRows', () => {
  it('keeps rows with name and full position data', () => {
    expect(cleanRows([raw])).toHaveLength(1)
  })

  it('drops rows missing name, ra, dec, or distance', () => {
    expect(cleanRows([{ ...raw, pl_name: null }])).toHaveLength(0)
    expect(cleanRows([{ ...raw, ra: null }])).toHaveLength(0)
    expect(cleanRows([{ ...raw, dec: null }])).toHaveLength(0)
    expect(cleanRows([{ ...raw, sy_dist: null }])).toHaveLength(0)
  })
})

describe('deriveRow', () => {
  it('maps archive fields to the internal shape', () => {
    const p = deriveRow(raw)
    expect(p.name).toBe('Test b')
    expect(p.host).toBe('Test')
    expect(p.rade).toBe(1.2)
    expect(p.masse).toBe(2)
    expect(p.eqt).toBe(250)
    expect(p.period).toBe(10)
    expect(p.smax).toBe(0.1)
    expect(p.teff).toBe(5000)
    expect(p.srad).toBe(1)
    expect(p.spectype).toBe('G8 V')
    expect(p.snum).toBe(1)
    expect(p.pnum).toBe(2)
    expect(p.discYear).toBe(2019)
    expect(p.discMethod).toBe('Transit')
  })

  it('computes the compressed cartesian position', () => {
    const p = deriveRow(raw)
    const expected = toPosition(10, 20, 30)
    expect(p.x).toBeCloseTo(expected.x, 6)
    expect(p.y).toBeCloseTo(expected.y, 6)
    expect(p.z).toBeCloseTo(expected.z, 6)
  })

  it('derives classification and star color', () => {
    const p = deriveRow(raw)
    expect(p.cls).toBe('temperate-rocky')
    expect(p.starColor).toBe(teffToColor(5000))
  })

  it('normalizes missing optional fields to null', () => {
    const { pl_eqt: _eqt, pl_rade: _rade, ...rest } = raw
    const p = deriveRow(rest)
    expect(p.eqt).toBeNull()
    expect(p.rade).toBeNull()
    expect(p.cls).toBe('unsurveyed')
  })
})

describe('buildSnapshot', () => {
  it('cleans then derives every row', () => {
    const rows = [raw, { ...raw, pl_name: 'Test c' }, { ...raw, ra: null }]
    const snapshot = buildSnapshot(rows)
    expect(snapshot).toHaveLength(2)
    expect(snapshot[0].cls).toBe('temperate-rocky')
  })
})

describe('groupSystems', () => {
  it('groups planets by host star', () => {
    const snapshot = buildSnapshot([
      raw,
      { ...raw, pl_name: 'Test c' },
      { ...raw, pl_name: 'Other b', hostname: 'Other', ra: 200 }
    ])
    const systems = groupSystems(snapshot)
    expect(systems).toHaveLength(2)
    const test = systems.find(s => s.host === 'Test')
    expect(test.planets).toHaveLength(2)
    expect(test.starColor).toBe(teffToColor(5000))
    expect(test.x).toBeCloseTo(test.planets[0].x, 6)
    expect(test.teff).toBe(5000)
  })
})
