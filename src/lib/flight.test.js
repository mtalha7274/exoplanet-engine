import { describe, it, expect } from 'vitest'
import {
  createFlight,
  stepFlight,
  forwardVector,
  orientationEuler,
  bankTarget,
  stickEase,
  turnAuthority,
  throttleGlow,
  distanceFromEarth,
  nearestSystem,
  speedInC,
  fmtSpeed,
  pickStar,
  eyePosition,
  inView,
  MIN_SPEED,
  BASE_SPEED,
  MAX_SPEED,
  LY_PER_PC,
  PITCH_LIMIT,
  YAW_RATE,
  PITCH_RATE,
  STICK_ENGAGE,
  TURN_AUTHORITY_FLOOR,
  TURN_AUTHORITY_SPEED,
  HOME_START,
  SOL_POSITION,
  ARRIVAL_PC
} from './flight.js'

const cruise = { turn: 0, pitch: 0, boost: false, halt: false }
const boosting = { ...cruise, boost: true }
const halted = { ...cruise, halt: true }

function rotateYXZ([x, y, z], v) {
  const sx = Math.sin(x), cx = Math.cos(x)
  const sy = Math.sin(y), cy = Math.cos(y)
  const sz = Math.sin(z), cz = Math.cos(z)
  const a = [v[0] * cz - v[1] * sz, v[0] * sz + v[1] * cz, v[2]]
  const b = [a[0], a[1] * cx - a[2] * sx, a[1] * sx + a[2] * cx]
  return [b[0] * cy + b[2] * sy, b[1], -b[0] * sy + b[2] * cy]
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const norm = a => Math.sqrt(dot(a, a))
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
]

const noseOf = (yaw, pitch, roll = 0) => rotateYXZ(orientationEuler(yaw, pitch, roll), [0, 0, 1])
const upOf = (yaw, pitch, roll = 0) => rotateYXZ(orientationEuler(yaw, pitch, roll), [0, 1, 0])
const rightOf = (yaw, pitch, roll = 0) => cross(noseOf(yaw, pitch, roll), upOf(yaw, pitch, roll))

function hold(input, seconds, state = createFlight(), dt = 1 / 60) {
  let f = state
  for (let i = 0; i < Math.round(seconds / dt); i++) f = stepFlight(f, input, dt)
  return f
}

function offAxisDegrees(target, state) {
  const to = sub(target, eyePosition(state))
  const nose = noseOf(state.yaw, state.pitch)
  return (Math.acos(dot(to, nose) / norm(to)) * 180) / Math.PI
}

const ANGLES = [
  [0, 0], [0.4, 0], [-0.4, 0], [0, 0.5], [0, -0.5],
  [1.2, 0.4], [-2.5, -0.9], [3.0, 1.2], [-1.1, 1.4]
]

describe('createFlight', () => {
  it('starts stationary just outside the home system, facing it', () => {
    const f = createFlight()
    expect(f.pos).toEqual([...HOME_START])
    expect(f.speed).toBe(0)
    expect(f.yaw).toBe(0)
    expect(f.pitch).toBe(0)
  })

  it('starts a short hop from Sol, not on top of it', () => {
    const d = distanceFromEarth(createFlight().pos)
    expect(d).toBeGreaterThan(1)
    expect(d).toBeLessThan(4)
  })

  it('hands out a fresh position array each time', () => {
    createFlight().pos[0] = 999
    expect(createFlight().pos).toEqual([...HOME_START])
  })
})

describe('home system framing', () => {
  it('has Sol in frame on the very first frame', () => {
    expect(inView(SOL_POSITION, createFlight(), 70, 16 / 9)).toBe(true)
  })

  it('keeps Sol in frame even in a narrow window', () => {
    expect(inView(SOL_POSITION, createFlight(), 70, 1)).toBe(true)
  })

  it('holds Sol clear of the ship silhouette dead ahead', () => {
    expect(offAxisDegrees(SOL_POSITION, createFlight())).toBeGreaterThan(6)
  })


  it('does not park the ship inside a catalogue arrival radius', () => {
    expect(norm(sub(HOME_START, SOL_POSITION))).toBeGreaterThan(ARRIVAL_PC)
  })

  it('flies past the home system rather than straight through Sol', () => {
    const f = createFlight()
    const nose = noseOf(f.yaw, f.pitch)
    const to = sub(SOL_POSITION, f.pos)
    const along = dot(to, nose)
    const miss = norm(sub(to, [nose[0] * along, nose[1] * along, nose[2] * along]))
    expect(miss).toBeGreaterThan(0.5)
  })


  it('keeps Sol itself at the true heliocentric origin', () => {
    expect(SOL_POSITION).toEqual([0, 0, 0])
    expect(distanceFromEarth(SOL_POSITION)).toBe(0)
  })
})

