/**
 * The USGS GeoJSON summary feed, transcribed from their published schema:
 * https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
 *
 * These types describe what the endpoint *claims* to send. Nothing in the app
 * imports them except the parser — everywhere else works with `Quake`, so a
 * change at the boundary surfaces in one file instead of forty components.
 */

export interface WireFeatureProperties {
  mag: number | null
  place: string | null
  /** Epoch milliseconds, UTC. */
  time: number
  updated: number
  tz: number | null
  url: string
  detail: string
  felt: number | null
  cdi: number | null
  mmi: number | null
  alert: 'green' | 'yellow' | 'orange' | 'red' | null
  status: 'automatic' | 'reviewed' | 'deleted'
  /** 0 or 1, not a boolean. */
  tsunami: number
  sig: number
  net: string
  code: string
  ids: string
  sources: string
  types: string
  nst: number | null
  dmin: number | null
  rms: number | null
  gap: number | null
  magType: string | null
  type: string
  title: string
}

export interface WireGeometry {
  type: 'Point'
  /** [longitude, latitude, depth in km]. Depth can be negative above sea level. */
  coordinates: [number, number, number]
}

export interface WireFeature {
  type: 'Feature'
  id: string
  properties: WireFeatureProperties
  geometry: WireGeometry | null
}

export interface WireFeedMetadata {
  generated: number
  url: string
  title: string
  status: number
  api: string
  count: number
}

export interface WireFeed {
  type: 'FeatureCollection'
  metadata: WireFeedMetadata
  features: WireFeature[]
  bbox?: number[]
}
