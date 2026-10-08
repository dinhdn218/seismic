import type { QuakeFeed } from '../domain/quake'
import { parseFeed } from './parse'
import type { FeedWindow } from './client'
import { FEED_WINDOWS } from './client'

/**
 * Offline fallback.
 *
 * A portfolio piece that renders an error screen whenever USGS is slow is a
 * worse demonstration than one that degrades. If the live request fails, this
 * snapshot is loaded instead and the UI labels itself clearly as cached.
 *
 * It goes through `parseFeed` like any live response — a fixture that bypasses
 * the parser tests nothing. It is also loaded on demand, so the 1.2 MB of
 * GeoJSON never lands in the main bundle.
 */

let cached: Promise<unknown> | null = null

function load(): Promise<unknown> {
  cached ??= import('./snapshot.json').then((module) => module.default)
  return cached
}

export async function fetchSnapshot(window: FeedWindow): Promise<QuakeFeed> {
  const raw = await load()
  const now = Date.now()

  // Timestamps are stored as "milliseconds before generation" so the snapshot
  // still reads as recent however long after the build it is served.
  const rebased = {
    ...(raw as Record<string, unknown>),
    features: ((raw as { features: unknown[] }).features as {
      properties: { time: number; updated: number }
    }[])
      .map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          time: now - feature.properties.time,
          updated: now - feature.properties.updated,
        },
      }))
      .filter((feature) => now - feature.properties.time <= FEED_WINDOWS[window].spanMs),
  }

  return parseFeed(rebased)
}
