import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { orbitRadius, orbitSpeed, orbitSeconds, orbitPosition, displayRadius, starDisplayRadius, STAR_BASE, FAST_ORBIT_SECONDS, SLOW_ORBIT_SECONDS } from './orbits.js'

describe('orbitRadius', () => {
  it('grows with semi-major axis', () => {
    expect(orbitRadius(1, 0)).toBeGreaterThan(orbitRadius(0.05, 0))
    expect(orbitRadius(30, 0)).toBeGreaterThan(orbitRadius(1, 0))
  })

  it('falls back to index spacing when semi-major axis is missing', () => {
    const r0 = orbitRadius(null, 0)
    const r1 = orbitRadius(null, 1)
    const r2 = orbitRadius(null, 2)
    expect(r1).toBeGreaterThan(r0)
    expect(r2).toBeGreaterThan(r1)
  })

  it('never dips below the base radius', () => {
    expect(orbitRadius(0.0001, 0)).toBeGreaterThanOrEqual(5.5)
    expect(orbitRadius(null, 0)).toBeGreaterThanOrEqual(5.5)
  })

  it('accepts a custom base so orbits clear a large star', () => {
    expect(orbitRadius(0.01, 0, 12)).toBeGreaterThanOrEqual(12)
  })
})

describe('orbitSpeed', () => {
  it('is inversely related to orbital period', () => {
    expect(orbitSpeed(400)).toBeLessThan(orbitSpeed(40))
  })

  it('keeps the longest-period world visibly moving rather than frozen', () => {
    expect(orbitSeconds(1e7)).toBeLessThanOrEqual(SLOW_ORBIT_SECONDS)
    expect(orbitSeconds(1e7)).toBeGreaterThan(0)
  })

  it('never lets any real period take longer than the slow bound', () => {
    for (const period of [0.09, 1, 12, 365, 4000, 100000, 3.6e8]) {
      expect(orbitSeconds(period)).toBeLessThanOrEqual(SLOW_ORBIT_SECONDS + 1e-9)
      expect(orbitSeconds(period)).toBeGreaterThanOrEqual(FAST_ORBIT_SECONDS - 1e-9)
    }
  })

  it('still ranks a hot jupiter faster than a cold long-period giant', () => {
    expect(orbitSeconds(3)).toBeLessThan(orbitSeconds(300))
    expect(orbitSeconds(300)).toBeLessThan(orbitSeconds(3000))
  })

  it('compresses a colossal real range into a watchable one', () => {
    const ratio = orbitSeconds(3.6e8) / orbitSeconds(0.09)
    expect(ratio).toBeLessThan(12)
  })

  it('gives an unmeasured period a mid-range pace instead of stalling', () => {
    const fallback = orbitSeconds(null)
    expect(fallback).toBeGreaterThan(FAST_ORBIT_SECONDS)
    expect(fallback).toBeLessThan(SLOW_ORBIT_SECONDS)
    expect(orbitSeconds(0)).toBe(fallback)
    expect(orbitSeconds(-5)).toBe(fallback)
  })

  it('returns radians per second that complete exactly one revolution', () => {
    for (const period of [null, 1, 365, 5000]) {
      expect(orbitSpeed(period) * orbitSeconds(period)).toBeCloseTo(Math.PI * 2, 9)
    }
  })
})

describe('displayRadius', () => {
  it('defaults when radius is unknown', () => {
    expect(displayRadius(null)).toBeCloseTo(0.16, 5)
  })

  it('grows sublinearly with real radius', () => {
    expect(displayRadius(10)).toBeGreaterThan(displayRadius(1))
    expect(displayRadius(30)).toBeLessThan(displayRadius(1) * 4)
  })
})

describe('starDisplayRadius', () => {
  it('uses a sun-like default when stellar radius is unknown', () => {
    expect(starDisplayRadius(null)).toBeCloseTo(STAR_BASE, 5)
  })

  it('grows with stellar radius', () => {
    expect(starDisplayRadius(10)).toBeGreaterThan(starDisplayRadius(1))
  })

  it('clamps dwarfs and giants into a usable range', () => {
    expect(starDisplayRadius(0.05)).toBeGreaterThanOrEqual(0.9)
    expect(starDisplayRadius(400)).toBeLessThanOrEqual(4.2)
  })
})

