import { raDecToXYZ } from './coords.js'
import { classifyPlanet } from './classify.js'
import { teffToColor } from './starColor.js'

export function cleanRows(rows) {
  return rows.filter(r => r.pl_name != null && r.ra != null && r.dec != null && r.sy_dist != null)
}

export function deriveRow(r) {
  const planet = {
    name: r.pl_name,
    host: r.hostname ?? null,
    ra: r.ra,
    dec: r.dec,
    dist: r.sy_dist,
    rade: r.pl_rade ?? null,
    masse: r.pl_bmasse ?? null,
    eqt: r.pl_eqt ?? null,
    period: r.pl_orbper ?? null,
    smax: r.pl_orbsmax ?? null,
    teff: r.st_teff ?? null,
    srad: r.st_rad ?? null,
    spectype: r.st_spectype ?? null,
    snum: r.sy_snum ?? null,
    pnum: r.sy_pnum ?? null,
    discYear: r.disc_year ?? null,
    discMethod: r.discoverymethod ?? null
  }
  const pos = raDecToXYZ(planet.ra, planet.dec, planet.dist)
  planet.x = pos.x
  planet.y = pos.y
  planet.z = pos.z
  planet.cls = classifyPlanet(planet)
  planet.starColor = teffToColor(planet.teff)
  return planet
}

export function buildSnapshot(rows) {
  return cleanRows(rows).map(deriveRow)
}

export function isRawArchiveRow(row) {
  return 'pl_name' in row || 'hostname' in row
}

function fromDerived(row) {
  return deriveRow({
    pl_name: row.name,
    hostname: row.host,
    ra: row.ra,
    dec: row.dec,
    sy_dist: row.dist,
    pl_rade: row.rade,
    pl_bmasse: row.masse,
    pl_eqt: row.eqt,
    pl_orbper: row.period,
    pl_orbsmax: row.smax,
    st_teff: row.teff,
    st_rad: row.srad,
    st_spectype: row.spectype,
    sy_snum: row.snum,
    sy_pnum: row.pnum,
    disc_year: row.discYear,
    discoverymethod: row.discMethod
  })
}

export function adaptRows(rows) {
  if (!Array.isArray(rows)) {
    throw new Error('exoplanet data must be a JSON array of rows')
  }
  if (rows.length === 0) return []
  if (isRawArchiveRow(rows[0])) return buildSnapshot(rows)
  if ('name' in rows[0]) {
    const ready = rows.every(r => typeof r.x === 'number' && r.cls != null && r.starColor != null)
    if (ready) return rows
    return rows.filter(r => r.ra != null && r.dec != null && r.dist != null).map(fromDerived)
  }
  throw new Error('unrecognized exoplanet row shape: expected NASA archive columns such as pl_name')
}

export function groupSystems(planets) {
  const map = new Map()
  for (const p of planets) {
    let system = map.get(p.host)
    if (!system) {
      system = {
        host: p.host,
        x: p.x,
        y: p.y,
        z: p.z,
        dist: p.dist,
        teff: p.teff,
        srad: p.srad,
        spectype: p.spectype,
        snum: p.snum,
        starColor: p.starColor,
        planets: []
      }
      map.set(p.host, system)
    }
    system.planets.push(p)
  }
  return [...map.values()]
}
