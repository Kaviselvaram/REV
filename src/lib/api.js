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

// ------------------------------------------------- recaps & ride photos

/* Returns the recap in exactly the shape data/mock.js produced, so the Recap
   screen renders it without knowing where it came from. Ride photos live in a
   private bucket — a gallery belongs to the people who were on that ride — so
   each one is served through a short-lived signed URL rather than a public one. */
export async function getRecap(rideId) {
  const sb = await must()

  const [{ data: recap }, { data: photos }, { data: roster }] = await Promise.all([
    sb.from('recaps').select('*').eq('ride_id', rideId).maybeSingle(),
    sb.from('ride_photos').select('*').eq('ride_id', rideId).order('created_at'),
    sb.from('ride_attendees').select('member_id').eq('ride_id', rideId).eq('status', 'joined'),
  ])
  if (!recap) return null

  let withUrls = []
  if (photos?.length) {
    const { data: signed } = await sb.storage
      .from('ride-photos')
      .createSignedUrls(photos.map((p) => p.storage_path), 60 * 60)
    withUrls = photos.map((p, i) => ({
      id: p.id,
      caption: p.caption ?? '',
      src: signed?.[i]?.signedUrl ?? null,
      memberId: p.member_id,
    })).filter((p) => p.src)
  }

  const riders = roster?.length ?? 0
  return {
    rideId,
    note: recap.note ?? '',
    photos: withUrls,
    attendeeIds: (roster ?? []).map((r) => r.member_id),
    statsSummary: {
      distanceKm: recap.distance_km ? Number(recap.distance_km) : 0,
      // these are not measured yet — shown as em dashes rather than invented
      movingTime: '—',
      avgSpeedKmh: 0,
      riders,
      showUpRate: riders > 0 ? 100 : 0,
      fuelStops: '—',
    },
  }
}

export async function addRidePhoto(rideId, file, caption, session) {
  const sb = await must()
  const uid = session?.user?.id
  if (!uid) throw new Error('Sign in to add photos.')

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${rideId}/${uid}/${crypto.randomUUID()}.${ext}`

  const { error: upErr } = await sb.storage.from('ride-photos')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (upErr) fail(upErr, "Couldn't upload that photo.")

  const { error } = await sb.rpc('add_ride_photo', {
    p_ride: rideId, p_path: path, p_caption: caption || null,
  })
  if (error) {
    await sb.storage.from('ride-photos').remove([path]) // do not orphan the file
    fail(error, "Couldn't add that photo to the ride.")
  }
}

export async function removeRidePhoto(photoId, storagePath) {
  const sb = await must()
  const { error } = await sb.from('ride_photos').delete().eq('id', photoId)
  if (error) fail(error, "Couldn't remove that photo.")
  await sb.storage.from('ride-photos').remove([storagePath]).catch(() => {})
}

/* Machine and avatar shots go to public buckets: they appear on a shared
   identity page a logged-out visitor has to be able to render. */
async function uploadPublic(bucket, file, session) {
  const sb = await must()
  const uid = session?.user?.id
  if (!uid) throw new Error('Sign in first.')
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${uid}/${crypto.randomUUID()}.${ext}`
  const { error } = await sb.storage.from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) fail(error, "Couldn't upload that image.")
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export const uploadMachinePhoto = (file, session) => uploadPublic('machines', file, session)
export const uploadAvatar       = (file, session) => uploadPublic('avatars', file, session)

// ------------------------------------------------- trust & safety

/* The public identity projection deliberately omits the member id, so a
   signed-in member reporting from a rider page needs to resolve the handle
   first. No new exposure: profiles are already readable to members. */
export async function getMemberIdByHandle(handle) {
  const sb = await must()
  const { data } = await sb.from('profiles').select('id').eq('handle', handle).maybeSingle()
  return data?.id ?? null
}

export async function reportMember({ subjectId, reason, detail, rideId }) {
  const sb = await must()
  const { error } = await sb.rpc('report_member', {
    p_subject: subjectId, p_reason: reason, p_detail: detail || null, p_ride: rideId || null,
  })
  if (error) fail(error, "Couldn't file that report.")
}

export async function blockMember(memberId, session) {
  const sb = await must()
  const { error } = await sb.from('blocks')
    .insert({ blocker_id: session?.user?.id, blocked_id: memberId })
  if (error && error.code !== '23505') fail(error, "Couldn't block that member.")
}

export async function unblockMember(memberId, session) {
  const sb = await must()
  const { error } = await sb.from('blocks').delete()
    .eq('blocker_id', session?.user?.id).eq('blocked_id', memberId)
  if (error) fail(error, "Couldn't unblock that member.")
}

export async function listBlocked(session) {
  const sb = await must()
  const uid = session?.user?.id
  if (!uid) return []
  const { data, error } = await sb.from('blocks')
    .select('blocked_id, created_at').eq('blocker_id', uid)
  if (error) return []
  if (!data?.length) return []
  const { data: profiles } = await sb.from('profiles')
    .select('id, handle, display_name').in('id', data.map((b) => b.blocked_id))
  return (profiles ?? []).map((p) => ({ ...p, blockedAt: data.find((b) => b.blocked_id === p.id)?.created_at }))
}

// ------------------------------------------------- SOS & emergency contacts

export async function getEmergencyContacts() {
  const sb = await must()
  const { data, error } = await sb.rpc('my_emergency_contacts')
  if (error) return []
  return data ?? []
}

export async function setEmergencyContacts(contacts) {
  const sb = await must()
  const { error } = await sb.rpc('set_emergency_contacts', { p_contacts: contacts })
  if (error) fail(error, "Couldn't save your emergency contacts.")
}

export async function raiseSos({ rideId, lat, lng, note }) {
  const sb = await must()
  const { data, error } = await sb.rpc('raise_sos', {
    p_ride: rideId ?? null, p_lat: lat ?? null, p_lng: lng ?? null, p_note: note ?? null,
  })
  if (error) fail(error, "Couldn't raise the alert.")
  return data
}

export async function updateSosLocation(lat, lng) {
  const sb = await must()
  await sb.rpc('update_sos_location', { p_lat: lat, p_lng: lng }).catch(() => {})
}

export async function resolveSos(cancelled = false) {
  const sb = await must()
  const { error } = await sb.rpc('resolve_sos', { p_cancelled: cancelled })
  if (error) fail(error, "Couldn't close the alert.")
}

export async function getActiveSos(session) {
  const sb = await must()
  const uid = session?.user?.id
  if (!uid) return null
  const { data } = await sb.from('sos_alerts')
    .select('*').eq('member_id', uid).eq('status', 'active')
    .order('raised_at', { ascending: false }).limit(1).maybeSingle()
  return data ?? null
}

// ------------------------------------------------- moderation

export async function amIModerator() {
  const sb = await getClient()
  if (!sb) return false
  const { data } = await sb.rpc('am_i_moderator')
  return data === true
}

export async function moderationQueue(status = 'open') {
  const sb = await must()
  const { data, error } = await sb.rpc('moderation_queue', { p_status: status })
  if (error) fail(error, "Couldn't load the queue.")
  return data ?? []
}

export async function resolveReport({ reportId, status, resolution, suspendDays }) {
  const sb = await must()
  const { error } = await sb.rpc('resolve_report', {
    p_report: reportId, p_status: status,
    p_resolution: resolution || null, p_suspend_days: suspendDays ?? null,
  })
  if (error) fail(error, "Couldn't resolve that report.")
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