describe('planet to star scale', () => {
  const star = starDisplayRadius(1)

  it('draws an earth-sized world far smaller than its sun-like host', () => {
    expect(displayRadius(1)).toBeLessThan(star * 0.2)
  })

  it('draws a jupiter-sized world clearly smaller than its host', () => {
    expect(displayRadius(11)).toBeLessThan(star * 0.35)
  })

  it('keeps even the largest planet below the smallest star', () => {
    expect(displayRadius(30)).toBeLessThan(starDisplayRadius(0.05))
  })

  it('keeps planets large enough to stay visible', () => {
    expect(displayRadius(1)).toBeGreaterThan(0.1)
  })
})

describe('orbitPosition', () => {
  const AXIS = new THREE.Vector3(1, 0, 0)
  const tilts = [-0.14, -0.09, -0.031, 0, 0.017, 0.062, 0.14]
  const radii = [5.5, 8.3, 20, 41.7]

  function ringWorldPoint(angle, radius, tilt) {
    return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
      .applyAxisAngle(AXIS, tilt)
  }

  it('sits on the tilted ring path at every angle and tilt', () => {
    for (const tilt of tilts) {
      for (const radius of radii) {
        for (let deg = 0; deg < 360; deg++) {
          const angle = (deg / 180) * Math.PI
          const p = orbitPosition(angle, radius, tilt)
          const expected = ringWorldPoint(angle, radius, tilt)
          const gap = Math.hypot(p.x - expected.x, p.y - expected.y, p.z - expected.z)
          expect(gap).toBeLessThan(1e-9)
        }
      }
    }
  })

  it('never strays from the ring by more than a hair over a full orbit', () => {
    for (const tilt of tilts) {
      let worst = 0
      for (let deg = 0; deg < 360; deg += 0.25) {
        const angle = (deg / 180) * Math.PI
        const p = orbitPosition(angle, 20, tilt)
        const e = ringWorldPoint(angle, 20, tilt)
        worst = Math.max(worst, Math.hypot(p.x - e.x, p.y - e.y, p.z - e.z))
      }
      expect(worst).toBeLessThan(1e-9)
    }
  })

  it('keeps the planet exactly one orbit radius from the star', () => {
    for (const tilt of tilts) {
      for (let deg = 0; deg < 360; deg += 3) {
        const p = orbitPosition((deg / 180) * Math.PI, 17.25, tilt)
        expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(17.25, 9)
      }
    }
  })

  it('stays in the tilted orbital plane', () => {
    for (const tilt of tilts) {
      const normal = new THREE.Vector3(0, 1, 0).applyAxisAngle(AXIS, tilt)
      for (let deg = 0; deg < 360; deg += 3) {
        const p = orbitPosition((deg / 180) * Math.PI, 12, tilt)
        expect(p.x * normal.x + p.y * normal.y + p.z * normal.z).toBeCloseTo(0, 9)
      }
    }
  })

  it('dips below the plane where a positive tilt lifts the far side', () => {
    expect(orbitPosition(Math.PI / 2, 20, 0.14).y).toBeLessThan(0)
    expect(orbitPosition(-Math.PI / 2, 20, 0.14).y).toBeGreaterThan(0)
    expect(orbitPosition(Math.PI / 2, 20, -0.14).y).toBeGreaterThan(0)
  })

  it('foreshortens depth by the cosine of the tilt', () => {
    const tilt = 0.14
    const p = orbitPosition(Math.PI / 2, 20, tilt)
    expect(Math.abs(p.z)).toBeLessThan(20)
    expect(p.z).toBeCloseTo(20 * Math.cos(tilt), 9)
  })

  it('lies flat in XZ when the orbit is untilted', () => {
    for (let deg = 0; deg < 360; deg += 7) {
      const angle = (deg / 180) * Math.PI
      const p = orbitPosition(angle, 9, 0)
      expect(p.y).toBeCloseTo(0, 12)
      expect(p.x).toBeCloseTo(Math.cos(angle) * 9, 9)
      expect(p.z).toBeCloseTo(Math.sin(angle) * 9, 9)
    }
  })
})
