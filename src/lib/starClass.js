import { fmtValue, fmtDistance } from './format.js'

const SEQUENCE = [
  { code: 'O', min: 30000, hue: 'Blue' },
  { code: 'B', min: 10000, hue: 'Blue-White' },
  { code: 'A', min: 7500, hue: 'White' },
  { code: 'F', min: 6000, hue: 'Yellow-White' },
  { code: 'G', min: 5200, hue: 'Yellow' },
  { code: 'K', min: 3700, hue: 'Orange' },
  { code: 'M', min: 0, hue: 'Red' }
]

export function spectralType(teff) {
  if (teff == null) return null
  return SEQUENCE.find(s => teff >= s.min).code
}

const SOLAR_TEFF = 5772

export function mainSequenceRadius(teff) {
  return Math.pow((teff ?? SOLAR_TEFF) / SOLAR_TEFF, 1.2)
}

export function luminosityClass(srad, teff = SOLAR_TEFF) {
  if (srad == null) return null
  if (srad < 0.05) return 'D'
  if (srad >= 200) return 'I'
  const ratio = srad / mainSequenceRadius(teff)
  if (srad >= 50 && ratio >= 5) return 'II'
  if (srad >= 2 && ratio >= 5) return 'III'
  if (ratio >= 1.7) return 'IV'
  return 'V'
}

function isPulsar(host) {
  return typeof host === 'string' && /^(PSR|SWIFT|XTE)\b/i.test(host.trim())
}

const KIND_BY_CLASS = {
  D: 'white-dwarf',
  I: 'supergiant',
  II: 'bright-giant',
  III: 'giant',
  IV: 'subgiant',
  V: 'main-sequence'
}

function nameFor(hue, lum) {
  const short = hue.split('-')[0]
  if (lum === 'D') return 'White Dwarf'
  if (lum === 'I') return `${short} Supergiant`
  if (lum === 'II') return `${short} Bright Giant`
  if (lum === 'III') return `${short} Giant`
  if (lum === 'IV') return `${hue} Subgiant`
  if (hue === 'Red' || hue === 'Orange' || hue === 'Yellow') return `${hue} Dwarf`
  return `${hue} Star`
}

