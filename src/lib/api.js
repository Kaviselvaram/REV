import { getClient, isConfigured, isDevAuth, describeError } from './supabase'

/* ---------------------------------------------------------------------------
   The single boundary between REV's screens and the database.

   Every function here returns data in the shape the UI already uses — the same
   shape data/mock.js produces. That is deliberate: the screens were built
   against that shape and work, so the adapting happens here rather than in
   twelve components. Swapping mock for real should be a data change, not a
   rewrite.

   Errors come back as thrown Error objects carrying a member-readable message.
   --------------------------------------------------------------------------- */

// Awaits the lazily-loaded client. Every caller here is already async, so
// deferring the SDK costs nothing at the call sites.
async function must() {
  if (!isConfigured) throw new Error('Backend not configured.')
  return getClient()
}

function fail(error, fallback) {
  throw new Error(describeError(error, fallback))
}

// ---------------------------------------------------------------- auth

// Dev stub: seeded members carry a synthetic email and a shared password, so
// the client obtains a genuine session without an SMS provider. Production
// takes the OTP path below and never reaches this.
const DEV_EMAIL = (digits) => `${digits}@dev.rev.invalid`
const DEV_PASSWORD = 'rev-dev-2026'

export async function sendOtp(phoneDigits) {
  if (isDevAuth) return               // nothing to send
  const sb = await must()
  const { error } = await sb.auth.signInWithOtp({ phone: `+91${phoneDigits}` })
  if (error) fail(error, "Couldn't send the code. Check the number and try again.")
}

export async function verifyOtp(phoneDigits, token) {
  const sb = await must()

  if (isDevAuth) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: DEV_EMAIL(phoneDigits), password: DEV_PASSWORD,
    })
    if (error) {
      throw new Error(
        'No seeded dev member for that number. Try 9876543210, 9123456789, ' +
        '9988776655, 9555000111, 9444333222, or 9000000001-3 for the new-member path.',
      )
    }
    return data.session
  }

  const { data, error } = await sb.auth.verifyOtp({
    phone: `+91${phoneDigits}`, token, type: 'sms',
  })
  if (error) fail(error, 'That code did not match. Try again.')
  return data.session
}

export async function getSession() {
  if (!isConfigured) return null
  const sb = await getClient()
  const { data } = await sb.auth.getSession()
  return data.session ?? null
}

export function onAuthChange(cb) {
  if (!isConfigured) return () => {}
  let unsub = null
  let cancelled = false
  getClient().then((sb) => {
    if (cancelled) return
    const { data } = sb.auth.onAuthStateChange((_e, session) => cb(session))
    unsub = () => data.subscription.unsubscribe()
  })
  return () => { cancelled = true; if (unsub) unsub() }
}

export async function signOut() {
  if (!isConfigured) return
  const sb = await getClient()
  await sb.auth.signOut()
}

// ---------------------------------------------------------------- profile

const toProfile = (row, phone) => row && ({
  id: 'me',                 // rosters key off 'me' for the current member
  uid: row.id,
  name: row.display_name,
  handle: row.handle,
  city: row.city,
  bio: row.bio ?? '',
  avatarUrl: row.avatar_path ?? null,
  verified: row.is_verified,
  ridesCount: row.rides_count,
  joinedDate: row.created_at?.slice(0, 10),
  phone: phone ?? '',
})

export async function getMyProfile(session) {
  const sb = await must()
  const uid = session?.user?.id
  if (!uid) return null
  const { data, error } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle()
  if (error) fail(error, "Couldn't load your profile.")
  return toProfile(data, session.user.phone ? `+${session.user.phone}` : '')
}

export async function completeSignup({ handle, name, city, dob }, session) {
  const sb = await must()
  const { data, error } = await sb.rpc('complete_signup', {
    p_handle: handle, p_display_name: name, p_city: city, p_dob: dob,
  })
  if (error) fail(error, "Couldn't create your account.")
  return toProfile(data, session?.user?.phone ? `+${session.user.phone}` : '')
}

export async function updateProfile(patch, session) {
  const sb = await must()
  const uid = session?.user?.id
  const row = {}
  if (patch.name !== undefined)   row.display_name = patch.name
  if (patch.handle !== undefined) row.handle = patch.handle
  if (patch.city !== undefined)   row.city = patch.city
  if (patch.bio !== undefined)    row.bio = patch.bio || null
  const { data, error } = await sb.from('profiles').update(row).eq('id', uid).select().single()
  if (error) fail(error, "Couldn't save your changes.")
  return toProfile(data, session.user.phone ? `+${session.user.phone}` : '')
}

