import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { adaptRows } from '../src/lib/pipeline.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const FIELDS = 'pl_name,hostname,ra,dec,sy_dist,pl_rade,pl_bmasse,pl_eqt,pl_orbper,pl_orbsmax,st_teff,st_rad,st_spectype,sy_snum,sy_pnum,disc_year,discoverymethod'
const QUERY = `select ${FIELDS} from pscomppars where ra is not null and dec is not null and sy_dist is not null`
const URL = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(QUERY)}&format=json`

console.log('Querying NASA Exoplanet Archive...')
const res = await fetch(URL)
if (!res.ok) {
  throw new Error(`NASA TAP request failed: ${res.status} ${res.statusText}`)
}
const rows = await res.json()
console.log(`Received ${rows.length} rows`)

const usable = adaptRows(rows)
console.log(`${usable.length} rows have usable sky coordinates`)

const outDir = join(root, 'public', 'data')
await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, 'exoplanets.json'), JSON.stringify(rows))
console.log('Saved raw archive rows to public/data/exoplanets.json')
console.log('The app derives positions, classes, and star colors at load time.')
