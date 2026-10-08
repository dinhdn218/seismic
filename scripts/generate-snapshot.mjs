// Generates a statistically plausible week of seismicity for the offline
// fallback: magnitudes follow Gutenberg-Richter (b ~= 1), and regions are
// weighted by how much they actually dominate the USGS feed.
//
//   node scripts/generate-snapshot.mjs
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REGIONS = [
  { weight: 26, net: 'ak', area: 'Alaska', anchors: ['Sand Point', 'Chignik', 'Adak', 'Cantwell', 'Susitna North', 'Nikiski', 'Skwentna'], lat: [52, 66], lon: [-168, -138], depth: [3, 120] },
  { weight: 22, net: 'ci', area: 'CA', anchors: ['Ridgecrest', 'Searles Valley', 'Barstow', 'Anza', 'Borrego Springs', 'Coso Junction', 'Trona'], lat: [32, 38], lon: [-122, -115], depth: [2, 18] },
  { weight: 12, net: 'nc', area: 'CA', anchors: ['The Geysers', 'Cobb', 'Hollister', 'Petrolia', 'Mammoth Lakes', 'Pinnacles'], lat: [36, 41], lon: [-124, -118], depth: [1, 14] },
  { weight: 9, net: 'hv', area: 'Hawaii', anchors: ['Pahala', 'Volcano', 'Fern Forest', 'Naalehu', 'Honaunau-Napoopoo'], lat: [18.9, 20.3], lon: [-156.2, -154.8], depth: [2, 40] },
  { weight: 7, net: 'nn', area: 'Nevada', anchors: ['Mina', 'Hawthorne', 'Goldfield', 'Beatty', 'Tonopah'], lat: [35, 41], lon: [-120, -114], depth: [3, 16] },
  { weight: 6, net: 'pr', area: 'Puerto Rico', anchors: ['Indios', 'Guanica', 'Tallaboa', 'Esperanza', 'Yauco'], lat: [17.6, 18.6], lon: [-67.5, -65.2], depth: [5, 30] },
  { weight: 2.6, net: 'us', area: 'Papua New Guinea', anchors: ['Kokopo', 'Kimbe', 'Lorengau', 'Rabaul', 'Madang'], lat: [-8, -2], lon: [145, 153], depth: [20, 220] },
  { weight: 2.2, net: 'us', area: 'Indonesia', anchors: ['Ternate', 'Bitung', 'Tual', 'Palu', 'Luwuk'], lat: [-8, 4], lon: [118, 136], depth: [15, 180] },
  { weight: 1.8, net: 'us', area: 'Chile', anchors: ['Calama', 'Ovalle', 'Coquimbo', 'San Antonio', 'Iquique'], lat: [-34, -18], lon: [-72, -68], depth: [20, 130] },
  { weight: 1.8, net: 'us', area: 'Japan', anchors: ['Hasaki', 'Ishinomaki', 'Nemuro', 'Katsuura', 'Miyako'], lat: [31, 44], lon: [136, 148], depth: [25, 160] },
  { weight: 3, net: 'uu', area: 'Utah', anchors: ['Magna', 'Salina', 'Delta', 'Alta', 'Clawson'], lat: [37, 42], lon: [-114, -109], depth: [2, 14] },
]

const BEARINGS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const TOTAL_WEIGHT = REGIONS.reduce((sum, r) => sum + r.weight, 0)

// Deterministic PRNG, so regenerating the snapshot gives a stable diff.
let seed = 0x5eed1e
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 0x100000000
}
const between = ([lo, hi]) => lo + rand() * (hi - lo)
const pick = (xs) => xs[Math.floor(rand() * xs.length)]

function pickRegion() {
  let roll = rand() * TOTAL_WEIGHT
  for (const region of REGIONS) {
    roll -= region.weight
    if (roll <= 0) return region
  }
  return REGIONS[0]
}

// Gutenberg-Richter: events at or above M fall off ~10x per whole step, which
// is why a real trace is mostly short strokes with a handful of tall ones.
//
// The real feed is a mixed catalogue, and modelling it as one distribution is
// what makes synthetic seismicity look wrong. Regional networks resolve down to
// M0.4 but only inside their own footprint; the global network only publishes
// teleseismic events from about M4. Two detection thresholds, two samples.
function magnitude(isGlobal) {
  const floor = isGlobal ? 4 : 1
  const ceiling = isGlobal ? 7.4 : 5.4
  const b = isGlobal ? 1.02 : 0.9
  return Math.min(floor - Math.log10(1 - rand()) / b, ceiling)
}

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const COUNT = 1850
const now = Date.now()

const features = []
for (let i = 0; i < COUNT; i += 1) {
  const region = pickRegion()
  const isLocal = region.net !== 'us'
  const mag = Math.round(magnitude(!isLocal) * 10) / 10
  const time = now - Math.floor(rand() * WINDOW_MS)
  const place = `${Math.round(between([2, 160]))} km ${pick(BEARINGS)} of ${pick(region.anchors)}, ${region.area}`

  features.push({
    type: 'Feature',
    id: `${region.net}${80000000 + i * 137}`,
    properties: {
      mag,
      place,
      // Stored as an offset from generation time; the loader rebases these so
      // the snapshot still reads as "recent" months after the build.
      time,
      updated: time + Math.floor(rand() * 600000),
      tz: null,
      url: 'https://earthquake.usgs.gov/earthquakes/map/',
      detail: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/',
      felt: mag > 3.4 && rand() > 0.55 ? Math.floor(rand() * 420) + 1 : null,
      cdi: null,
      mmi: null,
      alert: null,
      status: rand() > 0.72 ? 'reviewed' : 'automatic',
      tsunami: mag >= 6.3 && rand() > 0.6 ? 1 : 0,
      sig: Math.round(mag * mag * 24),
      net: region.net,
      code: String(80000000 + i * 137),
      ids: '',
      sources: `,${region.net},`,
      types: ',origin,phase-data,',
      nst: Math.floor(between([6, 90])),
      dmin: Math.round(between([0.01, 3]) * 1000) / 1000,
      rms: Math.round(between([0.05, 0.9]) * 100) / 100,
      gap: Math.round(between([25, 260])),
      magType: isLocal ? (region.net === 'hv' ? 'md' : 'ml') : mag >= 4.6 ? 'mww' : 'mb',
      type: 'earthquake',
      title: `M ${mag.toFixed(1)} - ${place}`,
    },
    geometry: {
      type: 'Point',
      coordinates: [
        Math.round(between(region.lon) * 10000) / 10000,
        Math.round(between(region.lat) * 10000) / 10000,
        Math.round(between(region.depth) * 10) / 10,
      ],
    },
  })
}

features.sort((a, b) => b.properties.time - a.properties.time)

// Rewrite absolute times as "milliseconds before generation" so the loader can
// rebase them onto the current clock.
for (const feature of features) {
  feature.properties.time = now - feature.properties.time
  feature.properties.updated = now - feature.properties.updated
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'api', 'snapshot.json')
writeFileSync(out, JSON.stringify({
  type: 'FeatureCollection',
  metadata: {
    generated: 0,
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
    title: 'USGS All Earthquakes, Past Week',
    status: 200,
    api: '1.10.3',
    count: features.length,
  },
  features,
}))

const max = Math.max(...features.map((f) => f.properties.mag))
console.log(`Wrote ${features.length} events (max M${max.toFixed(1)}) to ${out}`)
