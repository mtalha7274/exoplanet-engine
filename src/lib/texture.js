import { makeSurfaceSampler } from './surface.js'

const cache = new Map()

export function planetTextureCanvas(planet, width = 256, height = 128) {
  const key = `${planet.name}:${width}x${height}`
  if (cache.has(key)) return cache.get(key)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(width, height)
  const sample = makeSurfaceSampler(planet)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = sample(x / width, y / (height - 1))
      const i = (y * width + x) * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  cache.set(key, canvas)
  return canvas
}