describe('eyePosition', () => {
  it('sits behind and above the ship', () => {
    const f = createFlight()
    const eye = eyePosition(f)
    const behind = dot(sub(eye, f.pos), noseOf(f.yaw, f.pitch))
    expect(behind).toBeLessThan(0)
    expect(dot(sub(eye, f.pos), upOf(f.yaw, f.pitch))).toBeGreaterThan(0)
  })

  it('swings around with the ship as it turns', () => {
    const turned = { ...createFlight(), yaw: Math.PI / 2 }
    const behind = dot(sub(eyePosition(turned), turned.pos), noseOf(turned.yaw, turned.pitch))
    expect(behind).toBeLessThan(0)
  })
})

describe('inView', () => {
  const at = { pos: [0, 0, 0], yaw: 0, pitch: 0, speed: 0 }

  it('rejects anything behind the ship', () => {
    expect(inView([0, 0, -50], at, 70, 16 / 9)).toBe(false)
  })

  it('accepts a target dead ahead', () => {
    expect(inView([0, 0, 50], at, 70, 16 / 9)).toBe(true)
  })

  it('rejects a target off the side of the screen', () => {
    expect(inView([0, 60, 10], at, 70, 16 / 9)).toBe(false)
  })

  it('is wider than it is tall on a widescreen viewport', () => {
    const corner = [12, 0, 10]
    expect(inView(corner, at, 70, 16 / 9)).toBe(true)
    expect(inView([0, 12, 10], at, 70, 16 / 9)).toBe(false)
  })
})

describe('forwardVector', () => {
  it('returns a unit vector', () => {
    for (const [yaw, pitch] of ANGLES) {
      const [x, y, z] = forwardVector(yaw, pitch)
      expect(Math.sqrt(x * x + y * y + z * z)).toBeCloseTo(1, 10)
    }
  })

  it('points along +z at rest', () => {
    expect(forwardVector(0, 0)[2]).toBeCloseTo(1, 10)
  })

  it('pitching up raises the y component', () => {
    expect(forwardVector(0, 0.5)[1]).toBeGreaterThan(0)
    expect(forwardVector(0, -0.5)[1]).toBeLessThan(0)
  })

  it('yawing right swings the heading toward the ship\'s right', () => {
    const rest = forwardVector(0, 0)
    const right = rightOf(0, 0)
    expect(dot(sub(forwardVector(0.3, 0), rest), right)).toBeGreaterThan(0)
    expect(dot(sub(forwardVector(-0.3, 0), rest), right)).toBeLessThan(0)
  })
})

describe('orientation matches travel', () => {
  it('points the nose exactly where the ship is travelling', () => {
    for (const [yaw, pitch] of ANGLES) {
      const nose = noseOf(yaw, pitch)
      const travel = forwardVector(yaw, pitch)
      expect(dot(nose, travel)).toBeCloseTo(1, 10)
      for (let i = 0; i < 3; i++) expect(nose[i]).toBeCloseTo(travel[i], 10)
    }
  })

  it('keeps the nose on the heading even while banked', () => {
    for (const roll of [-0.4, 0, 0.4]) {
      for (const [yaw, pitch] of ANGLES) {
        expect(dot(noseOf(yaw, pitch, roll), forwardVector(yaw, pitch))).toBeCloseTo(1, 10)
      }
    }
  })

  it('never rolls the horizon upside down within the pitch limit', () => {
    for (const yaw of [-3, -1, 0, 1, 3]) {
      for (const pitch of [-PITCH_LIMIT, -0.7, 0, 0.7, PITCH_LIMIT]) {
        expect(upOf(yaw, pitch)[1]).toBeGreaterThan(0)
      }
    }
  })

  it('holds nose, up and right mutually perpendicular', () => {
    for (const [yaw, pitch] of ANGLES) {
      expect(dot(noseOf(yaw, pitch), upOf(yaw, pitch))).toBeCloseTo(0, 10)
      expect(dot(noseOf(yaw, pitch), rightOf(yaw, pitch))).toBeCloseTo(0, 10)
    }
  })

  it('travels exactly along the nose while cruising and steering', () => {
    let f = hold(cruise, 2)
    f = hold({ ...cruise, turn: 1, pitch: 1 }, 1, f)
    const before = [...f.pos]
    const moved = stepFlight(f, cruise, 0.5)
    const travelled = sub(moved.pos, before)
    expect(dot(travelled, noseOf(f.yaw, f.pitch)) / norm(travelled)).toBeCloseTo(1, 6)
  })
})

