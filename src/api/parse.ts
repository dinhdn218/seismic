import type { Quake, QuakeFeed } from '../domain/quake'
import type { WireFeature, WireFeed } from './wire'

/**
 * Parse at the boundary, once.
 *
 * The feed is public, unversioned and occasionally ships events with a null
 * magnitude or a missing geometry. Rather than let `undefined` leak into the
 * render tree, every event is validated here and anything malformed is counted
 * and dropped — the count is shown in the UI so silent data loss stays visible.
 */

export class FeedFormatError extends Error {
  override readonly name = 'FeedFormatError'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseFeature(raw: unknown): Quake | null {
  if (!isRecord(raw)) return null

  const feature = raw as unknown as WireFeature
  const props = feature.properties
  if (!isRecord(props)) return null

  const id = typeof feature.id === 'string' && feature.id.length > 0 ? feature.id : null
  const magnitude = finiteNumber(props.mag)
  const time = finiteNumber(props.time)

  // An event without an id, a magnitude or a timestamp cannot be placed on the
  // trace or keyed in a list, so there is nothing useful to render.
  if (id === null || magnitude === null || time === null) return null

  const coords = feature.geometry?.coordinates
  const longitude = Array.isArray(coords) ? finiteNumber(coords[0]) : null
  const latitude = Array.isArray(coords) ? finiteNumber(coords[1]) : null
  const depthKm = Array.isArray(coords) ? finiteNumber(coords[2]) : null

  if (longitude === null || latitude === null || depthKm === null) return null

  return {
    id,
    magnitude,
    magnitudeType: typeof props.magType === 'string' ? props.magType.toLowerCase() : 'unknown',
    place: typeof props.place === 'string' && props.place.length > 0 ? props.place : 'Location pending',
    time: new Date(time),
    depthKm,
    longitude,
    latitude,
    significance: finiteNumber(props.sig) ?? 0,
    tsunamiWarning: props.tsunami === 1,
    feltReports: finiteNumber(props.felt),
    reviewed: props.status === 'reviewed',
    url: typeof props.url === 'string' ? props.url : 'https://earthquake.usgs.gov',
  }
}

export function parseFeed(raw: unknown): QuakeFeed {
  if (!isRecord(raw)) {
    throw new FeedFormatError('The feed did not return an object.')
  }

  const feed = raw as unknown as WireFeed
  if (!Array.isArray(feed.features)) {
    throw new FeedFormatError('The feed is missing its features array.')
  }

  const quakes: Quake[] = []
  let skipped = 0

  for (const feature of feed.features) {
    const parsed = parseFeature(feature)
    if (parsed === null) skipped += 1
    else quakes.push(parsed)
  }

  const generated = isRecord(feed.metadata) ? finiteNumber(feed.metadata.generated) : null

  return {
    quakes,
    generatedAt: generated === null ? new Date() : new Date(generated),
    skipped,
  }
}
