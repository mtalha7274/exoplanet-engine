import { describe, it, expect } from 'vitest'
import { discPixels } from './disc.js'

const planet = { name: 'Kepler-16 b', cls: 'gas-giant' }
const SIZE = 64

function pixel(data, size, x, y) {
  const i = (y * size + x) * 4
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}

describe('discPixels', () => {
  it('returns an rgba buffer of the requested size', () => {
    expect(discPixels(planet, SIZE)).toHaveLength(SIZE * SIZE * 4)
  })

  it('leaves the area outside the disc transparent', () => {
    const data = discPixels(planet, SIZE)
    expect(pixel(data, SIZE, 0, 0)[3]).toBe(0)
    expect(pixel(data, SIZE, SIZE - 1, SIZE - 1)[3]).toBe(0)
  })

  it('fills the disc itself', () => {
    const data = discPixels(planet, SIZE)
    expect(pixel(data, SIZE, SIZE / 2, SIZE / 2)[3]).toBe(255)
  })

  it('shades the terminator darker than the lit side', () => {
    const data = discPixels(planet, SIZE)
    const lit = pixel(data, SIZE, Math.floor(SIZE * 0.35), SIZE / 2)
    const dark = pixel(data, SIZE, SIZE - 3, SIZE / 2)
    const brightness = p => p[0] + p[1] + p[2]
    expect(brightness(lit)).toBeGreaterThan(brightness(dark))
  })

  it('is deterministic per planet name', () => {
    expect(Array.from(discPixels(planet, SIZE))).toEqual(Array.from(discPixels({ ...planet }, SIZE)))
  })

  it('differs between planets', () => {
    const a = Array.from(discPixels({ name: 'One', cls: 'lava' }, SIZE))
    const b = Array.from(discPixels({ name: 'Two', cls: 'lava' }, SIZE))
    expect(a).not.toEqual(b)
  })
})
