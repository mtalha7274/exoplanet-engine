import { hashString } from './seed.js'
import { makeFbm } from './noise.js'
import { classInfo, classifyPlanet } from './classify.js'

const BANDED = new Set(['sub-neptune', 'neptunian', 'gas-giant'])
const POLAR = new Set(['temperate-rocky', 'frozen-rocky'])

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lerpRgb(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function clampByte(x) {
  return Math.max(0, Math.min(255, x))
}

export function makeSurfaceSampler(planet) {
  const cls = planet.cls ?? classifyPlanet(planet)
  const palette = classInfo(cls).palette.map(hexToRgb)
  const seed = hashString(planet.name ?? '')
  const fbm = makeFbm(seed)
  const detail = makeFbm(seed + 7919, 3, 16)
  const bands = 4 + (seed % 4)
  return function (u, v) {
    const n = fbm(u, v)
    let t
    if (BANDED.has(cls)) {
      const w = v * bands + (n - 0.5) * 1.4
      t = (Math.sin(w * Math.PI * 2) + 1) / 2
    } else {
      t = n
    }
    if (POLAR.has(cls)) {
      const polar = Math.abs(v - 0.5) * 2
      if (polar > 0.85) t = Math.min(1, t + (polar - 0.85) * 5)
    }
    const scaled = t * (palette.length - 1)
    const i = Math.min(palette.length - 2, Math.floor(scaled))
    const frac = scaled - i
    const base = lerpRgb(palette[i], palette[i + 1], frac)
    const shade = 0.85 + detail(u, v) * 0.3
    return [clampByte(base[0] * shade), clampByte(base[1] * shade), clampByte(base[2] * shade)]
  }
}
