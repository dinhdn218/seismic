import type { QuakeFeed } from '../domain/quake'
import { FeedFormatError, parseFeed } from './parse'

export const FEED_WINDOWS = {
  hour: { label: 'Past hour', path: 'all_hour', spanMs: 60 * 60 * 1000 },
  day: { label: 'Past day', path: 'all_day', spanMs: 24 * 60 * 60 * 1000 },
  week: { label: 'Past week', path: 'all_week', spanMs: 7 * 24 * 60 * 60 * 1000 },
} as const

export type FeedWindow = keyof typeof FEED_WINDOWS

const BASE = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary'
const TIMEOUT_MS = 12_000

/**
 * One error type per thing the user can actually do about it. "Something went
 * wrong" tells a person nothing; "the feed is unreachable, retrying in 30s"
 * tells them whether to wait or to go and look at the USGS status page.
 */
export type FeedErrorKind = 'offline' | 'timeout' | 'server' | 'malformed'

export class FeedError extends Error {
  override readonly name = 'FeedError'
  readonly kind: FeedErrorKind

  constructor(kind: FeedErrorKind, message: string, options?: { cause: unknown }) {
    super(message, options)
    this.kind = kind
  }
}

export const FEED_ERROR_COPY: Record<FeedErrorKind, { headline: string; detail: string }> = {
  offline: {
    headline: 'Cannot reach the USGS feed',
    detail: 'Check your connection. The last readings below are still on screen.',
  },
  timeout: {
    headline: 'The feed took too long to answer',
    detail: 'USGS is slow or unreachable right now. Retrying will usually clear it.',
  },
  server: {
    headline: 'USGS returned an error',
    detail: 'The service is having trouble. This normally resolves within a few minutes.',
  },
  malformed: {
    headline: 'The feed sent something unexpected',
    detail: 'The response did not match the published GeoJSON schema and was rejected.',
  },
}

export async function fetchFeed(window: FeedWindow, signal?: AbortSignal): Promise<QuakeFeed> {
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS)

  // Caller cancellation and our own timeout are separate concerns, so they get
  // separate controllers and are combined rather than conflated.
  const signals = signal ? [signal, timeout.signal] : [timeout.signal]

  try {
    const response = await fetch(`${BASE}/${FEED_WINDOWS[window].path}.geojson`, {
      signal: AbortSignal.any(signals),
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new FeedError('server', `The feed responded with ${response.status}.`)
    }

    return parseFeed(await response.json())
  } catch (cause) {
    if (cause instanceof FeedError) throw cause
    if (cause instanceof FeedFormatError) {
      throw new FeedError('malformed', cause.message, { cause })
    }
    // The caller aborted deliberately; let that propagate untouched.
    if (signal?.aborted) throw cause
    if (timeout.signal.aborted) {
      throw new FeedError('timeout', `No response within ${TIMEOUT_MS / 1000}s.`, { cause })
    }
    throw new FeedError('offline', 'The request never left the browser.', { cause })
  } finally {
    clearTimeout(timer)
  }
}
