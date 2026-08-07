export const STAR_BASE = 1.5
export const STAR_MIN = 0.9
export const STAR_MAX = 4.2

export function orbitRadius(smax, index, base = 5.5, step = 3) {
  if (smax == null || smax <= 0) return base + step * (index + 1)
  return base + step * Math.log10(1 + smax * 100)
}

export function orbitSpeed(period, k = 20) {
  if (period == null || period <= 0) return 0.1
  return Math.min(2, k / period)
}

export function displayRadius(rade) {
  if (rade == null) return 0.16
  return 0.09 * (1 + Math.log2(1 + rade))
}

export function starDisplayRadius(srad) {
  if (srad == null || srad <= 0) return STAR_BASE
  return Math.max(STAR_MIN, Math.min(STAR_MAX, STAR_BASE * Math.cbrt(srad)))
}
