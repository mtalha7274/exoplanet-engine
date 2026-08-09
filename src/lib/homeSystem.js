import { teffToColor } from './starColor.js'
import { classifyPlanet } from './classify.js'
import { pickStar, SOL_POSITION } from './flight.js'

export const SOL_DRAW_RADIUS = 0.11
export const SOL_KEEP_PC = 10
export const HOME_CLICK_FLOOR = 0.03
export const SOL_TRUE_RADIUS_PC = 2.2567e-8

export function solExaggeration(drawn = SOL_DRAW_RADIUS) {
  return drawn / SOL_TRUE_RADIUS_PC
}

const SOLAR_BODIES = [
  { name: 'Mercury', rade: 0.383, masse: 0.055, eqt: 440, period: 87.97, smax: 0.387 },
  { name: 'Venus', rade: 0.949, masse: 0.815, eqt: 232, period: 224.7, smax: 0.723 },
  { name: 'Earth', rade: 1, masse: 1, eqt: 255, period: 365.26, smax: 1 },
  { name: 'Mars', rade: 0.532, masse: 0.107, eqt: 210, period: 686.98, smax: 1.524 },
  { name: 'Jupiter', rade: 11.21, masse: 317.8, eqt: 110, period: 4332.59, smax: 5.204 },
  { name: 'Saturn', rade: 9.45, masse: 95.2, eqt: 81, period: 10759.22, smax: 9.583 },
  { name: 'Uranus', rade: 4.01, masse: 14.5, eqt: 58, period: 30685.4, smax: 19.191 },
  { name: 'Neptune', rade: 3.88, masse: 17.1, eqt: 47, period: 60189, smax: 30.07 }
]

export const SOLAR_PLANETS = SOLAR_BODIES.map(body => ({
  ...body,
  host: 'SOL',
  dist: 0,
  teff: 5772,
  srad: 1,
  spectype: 'G2 V',
  snum: 1,
  pnum: SOLAR_BODIES.length,
  discYear: null,
  discMethod: 'Direct observation',
  starColor: teffToColor(5772),
  cls: classifyPlanet(body)
}))

export const SOL_SYSTEM = {
  host: 'SOL',
  teff: 5772,
  srad: 1,
  spectype: 'G2 V',
  snum: 1,
  dist: 0,
  x: SOL_POSITION[0],
  y: SOL_POSITION[1],
  z: SOL_POSITION[2],
  starColor: teffToColor(5772),
  planets: SOLAR_PLANETS
}

export const HOME_BODIES = [
  { kind: 'sol', position: SOL_POSITION, radius: SOL_DRAW_RADIUS, keep: SOL_KEEP_PC }
]

export function drawnRadius(body, distance) {
  return body.radius * Math.max(1, distance / body.keep)
}

export function clickAngle(body, distance) {
  if (distance <= 0) return Math.PI
  return Math.max(HOME_CLICK_FLOOR, Math.atan(drawnRadius(body, distance) / distance))
}

export function pickHomeBody(eye, dir) {
  let best = null
  let bestAngle = Infinity
  for (const body of HOME_BODIES) {
    const dx = body.position[0] - eye[0]
    const dy = body.position[1] - eye[1]
    const dz = body.position[2] - eye[2]
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (len === 0) continue
    const cos = (dx * dir[0] + dy * dir[1] + dz * dir[2]) / len
    if (cos <= 0) continue
    const angle = Math.acos(Math.min(1, cos))
    if (angle > clickAngle(body, len)) continue
    if (angle < bestAngle) {
      best = body
      bestAngle = angle
    }
  }
  return best
}

export function pickFlightTarget(systems, eye, dir) {
  const home = pickHomeBody(eye, dir)
  if (home) return { kind: 'sol', system: SOL_SYSTEM, record: null }
  const star = pickStar(systems, eye, dir)
  return star ? { kind: 'star', system: star, record: null } : null
}
