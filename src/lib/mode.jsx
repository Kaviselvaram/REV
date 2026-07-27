import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
  // A refreshed token produces a new session object for the same member. Key
  // the data effects on the member id so a token refresh does not refetch.
  const uid = session?.user?.id ?? null

  const [rides, setRides] = useState(live ? [] : bundle.rides)
  const [directory, setDirectory] = useState(null) // real members, when live
  const directoryRef = useRef(null)
  const [corridors, setCorridors] = useState([])
  const corridorsRef = useRef(null)
  const sessionRef = useRef(session)
  sessionRef.current = session
  const [loading, setLoading] = useState(live)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!live) return
    setError(null)
    try {
      // The member directory is per-world and does not change when someone
      // RSVPs, so it is only fetched when it is missing.
      const [rows, dir, cors] = await Promise.all([
        api.listRides(mode, sessionRef.current),
        directoryRef.current ? Promise.resolve(directoryRef.current) : api.listMembers(mode),
        corridorsRef.current ? Promise.resolve(corridorsRef.current) : api.listCorridors(),
      ])
      setRides(rows)
      corridorsRef.current = cors
      setCorridors(cors)
      directoryRef.current = dir
      setDirectory(dir)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
    // sessionRef is read through a ref-like closure on purpose: only the
    // member identity should retrigger this, never a token rotation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, mode, uid])

  useEffect(() => {
    if (!live) {
      setRides(bundle.rides)
      setLoading(false)
      return
    }
    setLoading(true)
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, refresh])

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
      city: ride.city ?? 'Chennai',
      corridor: ride.corridor ?? null,
    }, sessionRef.current)
    await refresh()
    return id
  }, [live, mode, refresh])

  // Roster changes touch exactly one ride, so they are applied locally and
  // the server call runs behind the change. A full refetch here cost four
  // round trips and made every RSVP feel like it hung; this is instant, and
  // if the server refuses — a full ride, a block — the row rolls back.
  const patchRide = useCallback((rideId, fn) => {
    setRides((rs) => rs.map((r) => (r.id === rideId ? fn(r) : r)))
  }, [])

  const addAttendee = (riderId) => (r) =>
    r.attendees.includes(riderId) ? r : { ...r, attendees: [...r.attendees, riderId] }
  const dropAttendee = (riderId) => (r) =>
    ({ ...r, attendees: r.attendees.filter((a) => a !== riderId) })

  const joinRide = useCallback(async (rideId, riderId = 'me') => {
    if (!live) {
      setRides((rs) => rs.map((r) =>
        r.id === rideId && !r.attendees.includes(riderId) && r.attendees.length < r.capacity
          ? { ...r, attendees: [...r.attendees, riderId] } : r))
      return
    }
    patchRide(rideId, addAttendee(riderId))
    try {
      await api.joinRide(rideId)
    } catch (e) {
      patchRide(rideId, dropAttendee(riderId))
      throw e
    }
  }, [live, patchRide])

  const leaveRide = useCallback(async (rideId, riderId = 'me') => {
    if (!live) {
      setRides((rs) => rs.map((r) =>
        r.id === rideId ? { ...r, attendees: r.attendees.filter((a) => a !== riderId) } : r))
      return
    }
    patchRide(rideId, dropAttendee(riderId))
    try {
      // a captain removing someone else is a different operation to leaving
      if (riderId === 'me') await api.leaveRide(rideId)
      else await api.removeRider(rideId, riderId)
    } catch (e) {
      patchRide(rideId, addAttendee(riderId))
      throw e
    }
  }, [live, patchRide])

  // When live, resolve riders and machines from the database instead of the
  // bundle. 'me' still maps to the signed-in member so rosters keep working.
  const lookups = useMemo(() => {
    if (!live || !directory) return null
    const byId = new Map(directory.riders.map((r) => [r.id, r]))
    const myUid = uid
    return {
      riders: directory.riders,
      vehicles: directory.vehicles,
      getRider: (id) => byId.get(id === 'me' ? myUid : id),
      getVehicleFor: (riderId) =>
        directory.vehicles.find((v) => v.riderId === (riderId === 'me' ? myUid : riderId)),
      // the bundle's getRecap is a synchronous lookup; the real one is a
      // request, so live mode hands the screen a fetcher instead
      getRecap: null,
      fetchRecap: (rideId) => api.getRecap(rideId),
    }
  }, [live, directory, uid])

  const value = useMemo(
    () => ({
      ...bundle, ...(lookups ?? {}),
      mode, rides, corridors, loading, error, live,
      addRide, joinRide, leaveRide, refresh,
    }),
    [bundle, lookups, mode, rides, corridors, loading, error, live, addRide, joinRide, leaveRide, refresh],
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
