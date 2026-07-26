import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getModeBundle } from '../data/mock'
import { isConfigured } from './supabase'
import * as api from './api'

const ModeContext = createContext(null)

/* Provider is keyed by `mode` in App, so switching worlds remounts it.
   Rides come from Supabase when it is configured and from the in-memory
   bundle when it is not — the rest of the app cannot tell which, because
   both produce the same ride shape. Riders, vehicles, copy and imagery
   still come from the bundle; those move in a later phase. */
export function ModeProvider({ mode, session, children }) {
  const bundle = useMemo(() => getModeBundle(mode), [mode])
  const live = isConfigured && !!session

  const [rides, setRides] = useState(live ? [] : bundle.rides)
  const [directory, setDirectory] = useState(null) // real members, when live
  const [loading, setLoading] = useState(live)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!live) return
    setError(null)
    try {
      const [rows, dir] = await Promise.all([
        api.listRides(mode, session),
        api.listMembers(mode),
      ])
      setRides(rows)
      setDirectory(dir)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [live, mode, session])

  useEffect(() => {
    if (!live) {
      setRides(bundle.rides)
      setLoading(false)
      return
    }
    setLoading(true)
    refresh()
  }, [live, refresh, bundle.rides])

  // CreateRide speaks the UI ride shape; the API speaks columns. Translating
  // here keeps the screen identical whether or not a backend is present.
  const addRide = useCallback(async (ride) => {
    if (!live) {
      setRides((rs) => [ride, ...rs])
      return ride.id
    }
    const id = await api.createRide({
      mode,
      title: ride.title,
      startsAt: ride.dateTime,
      meetupLabel: ride.meetupPin.label,
      meetupLat: ride.meetupPin.lat,
      meetupLng: ride.meetupPin.lng,
      capacity: ride.capacity,
      safetyNotes: ride.safetyNotes || null,
      destinationLabel: ride.destination?.label ?? null,
      destLat: ride.destination?.lat ?? null,
      destLng: ride.destination?.lng ?? null,
      route: ride.routePath ?? null,
      distanceKm: ride.distanceKm ?? null,
    }, session)
    await refresh()
    return id
  }, [live, mode, session, refresh])

  const joinRide = useCallback(async (rideId, riderId = 'me') => {
    if (!live) {
      setRides((rs) => rs.map((r) =>
        r.id === rideId && !r.attendees.includes(riderId) && r.attendees.length < r.capacity
          ? { ...r, attendees: [...r.attendees, riderId] } : r))
      return
    }
    await api.joinRide(rideId)
    await refresh()
  }, [live, refresh])

  const leaveRide = useCallback(async (rideId, riderId = 'me') => {
    if (!live) {
      setRides((rs) => rs.map((r) =>
        r.id === rideId ? { ...r, attendees: r.attendees.filter((a) => a !== riderId) } : r))
      return
    }
    // a captain removing someone else is a different operation to leaving
    if (riderId === 'me') await api.leaveRide(rideId)
    else await api.removeRider(rideId, riderId)
    await refresh()
  }, [live, refresh])

  // When live, resolve riders and machines from the database instead of the
  // bundle. 'me' still maps to the signed-in member so rosters keep working.
  const lookups = useMemo(() => {
    if (!live || !directory) return null
    const byId = new Map(directory.riders.map((r) => [r.id, r]))
    const myUid = session?.user?.id
    return {
      riders: directory.riders,
      vehicles: directory.vehicles,
      getRider: (id) => byId.get(id === 'me' ? myUid : id),
      getVehicleFor: (riderId) =>
        directory.vehicles.find((v) => v.riderId === (riderId === 'me' ? myUid : riderId)),
    }
  }, [live, directory, session])

  const value = useMemo(
    () => ({
      ...bundle, ...(lookups ?? {}),
      mode, rides, loading, error, live,
      addRide, joinRide, leaveRide, refresh,
    }),
    [bundle, lookups, mode, rides, loading, error, live, addRide, joinRide, leaveRide, refresh],
  )
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>
}

// Everything mode-aware reads from here: { mode, accent, copy, images, riders,
// vehicles, rides, loading, error, live, recaps, membership, makes, styles,
// extraField, addRide, joinRide, leaveRide, refresh, getRider, getVehicleFor,
// getRecap }
export function useMode() {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used inside <ModeProvider>')
  return ctx
}
