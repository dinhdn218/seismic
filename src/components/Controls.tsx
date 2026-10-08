import type { FeedWindow } from '../api/client'
import { FEED_WINDOWS } from '../api/client'

export type SortKey = 'time' | 'magnitude'
export const MAGNITUDE_FLOORS = [0, 2, 4, 5] as const
export type MagnitudeFloor = (typeof MAGNITUDE_FLOORS)[number]

const FLOOR_LABEL: Record<MagnitudeFloor, string> = {
  0: 'Everything',
  2: 'M2 and up',
  4: 'M4 and up',
  5: 'M5 and up',
}

export function Controls({
  window,
  onWindowChange,
  floor,
  onFloorChange,
  sort,
  onSortChange,
  resultCount,
}: {
  window: FeedWindow
  onWindowChange: (next: FeedWindow) => void
  floor: MagnitudeFloor
  onFloorChange: (next: MagnitudeFloor) => void
  sort: SortKey
  onSortChange: (next: SortKey) => void
  resultCount: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-rule px-4 py-3">
      <Group label="Window">
        {(Object.keys(FEED_WINDOWS) as FeedWindow[]).map((key) => (
          <Segment
            key={key}
            active={window === key}
            onClick={() => onWindowChange(key)}
          >
            {FEED_WINDOWS[key].label.replace('Past ', '')}
          </Segment>
        ))}
      </Group>

      <Group label="Magnitude">
        {MAGNITUDE_FLOORS.map((value) => (
          <Segment key={value} active={floor === value} onClick={() => onFloorChange(value)}>
            {FLOOR_LABEL[value]}
          </Segment>
        ))}
      </Group>

      <Group label="Order">
        <Segment active={sort === 'time'} onClick={() => onSortChange('time')}>
          Newest
        </Segment>
        <Segment active={sort === 'magnitude'} onClick={() => onSortChange('magnitude')}>
          Largest
        </Segment>
      </Group>

      <p
        className="tnum ml-auto text-micro text-ink-faint"
        aria-live="polite"
        aria-atomic="true"
      >
        {resultCount} shown
      </p>
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-micro text-ink-faint">{label}</span>
      <div className="flex border border-rule-strong">{children}</div>
    </div>
  )
}

function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`border-r border-rule-strong px-2.5 py-1 text-xs transition-colors last:border-r-0 ${
        active
          ? 'bg-ink text-paper'
          : 'bg-paper-raised text-ink-soft hover:bg-paper hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
