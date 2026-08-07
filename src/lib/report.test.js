import { describe, it, expect } from 'vitest'
import { templateReport, buildSurveyPrompt } from './report.js'

const planet = {
  name: 'Kepler-452 b',
  host: 'Kepler-452',
  rade: 1.63,
  masse: 5,
  eqt: 265,
  period: 384.8,
  smax: 1.05,
  teff: 5757,
  srad: 1.11,
  spectype: 'G2 V',
  snum: 1,
  pnum: 1,
  discYear: 2015,
  discMethod: 'Transit',
  dist: 551,
  cls: 'sub-neptune'
}

describe('templateReport', () => {
  it('includes the planet designation', () => {
    expect(templateReport(planet)).toContain('Kepler-452 b')
  })

  it('includes the classification label', () => {
    expect(templateReport(planet)).toContain('Sub-Neptune')
  })

  it('includes a closing recommendation', () => {
    expect(templateReport(planet)).toContain('RECOMMENDATION')
  })

  it('includes real measured values', () => {
    const text = templateReport(planet)
    expect(text).toContain('265')
    expect(text).toContain('2015')
  })

  it('is deterministic', () => {
    expect(templateReport(planet)).toBe(templateReport(planet))
  })

  it('handles missing values gracefully', () => {
    const sparse = { name: 'Mystery b', host: 'Mystery', cls: 'unsurveyed' }
    const text = templateReport(sparse)
    expect(text).toContain('Mystery b')
    expect(text.toLowerCase()).toContain('unknown')
  })

  it('classifies on the fly when cls is absent', () => {
    const bare = { name: 'Hot b', rade: 1.1, eqt: 1400 }
    expect(templateReport(bare)).toContain('Lava World')
  })
})

describe('buildSurveyPrompt', () => {
  it('frames the survey vessel persona', () => {
    expect(buildSurveyPrompt(planet)).toContain('Meridian')
  })

  it('embeds the real planet data', () => {
    const prompt = buildSurveyPrompt(planet)
    expect(prompt).toContain('Kepler-452 b')
    expect(prompt).toContain('265')
    expect(prompt).toContain('Transit')
  })

  it('marks unknown fields as unknown', () => {
    const prompt = buildSurveyPrompt({ name: 'Mystery b' })
    expect(prompt.toLowerCase()).toContain('unknown')
  })
})
