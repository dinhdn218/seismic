import { useId, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { Quake } from '../domain/quake'
import { BAND_COLOR, bandFor } from '../domain/quake'
import type { FeedWindow } from '../api/client'
import { FEED_WINDOWS } from '../api/client'
import { useElementWidth } from '../hooks/useElementWidth'
import { asCount, asMagnitude, timeAgo } from '../lib/format'

const HEIGHT = 168
const BASELINE = HEIGHT - 26
const BUCKET_PX = 3
const MAX_MAGNITUDE = 7.5

interface Bucket {
  x: number
  peak: Quake
  count: number
}

/**
 * Magnitude is already a log scale, so stroke height is linear in magnitude.
 * The mild exponent only keeps the top of the scale visually dominant: the
 * difference between M2 and M6 is a million-fold in energy and the chart
 * should not imply it is three times anything.
 */
function strokeHeight(magnitude: number): number {
  const normalised = Math.min(Math.max(magnitude, 0), MAX_MAGNITUDE) / MAX_MAGNITUDE
  return Math.max(normalised ** 1.4 * (BASELINE - 10), 1.5)
}

export function Trace({
  quakes,
  window,
  floor,
  matchedCount,
  selectedId,
  onSelect,
}: {
  quakes: readonly Quake[]
  window: FeedWindow
  /** Strokes below this magnitude stay on the chart but recede, so filtering
   * never hides the fact that almost everything recorded is small. */
  floor: number
  matchedCount: number
  selectedId: string | null
  onSelect: (quake: Quake) => void
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [hovered, setHovered] = useState<Bucket | null>(null)
  const reduceMotion = useReducedMotion()
  const clipId = useId()

  const { buckets, span } = useMemo(() => {
    const now = Date.now()
    const spanMs = FEED_WINDOWS[window].spanMs
    if (width <= 0) return { buckets: [] as Bucket[], span: spanMs }

    const columns = Math.max(Math.floor(width / BUCKET_PX), 1)
    const byColumn = new Map<number, Bucket>()

    for (const quake of quakes) {
      const age = now - quake.time.getTime()
      if (age < 0 || age > spanMs) continue

      // Oldest on the left, "now" pinned to the right edge.
      const column = Math.min(Math.floor(((spanMs - age) / spanMs) * columns), columns - 1)
      const existing = byColumn.get(column)

      if (!existing) {
        byColumn.set(column, { x: column * BUCKET_PX + BUCKET_PX / 2, peak: quake, count: 1 })
      } else {
        existing.count += 1
        if (quake.magnitude > existing.peak.magnitude) existing.peak = quake
      }
    }

    return {
      buckets: [...byColumn.values()].sort((a, b) => a.peak.magnitude - b.peak.magnitude),
      span: spanMs,
    }
  }, [quakes, width, window])

  const gridlines = useMemo(() => {
    const divisions = width < 420 ? 2 : width < 680 ? 4 : 6
    return Array.from({ length: divisions }, (_, index) => {
      const fraction = (index + 1) / (divisions + 1)
      return {
        x: fraction * width,
        label: timeAgo(new Date(Date.now() - span * (1 - fraction))),
      }
    })
  }, [span, width, window])

  const active = hovered ?? null

  return (
    <figure className="relative m-0">
      <figcaption className="sr-only">
        Seismic activity over the {FEED_WINDOWS[window].label.toLowerCase()}. Each stroke is one
        column of time; its height is the largest magnitude recorded in that column.
      </figcaption>

      <div
        ref={ref}
        className="relative border-y border-rule bg-paper-raised"
        style={{ height: HEIGHT }}
        onMouseLeave={() => setHovered(null)}
      >
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            className="block"
            role="presentation"
            onMouseMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect()
              const x = event.clientX - bounds.left
              let nearest: Bucket | null = null
              let distance = Infinity
              for (const bucket of buckets) {
                const delta = Math.abs(bucket.x - x)
                if (delta < distance) {
                  distance = delta
                  nearest = bucket
                }
              }
              setHovered(distance <= 14 ? nearest : null)
            }}
            onClick={() => {
              if (active) onSelect(active.peak)
            }}
          >
            <defs>
              <clipPath id={clipId}>
                <motion.rect
                  x={0}
                  y={0}
                  height={HEIGHT}
                  initial={{ width: reduceMotion ? width : 0 }}
                  animate={{ width }}
                  transition={{ duration: reduceMotion ? 0 : 1.1, ease: [0.22, 0.61, 0.36, 1] }}
                />
              </clipPath>
            </defs>

            {gridlines.map((line) => (
              <g key={line.x}>
                <line
                  x1={line.x}
                  x2={line.x}
                  y1={10}
                  y2={BASELINE}
                  stroke="var(--color-rule)"
                  strokeWidth={1}
                  opacity={0.55}
                />
                <text
                  x={line.x}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-ink-faint text-[10px]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {line.label}
                </text>
              </g>
            ))}

            <line
              x1={0}
              x2={width}
              y1={BASELINE}
              y2={BASELINE}
              stroke="var(--color-rule-strong)"
              strokeWidth={1}
            />

            <g clipPath={`url(#${clipId})`}>
              {buckets.map((bucket) => {
                const height = strokeHeight(bucket.peak.magnitude)
                const isActive = active?.peak.id === bucket.peak.id
                const isSelected = bucket.peak.id === selectedId
                const emphasised = isSelected || isActive
                // The peak is the largest event in the column, so a peak below
                // the floor means nothing in that column matches.
                const matches = bucket.peak.magnitude >= floor

                return (
                  <line
                    key={bucket.peak.id}
                    x1={bucket.x}
                    x2={bucket.x}
                    y1={BASELINE}
                    y2={BASELINE - height}
                    stroke={BAND_COLOR[bandFor(bucket.peak.magnitude)]}
                    strokeWidth={emphasised ? 2.5 : 1.5}
                    opacity={emphasised ? 1 : matches ? 0.78 : 0.16}
                  />
                )
              })}
            </g>

            {active && (
              <line
                x1={active.x}
                x2={active.x}
                y1={6}
                y2={BASELINE}
                stroke="var(--color-ink)"
                strokeWidth={1}
                strokeDasharray="2 3"
                opacity={0.5}
              />
            )}
          </svg>
        )}

        {active && (
          <div
            className="pointer-events-none absolute top-2 z-10 border border-ink bg-paper-raised px-2.5 py-1.5 shadow-[3px_3px_0_var(--color-rule-strong)]"
            style={{
              left: Math.min(Math.max(active.x - 95, 4), Math.max(width - 198, 4)),
              width: 190,
            }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="tnum text-base font-semibold"
                style={{ color: BAND_COLOR[bandFor(active.peak.magnitude)] }}
              >
                M{asMagnitude(active.peak.magnitude)}
              </span>
              <span className="tnum text-micro text-ink-faint">
                {timeAgo(active.peak.time)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-micro text-ink-soft">{active.peak.place}</p>
            {active.count > 1 && (
              <p className="tnum mt-0.5 text-micro text-ink-faint">
                +{asCount(active.count - 1)} more here
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 pt-2 text-micro text-ink-faint">
        <span>{FEED_WINDOWS[window].label.replace('Past ', 'One ')} ago</span>
        <span className="tnum">
          {matchedCount < quakes.length
            ? `${asCount(matchedCount)} of ${asCount(quakes.length)} events`
            : `${asCount(quakes.length)} events plotted`}
        </span>
        <span>Now</span>
      </div>
    </figure>
  )
}
