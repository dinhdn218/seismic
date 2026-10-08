import { useEffect, useState } from 'react'
import type { Quake } from '../domain/quake'
import { BAND_COLOR, bandFor } from '../domain/quake'
import { asDepth, asFullDate, asMagnitude, timeAgo } from '../lib/format'

const PAGE = 60

export function QuakeTable({
  quakes,
  selectedId,
  onSelect,
}: {
  quakes: readonly Quake[]
  selectedId: string | null
  onSelect: (quake: Quake) => void
}) {
  const [visible, setVisible] = useState(PAGE)

  // A new filter means a new list; keep the old scroll depth and the user is
  // looking at page four of something they have not seen page one of.
  useEffect(() => setVisible(PAGE), [quakes])

  const rows = quakes.slice(0, visible)
  const remaining = quakes.length - rows.length

  return (
    <div>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Recorded earthquakes, {quakes.length} in total. Select a row for full detail.
        </caption>
        <thead>
          <tr className="border-b border-rule-strong text-micro text-ink-faint">
            <th scope="col" className="w-20 px-4 py-2 text-left font-normal">
              Magnitude
            </th>
            <th scope="col" className="px-2 py-2 text-left font-normal">
              Location
            </th>
            <th scope="col" className="hidden w-24 px-2 py-2 text-right font-normal sm:table-cell">
              Depth
            </th>
            <th scope="col" className="w-28 px-4 py-2 text-right font-normal">
              Recorded
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((quake) => {
            const selected = quake.id === selectedId
            return (
              <tr
                key={quake.id}
                onClick={() => onSelect(quake)}
                tabIndex={0}
                aria-selected={selected}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(quake)
                  }
                }}
                className={`cursor-pointer border-b border-rule transition-colors ${
                  selected ? 'bg-ink/[0.055]' : 'hover:bg-ink/[0.03]'
                }`}
              >
                <td className="px-4 py-2.5">
                  <span
                    className="tnum font-semibold"
                    style={{ color: BAND_COLOR[bandFor(quake.magnitude)] }}
                  >
                    {asMagnitude(quake.magnitude)}
                  </span>
                </td>
                <td className="max-w-0 px-2 py-2.5">
                  <span className="block truncate">{quake.place}</span>
                  {quake.tsunamiWarning && (
                    <span className="text-micro text-mag-strong">Tsunami warning issued</span>
                  )}
                </td>
                <td className="tnum hidden px-2 py-2.5 text-right text-ink-soft sm:table-cell">
                  {asDepth(quake.depthKm)}
                </td>
                <td className="tnum px-4 py-2.5 text-right text-ink-soft">
                  <time dateTime={quake.time.toISOString()} title={asFullDate(quake.time)}>
                    {timeAgo(quake.time)}
                  </time>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {remaining > 0 && (
        <div className="border-b border-rule px-4 py-3">
          <button
            type="button"
            onClick={() => setVisible((count) => count + PAGE)}
            className="border border-rule-strong bg-paper-raised px-3 py-1.5 text-xs text-ink-soft transition-colors hover:bg-ink hover:text-paper"
          >
            Show {Math.min(remaining, PAGE)} more
          </button>
          <span className="tnum ml-3 text-micro text-ink-faint">{remaining} remaining</span>
        </div>
      )}
    </div>
  )
}
