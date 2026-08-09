import { describe, it, expect } from 'vitest'
import {
  SOL_SYSTEM,
  HOME_BODIES,
  HOME_CLICK_FLOOR,
  SOL_DRAW_RADIUS,
  SOL_KEEP_PC,
  drawnRadius,
  clickAngle,
  pickHomeBody,
  pickFlightTarget
} from './homeSystem.js'
import { classifyStar, starStats } from './starClass.js'
import { teffToColor } from './starColor.js'
import {
  createFlight,
  stepFlight,
  eyePosition,
  forwardVector,
  SOL_POSITION
} from './flight.js'

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const norm = a => Math.sqrt(dot(a, a))
const unit = a => {
  const n = norm(a)
  return [a[0] / n, a[1] / n, a[2] / n]
}
const rayTo = (target, eye) => unit(sub(target, eye))
const stat = (system, label) => starStats(system).find(s => s.label === label).value

function nudged(dir, degrees) {
  const a = (degrees * Math.PI) / 180
  const side = unit([dir[1], -dir[0], 0])
  return unit([
    dir[0] * Math.cos(a) + side[0] * Math.sin(a),
    dir[1] * Math.cos(a) + side[1] * Math.sin(a),
    dir[2] * Math.cos(a) + side[2] * Math.sin(a)
  ])
}

function cruised(seconds, dt = 1 / 60) {
  let f = createFlight()
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    f = stepFlight(f, { turn: 0, pitch: 0, boost: false, halt: false }, dt)
  }
  return f
}

function starBehind(target, eye, parsecsBeyond) {
  const dir = rayTo(target, eye)
  const range = norm(sub(target, eye)) + parsecsBeyond
  return {
    host: 'CATALOG-BEHIND-SOL',
    x: eye[0] + dir[0] * range,
    y: eye[1] + dir[1] * range,
    z: eye[2] + dir[2] * range,
    dist: range,
    planets: [{ name: 'CATALOG-BEHIND-SOL b' }]
  }
}

describe('the Sun is a first-class record, not a catalog lookup', () => {
  it('carries the real measured Sun rather than values borrowed from a catalog host', () => {
    expect(SOL_SYSTEM.host).toBe('SOL')
    expect(SOL_SYSTEM.teff).toBe(5772)
    expect(SOL_SYSTEM.srad).toBe(1)
    expect(SOL_SYSTEM.spectype).toBe('G2 V')
    expect(SOL_SYSTEM.snum).toBe(1)
  })

  it('is classified Yellow Dwarf by the existing classifier, unchanged', () => {
    const star = classifyStar(SOL_SYSTEM)
    expect(star.label).toBe('Yellow Dwarf')
    expect(star.code).toBe('G V')
    expect(star.kind).toBe('main-sequence')
  })

  it('lands on the yellow dwarf copy that already calls it the sun\'s own class', () => {
    expect(classifyStar(SOL_SYSTEM).blurb).toContain('sun\'s own class')
  })

  it('reads zero distance from Earth instead of a catalog parsec value', () => {
    expect(SOL_SYSTEM.dist).toBe(0)
    expect(stat(SOL_SYSTEM, 'DISTANCE')).toBe('0 ly · 0 pc')
    expect(stat(SOL_SYSTEM, 'DISTANCE')).not.toContain('UNSURVEYED')
  })

  it('carries its own eight planets so the home system can be entered', () => {
    expect(SOL_SYSTEM.planets.length).toBe(8)
    const names = SOL_SYSTEM.planets.map(p => p.name)
    expect(names).toEqual(['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'])
  })

  it('holds Earth as a planet of the Sun rather than a floating body', () => {
    const earth = SOL_SYSTEM.planets.find(p => p.name === 'Earth')
    expect(earth.host).toBe('SOL')
    expect(earth.smax).toBe(1)
    expect(earth.period).toBeCloseTo(365.26, 2)
    expect(earth.rade).toBe(1)
  })

  it('orders its planets outward from the Sun', () => {
    const axes = SOL_SYSTEM.planets.map(p => p.smax)
    expect([...axes].sort((a, b) => a - b)).toEqual(axes)
  })

  it('sits exactly at the heliocentric origin the flight model uses', () => {
    expect([SOL_SYSTEM.x, SOL_SYSTEM.y, SOL_SYSTEM.z]).toEqual(SOL_POSITION)
  })

  it('takes its colour from its own temperature, like every other star here', () => {
    expect(SOL_SYSTEM.starColor).toBe(teffToColor(5772))
  })

  it('fills the panel stats with measurements rather than UNSURVEYED gaps', () => {
    expect(stat(SOL_SYSTEM, 'STAR TEMP')).toBe('5,772 K')
    expect(stat(SOL_SYSTEM, 'STAR RADIUS')).toBe('1 R☉')
    expect(stat(SOL_SYSTEM, 'ARCHIVE TYPE')).toBe('G2 V')
    expect(stat(SOL_SYSTEM, 'STARS IN SYSTEM')).toBe('1')
  })

  it('hands out the same record object every time so the panel can track it', () => {
    expect(pickFlightTarget([], [0, 0, -3], [0, 0, 1]).system).toBe(SOL_SYSTEM)
  })
})


