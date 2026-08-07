import { describe, it, expect, vi } from 'vitest'
import { createSurveyClient } from './surveyClient.js'
import { templateReport } from './report.js'

const planet = { name: 'Proxima Cen b', host: 'Proxima Cen', rade: 1.03, eqt: 234, cls: 'temperate-rocky' }

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v)
  }
}

describe('createSurveyClient', () => {
  it('falls back to the template report without an api key', async () => {
    const client = createSurveyClient({ apiKey: null, storage: memoryStorage() })
    expect(await client.getReport(planet)).toBe(templateReport(planet))
  })

  it('uses the generator when an api key is present', async () => {
    const generate = vi.fn().mockResolvedValue('AI survey text')
    const client = createSurveyClient({ apiKey: 'k', generate, storage: memoryStorage() })
    expect(await client.getReport(planet)).toBe('AI survey text')
    expect(generate).toHaveBeenCalledWith(planet, 'k')
  })

  it('falls back to the template when generation fails', async () => {
    const generate = vi.fn().mockRejectedValue(new Error('down'))
    const client = createSurveyClient({ apiKey: 'k', generate, storage: memoryStorage() })
    expect(await client.getReport(planet)).toBe(templateReport(planet))
  })

  it('caches reports so generation runs once per planet', async () => {
    const generate = vi.fn().mockResolvedValue('AI survey text')
    const client = createSurveyClient({ apiKey: 'k', generate, storage: memoryStorage() })
    await client.getReport(planet)
    await client.getReport(planet)
    expect(generate).toHaveBeenCalledTimes(1)
  })

  it('reads previously stored reports before generating', async () => {
    const generate = vi.fn()
    const storage = memoryStorage({ 'survey:Proxima Cen b': 'stored text' })
    const client = createSurveyClient({ apiKey: 'k', generate, storage })
    expect(await client.getReport(planet)).toBe('stored text')
    expect(generate).not.toHaveBeenCalled()
  })

  it('persists generated reports to storage', async () => {
    const storage = memoryStorage()
    const generate = vi.fn().mockResolvedValue('AI survey text')
    const client = createSurveyClient({ apiKey: 'k', generate, storage })
    await client.getReport(planet)
    expect(storage.getItem('survey:Proxima Cen b')).toBe('AI survey text')
  })

  it('survives a broken storage backend', async () => {
    const storage = {
      getItem: () => { throw new Error('quota') },
      setItem: () => { throw new Error('quota') }
    }
    const client = createSurveyClient({ apiKey: null, storage })
    expect(await client.getReport(planet)).toBe(templateReport(planet))
  })
})
