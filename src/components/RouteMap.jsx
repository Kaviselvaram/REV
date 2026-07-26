import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMode } from '../lib/mode'
import { fetchRoute } from '../lib/routing'

// Real interactive map (Leaflet + CartoDB Positron tiles — free, no API key),
// tinted to the parchment theme. Draws the instant synthetic path first, then
// swaps in the REAL road-following route from OSRM once it resolves.
// `onRoute({km, real})` reports the real driving distance to the caller.
export default function RouteMap({ ride, interactive = true, className = '', height = 340, onRoute }) {
  const { accent } = useMode()
  const elRef = useRef(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    let alive = true
    const synthetic = ride.routePath?.length ? ride.routePath : [[ride.meetupPin.lat, ride.meetupPin.lng]]
    const isStatic = synthetic.length < 2

    const map = L.map(el, {
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: false,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      keyboard: false,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    const drawLine = (path) => {
      const glow = L.polyline(path, { color: accent, weight: 9, opacity: 0.16, lineJoin: 'round', lineCap: 'round' }).addTo(map)
      const line = L.polyline(path, { color: accent, weight: 3.5, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }).addTo(map)
      return [glow, line]
    }

    let lines = []
    if (!isStatic) lines = drawLine(synthetic)

    const pin = (color) =>
      L.divIcon({
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -12],
        html: `<span style="display:grid;place-items:center;width:22px;height:22px;border-radius:9999px;background:${color}2e">
                 <span style="width:10px;height:10px;border-radius:9999px;background:${color};box-shadow:0 0 0 3px #fff,0 2px 8px rgba(30,24,14,.35)"></span>
               </span>`,
      })

    L.marker(synthetic[0], { icon: pin('#2F6B4F') }).addTo(map).bindPopup(`<b>Meetup</b><br>${ride.meetupPin.label}`)
    if (!isStatic) {
      L.marker(synthetic[synthetic.length - 1], { icon: pin(accent) })
        .addTo(map)
        .bindPopup(`<b>Destination</b><br>${ride.destination?.label || ''}`)
    }

    const fit = (path) => {
      if (path.length < 2) map.setView(path[0], 14)
      else map.fitBounds(L.latLngBounds(path), { padding: [40, 40] })
    }
    fit(synthetic)

    const invalidate = () => map.invalidateSize()
    const t = setTimeout(invalidate, 60)
    window.addEventListener('resize', invalidate)

    // upgrade to the real road route
    if (!isStatic && ride.destination) {
      fetchRoute(ride.meetupPin, ride.destination).then((route) => {
        if (!alive || !route?.coords?.length) return
        lines.forEach((l) => map.removeLayer(l))
        lines = drawLine(route.coords)
        map.fitBounds(L.latLngBounds(route.coords), { padding: [40, 40] })
        onRoute?.({ km: route.km, minutes: route.minutes, real: true })
      })
    }

    return () => {
      alive = false
      clearTimeout(t)
      window.removeEventListener('resize', invalidate)
      map.remove()
    }
  }, [ride.id, interactive, accent])

  return <div ref={elRef} className={`route-map ${className}`} style={{ height }} aria-label={`Route map for ${ride.title}`} />
}
