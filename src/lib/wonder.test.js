import { describe, expect, it } from 'vitest'
import { approachFlight, WONDER_STANDOFF } from './wonder.js'
import { ARRIVAL_PC, forwardVector } from './flight.js'

const VEGA = { host: 'Vega', x: 3, y: -4, z: 12 }
const VEGA_FROM_SOL = 13

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

function unitToStar(state, system) {
  const d = [system.x - state.pos[0], system.y - state.pos[1], system.z - state.pos[2]]
  const len = Math.hypot(...d)
  return [d[0] / len, d[1] / len, d[2] / len]
}

describe('WONDER_STANDOFF', () => {
  it('parks inside the arrival radius so the arrival prompt shows on landing', () => {
    expect(WONDER_STANDOFF).toBeGreaterThan(0)
    expect(WONDER_STANDOFF).toBeLessThan(ARRIVAL_PC)
  })
})

describe('approachFlight', () => {
  it('stops short of the star rather than inside it', () => {
    const state = approachFlight(VEGA)
    expect(distance(state.pos, [VEGA.x, VEGA.y, VEGA.z])).toBeCloseTo(WONDER_STANDOFF, 10)
  })

  it('approaches from the Sol side, leaving the star further out than the ship', () => {
    const state = approachFlight(VEGA)
    expect(Math.hypot(...state.pos)).toBeCloseTo(VEGA_FROM_SOL - WONDER_STANDOFF, 10)
  })

  it('aims the nose at the star so it sits dead ahead', () => {
    const state = approachFlight(VEGA)
    const heading = forwardVector(state.yaw, state.pitch)
    const wanted = unitToStar(state, VEGA)
    expect(heading[0]).toBeCloseTo(wanted[0], 10)
    expect(heading[1]).toBeCloseTo(wanted[1], 10)
    expect(heading[2]).toBeCloseTo(wanted[2], 10)
  })

  it('honours an explicit standoff', () => {
    const state = approachFlight(VEGA, 2)
    expect(distance(state.pos, [VEGA.x, VEGA.y, VEGA.z])).toBeCloseTo(2, 10)
    expect(Math.hypot(...state.pos)).toBeCloseTo(VEGA_FROM_SOL - 2, 10)
  })

  it('arrives with the engines idle', () => {
    expect(approachFlight(VEGA).speed).toBe(0)
  })

  it('pitches straight up for a star on the north polar axis', () => {
    const state = approachFlight({ host: 'Polaris', x: 0, y: 40, z: 0 })
    expect(state.pitch).toBeCloseTo(Math.PI / 2, 10)
    expect(state.pos).toEqual([0, 40 - WONDER_STANDOFF, 0])
  })

  it('pitches straight down for a star on the south polar axis', () => {
    const state = approachFlight({ host: 'Sigma Octantis', x: 0, y: -40, z: 0 })
    expect(state.pitch).toBeCloseTo(-Math.PI / 2, 10)
  })

  it('survives a star sitting on the origin without producing NaN', () => {
    const state = approachFlight({ host: 'Sol', x: 0, y: 0, z: 0 })
    for (const v of [...state.pos, state.yaw, state.pitch, state.speed]) {
      expect(Number.isFinite(v)).toBe(true)
    }
    expect(distance(state.pos, [0, 0, 0])).toBeCloseTo(WONDER_STANDOFF, 10)
  })

  it('leaves the system record untouched', () => {
    const system = { host: 'Vega', x: 3, y: -4, z: 12 }
    approachFlight(system)
    expect(system).toEqual(VEGA)
  })
})
