export const LY_PER_PC = 3.26156
export const AU_PER_PC = 206264.806
export const MIN_SPEED = 0.002
export const BASE_SPEED = 0.15
export const MAX_SPEED = 8
export const SPOOL_RATE = 6
export const BOOST_ACCEL = 1.5
export const BOOST_DECAY = 2.2
export const BRAKE_RATE = 8
export const YAW_RATE = 0.6
export const STICK_ENGAGE = 5
export const TURN_AUTHORITY_FLOOR = 0.4
export const TURN_AUTHORITY_SPEED = 2
export const PITCH_RATE = 0.5
export const BANK_ANGLE = 0.4
export const PITCH_LIMIT = Math.PI / 2 - 0.05
export const ARRIVAL_PC = 0.6

export const FLIGHT_FOV = 70
export const CAM_OFFSET = [0, 0.28, -1.65]

export const SOL_POSITION = [0, 0, 0]
export const HOME_START = [0.85, -0.55, -1.7]

export function createFlight() {
  return { pos: [...HOME_START], yaw: 0, pitch: 0, speed: 0 }
}

export function forwardVector(yaw, pitch) {
  const cp = Math.cos(pitch)
  return [-Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp]
}

export function orientationEuler(yaw, pitch, roll = 0) {
  return [-pitch, -yaw, roll]
}

export function stickEase(current, target, dt, rate = STICK_ENGAGE) {
  return target + (current - target) * Math.exp(-rate * dt)
}

export function turnAuthority(speed) {
  const t = Math.min(1, Math.max(0, speed) / TURN_AUTHORITY_SPEED)
  return TURN_AUTHORITY_FLOOR + (1 - TURN_AUTHORITY_FLOOR) * (1 - t)
}

export function bankTarget(turn) {
  return turn * BANK_ANGLE
}

function rotateYXZ([ex, ey, ez], v) {
  const sx = Math.sin(ex), cx = Math.cos(ex)
  const sy = Math.sin(ey), cy = Math.cos(ey)
  const sz = Math.sin(ez), cz = Math.cos(ez)
  const a = [v[0] * cz - v[1] * sz, v[0] * sz + v[1] * cz, v[2]]
  const b = [a[0], a[1] * cx - a[2] * sx, a[1] * sx + a[2] * cx]
  return [b[0] * cy + b[2] * sy, b[1], -b[0] * sy + b[2] * cy]
}

export function eyePosition(state) {
  const off = rotateYXZ(orientationEuler(state.yaw, state.pitch), CAM_OFFSET)
  return [state.pos[0] + off[0], state.pos[1] + off[1], state.pos[2] + off[2]]
}

export function viewOffset(target, state) {
  const eye = eyePosition(state)
  const euler = orientationEuler(state.yaw, state.pitch)
  const nose = rotateYXZ(euler, [0, 0, 1])
  const up = rotateYXZ(euler, [0, 1, 0])
  const right = [
    nose[1] * up[2] - nose[2] * up[1],
    nose[2] * up[0] - nose[0] * up[2],
    nose[0] * up[1] - nose[1] * up[0]
  ]
  const d = [target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]]
  return {
    forward: d[0] * nose[0] + d[1] * nose[1] + d[2] * nose[2],
    x: d[0] * right[0] + d[1] * right[1] + d[2] * right[2],
    y: d[0] * up[0] + d[1] * up[1] + d[2] * up[2]
  }
}

export function inView(target, state, fov = FLIGHT_FOV, aspect = 16 / 9) {
  const o = viewOffset(target, state)
  if (o.forward <= 0) return false
  const half = Math.tan((fov * Math.PI) / 360) * o.forward
  return Math.abs(o.y) <= half && Math.abs(o.x) <= half * aspect
}

export function throttleGlow(speed) {
  if (speed <= 0) return 0
  const ramp = Math.log1p(speed / BASE_SPEED) / Math.log1p(MAX_SPEED / BASE_SPEED)
  return Math.min(1, ramp * 0.75 + Math.min(speed / BASE_SPEED, 1) * 0.25)
}

export function distanceFromEarth(pos) {
  return Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2])
}

export function nearestSystem(pos, systems) {
  let best = null
  let bestSq = Infinity
  for (const s of systems) {
    const dx = s.x - pos[0]
    const dy = s.y - pos[1]
    const dz = s.z - pos[2]
    const sq = dx * dx + dy * dy + dz * dz
    if (sq < bestSq) {
      bestSq = sq
      best = s
    }
  }
  return best ? { system: best, distance: Math.sqrt(bestSq) } : null
}

export function pickStar(systems, eye, dir, maxAngle = 0.05) {
  const minCos = Math.cos(maxAngle)
  let best = null
  let bestCos = minCos
  let bestDist = Infinity
  for (const s of systems) {
    const dx = s.x - eye[0]
    const dy = s.y - eye[1]
    const dz = s.z - eye[2]
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (len === 0) continue
    const cos = (dx * dir[0] + dy * dir[1] + dz * dir[2]) / len
    if (cos < minCos) continue
    if (cos > bestCos + 1e-9 || (Math.abs(cos - bestCos) <= 1e-9 && len < bestDist)) {
      best = s
      bestCos = cos
      bestDist = len
    }
  }
  return best
}

export function speedInC(lyPerSec) {
  return lyPerSec * 31557600
}

export function fmtSpeed(lyPerSec) {
  if (lyPerSec < MIN_SPEED) return 'STATIONARY'
  const digits = lyPerSec < 0.1 ? 3 : lyPerSec < 10 ? 2 : 1
  return `${lyPerSec.toFixed(digits)} ly/s`
}

function approach(value, target, rate, dt) {
  return target + (value - target) * Math.exp(-rate * dt)
}

function nextSpeed(speed, input, dt) {
  if (input.halt) {
    const slowed = approach(speed, 0, BRAKE_RATE, dt)
    return slowed < MIN_SPEED ? 0 : slowed
  }
  if (input.boost) {
    const spool = BASE_SPEED * (1 - Math.exp(-SPOOL_RATE * dt))
    return Math.min(MAX_SPEED, speed * Math.exp(BOOST_ACCEL * dt) + spool)
  }
  return approach(speed, BASE_SPEED, speed > BASE_SPEED ? BOOST_DECAY : SPOOL_RATE, dt)
}

export function stepFlight(state, input, dt) {
  const yaw = state.yaw + (input.turn ?? 0) * YAW_RATE * turnAuthority(state.speed) * dt
  const pitch = Math.max(
    -PITCH_LIMIT,
    Math.min(PITCH_LIMIT, state.pitch + (input.pitch ?? 0) * PITCH_RATE * dt)
  )

  const speed = nextSpeed(state.speed, input, dt)
  const [fx, fy, fz] = forwardVector(yaw, pitch)
  const parsecs = (speed / LY_PER_PC) * dt

  return {
    pos: [
      state.pos[0] + fx * parsecs,
      state.pos[1] + fy * parsecs,
      state.pos[2] + fz * parsecs
    ],
    yaw,
    pitch,
    speed
  }
}
