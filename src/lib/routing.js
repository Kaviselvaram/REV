// Real road-following routes via OSRM (Open Source Routing Machine) public API —
// free, no API key. Returns actual driving geometry along real roads, not a
// synthetic line. Cached per O/D pair; falls back to null on failure so the
// caller can keep the instant synthetic placeholder. Swap the host for a
// self-hosted OSRM or Mapbox Directions in production (rate limits / SLA).
const OSRM = 'https://router.project-osrm.org/route/v1/driving'
const cache = new Map()

export async function fetchRoute(start, end) {
  if (!start || !end) return null
  const key = `${start.lat.toFixed(4)},${start.lng.toFixed(4)};${end.lat.toFixed(4)},${end.lng.toFixed(4)}`
  if (cache.has(key)) return cache.get(key)

  const url = `${OSRM}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 9000)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`OSRM ${res.status}`)
    const data = await res.json()
    const route = data.routes?.[0]
    if (!route?.geometry?.coordinates?.length) throw new Error('no route')
    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]) // → Leaflet order
    const result = { coords, km: Math.round(route.distance / 1000), minutes: Math.round(route.duration / 60), real: true }
    cache.set(key, result)
    return result
  } catch {
    cache.set(key, null) // don't hammer a failing endpoint for the same pair
    return null
  }
}