describe('bankTarget', () => {
  it('dips the right wing when turning right', () => {
    expect(rightOf(0, 0, bankTarget(1))[1]).toBeLessThan(0)
  })

  it('dips the left wing when turning left', () => {
    expect(rightOf(0, 0, bankTarget(-1))[1]).toBeGreaterThan(0)
  })

  it('flies level when not turning', () => {
    expect(bankTarget(0)).toBe(0)
    expect(rightOf(0, 0, bankTarget(0))[1]).toBeCloseTo(0, 10)
  })

  it('banks into the turn, never away from it', () => {
    for (const turn of [-1, -0.5, 0.5, 1]) {
      expect(Math.sign(bankTarget(turn))).toBe(Math.sign(turn))
    }
  })
})

describe('cruise throttle', () => {
  it('flies forward with no keys held at all', () => {
    const f = hold(cruise, 1.5)
    expect(f.speed).toBeCloseTo(BASE_SPEED, 3)
  })

  it('spools up from a standing start rather than snapping to cruise', () => {
    const f = stepFlight(createFlight(), cruise, 1 / 60)
    expect(f.speed).toBeGreaterThan(0)
    expect(f.speed).toBeLessThan(BASE_SPEED * 0.5)
  })

  it('never drifts past base cruise on its own', () => {
    expect(hold(cruise, 60).speed).toBeLessThanOrEqual(BASE_SPEED + 1e-9)
  })

  it('has no forward key: steering alone does not change the cruise speed', () => {
    const steered = hold({ ...cruise, turn: 1, pitch: 1 }, 4)
    expect(steered.speed).toBeCloseTo(BASE_SPEED, 3)
  })

  it('shift is the only accelerator: it ramps beyond base while held', () => {
    const base = hold(cruise, 2)
    const short = hold(boosting, 1, base)
    const long = hold(boosting, 3, base)
    expect(short.speed).toBeGreaterThan(BASE_SPEED)
    expect(long.speed).toBeGreaterThan(short.speed)
  })

  it('climbs off a standing start under boost', () => {
    expect(hold(boosting, 1).speed).toBeGreaterThan(0)
    expect(hold(boosting, 8).speed).toBeGreaterThan(BASE_SPEED * 10)
  })

  it('never exceeds the maximum speed', () => {
    const f = hold(boosting, 90)
    expect(f.speed).toBeLessThanOrEqual(MAX_SPEED)
    expect(f.speed).toBeCloseTo(MAX_SPEED, 5)
  })

  it('releasing shift decays back toward base cruise, not to a stop', () => {
    const fast = hold(boosting, 10)
    expect(fast.speed).toBeGreaterThan(BASE_SPEED * 10)
    const easing = hold(cruise, 1, fast)
    expect(easing.speed).toBeLessThan(fast.speed)
    const settled = hold(cruise, 12, fast)
    expect(settled.speed).toBeCloseTo(BASE_SPEED, 2)
    expect(settled.speed).toBeGreaterThan(0)
  })

  it('base cruise is manoeuvrable near a star but not stuck', () => {
    const secondsToCross = ARRIVAL_PC / (BASE_SPEED / LY_PER_PC)
    expect(secondsToCross).toBeGreaterThan(8)
    expect(secondsToCross).toBeLessThan(20)
  })

  it('sustained boost still reaches the nearest real stars within a play session', () => {
    const proxima = 1.301
    const worthwhileRange = 50
    let f = createFlight()
    const start = [...f.pos]
    let toProxima = null
    for (let i = 0; i < 60 * 90; i++) {
      f = stepFlight(f, boosting, 1 / 60)
      const gone = norm(sub(f.pos, start))
      if (toProxima === null && gone >= proxima) toProxima = (i + 1) / 60
    }
    expect(toProxima).toBeLessThan(5)
    expect(norm(sub(f.pos, start))).toBeGreaterThan(worthwhileRange)
  })
})

