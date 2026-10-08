const UNITS: readonly [limit: number, step: number, unit: Intl.RelativeTimeFormatUnit][] = [
  [60_000, 1_000, 'second'],
  [3_600_000, 60_000, 'minute'],
  [86_400_000, 3_600_000, 'hour'],
  [604_800_000, 86_400_000, 'day'],
]

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'narrow' })

export function timeAgo(date: Date, now = Date.now()): string {
  const elapsed = date.getTime() - now
  const magnitude = Math.abs(elapsed)

  for (const [limit, step, unit] of UNITS) {
    if (magnitude < limit) return relative.format(Math.round(elapsed / step), unit)
  }
  return relative.format(Math.round(elapsed / 604_800_000), 'week')
}

const clock = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export const asClock = (date: Date) => clock.format(date)

const full = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const asFullDate = (date: Date) => full.format(date)

const integer = new Intl.NumberFormat('en', { maximumFractionDigits: 0 })
export const asCount = (value: number) => integer.format(value)

/** Magnitudes always carry one decimal: M4 and M4.0 mean different confidences. */
export const asMagnitude = (value: number) => value.toFixed(1)

export function asDepth(km: number): string {
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

export function asCoordinates(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? 'N' : 'S'}`
  const lon = `${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? 'E' : 'W'}`
  return `${lat} ${lon}`
}

/**
 * Energy released grows by ~10^1.5 per magnitude step. Comparing two events by
 * subtracting their magnitudes is the single most common way to misread this
 * data, so the UI states the ratio outright.
 */
export function energyRatio(magnitude: number, reference: number): number {
  return 10 ** (1.5 * (magnitude - reference))
}

/**
 * Always formatted as a number greater than one, with the direction returned
 * separately: "0.008x as much energy" is unreadable, "126x less" is not.
 */
export function compareEnergy(magnitude: number, reference: number) {
  const ratio = energyRatio(magnitude, reference)
  return {
    factor: ratio >= 1 ? ratio : 1 / ratio,
    direction: ratio >= 1 ? ('more' as const) : ('less' as const),
  }
}

export function asEnergyRatio(factor: number): string {
  if (factor >= 1_000_000) {
    return `${(factor / 1_000_000).toFixed(factor >= 10_000_000 ? 0 : 1)} million`
  }
  if (factor >= 1_000) return `${(factor / 1_000).toFixed(factor >= 10_000 ? 0 : 1)} thousand`
  if (factor >= 10) return integer.format(Math.round(factor))
  return factor.toFixed(1)
}

/**
 * Depth bands as seismologists use them. The distinction matters to a reader:
 * a deep event of the same magnitude does far less damage at the surface.
 */
export function describeDepth(km: number): string {
  if (km < 20) return 'Very shallow — shaking is concentrated near the epicentre'
  if (km < 70) return 'Crustal depth — typically felt across a wide area'
  if (km < 300) return 'Intermediate — much of the energy disperses before the surface'
  return 'Deep focus — rarely causes damage despite the magnitude'
}
