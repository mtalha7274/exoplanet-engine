export function fmtValue(value, digits = 1, unit = '') {
  if (value == null) return 'UNSURVEYED'
  const rounded = Number(Number(value).toFixed(digits))
  const text = rounded.toLocaleString('en-US', { maximumFractionDigits: digits })
  return unit ? `${text} ${unit}` : text
}

const LY_PER_PARSEC = 3.26156

export function lightYears(parsecs) {
  if (parsecs == null) return null
  return parsecs * LY_PER_PARSEC
}

export function fmtDistance(parsecs) {
  if (parsecs == null) return 'UNSURVEYED'
  return `${fmtValue(lightYears(parsecs), 1, 'ly')} · ${fmtValue(parsecs, 1, 'pc')}`
}

export function planetStats(p) {
  const discovery = p.discYear == null
    ? 'UNSURVEYED'
    : `${p.discYear}${p.discMethod ? ` · ${p.discMethod}` : ''}`
  return [
    { label: 'RADIUS', value: fmtValue(p.rade, 2, 'R⊕') },
    { label: 'MASS', value: fmtValue(p.masse, 2, 'M⊕') },
    { label: 'EQ. TEMP', value: fmtValue(p.eqt, 0, 'K') },
    { label: 'ORBITAL PERIOD', value: fmtValue(p.period, 2, 'days') },
    { label: 'SEMI-MAJOR AXIS', value: fmtValue(p.smax, 3, 'AU') },
    { label: 'DISTANCE', value: fmtDistance(p.dist) },
    { label: 'DISCOVERED', value: discovery }
  ]
}

function worldCount(s) {
  const held = s.planets.length
  if (s.pnum != null && s.pnum !== held) return `${held} of ${s.pnum}`
  return String(held)
}

export function systemStats(s) {
  return [
    { label: 'SPECTRAL TYPE', value: s.spectype ?? 'UNSURVEYED' },
    { label: 'STAR TEMP', value: fmtValue(s.teff, 0, 'K') },
    { label: 'STAR RADIUS', value: fmtValue(s.srad, 2, 'R☉') },
    { label: 'DISTANCE', value: fmtDistance(s.dist) },
    { label: 'STARS', value: fmtValue(s.snum, 0) },
    { label: 'WORLDS', value: worldCount(s) }
  ]
}