export async function deleteAccount() {
  const sb = await must()
  const { error } = await sb.rpc('delete_my_account')
  if (error) fail(error, "Couldn't delete your account.")
  await sb.auth.signOut()
}

// ---------------------------------------------------------------- garage

const toVehicle = (row) => row && ({
  id: row.id,
  make: row.make,
  model: row.model,
  year: row.year ? String(row.year) : '',
  extra: row.extra ?? '',
  extraLabel: row.extra ?? '',
  mods: row.mods ?? [],
  rideStyle: row.ride_style ?? '',
  styleLabel: row.ride_style ?? '',
  photos: row.photo_paths ?? [],
})

export async function getMyVehicles(session) {
  const sb = await must()
  const uid = session?.user?.id
  if (!uid) return { bike: null, car: null }
  const { data, error } = await sb.from('vehicles').select('*').eq('owner_id', uid).eq('is_primary', true)
  if (error) fail(error, "Couldn't load your garage.")
  const out = { bike: null, car: null }
  for (const row of data ?? []) out[row.mode] = toVehicle(row)
  return out
}

export async function saveVehicle(mode, vehicle, session) {
  const sb = await must()
  const uid = session?.user?.id
  const row = {
    owner_id: uid,
    mode,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year ? parseInt(vehicle.year, 10) : null,
    extra: vehicle.extra || null,
    mods: vehicle.mods ?? [],
    ride_style: vehicle.rideStyle || vehicle.styleLabel || null,
    photo_paths: vehicle.photos ?? [],
    is_primary: true,
  }
  // one primary machine per world — replace rather than accumulate
  const { data: existing } = await sb.from('vehicles')
    .select('id').eq('owner_id', uid).eq('mode', mode).eq('is_primary', true).maybeSingle()

  const q = existing
    ? sb.from('vehicles').update(row).eq('id', existing.id).select().single()
    : sb.from('vehicles').insert(row).select().single()

  const { data, error } = await q
  if (error) fail(error, "Couldn't save your machine.")
  return toVehicle(data)
}

// Community directory for a world: every member, plus the machine they keep
// in that world. Rosters and ride pages resolve names and bikes from this.
export async function listMembers(mode) {
  const sb = await must()
  const [{ data: profiles, error: pErr }, { data: vehicles, error: vErr }] = await Promise.all([
    sb.from('profiles').select('*'),
    sb.from('vehicles').select('*').eq('mode', mode).eq('is_primary', true),
  ])
  if (pErr) fail(pErr, "Couldn't load members.")
  if (vErr) fail(vErr, "Couldn't load garages.")

  return {
    riders: (profiles ?? []).map((p) => ({
      id: p.id,
      name: p.display_name,
      handle: p.handle,
      avatarUrl: p.avatar_path ?? null,
      verified: p.is_verified,
      ridesCount: p.rides_count,
      joinedDate: p.created_at?.slice(0, 10),
    })),
    vehicles: (vehicles ?? []).map((v) => ({
      id: v.id,
      riderId: v.owner_id,
      make: v.make,
      model: v.model,
      year: v.year,
      mods: v.mods ?? [],
      photos: v.photo_paths ?? [],
      rideStyle: v.ride_style ?? '',
    })),
  }
}

// ---------------------------------------------------------------- rides

const toRide = (row, attendeeIds = [], myUid = null) => ({
  id: row.id,
  title: row.title,
  captainId: row.captain_id === myUid ? 'me' : row.captain_id,
  dateTime: row.starts_at,
  meetupPin: { lat: row.meetup_lat, lng: row.meetup_lng, label: row.meetup_label },
  destination: row.destination_label
    ? { lat: row.dest_lat, lng: row.dest_lng, label: row.destination_label }
    : undefined,
  route: row.destination_label
    ? `${row.meetup_label} → ${row.destination_label}`
    : `Static meet at ${row.meetup_label}`,
  safetyNotes: row.safety_notes ?? '',
  attendees: attendeeIds,
  capacity: row.capacity,
  status: row.status,
  distanceKm: row.distance_km ? Number(row.distance_km) : 0,
  routePath: row.route ?? null,
  mine: row.captain_id === myUid,
})

