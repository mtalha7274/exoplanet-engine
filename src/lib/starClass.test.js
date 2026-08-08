import { describe, it, expect } from 'vitest'
import { spectralType, luminosityClass, classifyStar, starStats, STAR_CONTENT } from './starClass.js'

describe('spectralType', () => {
  it('maps temperature to the Harvard sequence', () => {
    expect(spectralType(40000)).toBe('O')
    expect(spectralType(20000)).toBe('B')
    expect(spectralType(8500)).toBe('A')
    expect(spectralType(6500)).toBe('F')
    expect(spectralType(5772)).toBe('G')
    expect(spectralType(4500)).toBe('K')
    expect(spectralType(3000)).toBe('M')
  })

  it('returns null without a temperature', () => {
    expect(spectralType(null)).toBeNull()
  })

  it('places boundaries on the hotter class', () => {
    expect(spectralType(30000)).toBe('O')
    expect(spectralType(29999)).toBe('B')
    expect(spectralType(3700)).toBe('K')
    expect(spectralType(3699)).toBe('M')
  })
})

describe('luminosityClass', () => {
  it('calls sun-sized stars main sequence', () => {
    expect(luminosityClass(1)).toBe('V')
    expect(luminosityClass(0.12)).toBe('V')
  })

  it('recognizes subgiants, giants, bright giants, and supergiants', () => {
    expect(luminosityClass(3)).toBe('IV')
    expect(luminosityClass(20)).toBe('III')
    expect(luminosityClass(70)).toBe('II')
    expect(luminosityClass(300)).toBe('I')
  })

  it('judges radius against the main sequence for that temperature', () => {
    expect(luminosityClass(4, 20000)).toBe('V')
    expect(luminosityClass(4, 3200)).toBe('III')
  })

  it('recognizes white dwarfs by their tiny radius', () => {
    expect(luminosityClass(0.02)).toBe('D')
  })

  it('returns null without a radius', () => {
    expect(luminosityClass(null)).toBeNull()
  })
})

describe('classifyStar', () => {
  it('names a sun-like star', () => {
    const s = classifyStar({ teff: 5772, srad: 1 })
    expect(s.code).toBe('G V')
    expect(s.label).toBe('Yellow Dwarf')
    expect(s.kind).toBe('main-sequence')
  })

  it('names a red dwarf', () => {
    expect(classifyStar({ teff: 3200, srad: 0.15 }).label).toBe('Red Dwarf')
  })

  it('names a red giant', () => {
    const s = classifyStar({ teff: 3400, srad: 25 })
    expect(s.label).toBe('Red Giant')
    expect(s.kind).toBe('giant')
  })

  it('names a cooler K-type giant orange, not red', () => {
    expect(classifyStar({ teff: 4000, srad: 25 }).label).toBe('Orange Giant')
  })

  it('names a red supergiant', () => {
    const s = classifyStar({ teff: 3500, srad: 400 })
    expect(s.label).toBe('Red Supergiant')
    expect(s.kind).toBe('supergiant')
  })

  it('calls the largest star in this catalog a bright giant, not a supergiant', () => {
    const s = classifyStar({ teff: 3500, srad: 88.5 })
    expect(s.label).toBe('Red Bright Giant')
    expect(s.kind).toBe('bright-giant')
  })

  it('names a blue star', () => {
    expect(classifyStar({ teff: 20000, srad: 4 }).label).toBe('Blue-White Star')
  })

  it('identifies a pulsar from its designation', () => {
    const s = classifyStar({ host: 'PSR B1257+12', teff: null, srad: null })
    expect(s.label).toBe('Pulsar')
    expect(s.kind).toBe('neutron-star')
    expect(s.code).toBe('PSR')
  })

  it('does not mistake an ordinary host for a pulsar', () => {
    expect(classifyStar({ host: 'Kepler-22', teff: 5518, srad: 0.98 }).kind).toBe('main-sequence')
  })

  it('prefers the archive spectral type when it is present', () => {
    const s = classifyStar({ host: 'x', teff: 5772, srad: 1, spectype: 'G2 V' })
    expect(s.archiveType).toBe('G2 V')
  })

  it('falls back to unsurveyed when nothing is known', () => {
    const s = classifyStar({ host: 'x' })
    expect(s.kind).toBe('unknown')
    expect(s.label).toBe('Unsurveyed Star')
  })

  it('classifies from temperature alone when radius is missing', () => {
    const s = classifyStar({ host: 'x', teff: 3200 })
    expect(s.code).toBe('M')
    expect(s.label).toContain('Red')
  })
})

const SAMPLES = [
  { host: 'NY Vir', teff: 32780, srad: 0.151 },
  { host: 'HD 100546', teff: 10500, srad: 1.85 },
  { host: 'bet Pic', teff: 8038, srad: 1.54 },
  { host: 'Kepler-1408', teff: 6170, srad: 1.35 },
  { host: 'HD 80653', teff: 5959, srad: 1.19 },
  { host: 'Kepler-296', teff: 3740, srad: 0.48 },
  { host: 'Kepler-249', teff: 3568, srad: 0.482 },
  { host: 'TOI-1296', teff: 5567, srad: 1.7031 },
  { host: 'HD 81688', teff: 4797, srad: 11.13 },
  { host: 'HD 18438', teff: 3860, srad: 88.475 },
  { host: 'Betelgeuse', teff: 3500, srad: 764 },
  { host: 'WD 1856+534', teff: 4710, srad: 0.0131 },
  { host: 'PSR J2322-2650', teff: null, srad: null },
  { host: 'PSR B1257+12', teff: null, srad: null },
  { host: 'GJ 667 C', teff: 3350, srad: null },
  { host: 'OGLE-2017-BLG-0364L', teff: null, srad: null }
]

