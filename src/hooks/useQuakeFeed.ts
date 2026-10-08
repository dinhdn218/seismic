import { useCallback, useEffect, useRef, useState } from 'react'
import type { QuakeFeed } from '../domain/quake'
import type { FeedWindow } from '../api/client'
import { FeedError, fetchFeed } from '../api/client'
import { fetchSnapshot } from '../api/snapshot'

export const REFRESH_INTERVAL_MS = 60_000

export type FeedSource = 'live' | 'snapshot'

export interface FeedState {
  feed: QuakeFeed | null
  source: FeedSource
  /** Only true on the very first load; a background refresh must not blank the screen. */
  loading: boolean
  refreshing: boolean
  error: FeedError | null
  lastUpdated: Date | null
}

export function useQuakeFeed(window: FeedWindow) {
  const [state, setState] = useState<FeedState>({
    feed: null,
    source: 'live',
    loading: true,
    refreshing: false,
    error: null,
    lastUpdated: null,
  })

  const inflight = useRef<AbortController | null>(null)
  // Read inside the effect without making the effect depend on the data it sets.
  const hasData = useRef(false)

  const run = useCallback(
    async (target: FeedWindow) => {
      inflight.current?.abort()
      const controller = new AbortController()
      inflight.current = controller

      setState((prev) => ({
        ...prev,
        loading: !hasData.current,
        refreshing: hasData.current,
      }))

      try {
        const feed = await fetchFeed(target, controller.signal)
        if (controller.signal.aborted) return
        hasData.current = true
        setState({
          feed,
          source: 'live',
          loading: false,
          refreshing: false,
          error: null,
          lastUpdated: new Date(),
        })
      } catch (cause) {
        if (controller.signal.aborted) return
        const error = cause instanceof FeedError ? cause : new FeedError('offline', 'The request failed.', { cause })

        // Keep whatever is already on screen; only reach for the snapshot when
        // there is nothing to show at all.
        if (hasData.current) {
          setState((prev) => ({ ...prev, loading: false, refreshing: false, error }))
          return
        }

        try {
          const feed = await fetchSnapshot(target)
          if (controller.signal.aborted) return
          hasData.current = true
          setState({
            feed,
            source: 'snapshot',
            loading: false,
            refreshing: false,
            error,
            lastUpdated: new Date(),
          })
        } catch {
          if (controller.signal.aborted) return
          setState((prev) => ({ ...prev, loading: false, refreshing: false, error }))
        }
      }
    },
    [],
  )

  useEffect(() => {
    hasData.current = false
    void run(window)
    const timer = setInterval(() => void run(window), REFRESH_INTERVAL_MS)
    return () => {
      clearInterval(timer)
      inflight.current?.abort()
    }
  }, [window, run])

  const refresh = useCallback(() => void run(window), [run, window])

  return { ...state, refresh }
}
