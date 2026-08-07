import { mulberry32 } from './seed.js'

function smooth(t) {
  return t * t * (3 - 2 * t)
}

export function makeValueNoise(seed, gridSize = 16) {
  const rand = mulberry32(seed)
  const grid = []
  for (let y = 0; y <= gridSize; y++) {
    const row = []
    for (let x = 0; x < gridSize; x++) row.push(rand())
    grid.push(row)
  }
  return function (u, v) {
    const wrappedU = u - Math.floor(u)
    const clampedV = Math.min(Math.max(v, 0), 1)
    const gx = wrappedU * gridSize
    const gy = clampedV * gridSize
    const x0 = Math.floor(gx) % gridSize
    const y0 = Math.min(Math.floor(gy), gridSize - 1)
    const x1 = (x0 + 1) % gridSize
    const y1 = y0 + 1
    const tx = smooth(gx - Math.floor(gx))
    const ty = smooth(gy - y0)
    const a = grid[y0][x0] * (1 - tx) + grid[y0][x1] * tx
    const b = grid[y1][x0] * (1 - tx) + grid[y1][x1] * tx
    return a * (1 - ty) + b * ty
  }
}

export function makeFbm(seed, octaves = 4, baseGrid = 8) {
  const layers = []
  let totalAmp = 0
  for (let i = 0; i < octaves; i++) {
    const amp = Math.pow(0.5, i)
    layers.push({ noise: makeValueNoise(seed + i * 1013, baseGrid * Math.pow(2, i)), amp })
    totalAmp += amp
  }
  return function (u, v) {
    let sum = 0
    for (const { noise, amp } of layers) {
      sum += noise(u, v) * amp
    }
    return sum / totalAmp
  }
}
