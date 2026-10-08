import { useMemo } from 'react'
import type { Quake } from '../domain/quake'
import { BAND_COLOR, bandFor } from '../domain/quake'
import { asCount, asMagnitude, asEnergyRatio, compareEnergy } from '../lib/format'

/**
 * An instrument readout rather than a row of stat cards: hairline cells, no
 * shadows, numbers doing the work. The last figure is the one most earthquake
 * dashboards leave out — how much bigger the largest event was than a typical
 * one, which is the whole point of a logarithmic scale.
 */
export function Readout({ quakes }: { quakes: readonly Quake[] }) {
  const stats = useMemo(() => {
    const first = quakes[0]
    if (!first) return null

    const magnitudes = quakes.map((q) => q.magnitude).sort((a, b) => a - b)
    const median = magnitudes[Math.floor(magnitudes.length / 2)] ?? 0
    const largest = quakes.reduce((best, q) => (q.magnitude > best.magnitude ? q : best), first)

    return {
      total: quakes.length,
      median,
      largest,
      feltCount: quakes.filter((q) => q.magnitude >= 4).length,
      gap: compareEnergy(largest.magnitude, median),
    }
  }, [quakes])

  if (!stats) return null

  return (
    <dl className="grid grid-cols-2 gap-px border-b border-rule bg-rule sm:grid-cols-3 lg:grid-cols-5">
      <Figure label="Events recorded">
        <span className="tnum text-xl font-semibold">{asCount(stats.total)}</span>
      </Figure>

      <Figure label="Largest">
        <span
          className="text-xl font-semibold"
          style={{ color: BAND_COLOR[bandFor(stats.largest.magnitude)] }}
        >
          M<span className="tnum">{asMagnitude(stats.largest.magnitude)}</span>
        </span>
        <span className="block truncate text-micro text-ink-faint">{stats.largest.place}</span>
      </Figure>

      <Figure label="Typical">
        <span className="text-xl font-semibold text-ink-soft">
          M<span className="tnum">{asMagnitude(stats.median)}</span>
        </span>
      </Figure>

      <Figure label="Strong enough to feel">
        <span className="tnum text-xl font-semibold">{asCount(stats.feltCount)}</span>
        <span className="block text-micro text-ink-faint">magnitude 4 and above</span>
      </Figure>

      <Figure label="Energy gap">
        <span className="tnum text-xl font-semibold">{asEnergyRatio(stats.gap.factor)}×</span>
        <span className="block text-micro text-ink-faint">the largest against the typical</span>
      </Figure>
    </dl>
  )
}

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 bg-paper-raised px-4 py-3">
      <dt className="text-micro text-ink-faint">{label}</dt>
      <dd className="mt-0.5 min-w-0 leading-tight">{children}</dd>
    </div>
  )
}