describe('star content', () => {
  it('reaches every content entry from the classifier', () => {
    const seen = new Set(SAMPLES.map(s => classifyStar(s).contentKey))
    for (const key of Object.keys(STAR_CONTENT)) expect(seen).toContain(key)
  })

  it('gives every classified star a blurb and a worlds note', () => {
    for (const sample of SAMPLES) {
      const star = classifyStar(sample)
      expect(star.blurb.length).toBeGreaterThan(80)
      expect(star.worlds.length).toBeGreaterThan(80)
    }
  })

  it('never repeats copy between classes', () => {
    const entries = Object.values(STAR_CONTENT)
    expect(new Set(entries.map(e => e.blurb)).size).toBe(entries.length)
    expect(new Set(entries.map(e => e.worlds)).size).toBe(entries.length)
  })

  it('writes distinct copy for each main-sequence colour', () => {
    const hues = [32780, 20000, 8500, 6500, 5772, 4500, 3200]
      .map(teff => classifyStar({ teff, srad: 0.5 }).blurb)
    expect(new Set(hues).size).toBe(hues.length)
  })

  it('separates the evolved classes from one another', () => {
    const evolved = [
      classifyStar({ teff: 5567, srad: 1.7031 }),
      classifyStar({ teff: 4797, srad: 11.13 }),
      classifyStar({ teff: 3860, srad: 88.475 }),
      classifyStar({ teff: 3500, srad: 764 })
    ].map(s => s.contentKey)
    expect(evolved).toEqual(['subgiant', 'giant', 'bright-giant', 'supergiant'])
    expect(new Set(evolved).size).toBe(4)
  })

  it('does not describe a yellow dwarf as red or cool', () => {
    const star = classifyStar({ host: 'Kepler-22', teff: 5406, srad: 0.98 })
    expect(star.label).toBe('Yellow Dwarf')
    expect(`${star.blurb} ${star.worlds}`).not.toMatch(/\b(red|cool|cooler|coolest|dim|faint)\b/i)
  })

  it('does not describe a red dwarf as hot or sun-sized', () => {
    const star = classifyStar({ teff: 3200, srad: 0.15 })
    expect(`${star.blurb} ${star.worlds}`).not.toMatch(/\b(hot|hotter|hottest|blue|white)\b/i)
  })

  it('never claims this catalog holds a supergiant', () => {
    expect(STAR_CONTENT.supergiant.worlds).toMatch(/no host in this catalog is one/i)
    const others = Object.entries(STAR_CONTENT).filter(([key]) => key !== 'supergiant')
    for (const [, entry] of others) {
      expect(`${entry.blurb} ${entry.worlds}`).not.toMatch(/supergiant/i)
    }
  })

  it('claims no radius range for the hottest classes, whose hosts here are compact', () => {
    for (const key of ['main-O', 'main-B']) {
      const entry = STAR_CONTENT[key]
      expect(`${entry.blurb} ${entry.worlds}`).not.toMatch(/\d+\s*(to|-|–)?\s*\d*\s*(solar radii|times the sun's (width|radius))/i)
    }
  })

  it('tells the PSR B1257+12 story rather than the generic pulsar one', () => {
    const first = classifyStar({ host: 'PSR B1257+12' })
    const other = classifyStar({ host: 'PSR J2322-2650' })
    expect(first.label).toBe('Pulsar')
    expect(first.kind).toBe('neutron-star')
    expect(first.contentKey).toBe('psr-b1257')
    expect(first.blurb).toContain('1992')
    expect(first.blurb).not.toBe(other.blurb)
    expect(first.worlds).not.toBe(other.worlds)
  })

  it('matches the pulsar story on the trimmed and cased host name', () => {
    expect(classifyStar({ host: '  psr b1257+12 ' }).contentKey).toBe('psr-b1257')
  })

  it('explains a missing radius rather than guessing at one', () => {
    const star = classifyStar({ host: 'GJ 667 C', teff: 3350 })
    expect(star.contentKey).toBe('unmeasured')
    expect(star.blurb).toMatch(/radius/i)
  })

  it('explains an unsurveyed host', () => {
    const star = classifyStar({ host: 'OGLE-2017-BLG-0364L' })
    expect(star.contentKey).toBe('unknown')
    expect(`${star.blurb} ${star.worlds}`).toMatch(/microlensing/i)
  })
})

describe('starStats', () => {
  it('returns label and value pairs for the star panel', () => {
    const labels = starStats({ host: 'Kepler-22', teff: 5518, srad: 0.98, snum: 1, dist: 190, planets: [{}] })
      .map(s => s.label)
    expect(labels).toContain('CLASSIFICATION')
    expect(labels).toContain('STAR TEMP')
    expect(labels).toContain('STAR RADIUS')
  })

  it('reports the classification label', () => {
    const byLabel = Object.fromEntries(
      starStats({ host: 'x', teff: 3500, srad: 80, planets: [] }).map(s => [s.label, s.value])
    )
    expect(byLabel['CLASSIFICATION']).toBe('Red Bright Giant')
  })
})