export const STAR_CONTENT = {
  'main-O': {
    blurb: 'Above 30,000 K a star radiates almost everything it makes as ultraviolet. True O-type stars at this temperature are the rarest and heaviest on the main sequence, hundreds of thousands of times more luminous than the sun and finished inside a few million years. Most stars this hot that turn up holding planets are not those: they are stripped cores, subdwarfs and white dwarfs laid bare after a close companion pulled their outer layers away.',
    worlds: 'Planets here are inferred from shifts in the timing of the tight binary the star belongs to, and those results are still argued over. Nothing in such a system is untouched — whatever orbits now has already lived through the star swelling into a giant and then losing most of itself.'
  },
  'main-B': {
    blurb: 'Between 10,000 and 30,000 K, and two populations land in the same band. One is young, heavy B-type stars still wrapped in the gas they condensed out of. The other is hot subdwarfs: red giants whose envelopes were stripped by a close companion, leaving a core far hotter than the sun and a fraction of its size.',
    worlds: 'Around the young stars, ultraviolet boils off the planet-forming disk before it can finish assembling anything, so surviving disks are studied more often than the planets in them. Around the stripped cores, the few known worlds sit on orbits tight enough that they should have been swallowed during the giant phase, which is exactly what makes them interesting.'
  },
  'main-A': {
    blurb: 'A hot white star of 7,500 to 10,000 K and roughly one and a half to three solar radii. It burns bright and briefly, a few hundred million to about two billion years, and it spins fast enough that the spectral lines radial-velocity surveys rely on are smeared into uselessness.',
    worlds: 'That is why planets here are caught by transit or by direct imaging rather than by stellar wobble. The systems are young, many still carrying the debris disks they formed from, and they host the most extreme hot Jupiters on record: worlds whose daysides run hotter than the surface of a red dwarf.'
  },
  'main-F': {
    blurb: 'Hotter, heavier and brighter than the sun at 6,000 to 7,500 K, and correspondingly impatient. An F-type star spends its hydrogen in a few billion years rather than ten, and floods its system with far more ultraviolet than Earth has ever had to weather.',
    worlds: 'The habitable zone sits further out than the sun\'s, so a temperate world here takes longer than a year to come round. But everything in it is on a clock: Earth needed roughly four billion years to get from formation to complex life, which is longer than many stars of this class stay on the main sequence at all.'
  },
  'main-G': {
    blurb: 'The sun\'s own class. A yellow dwarf fuses hydrogen at 5,200 to 6,000 K, sits near one solar radius, and holds that state for something like ten billion years. The steadiness is the whole point: it leaves time for a planet to develop an atmosphere, an ocean and a biosphere without being sterilised halfway through.',
    worlds: 'The habitable zone falls near 1 AU, so a temperate world takes about a year to circle. These are the most common hosts in this catalog — not because they are the most common stars in the galaxy, they are not, but because the surveys that filled this archive were built to find another Earth and pointed at suns like ours.'
  },
  'main-K': {
    blurb: 'Smaller and cooler than the sun at 3,700 to 5,200 K, and far more frugal with fuel: an orange dwarf can hold the main sequence for tens of billions of years, longer than the universe has so far existed. It is also better behaved than a red dwarf, with weaker and rarer flares.',
    worlds: 'Its habitable zone lies closer in than the sun\'s, so a temperate world orbits in months rather than a year, close enough to be found readily by transit. Steady light, a mild temper and an enormous lifespan are why orange dwarfs are often argued to be the best places to go looking for life.'
  },
  'main-M': {
    blurb: 'The most numerous star in the galaxy and the faintest thing that still fuses hydrogen: under 3,700 K, usually less than half the sun\'s width, and so slow-burning that no red dwarf anywhere has yet died of old age. Their lifespans run into the trillions of years.',
    worlds: 'Because so little light comes out, the habitable zone is drawn in tight, often closer than Mercury orbits the sun. Worlds there finish a year in days or weeks and are likely tidally locked, one face in permanent daylight. Flares and X-ray output make the surface a rougher place than the equilibrium temperature alone would suggest.'
  },
  subgiant: {
    blurb: 'A star grown measurably larger than a main-sequence star of the same temperature. That is the first visible sign that core hydrogen is spent and fusion has moved out into a shell around a dead centre. The swelling continues for a few hundred million years before the star becomes a giant.',
    worlds: 'The habitable zone has already started sliding outward from where it sat when these planets formed, so inner worlds are heating past their best and outer ones may be thawing into a brief warm spell. A few of the coolest entries in this class are the reverse case: very young stars still contracting onto the main sequence, which read as oversized for their temperature for the same arithmetic reason.'
  },
  giant: {
    blurb: 'Core hydrogen ran out long ago. The envelope has swollen to several times the sun\'s width, often ten times and sometimes fifty, while the surface cooled as it spread, and the star now puts out tens to hundreds of times the light it once did. The sun will arrive here in about five billion years.',
    worlds: 'Expansion is fatal to anything close. Whatever orbited within a fraction of an AU has already been drawn into the envelope, and the survivors are being cooked at distances that used to be temperate. Giants are bright, slow-rotating and easy to measure by radial velocity, which is why so many of the heavy planets in this catalog were found around them.'
  },
  'bright-giant': {
    blurb: 'One rung above an ordinary giant: fifty to a few hundred solar radii and hundreds to thousands of times the sun\'s output, sitting near the top of the giant branch with a small fraction of its life left — millions of years, not billions. The largest host star in this catalog is one of these.',
    worlds: 'Anything that orbited inside roughly half an AU is gone, absorbed as the envelope grew out past it. What is left is usually a heavy planet on a wide orbit, and it is living on borrowed time: the star is close to shedding its outer layers altogether and leaving a white dwarf behind.'
  },
  supergiant: {
    blurb: 'The largest stars there are, two hundred to well over a thousand solar radii. Put Betelgeuse where the sun is and its surface would reach past the orbit of Mars. They are heavy, short-lived and end as supernovae.',
    worlds: 'No host in this catalog is one. The biggest star here is a bright giant, less than half the radius the class requires, so this is a label the classifier can produce rather than a place you will visit. A planet around a star like this would have to orbit far out indeed, since the star alone would fill the inner solar system.'
  },
  'white-dwarf': {
    blurb: 'The bare core left behind when a sun-like star sheds its outer layers: about the size of Earth while holding a large share of the sun\'s mass, dense enough that a teaspoon would weigh a couple of tonnes. Fusion has stopped for good. Everything it still radiates is leftover heat leaking away over billions of years, which is how a star can read 15,000 K here and remain almost invisible.',
    worlds: 'Any planet found around one is a survivor. Whatever orbited close was swallowed while the star was a giant, so these worlds either began far enough out or migrated inward after the fact. Most were caught in transit: a planet crossing a disc this small blocks nearly all of it, so the dip is impossible to miss once you are watching.'
  },
  'neutron-star': {
    blurb: 'The collapsed core a heavy star leaves after it explodes: about twenty kilometres across yet heavier than the sun, spinning up to hundreds of times a second and sweeping a beam of radio waves past us with every turn. The pulses arrive on such a strict schedule that a planet tugging the star around shows up as a drift in their timing, measurable down to microseconds.',
    worlds: 'That precision makes pulsars sensitive to far lighter planets than any other method can reach, and it is the only reason we know these worlds exist. It is a bleak place to be one. There is no starlight, only X-rays and a relativistic particle wind, and whatever is in orbit either came through the supernova or condensed afterwards out of the wreckage.'
  },
  'psr-b1257': {
    blurb: 'This is where the field began. In 1992 Aleksander Wolszczan and Dale Frail announced two planets around this millisecond pulsar, read out of millisecond-scale wobbles in the arrival time of its pulses; a third and much lighter world was confirmed in 1994. They were the first exoplanets ever confirmed, three years ahead of the first planet found around an ordinary star.',
    worlds: 'All three orbit within half an astronomical unit. Two are around four times the mass of Earth, and the third is about two hundredths of an Earth — heavier than the Moon by half, and still the lightest exoplanet on record. None of them can have formed the ordinary way. They were assembled after the supernova, out of what it left behind.'
  },
  unmeasured: {
    blurb: 'The temperature of this star is measured but its radius is not, so it cannot be placed on the luminosity ladder. From this data alone there is no separating an ordinary main-sequence star from one that has already begun to swell — the colour is real, the size is simply not known yet.',
    worlds: 'Temperature fixes the colour of the light but not how much of it there is, and quantity is what decides where the habitable zone falls. Until a radius is measured, the orbits in this system can be ranked against each other but not called warm or cold.'
  },
  unknown: {
    blurb: 'No temperature measurement exists for this star, so it cannot be placed on the spectral sequence at all. Nearly every host in this state was found by microlensing: the planet announced itself by briefly magnifying a background star, then the alignment passed and the host was never seen well enough to take a spectrum of.',
    worlds: 'The planet is no less real for it. Microlensing measures mass and orbital separation well, and it reaches cold, wide-orbit worlds at distances across the galaxy that no other method touches. What the star itself is remains an open question.'
  }
}

