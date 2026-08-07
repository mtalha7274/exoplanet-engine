import { templateReport } from './report.js'

export function createSurveyClient({ apiKey = null, generate = null, storage = null } = {}) {
  const memory = new Map()

  function readStored(key) {
    if (!storage) return null
    try {
      return storage.getItem(key)
    } catch {
      return null
    }
  }

  function writeStored(key, value) {
    if (!storage) return
    try {
      storage.setItem(key, value)
    } catch {
      return
    }
  }

  async function getReport(planet) {
    const key = `survey:${planet.name}`
    if (memory.has(key)) return memory.get(key)
    const stored = readStored(key)
    if (stored) {
      memory.set(key, stored)
      return stored
    }
    let report
    if (apiKey && generate) {
      try {
        report = await generate(planet, apiKey)
      } catch {
        report = templateReport(planet)
      }
    } else {
      report = templateReport(planet)
    }
    memory.set(key, report)
    writeStored(key, report)
    return report
  }

  return { getReport }
}
