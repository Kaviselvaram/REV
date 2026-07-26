import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { getModeBundle } from '../data/mock'

const ModeContext = createContext(null)

// Provider is keyed by `mode` in App, so switching worlds remounts it and the
// in-memory rides reset cleanly per mode (created rides + joins are prototype
// state that will move to the backend later).
export function ModeProvider({ mode, children }) {
  const bundle = useMemo(() => getModeBundle(mode), [mode])
  const [rides, setRides] = useState(bundle.rides)

  const addRide = useCallback((ride) => setRides((rs) => [ride, ...rs]), [])

  const joinRide = useCallback((rideId, riderId = 'me') => {
    setRides((rs) =>
      rs.map((r) =>
        r.id === rideId && !r.attendees.includes(riderId) && r.attendees.length < r.capacity
          ? { ...r, attendees: [...r.attendees, riderId] }
          : r
      )
    )
  }, [])

  const leaveRide = useCallback((rideId, riderId = 'me') => {
    setRides((rs) =>
      rs.map((r) => (r.id === rideId ? { ...r, attendees: r.attendees.filter((a) => a !== riderId) } : r))
    )
  }, [])

  const value = useMemo(
    () => ({ ...bundle, mode, rides, addRide, joinRide, leaveRide }),
    [bundle, mode, rides, addRide, joinRide, leaveRide]
  )
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>
}

// Everything mode-aware reads from here: { mode, accent, copy, images, riders,
// vehicles, rides, recaps, membership, makes, styles, extraField, addRide,
// joinRide, leaveRide, getRider, getVehicleFor, getRecap }
export function useMode() {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used inside <ModeProvider>')
  return ctx
}
