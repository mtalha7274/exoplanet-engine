import { makeSurfaceSampler } from './surface.js'

const LIGHT = [-0.55, 0.35, 0.76]

export function discPixels(planet, size) {
  const sample = makeSurfaceSampler(planet)
  const data = new Uint8ClampedArray(size * size * 4)
  const r = size / 2 - 1
  const cx = size / 2
  const cy = size / 2
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const nx = (px - cx) / r
      const ny = (py - cy) / r
      const d2 = nx * nx + ny * ny
      const i = (py * size + px) * 4
      if (d2 > 1) continue
      const nz = Math.sqrt(1 - d2)
      const u = (Math.atan2(nx, nz) / (2 * Math.PI) + 0.5) % 1
      const v = Math.acos(Math.max(-1, Math.min(1, ny))) / Math.PI
      const [cr, cg, cb] = sample(u, v)
      const lambert = Math.max(0, nx * LIGHT[0] + -ny * LIGHT[1] + nz * LIGHT[2])
      const shade = 0.12 + 0.95 * lambert
      const rim = 1 - Math.pow(d2, 3) * 0.35
      const k = shade * rim
      data[i] = cr * k
      data[i + 1] = cg * k
      data[i + 2] = cb * k
      data[i + 3] = 255
    }
  }
  return data
}