export async function listRides(mode, session) {
  const sb = await must()
  const myUid = session?.user?.id ?? null

  const { data: rides, error } = await sb
    .from('ride_feed').select('*').eq('mode', mode).order('starts_at', { ascending: true })
  if (error) fail(error, "Couldn't load rides.")
  if (!rides?.length) return []

  const { data: roster } = await sb
    .from('ride_attendees')
    .select('ride_id, member_id')
    .in('ride_id', rides.map((r) => r.id))
    .eq('status', 'joined')

  const byRide = new Map()
  for (const a of roster ?? []) {
    if (!byRide.has(a.ride_id)) byRide.set(a.ride_id, [])
    byRide.get(a.ride_id).push(a.member_id === myUid ? 'me' : a.member_id)
  }
  return rides.map((r) => toRide(r, byRide.get(r.id) ?? [], myUid))
}

export async function createRide(input, session) {
  const sb = await must()
  const { data, error } = await sb.rpc('create_ride', {
    p_mode: input.mode,
    p_title: input.title,
    p_starts_at: input.startsAt,
    p_meetup_label: input.meetupLabel,
    p_meetup_lat: input.meetupLat,
    p_meetup_lng: input.meetupLng,
    p_capacity: input.capacity,
    p_safety_notes: input.safetyNotes ?? null,
    p_destination_label: input.destinationLabel ?? null,
    p_dest_lat: input.destLat ?? null,
    p_dest_lng: input.destLng ?? null,
    p_route: input.route ?? null,
    p_distance_km: input.distanceKm ?? null,
  })
  if (error) fail(error, "Couldn't publish that ride.")
  return data?.id
}

export async function joinRide(rideId) {
  const sb = await must()
  const { error } = await sb.rpc('join_ride', { p_ride: rideId })
  if (error) fail(error, "Couldn't save your seat.")
}

export async function leaveRide(rideId) {
  const sb = await must()
  const { error } = await sb.rpc('leave_ride', { p_ride: rideId })
  if (error) fail(error, "Couldn't update your RSVP.")
}

export async function removeRider(rideId, memberId) {
  const sb = await must()
  const { error } = await sb.rpc('remove_rider', { p_ride: rideId, p_member: memberId })
  if (error) fail(error, "Couldn't update the roster.")
}

// Exact pin — the server releases this only to the captain and confirmed riders.
export async function getExactMeetup(rideId) {
  const sb = await must()
  const { data, error } = await sb.rpc('ride_meetup', { p_ride: rideId })
  if (error) fail(error, 'Join the ride to see the exact meetup point.')
  return data?.[0] ?? null
}

// ------------------------------------------------- identity & standing

// The shareable rider page. Readable without a session — that is the growth
// loop — so this is the one call that works signed out.
export async function getRiderIdentity(handle) {
  const sb = await getClient()
  if (!sb) return null
  const { data, error } = await sb.rpc('rider_identity', { p_handle: handle })
  if (error) fail(error, "Couldn't load that rider.")
  return data ?? null
}

export async function getFoundingStatus() {
  const sb = await getClient()
  if (!sb) return null
  const { data, error } = await sb.rpc('founding_status')
  if (error) return null           // a missing counter must never block a page
  return data?.[0] ?? null
}

export async function setProfileVisibility(isPublic, session) {
  const sb = await must()
  const { error } = await sb.from('profiles')
    .update({ profile_public: isPublic }).eq('id', session?.user?.id)
  if (error) fail(error, "Couldn't change your page visibility.")
}

// ---------------------------------------------------------------- chat

export async function listMessages(rideId) {
  const sb = await must()
  const { data, error } = await sb
    .from('ride_messages').select('*').eq('ride_id', rideId).order('created_at')
  if (error) fail(error, "Couldn't load the chat.")
  return data ?? []
}

export async function sendMessage(rideId, body, session) {
  const sb = await must()
  const { data, error } = await sb.from('ride_messages')
    .insert({ ride_id: rideId, sender_id: session?.user?.id, body })
    .select().single()
  if (error) fail(error, "Couldn't send that message.")
  return data
}

export function subscribeMessages(rideId, onInsert) {
  if (!isConfigured) return () => {}
  let cleanup = null
  let cancelled = false
  getClient().then((sb) => {
    if (cancelled) return
    const channel = sb
      .channel(`ride:${rideId}`)
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ride_messages', filter: `ride_id=eq.${rideId}` },
          (payload) => onInsert(payload.new))
      .subscribe()
    cleanup = () => sb.removeChannel(channel)
  })
  return () => { cancelled = true; if (cleanup) cleanup() }
}
