import { useEffect, useState } from 'react'
import { MAGNITUDE_BANDS, BAND_COLOR } from '../domain/quake'
import { REFRESH_INTERVAL_MS } from '../hooks/useQuakeFeed'
import type { FeedSource } from '../hooks/useQuakeFeed'
import { asClock } from '../lib/format'

function useSecondsUntilRefresh(lastUpdated: Date | null) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!lastUpdated) return
    const tick = () => {
      const elapsed = Date.now() - lastUpdated.getTime()
      setSeconds(Math.max(Math.ceil((REFRESH_INTERVAL_MS - elapsed) / 1000), 0))
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [lastUpdated])

  return seconds
}

export function Header({
  source,
  refreshing,
  lastUpdated,
}: {
  source: FeedSource
  refreshing: boolean
  lastUpdated: Date | null
}) {
  const seconds = useSecondsUntilRefresh(lastUpdated)
  const live = source === 'live'

  return (
    <header className="border-b border-ink">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 py-5">
        <div>
          <h1
            className="text-3xl leading-none font-extrabold tracking-tight"
            style={{ fontVariationSettings: "'wdth' 112" }}
          >
            Seismic
          </h1>
          <p className="mt-1.5 max-w-[46ch] text-sm text-ink-soft">
            Every earthquake the USGS has recorded, as it arrives. Each stroke below is a moment
            in time; its height is how much the ground moved.
          </p>
        </div>

        <div className="flex items-center gap-2 text-micro">
          <span
            className={`size-1.5 rounded-full ${refreshing ? 'animate-ping' : ''}`}
            style={{ backgroundColor: live ? 'var(--color-mag-minor)' : 'var(--color-mag-light)' }}
            aria-hidden="true"
          />
          <span className="text-ink-soft">
            {live ? 'Live' : 'Cached'}
            {lastUpdated && (
              <>
                {' · '}
                <span className="tnum">{asClock(lastUpdated)}</span>
                {live && <span className="tnum text-ink-faint"> · next in {seconds}s</span>}
              </>
            )}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-rule px-4 py-2">
        {[...MAGNITUDE_BANDS].reverse().map((entry) => (
          <span key={entry.band} className="flex items-center gap-1.5 text-micro text-ink-soft">
            <span
              className="h-3 w-[3px]"
              style={{ backgroundColor: BAND_COLOR[entry.band] }}
              aria-hidden="true"
            />
            {entry.label}
            <span className="tnum text-ink-faint">
              {entry.floor === -Infinity ? 'under 2' : `${entry.floor}+`}
            </span>
          </span>
        ))}
      </div>
    </header>
  )
}