describe('comfortable controls', () => {
  it('keeps cruise and boost well clear of the old billion-c territory', () => {
    expect(speedInC(BASE_SPEED)).toBeLessThan(10_000_000)
    expect(speedInC(MAX_SPEED)).toBeLessThan(500_000_000)
  })

  it('caps boost to a meaningful but not extreme multiple of cruise', () => {
    expect(MAX_SPEED / BASE_SPEED).toBeGreaterThan(5)
    expect(MAX_SPEED / BASE_SPEED).toBeLessThanOrEqual(60)
  })

  it('completes a full turn-in-place in a comfortable number of seconds', () => {
    const seconds = (2 * Math.PI) / YAW_RATE
    expect(seconds).toBeGreaterThan(6)
    expect(seconds).toBeLessThan(25)
  })

  it('keeps per-frame displacement small at a typical frame time, even under full boost', () => {
    const f = hold(boosting, 30)
    const before = [...f.pos]
    const after = stepFlight(f, boosting, 1 / 60)
    expect(norm(sub(after.pos, before))).toBeLessThan(0.05)
  })

  it('a short tap of the turn key nudges heading rather than snapping it', () => {
    const before = createFlight()
    const tapped = stepFlight(before, { ...cruise, turn: 1 }, 1 / 10)
    const degrees = Math.abs(tapped.yaw - before.yaw) * (180 / Math.PI)
    expect(degrees).toBeGreaterThan(0)
    expect(degrees).toBeLessThan(15)
  })

  it('brakes smoothly rather than snapping instantly to zero', () => {
    const flying = hold(cruise, 2)
    const oneFrame = stepFlight(flying, halted, 1 / 60)
    expect(oneFrame.speed).toBeGreaterThan(flying.speed * 0.8)
  })
})

describe('space holds position', () => {
  it('brakes a cruising ship to a dead stop', () => {
    const flying = hold(cruise, 2)
    expect(flying.speed).toBeGreaterThan(0)
    expect(hold(halted, 2, flying).speed).toBe(0)
  })

  it('brakes a boosted ship to a dead stop', () => {
    expect(hold(halted, 8, hold(boosting, 10)).speed).toBe(0)
  })

  it('holds the ship perfectly still while the key is down', () => {
    const stopped = hold(halted, 3, hold(cruise, 2))
    const still = hold(halted, 5, stopped)
    expect(still.speed).toBe(0)
    expect(still.pos).toEqual(stopped.pos)
  })

  it('coasts down instead of snapping to zero', () => {
    const flying = hold(cruise, 2)
    const oneFrame = stepFlight(flying, halted, 1 / 60)
    expect(oneFrame.speed).toBeGreaterThan(0)
    expect(oneFrame.speed).toBeLessThan(flying.speed)
  })

  it('outranks shift while both are held', () => {
    const fast = hold(boosting, 4)
    expect(hold({ ...boosting, halt: true }, 4, fast).speed).toBe(0)
  })

  it('never drives the ship backwards', () => {
    let f = hold(cruise, 2)
    const nose = noseOf(f.yaw, f.pitch)
    const before = [...f.pos]
    f = hold(halted, 5, f)
    expect(f.speed).toBe(0)
    expect(dot(sub(f.pos, before), nose)).toBeGreaterThanOrEqual(0)
  })

  it('resumes cruising the moment it is released', () => {
    const stopped = hold(halted, 3, hold(cruise, 2))
    expect(hold(cruise, 2, stopped).speed).toBeCloseTo(BASE_SPEED, 3)
  })

  it('still steers while stopped', () => {
    const stopped = hold(halted, 3, hold(cruise, 2))
    const turned = hold({ ...halted, turn: 1 }, 1, stopped)
    expect(turned.yaw).toBeGreaterThan(stopped.yaw)
    expect(turned.pos).toEqual(stopped.pos)
  })
})

