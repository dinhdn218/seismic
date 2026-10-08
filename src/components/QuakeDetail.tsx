import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Quake } from '../domain/quake'
import { BAND_COLOR, bandFor, bandMeta } from '../domain/quake'
import {
  asCoordinates,
  asCount,
  asDepth,
  asEnergyRatio,
  asFullDate,
  asMagnitude,
  compareEnergy,
  describeDepth,
  timeAgo,
} from '../lib/format'

export function QuakeDetail({ quake, onClose }: { quake: Quake | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const restoreTo = useRef<Element | null>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!quake) return
    restoreTo.current = document.activeElement
    closeRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (restoreTo.current instanceof HTMLElement) restoreTo.current.focus()
    }
  }, [quake, onClose])

  return (
    <AnimatePresence>
      {quake && (
        <>
          <motion.div
            className="fixed inset-0 z-20 bg-ink/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`Magnitude ${asMagnitude(quake.magnitude)}, ${quake.place}`}
            className="fixed inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col overflow-y-auto border-l border-ink bg-paper-raised"
            initial={{ x: reduceMotion ? 0 : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: reduceMotion ? 0 : '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <Body quake={quake} onClose={onClose} closeRef={closeRef} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function Body({
  quake,
  onClose,
  closeRef,
}: {
  quake: Quake
  onClose: () => void
  closeRef: React.Ref<HTMLButtonElement>
}) {
  const band = bandFor(quake.magnitude)
  const meta = bandMeta(band)
  const colour = BAND_COLOR[band]
  const vsM4 = compareEnergy(quake.magnitude, 4)

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-rule px-5 py-4">
        <div>
          <span className="block text-4xl leading-none font-semibold" style={{ color: colour }}>
            M<span className="tnum">{asMagnitude(quake.magnitude)}</span>
          </span>
          <span className="mt-1 block text-sm" style={{ color: colour }}>
            {meta.label}
          </span>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="border border-rule-strong px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-ink hover:text-paper"
        >
          Close
        </button>
      </header>

      <div className="border-b border-rule px-5 py-4">
        <p className="text-base leading-snug">{quake.place}</p>
        <p className="mt-1 text-micro text-ink-faint">{meta.felt}</p>
      </div>

      {quake.tsunamiWarning && (
        <p className="border-b border-rule bg-mag-strong/8 px-5 py-3 text-sm text-mag-strong">
          A tsunami warning was issued for this event.
        </p>
      )}

      <dl className="divide-y divide-rule">
        <Row label="Recorded">
          <span className="tnum">{asFullDate(quake.time)}</span>
          <span className="tnum block text-micro text-ink-faint">{timeAgo(quake.time)}</span>
        </Row>
        <Row label="Depth">
          <span className="tnum">{asDepth(quake.depthKm)}</span>
          <span className="block text-micro text-ink-faint">{describeDepth(quake.depthKm)}</span>
        </Row>
        <Row label="Epicentre">
          <span className="tnum">{asCoordinates(quake.latitude, quake.longitude)}</span>
        </Row>
        <Row label="Scale used">
          <span className="tnum uppercase">{quake.magnitudeType}</span>
        </Row>
        <Row label="Energy">
          <span className="tnum">{asEnergyRatio(vsM4.factor)}×</span>
          <span className="block text-micro text-ink-faint">
            {vsM4.direction} energy released than a magnitude 4
          </span>
        </Row>
        {quake.feltReports !== null && (
          <Row label="Felt reports">
            <span className="tnum">{asCount(quake.feltReports)}</span>
            <span className="block text-micro text-ink-faint">people filed a report</span>
          </Row>
        )}
        <Row label="Status">
          <span>{quake.reviewed ? 'Reviewed by a seismologist' : 'Automatic, not yet reviewed'}</span>
        </Row>
      </dl>

      <div className="mt-auto border-t border-rule px-5 py-4">
        <a
          href={quake.url}
          target="_blank"
          rel="noreferrer"
          className="inline-block border border-ink px-3 py-1.5 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Open the USGS event page
        </a>
      </div>
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 px-5 py-3">
      <dt className="text-micro text-ink-faint">{label}</dt>
      <dd className="text-sm leading-snug">{children}</dd>
    </div>
  )
}
