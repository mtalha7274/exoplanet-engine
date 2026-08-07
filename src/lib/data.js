import { adaptRows } from './pipeline.js'

export const DATA_URL = 'data/exoplanets.json'

export async function loadPlanets() {
  const res = await fetch(`${import.meta.env.BASE_URL}${DATA_URL}`)
  if (!res.ok) {
    throw new Error(`star chart download failed (${res.status})`)
  }
  return adaptRows(await res.json())
}