describe('steering', () => {
  it('D turns right and A turns left', () => {
    const rest = createFlight()
    const before = forwardVector(rest.yaw, rest.pitch)
    const right = rightOf(rest.yaw, rest.pitch)
    const d = stepFlight(rest, { ...cruise, turn: 1 }, 0.3)
    const a = stepFlight(rest, { ...cruise, turn: -1 }, 0.3)
    expect(dot(sub(forwardVector(d.yaw, d.pitch), before), right)).toBeGreaterThan(0)
    expect(dot(sub(forwardVector(a.yaw, a.pitch), before), right)).toBeLessThan(0)
  })

  it('keeps turning the same way from any heading', () => {
    for (const yaw of [-2.5, -0.8, 0.6, 2.9]) {
      const from = { ...createFlight(), yaw }
      const right = rightOf(from.yaw, from.pitch)
      const before = forwardVector(from.yaw, from.pitch)
      const d = stepFlight(from, { ...cruise, turn: 1 }, 0.2)
      expect(dot(sub(forwardVector(d.yaw, d.pitch), before), right)).toBeGreaterThan(0)
    }
  })

  it('W raises the nose and climbs', () => {
    const up = stepFlight(createFlight(), { ...cruise, pitch: 1 }, 0.5)
    expect(up.pitch).toBeGreaterThan(0)
    expect(forwardVector(up.yaw, up.pitch)[1]).toBeGreaterThan(0)
    expect(noseOf(up.yaw, up.pitch)[1]).toBeGreaterThan(0)
  })

  it('S lowers the nose and dives', () => {
    const down = stepFlight(createFlight(), { ...cruise, pitch: -1 }, 0.5)
    expect(down.pitch).toBeLessThan(0)
    expect(forwardVector(down.yaw, down.pitch)[1]).toBeLessThan(0)
    expect(noseOf(down.yaw, down.pitch)[1]).toBeLessThan(0)
  })

  it('gains altitude while held on W', () => {
    let f = hold(cruise, 2)
    f = hold({ ...cruise, pitch: 1 }, 1, f)
    expect(stepFlight(f, cruise, 0.5).pos[1]).toBeGreaterThan(f.pos[1])
  })

  it('loses altitude while held on S', () => {
    let f = hold(cruise, 2)
    f = hold({ ...cruise, pitch: -1 }, 1, f)
    expect(stepFlight(f, cruise, 0.5).pos[1]).toBeLessThan(f.pos[1])
  })

  it('clamps pitch short of straight up so the horizon never flips', () => {
    const up = hold({ ...cruise, pitch: 1 }, 20)
    expect(up.pitch).toBeLessThan(Math.PI / 2)
    expect(up.pitch).toBeCloseTo(PITCH_LIMIT, 10)
    const down = hold({ ...cruise, pitch: -1 }, 20)
    expect(down.pitch).toBeCloseTo(-PITCH_LIMIT, 10)
  })

  it('ignores a missing input field rather than drifting', () => {
    const f = stepFlight(createFlight(), {}, 0.5)
    expect(f.yaw).toBe(0)
    expect(f.pitch).toBe(0)
  })
})

describe('movement', () => {
  it('advances along its heading', () => {
    const start = createFlight()
    const moved = hold(cruise, 2)
    const travelled = sub(moved.pos, start.pos)
    expect(norm(travelled)).toBeGreaterThan(0)
    expect(travelled[2]).toBeGreaterThan(0)
    expect(Math.abs(travelled[0])).toBeCloseTo(0, 6)
    expect(Math.abs(travelled[1])).toBeCloseTo(0, 6)
  })

  it('converts light years per second into parsecs of travel', () => {
    const dt = 0.5
    const from = { pos: [0, 0, 0], yaw: 0, pitch: 0, speed: 3 }
    const moved = stepFlight(from, boosting, dt)
    expect(moved.pos[2] * LY_PER_PC).toBeCloseTo(moved.speed * dt, 10)
  })

  it('covers more ground with boost held', () => {
    const at = { pos: [0, 0, 0], yaw: 0, pitch: 0, speed: BASE_SPEED }
    expect(stepFlight(at, boosting, 1).pos[2]).toBeGreaterThan(stepFlight(at, cruise, 1).pos[2])
  })

  it('does not mutate the state it is given', () => {
    const f = createFlight()
    stepFlight(f, { ...cruise, turn: 1, pitch: 1, boost: true }, 1)
    expect(f).toEqual(createFlight())
  })
})

