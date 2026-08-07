import { classifyPlanet, classInfo } from './classify.js'

function num(value, digits = 1) {
  if (value == null) return 'unknown'
  return Number(value).toFixed(digits).replace(/\.0$/, '')
}

function text(value) {
  return value == null || value === '' ? 'unknown' : String(value)
}

function resolveClass(p) {
  return p.cls ?? classifyPlanet(p)
}

const HAZARDS = {
  'temperate-rocky': 'Surface conditions fall inside the liquid-water band, but atmospheric composition remains unverified. Treat all biosignature readings as unconfirmed.',
  'lava': 'Dayside surface is molten silicate. Hull ablation guaranteed below 200 km altitude. Do not attempt descent.',
  'frozen-rocky': 'Surface locked in deep cryogenic stasis. Landing gear icing and brittle-fracture risk on all exposed alloys.',
  'hot-rocky': 'Surface temperatures exceed habitability margins. Expect degraded sensor performance and rapid coolant depletion.',
  'sub-neptune': 'Dense haze layers obscure the surface, if any exists. Atmospheric probes report crushing pressure gradients.',
  'neptunian': 'Supersonic wind belts and methane storm cells detected. Orbital survey only.',
  'gas-giant': 'Gravity well and radiation belts hostile to all crewed operations. Magnetosphere interferes with navigation arrays.',
  'unsurveyed': 'Insufficient telemetry. This world has never been fully characterized. Approach with maximum caution.'
}

const RECOMMENDATIONS = {
  'temperate-rocky': 'RESEARCH PRIORITY ALPHA — flag for long-range habitability survey.',
  'lava': 'AVOID — catalog for mineral spectrometry at safe distance.',
  'frozen-rocky': 'RESEARCH — candidate for subsurface ocean sounding.',
  'hot-rocky': 'RESEARCH — geological interest only. Colonization not viable.',
  'sub-neptune': 'RESEARCH — atmospheric composition study recommended.',
  'neptunian': 'RESEARCH — suitable for automated atmospheric skimmers.',
  'gas-giant': 'RESEARCH — moon system reconnaissance advised.',
  'unsurveyed': 'FURTHER OBSERVATION REQUIRED — telemetry insufficient for classification.'
}

export function templateReport(p) {
  const cls = resolveClass(p)
  const info = classInfo(cls)
  const lines = [
    `SURVEY LOG — DSV MERIDIAN`,
    `DESIGNATION: ${p.name}`,
    `CLASSIFICATION: ${info.label}`,
    ``,
    `Orbital reconnaissance complete. Target spans ${num(p.rade, 2)} Earth radii at ${num(p.masse, 1)} Earth masses, holding an equilibrium temperature of ${num(p.eqt, 0)} K.`,
    `Primary star: ${text(p.spectype)} class, ${num(p.teff, 0)} K, at ${num(p.dist, 1)} parsecs from Sol.`,
    `Orbital period ${num(p.period, 1)} days${p.smax == null ? ', semi-major axis not resolved' : ` at ${num(p.smax, 3)} AU`}.`,
    `First catalogued in ${text(p.discYear)} via ${text(p.discMethod).toLowerCase()} detection.`,
    ``,
    `HAZARD ADVISORY: ${HAZARDS[cls]}`,
    ``,
    `RECOMMENDATION: ${RECOMMENDATIONS[cls]}`
  ]
  return lines.join('\n')
}

export function buildSurveyPrompt(p) {
  const cls = resolveClass(p)
  const info = classInfo(cls)
  const data = [
    `name: ${text(p.name)}`,
    `classification: ${info.label}`,
    `radius: ${num(p.rade, 2)} Earth radii`,
    `mass: ${num(p.masse, 1)} Earth masses`,
    `equilibrium temperature: ${num(p.eqt, 0)} K`,
    `orbital period: ${num(p.period, 1)} days`,
    `semi-major axis: ${num(p.smax, 3)} AU`,
    `host star: ${text(p.host)}, spectral type ${text(p.spectype)}, ${num(p.teff, 0)} K`,
    `stars in system: ${text(p.snum)}`,
    `distance from Earth: ${num(p.dist, 1)} parsecs`,
    `discovered: ${text(p.discYear)} via ${text(p.discMethod)}`
  ].join('\n')
  return `You are the survey AI of the deep-space exploration vessel Meridian. Write a short planetary survey report (150-200 words) for the following real exoplanet. Use its actual data. Style: atmospheric sci-fi expedition log, evocative but scientifically grounded. Include the designation, classification, one striking physical fact, one hazard or anomaly, and a closing recommendation line (colonization / research / avoid). Where a value is unknown, treat it as a gap in the survey data rather than inventing numbers.\n\nData:\n${data}`
}
