export const STAR_BASE = 1.5
export const STAR_MIN = 0.9
export const STAR_MAX = 4.2

export function orbitRadius(smax, index, base = 5.5, step = 3) {
  if (smax == null || smax <= 0) return base + step * (index + 1)
  return base + step * Math.log10(1 + smax * 100)
}

export const FAST_ORBIT_SECONDS = 9
export const SLOW_ORBIT_SECONDS = 80
export const SHORT_PERIOD_DAYS = 0.5
export const LONG_PERIOD_DAYS = 10000

export function orbitSpeed(period) {
  const seconds = orbitSeconds(period)
  return (Math.PI * 2) / seconds
}

export function orbitSeconds(period) {
  if (period == null || period <= 0) {
    return (FAST_ORBIT_SECONDS + SLOW_ORBIT_SECONDS) / 2
  }
  const clamped = Math.min(LONG_PERIOD_DAYS, Math.max(SHORT_PERIOD_DAYS, period))
  const t = Math.log(clamped / SHORT_PERIOD_DAYS) / Math.log(LONG_PERIOD_DAYS / SHORT_PERIOD_DAYS)
  return FAST_ORBIT_SECONDS + t * (SLOW_ORBIT_SECONDS - FAST_ORBIT_SECONDS)
}

export function displayRadius(rade) {
  if (rade == null) return 0.16
  return 0.09 * (1 + Math.log2(1 + rade))
}

export function starDisplayRadius(srad) {
  if (srad == null || srad <= 0) return STAR_BASE
  return Math.max(STAR_MIN, Math.min(STAR_MAX, STAR_BASE * Math.cbrt(srad)))
}

export function orbitPosition(angle, radius, tilt) {
  const x = Math.cos(angle) * radius
  const zf = Math.sin(angle) * radius
  return { x, y: -zf * Math.sin(tilt), z: zf * Math.cos(tilt) }
}
