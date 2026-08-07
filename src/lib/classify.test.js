import { describe, it, expect } from 'vitest'
import { classifyPlanet, classInfo, CLASSES } from './classify.js'

describe('classifyPlanet', () => {
  it('classifies temperate rocky worlds', () => {
    expect(classifyPlanet({ rade: 1.0, eqt: 250 })).toBe('temperate-rocky')
    expect(classifyPlanet({ rade: 1.5, eqt: 180 })).toBe('temperate-rocky')
    expect(classifyPlanet({ rade: 0.8, eqt: 310 })).toBe('temperate-rocky')
  })

  it('classifies lava worlds above 1000 K', () => {
    expect(classifyPlanet({ rade: 1.2, eqt: 1200 })).toBe('lava')
    expect(classifyPlanet({ rade: 1.2, eqt: 1001 })).toBe('lava')
    expect(classifyPlanet({ rade: 1.2, eqt: 1000 })).toBe('hot-rocky')
  })

  it('classifies frozen rocky worlds below 180 K', () => {
    expect(classifyPlanet({ rade: 0.9, eqt: 100 })).toBe('frozen-rocky')
    expect(classifyPlanet({ rade: 0.9, eqt: 179 })).toBe('frozen-rocky')
  })

  it('classifies warm rocky worlds between 310 and 1000 K', () => {
    expect(classifyPlanet({ rade: 1.0, eqt: 600 })).toBe('hot-rocky')
    expect(classifyPlanet({ rade: 1.0, eqt: 311 })).toBe('hot-rocky')
  })

  it('classifies sub-neptunes from 1.6 to 4 earth radii', () => {
    expect(classifyPlanet({ rade: 1.6, eqt: 250 })).toBe('sub-neptune')
    expect(classifyPlanet({ rade: 3.9, eqt: 2000 })).toBe('sub-neptune')
  })

  it('classifies neptune-likes from 4 to 10 earth radii', () => {
    expect(classifyPlanet({ rade: 4, eqt: 100 })).toBe('neptunian')
    expect(classifyPlanet({ rade: 10, eqt: 100 })).toBe('neptunian')
  })

  it('classifies gas giants above 10 earth radii', () => {
    expect(classifyPlanet({ rade: 10.1, eqt: 100 })).toBe('gas-giant')
    expect(classifyPlanet({ rade: 22, eqt: null })).toBe('gas-giant')
  })

  it('marks planets without radius as unsurveyed', () => {
    expect(classifyPlanet({ rade: null, eqt: 300 })).toBe('unsurveyed')
    expect(classifyPlanet({ rade: undefined, eqt: 300 })).toBe('unsurveyed')
  })

  it('marks small planets without temperature as unsurveyed', () => {
    expect(classifyPlanet({ rade: 1.0, eqt: null })).toBe('unsurveyed')
  })
})

describe('classInfo', () => {
  it('provides a label and palette for every class', () => {
    for (const key of Object.keys(CLASSES)) {
      const info = classInfo(key)
      expect(info.label.length).toBeGreaterThan(0)
      expect(info.palette.length).toBeGreaterThanOrEqual(3)
      for (const color of info.palette) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })

  it('covers every classification result', () => {
    const keys = ['temperate-rocky', 'lava', 'frozen-rocky', 'hot-rocky', 'sub-neptune', 'neptunian', 'gas-giant', 'unsurveyed']
    for (const key of keys) {
      expect(CLASSES[key]).toBeDefined()
    }
  })
})
