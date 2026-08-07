const UNKNOWN = '#c0c8d8'

function clamp(x) {
  return Math.max(0, Math.min(255, x))
}

export function teffToRgb(teff) {
  const kelvin = Math.max(1000, Math.min(40000, Number(teff) || 1000))
  const t = kelvin / 100

  let r
  if (t <= 66) r = 255
  else r = 329.698727446 * Math.pow(t - 60, -0.1332047592)

  let g
  if (t <= 66) g = 99.4708025861 * Math.log(t) - 161.1195681661
  else g = 288.1221695283 * Math.pow(t - 60, -0.0755148492)

  let b
  if (t >= 66) b = 255
  else if (t <= 19) b = 0
  else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307

  const lift = 30
  return [
    clamp(r * 0.88 + lift),
    clamp(g * 0.88 + lift),
    clamp(b * 0.88 + lift)
  ].map(Math.round)
}

export function teffToColor(teff) {
  if (teff == null) return UNKNOWN
  const hex = teffToRgb(teff).map(c => c.toString(16).padStart(2, '0')).join('')
  return `#${hex}`
}