describe('home bodies keep a clickable size at any range', () => {
  it('matches the level-of-detail scaling the flight view draws them with', () => {
    expect(drawnRadius(HOME_BODIES[0], 1)).toBeCloseTo(SOL_DRAW_RADIUS, 10)
    expect(drawnRadius(HOME_BODIES[0], SOL_KEEP_PC * 4)).toBeCloseTo(SOL_DRAW_RADIUS * 4, 10)
  })

  it('never shrinks the click target below the floor, however far away home is', () => {
    for (const body of HOME_BODIES) {
      for (const distance of [0.5, 5, 60, 900, 8500]) {
        expect(clickAngle(body, distance)).toBeGreaterThanOrEqual(HOME_CLICK_FLOOR)
      }
    }
  })

  it('gives Sol a wide target up close where it fills the view', () => {
    expect(clickAngle(HOME_BODIES[0], 1)).toBeGreaterThan(HOME_CLICK_FLOOR)
    expect(clickAngle(HOME_BODIES[0], 2)).toBeGreaterThan(clickAngle(HOME_BODIES[0], 40))
  })
})

describe('clicking the Sun selects the Sun', () => {
  const eye = eyePosition(createFlight())

  it('beats a catalog star sitting directly behind it on the same ray', () => {
    const decoy = starBehind(SOL_POSITION, eye, 300)
    const hit = pickFlightTarget([decoy], eye, rayTo(SOL_POSITION, eye))
    expect(hit.kind).toBe('sol')
    expect(hit.system).toBe(SOL_SYSTEM)
    expect(hit.system.host).not.toBe(decoy.host)
  })

  it('beats a catalog star behind it even when that star is dead centre of the ray', () => {
    const dir = rayTo(SOL_POSITION, eye)
    const decoy = { host: 'DEAD-CENTRE', x: eye[0] + dir[0] * 400, y: eye[1] + dir[1] * 400, z: eye[2] + dir[2] * 400, planets: [] }
    expect(pickFlightTarget([decoy], eye, dir).kind).toBe('sol')
  })

  it('still selects the Sun when the click lands near its edge rather than dead centre', () => {
    const dir = nudged(rayTo(SOL_POSITION, eye), 1.2)
    expect(pickFlightTarget([], eye, dir).kind).toBe('sol')
  })

  it('leaves catalog stars elsewhere in the sky alone', () => {
    const aside = { host: 'ELSEWHERE', x: eye[0] + 10, y: eye[1], z: eye[2] + 1, planets: [] }
    const hit = pickFlightTarget([aside], eye, rayTo([aside.x, aside.y, aside.z], eye))
    expect(hit.kind).toBe('star')
    expect(hit.system.host).toBe('ELSEWHERE')
  })



  it('ignores home bodies that are behind the ship', () => {
    const behind = rayTo(SOL_POSITION, eye).map(v => -v)
    expect(pickHomeBody(eye, behind)).toBeNull()
  })

  it('returns nothing when the click lands on empty sky', () => {
    expect(pickFlightTarget([], eye, [0, 1, 0])).toBeNull()
  })
})

describe('the Sun stays clickable well after launch', () => {
  it('is still selectable after the ship has auto-cruised for twenty seconds', () => {
    const f = cruised(20)
    const eye = eyePosition(f)
    expect(pickFlightTarget([], eye, rayTo(SOL_POSITION, eye)).kind).toBe('sol')
  })

  it('survives a catalog star ambush at every distance the ship reaches on cruise', () => {
    for (const seconds of [0, 5, 15, 30, 60]) {
      const f = cruised(seconds)
      const eye = eyePosition(f)
      const decoy = starBehind(SOL_POSITION, eye, 50)
      expect(pickFlightTarget([decoy], eye, rayTo(SOL_POSITION, eye)).kind).toBe('sol')
    }
  })

  it('is not tied to the launch framing: it works from a turned, climbed ship too', () => {
    let f = createFlight()
    for (let i = 0; i < 300; i++) {
      f = stepFlight(f, { turn: 1, pitch: 1, boost: false, halt: false }, 1 / 60)
    }
    const eye = eyePosition(f)
    expect(pickFlightTarget([], eye, rayTo(SOL_POSITION, eye)).kind).toBe('sol')
  })

  it('does not fire when the ship is simply pointing where it is going', () => {
    const f = cruised(30)
    const eye = eyePosition(f)
    expect(pickHomeBody(eye, forwardVector(f.yaw, f.pitch))).toBeNull()
  })
})
