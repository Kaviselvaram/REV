// Lightweight, tile-free route thumbnail — projects the ride's REAL routePath
// (lat/lng) onto the SVG viewBox so cards show the true route shape, fast and
// on-brand. Falls back to a stylised wander if a ride has no path yet.
function seeded(seed) {
  let s = 0
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 100000
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export default function RouteThumb({ ride, className = '', tall = false }) {
  const rnd = seeded(ride.id)
  const H = tall ? 220 : 130
  const W = 400
  const pad = 34

  const streets = Array.from({ length: 7 }, () => ({
    x1: rnd() * W, y1: rnd() * H, x2: rnd() * W, y2: rnd() * H,
  }))

  // project the real geographic path into the viewBox (equirectangular, fit-to-box)
  const geo = ride.routePath && ride.routePath.length >= 2 ? ride.routePath : null
  let pts
  if (geo) {
    const lats = geo.map((p) => p[0])
    const lngs = geo.map((p) => p[1])
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
    const spanLat = Math.max(1e-4, maxLat - minLat)
    const spanLng = Math.max(1e-4, maxLng - minLng)
    const span = Math.max(spanLat, spanLng) // keep aspect square-ish so it reads as a map
    pts = geo.map(([lat, lng]) => [
      pad + ((lng - minLng) / span) * (W - 2 * pad) + (W - 2 * pad - ((maxLng - minLng) / span) * (W - 2 * pad)) / 2,
      pad + (1 - (lat - minLat) / span) * (H - 2 * pad) + (H - 2 * pad - ((maxLat - minLat) / span) * (H - 2 * pad)) / 2,
    ])
  } else {
    const n = 6
    pts = Array.from({ length: n + 1 }, (_, i) => [
      pad + (i / n) * (W - 2 * pad) + (rnd() - 0.5) * 30,
      H * 0.25 + rnd() * H * 0.5,
    ])
  }

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const [sx, sy] = pts[0]
  const [ex, ey] = pts[pts.length - 1]
  const staticMeet = ride.routePath && ride.routePath.length < 2

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`block w-full ${className}`}
      style={{ aspectRatio: `${W}/${H}` }}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width={W} height={H} fill="#ECE6D8" />
      <g fill="rgba(25,23,19,0.08)">
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={(i % 10) * (W / 10) + 20} cy={Math.floor(i / 10) * (H / 4) + 14} r="1.2" />
        ))}
      </g>
      <g stroke="rgba(25,23,19,0.09)" strokeWidth="2">
        {streets.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
        ))}
      </g>
      {!staticMeet && (
        <>
          <path d={path} fill="none" style={{ stroke: 'color-mix(in srgb, var(--accent) 25%, transparent)' }} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d={path} fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {/* start pin — trust green */}
      <circle cx={sx} cy={sy} r="6" fill="rgba(47,107,79,0.22)" />
      <circle cx={sx} cy={sy} r="3" fill="#2F6B4F" />
      {!staticMeet && (
        <>
          <circle cx={ex} cy={ey} r="7" style={{ fill: 'color-mix(in srgb, var(--accent) 25%, transparent)' }} />
          <circle cx={ex} cy={ey} r="3.5" style={{ fill: 'var(--accent)' }} />
        </>
      )}
    </svg>
  )
}
