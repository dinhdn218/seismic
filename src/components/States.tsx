import type { FeedError } from '../api/client'
import { FEED_ERROR_COPY } from '../api/client'
import type { FeedSource } from '../hooks/useQuakeFeed'

export function Skeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading the latest readings.</p>
      <div className="h-[168px] animate-pulse border-y border-rule bg-paper-raised" />
      <div className="flex divide-x divide-rule border-b border-rule">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="grow basis-40 px-4 py-4">
            <div className="h-2 w-16 animate-pulse bg-rule" />
            <div className="mt-2 h-5 w-12 animate-pulse bg-rule" />
          </div>
        ))}
      </div>
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 border-b border-rule px-4 py-3">
          <div className="h-3 w-8 animate-pulse bg-rule" />
          <div className="h-3 animate-pulse bg-rule" style={{ width: `${30 + ((index * 13) % 40)}%` }} />
          <div className="ml-auto h-3 w-12 animate-pulse bg-rule" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="border-b border-rule px-4 py-14 text-center">
      <p className="text-base">Nothing above that magnitude in this window.</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
        Most recorded earthquakes are too small to feel, so the stronger filters are often empty.
        Widen the window or lower the magnitude floor.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 border border-ink px-3 py-1.5 text-xs transition-colors hover:bg-ink hover:text-paper"
      >
        Show everything
      </button>
    </div>
  )
}

export function DeadEnd({ error, onRetry }: { error: FeedError | null; onRetry: () => void }) {
  const copy = FEED_ERROR_COPY[error?.kind ?? 'offline']
  return (
    <div className="border-b border-rule px-4 py-14 text-center">
      <p className="text-base">{copy.headline}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">{copy.detail}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 border border-ink px-3 py-1.5 text-xs transition-colors hover:bg-ink hover:text-paper"
      >
        Try again
      </button>
    </div>
  )
}

/** Shown above the data when what is on screen is not live. */
export function FeedBanner({
  source,
  error,
  skipped,
  onRetry,
}: {
  source: FeedSource
  error: FeedError | null
  skipped: number
  onRetry: () => void
}) {
  if (!error && skipped === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule bg-mag-light/10 px-4 py-2 text-xs">
      {error && (
        <>
          <span className="text-ink">
            {source === 'snapshot'
              ? 'Showing a cached snapshot — the live feed is unreachable.'
              : FEED_ERROR_COPY[error.kind].headline + '. Readings below are the last good ones.'}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="underline underline-offset-2 hover:no-underline"
          >
            Retry now
          </button>
        </>
      )}
      {skipped > 0 && (
        <span className="tnum text-ink-soft">
          {skipped} malformed {skipped === 1 ? 'event' : 'events'} rejected by the parser.
        </span>
      )}
    </div>
  )
}