describe('throttleGlow', () => {
  it('is dark at a standstill', () => {
    expect(throttleGlow(0)).toBe(0)
  })

  it('is clearly lit at base cruise', () => {
    expect(throttleGlow(BASE_SPEED)).toBeGreaterThan(0.2)
  })

  it('rises with speed and saturates at full throttle', () => {
    expect(throttleGlow(MAX_SPEED)).toBeGreaterThan(throttleGlow(BASE_SPEED * 20))
    expect(throttleGlow(BASE_SPEED * 20)).toBeGreaterThan(throttleGlow(BASE_SPEED))
    expect(throttleGlow(MAX_SPEED)).toBeCloseTo(1, 6)
    expect(throttleGlow(MAX_SPEED * 4)).toBeLessThanOrEqual(1)
  })
})

describe('distanceFromEarth', () => {
  it('measures parsecs from the origin', () => {
    expect(distanceFromEarth([3, 4, 0])).toBeCloseTo(5, 10)
    expect(distanceFromEarth([0, 0, 0])).toBe(0)
  })
})

describe('nearestSystem', () => {
  const systems = [
    { host: 'A', x: 1, y: 0, z: 0 },
    { host: 'B', x: 10, y: 0, z: 0 },
    { host: 'C', x: 0, y: 0, z: 4 }
  ]

  it('finds the closest system and its distance', () => {
    const hit = nearestSystem([0, 0, 0], systems)
    expect(hit.system.host).toBe('A')
    expect(hit.distance).toBeCloseTo(1, 10)
  })

  it('tracks the ship as it moves', () => {
    expect(nearestSystem([9, 0, 0], systems).system.host).toBe('B')
  })

  it('returns null for an empty catalog', () => {
    expect(nearestSystem([0, 0, 0], [])).toBeNull()
  })
})

describe('pickStar', () => {
  const systems = [
    { host: 'AHEAD', x: 0, y: 0, z: 5 },
    { host: 'FAR-AHEAD', x: 0, y: 0, z: 50 },
    { host: 'BEHIND', x: 0, y: 0, z: -5 },
    { host: 'ASIDE', x: 5, y: 0, z: 0 }
  ]

  it('picks the star the ray points at', () => {
    expect(pickStar(systems, [0, 0, 0], [0, 0, 1]).host).toBe('AHEAD')
  })

  it('prefers the nearer of two stars along the same bearing', () => {
    expect(pickStar(systems, [0, 0, 0], [0, 0, 1]).host).toBe('AHEAD')
    expect(pickStar(systems, [0, 0, 10], [0, 0, 1]).host).toBe('FAR-AHEAD')
  })

  it('ignores stars behind the viewer', () => {
    expect(pickStar([systems[2]], [0, 0, 0], [0, 0, 1])).toBeNull()
  })

  it('returns null when nothing is near the ray', () => {
    expect(pickStar(systems, [0, 0, 0], [0, 1, 0])).toBeNull()
  })

  it('respects the cone width', () => {
    const offAxis = [{ host: 'OFF', x: 1, y: 0, z: 10 }]
    expect(pickStar(offAxis, [0, 0, 0], [0, 0, 1], 0.02)).toBeNull()
    expect(pickStar(offAxis, [0, 0, 0], [0, 0, 1], 0.3).host).toBe('OFF')
  })

  it('skips a star sitting exactly on the viewer', () => {
    expect(pickStar([{ host: 'HERE', x: 0, y: 0, z: 0 }], [0, 0, 0], [0, 0, 1])).toBeNull()
  })

  it('finds the star the ship is aimed at', () => {
    const f = createFlight()
    const ahead = [{
      host: 'TARGET',
      x: f.pos[0],
      y: f.pos[1],
      z: f.pos[2] + 12
    }]
    expect(pickStar(ahead, f.pos, forwardVector(f.yaw, f.pitch)).host).toBe('TARGET')
  })
})

