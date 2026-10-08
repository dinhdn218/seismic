/**
 * Domain types. Deliberately narrower than the wire format: the UI should never
 * have to reason about USGS's nullable fields, comma-wrapped id strings, or the
 * fact that depth arrives as the third element of a coordinate tuple.
 */

export type MagnitudeBand = 'micro' | 'minor' | 'light' | 'moderate' | 'strong'

export interface Quake {
  readonly id: string
  /** Moment magnitude. Logarithmic: each whole step is ~32x the energy. */
  readonly magnitude: number
  /** The scale actually used for this reading (ml, mb, mww, ...). */
  readonly magnitudeType: string
  readonly place: string
  readonly time: Date
  readonly depthKm: number
  readonly longitude: number
  readonly latitude: number
  /** USGS significance score, 0–1000. Weighs magnitude, felt reports and damage. */
  readonly significance: number
  readonly tsunamiWarning: boolean
  /** Number of people who filed a "did you feel it" report. */
  readonly feltReports: number | null
  readonly reviewed: boolean
  readonly url: string
}

export interface QuakeFeed {
  readonly quakes: readonly Quake[]
  readonly generatedAt: Date
  /** Events the parser rejected. Surfaced rather than silently dropped. */
  readonly skipped: number
}

export const MAGNITUDE_BANDS: readonly {
  band: MagnitudeBand
  floor: number
  label: string
  /** What a person at the epicentre would actually notice. */
  felt: string
}[] = [
  { band: 'strong', floor: 6, label: 'Strong', felt: 'Serious damage near the epicentre' },
  { band: 'moderate', floor: 5, label: 'Moderate', felt: 'Shakes buildings, damages weak structures' },
  { band: 'light', floor: 4, label: 'Light', felt: 'Noticeable indoors, rattles windows' },
  { band: 'minor', floor: 2, label: 'Minor', felt: 'Often felt, rarely causes damage' },
  { band: 'micro', floor: -Infinity, label: 'Micro', felt: 'Recorded by instruments, not felt' },
]

export function bandFor(magnitude: number): MagnitudeBand {
  for (const entry of MAGNITUDE_BANDS) {
    if (magnitude >= entry.floor) return entry.band
  }
  return 'micro'
}

export function bandMeta(band: MagnitudeBand) {
  const found = MAGNITUDE_BANDS.find((entry) => entry.band === band)
  // MAGNITUDE_BANDS covers every member of the union, so this is unreachable.
  if (!found) throw new Error(`Unknown magnitude band: ${band}`)
  return found
}

export const BAND_COLOR: Record<MagnitudeBand, string> = {
  micro: 'var(--color-mag-micro)',
  minor: 'var(--color-mag-minor)',
  light: 'var(--color-mag-light)',
  moderate: 'var(--color-mag-moderate)',
  strong: 'var(--color-mag-strong)',
}