const HOST_CONTENT = {
  'psr b1257+12': 'psr-b1257'
}

function hostKey(host) {
  return typeof host === 'string' ? host.trim().toLowerCase() : null
}

function withContent(star, key) {
  return { ...star, contentKey: key, blurb: STAR_CONTENT[key].blurb, worlds: STAR_CONTENT[key].worlds }
}

export function classifyStar({ host, teff, srad, spectype } = {}) {
  const archiveType = spectype ?? null

  if (isPulsar(host)) {
    return withContent(
      { code: 'PSR', archiveType, label: 'Pulsar', kind: 'neutron-star' },
      HOST_CONTENT[hostKey(host)] ?? 'neutron-star'
    )
  }

  const type = spectralType(teff)
  if (type == null) {
    return withContent(
      { code: null, archiveType, label: 'Unsurveyed Star', kind: 'unknown' },
      'unknown'
    )
  }

  const hue = SEQUENCE.find(s => s.code === type).hue
  const lum = luminosityClass(srad, teff)
  if (lum == null) {
    return withContent(
      { code: type, archiveType, label: `${hue} Star`, kind: 'unknown' },
      'unmeasured'
    )
  }

  const kind = KIND_BY_CLASS[lum]
  return withContent(
    { code: `${type} ${lum}`, archiveType, label: nameFor(hue, lum), kind },
    lum === 'V' ? `main-${type}` : kind
  )
}

export function starStats(system) {
  const star = classifyStar(system)
  return [
    { label: 'CLASSIFICATION', value: star.label },
    { label: 'SPECTRAL CODE', value: star.code ?? 'UNSURVEYED' },
    { label: 'ARCHIVE TYPE', value: star.archiveType ?? 'UNSURVEYED' },
    { label: 'STAR TEMP', value: fmtValue(system.teff, 0, 'K') },
    { label: 'STAR RADIUS', value: fmtValue(system.srad, 2, 'R☉') },
    { label: 'DISTANCE', value: fmtDistance(system.dist) },
    { label: 'STARS IN SYSTEM', value: fmtValue(system.snum, 0) },
    { label: 'WORLDS', value: String(system.planets?.length ?? 0) }
  ]
}