describe('speed readouts', () => {
  it('expresses light years per second as a multiple of light speed', () => {
    expect(speedInC(1)).toBeCloseTo(31557600, 0)
  })

  it('formats a stopped ship', () => {
    expect(fmtSpeed(0)).toBe('STATIONARY')
  })

  it('formats slow and fast cruising differently', () => {
    expect(fmtSpeed(0.004)).toContain('ly/s')
    expect(fmtSpeed(120)).toContain('ly/s')
  })

  it('reads out base cruise and full boost', () => {
    expect(fmtSpeed(BASE_SPEED)).toContain('ly/s')
    expect(parseFloat(fmtSpeed(MAX_SPEED))).toBeCloseTo(MAX_SPEED, 1)
  })

  it('treats a speed below the cutoff as stopped', () => {
    expect(fmtSpeed(MIN_SPEED / 2)).toBe('STATIONARY')
  })
})

describe('turn authority falls away with speed', () => {
  it('gives a stopped ship its full turn rate', () => {
    expect(turnAuthority(0)).toBeCloseTo(1, 10)
  })

  it('never drops below the floor, however fast the ship is going', () => {
    for (const speed of [TURN_AUTHORITY_SPEED, 5, MAX_SPEED, MAX_SPEED * 10]) {
      expect(turnAuthority(speed)).toBeCloseTo(TURN_AUTHORITY_FLOOR, 10)
    }
  })

  it('tapers rather than stepping between the two', () => {
    const half = turnAuthority(TURN_AUTHORITY_SPEED / 2)
    expect(half).toBeLessThan(1)
    expect(half).toBeGreaterThan(TURN_AUTHORITY_FLOOR)
  })

  it('leaves the ship nimble at base cruise near a star', () => {
    expect(turnAuthority(BASE_SPEED)).toBeGreaterThan(0.9)
  })

  it('steers a boosted ship more sluggishly than a cruising one', () => {
    const cruiseTurn = stepFlight(hold(cruise, 2), { ...cruise, turn: 1 }, 1 / 60)
    const boostTurn = stepFlight(hold(boosting, 20), { ...boosting, turn: 1 }, 1 / 60)
    const cruiseYaw = Math.abs(cruiseTurn.yaw - hold(cruise, 2).yaw)
    const boostYaw = Math.abs(boostTurn.yaw - hold(boosting, 20).yaw)
    expect(boostYaw).toBeLessThan(cruiseYaw)
  })
})

describe('stick easing softens the controls', () => {
  it('leaves a settled stick where it is', () => {
    expect(stickEase(1, 1, 1 / 60)).toBeCloseTo(1, 10)
    expect(stickEase(0, 0, 1 / 60)).toBeCloseTo(0, 10)
  })

  it('never snaps to full deflection in a single frame', () => {
    expect(stickEase(0, 1, 1 / 60)).toBeLessThan(0.2)
    expect(stickEase(0, 1, 1 / 60)).toBeGreaterThan(0)
  })

  it('eases back toward centre when the key is released', () => {
    const engaged = stickEase(0, 1, 0.3)
    expect(stickEase(engaged, 0, 1 / 60)).toBeLessThan(engaged)
  })

  it('closes most of the gap within a comfortable fraction of a second', () => {
    let stick = 0
    for (let i = 0; i < 30; i++) stick = stickEase(stick, 1, 1 / 60)
    expect(stick).toBeGreaterThan(0.8)
  })

  it('is symmetric for a left deflection', () => {
    expect(stickEase(0, -1, 1 / 60)).toBeCloseTo(-stickEase(0, 1, 1 / 60), 12)
  })

  it('uses the shared engage rate by default', () => {
    expect(stickEase(0, 1, 1 / 60)).toBeCloseTo(stickEase(0, 1, 1 / 60, STICK_ENGAGE), 12)
  })

  it('keeps the nose calmer than the turn so climbing stays gentle', () => {
    expect(PITCH_RATE).toBeLessThanOrEqual(YAW_RATE)
    expect(PITCH_RATE).toBeGreaterThan(0.2)
  })
})
