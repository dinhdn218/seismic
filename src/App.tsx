import { useMemo, useState } from 'react'
import type { FeedWindow } from './api/client'
import type { Quake } from './domain/quake'
import { useQuakeFeed } from './hooks/useQuakeFeed'
import { Header } from './components/Header'
import { Trace } from './components/Trace'
import { Readout } from './components/Readout'
import { Controls } from './components/Controls'
import type { MagnitudeFloor, SortKey } from './components/Controls'
import { QuakeTable } from './components/QuakeTable'
import { QuakeDetail } from './components/QuakeDetail'
import { DeadEnd, EmptyState, FeedBanner, Skeleton } from './components/States'

export default function App() {
  const [window, setWindow] = useState<FeedWindow>('day')
  const [floor, setFloor] = useState<MagnitudeFloor>(0)
  const [sort, setSort] = useState<SortKey>('time')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { feed, source, loading, refreshing, error, lastUpdated, refresh } = useQuakeFeed(window)

  const filtered = useMemo(() => {
    if (!feed) return []
    const subset = feed.quakes.filter((quake) => quake.magnitude >= floor)
    return subset.sort((a, b) =>
      sort === 'time' ? b.time.getTime() - a.time.getTime() : b.magnitude - a.magnitude,
    )
  }, [feed, floor, sort])

  const selected = useMemo<Quake | null>(
    () => feed?.quakes.find((quake) => quake.id === selectedId) ?? null,
    [feed, selectedId],
  )

  return (
    <div className="mx-auto min-h-dvh max-w-5xl border-x border-rule bg-paper">
      <Header source={source} refreshing={refreshing} lastUpdated={lastUpdated} />

      {loading ? (
        <Skeleton />
      ) : !feed ? (
        <DeadEnd error={error} onRetry={refresh} />
      ) : (
        <>
          <FeedBanner source={source} error={error} skipped={feed.skipped} onRetry={refresh} />

          <Trace
            quakes={feed.quakes}
            window={window}
            floor={floor}
            matchedCount={filtered.length}
            selectedId={selectedId}
            onSelect={(quake) => setSelectedId(quake.id)}
          />

          <Readout quakes={filtered} />

          <Controls
            window={window}
            onWindowChange={setWindow}
            floor={floor}
            onFloorChange={setFloor}
            sort={sort}
            onSortChange={setSort}
            resultCount={filtered.length}
          />

          {filtered.length === 0 ? (
            <EmptyState onClear={() => setFloor(0)} />
          ) : (
            <QuakeTable
              quakes={filtered}
              selectedId={selectedId}
              onSelect={(quake) => setSelectedId(quake.id)}
            />
          )}
        </>
      )}

      <footer className="px-4 py-6 text-micro text-ink-faint">
        <p>
          Data from the{' '}
          <a
            className="underline underline-offset-2 hover:text-ink"
            href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"
            target="_blank"
            rel="noreferrer"
          >
            USGS earthquake feed
          </a>
          , refreshed every minute. Magnitudes below 2 are rarely felt.
        </p>
      </footer>

      <QuakeDetail quake={selected} onClose={() => setSelectedId(null)} />
    </div>
  )
}
