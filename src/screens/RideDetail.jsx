import { Suspense, lazy, useEffect, useState } from 'react'
import RouteThumb from '../components/RouteThumb'
import {
  Avatar, Eyebrow, GhostButton, IconButton, PrimaryButton, Reveal,
  StatusTag, VerifiedBadge, formatRideDate, formatRideTime,
} from '../components/ui'
import { useMode } from '../lib/mode'
import { useUser } from '../lib/user'
import { shareOrCopy, SHARE_MESSAGE } from '../lib/share'
import * as api from '../lib/api'
import { currentUser } from '../data/mock'
import RideChat from '../components/RideChat'
import RosterManager from '../components/RosterManager'

const RouteMap = lazy(() => import('../components/RouteMap'))

export default function RideDetail({ ride, onBack, onOpenRecap }) {
  const { mode, copy, getRider, getVehicleFor, joinRide, leaveRide, live } = useMode()
  const { requireAuth, profile } = useUser()
  const [bookmarked, setBookmarked] = useState(false)
  const [realRoute, setRealRoute] = useState(null) // real OSRM distance/time once loaded
  const [rosterOpen, setRosterOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const [exactPin, setExactPin] = useState(null)
  const [shareNote, setShareNote] = useState('')

  const share = async () => {
    const res = await shareOrCopy({
      title: ride.title,
      text: `${ride.title} — ${formatRideDate(ride.dateTime)} from ${ride.meetupPin.label}`,
    })
    if (SHARE_MESSAGE[res]) {
      setShareNote(SHARE_MESSAGE[res])
      setTimeout(() => setShareNote(''), 2400)
    }
  }

  // RSVP state derives from the shared store — joins/leaves reflect in the feed.
  const isLead = ride.captainId === currentUser.id
  const joined = ride.attendees.includes(currentUser.id)
  const captain = getRider(ride.captainId)
  const captainBike = getVehicleFor(ride.captainId)
  // your own roster entry shows the live profile, not the demo identity
  const attendees = ride.attendees
    .map((id) => (id === currentUser.id && profile ? profile : getRider(id)))
    .filter(Boolean)
  const spotsLeft = ride.capacity - attendees.length
  const isFull = spotsLeft <= 0
  const isDone = ride.status === 'completed'

  // The public listing carries a point snapped to ~1km. Captains and confirmed
  // riders get the real one, which the server releases only to them — so this
  // request is the payoff for the privacy design, not a decoration.
  useEffect(() => {
    if (!live || !(joined || isLead)) { setExactPin(null); return }
    let alive = true
    api.getExactMeetup(ride.id)
      .then((p) => { if (alive && p) setExactPin(p) })
      .catch(() => {}) // refusal is expected until you are on the roster
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, ride.id, joined, isLead])


  return (
    <div className="screen-enter mx-auto max-w-5xl px-6 pb-32 pt-10 lg:px-10">
      {/* top bar */}
      <Reveal>
        <div className="mb-8 flex items-center justify-between">
          <button onClick={onBack} className="label-caps flex cursor-pointer items-center gap-2 text-[11px] text-bone/50 transition-colors hover:text-bone">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            {copy.backToFeed}
          </button>
          <div className="flex items-center gap-2">
            {shareNote && <span className="label-caps mr-1 text-[10px] text-volt">{shareNote}</span>}
            <IconButton label="Share" onClick={share}>
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
            </IconButton>
            <IconButton label={bookmarked ? 'Remove bookmark' : 'Bookmark'} onClick={() => setBookmarked(!bookmarked)}
              className={bookmarked ? '!text-accent !border-accent/40' : ''}>
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>
            </IconButton>
          </div>
        </div>
      </Reveal>

      {/* hero map */}
      <Reveal delay={80}>
        <div className="glass relative overflow-hidden rounded-3xl">
          <RouteThumb ride={ride} tall />
          <div className="absolute inset-0 bg-gradient-to-t from-asphalt via-asphalt/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <StatusTag status={ride.status} />
                {ride.distanceKm > 0 && (
                  <span className="label-caps text-[10px] text-bone/60">{ride.distanceKm} km</span>
                )}
              </div>
              <h1 className="max-w-xl font-display text-3xl font-medium leading-[1.05] tracking-tight text-bone sm:text-5xl">
                {ride.title}
              </h1>
              <p className="label-caps mt-3 text-[11px] text-bone/55">
                {formatRideDate(ride.dateTime)} · {formatRideTime(ride.dateTime)}
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* left column */}
        <div className="flex flex-col gap-8">
          {/* route on a real map */}
          <Reveal delay={120}>
            <section className="glass overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between px-6 pt-6">
                <Eyebrow className="!text-volt">The route {realRoute?.real && <span className="ml-1 text-bone/35 normal-case tracking-normal">· live</span>}</Eyebrow>
                <span className="label-caps text-[10px] text-bone/45">
                  {ride.distanceKm > 0
                    ? `${realRoute?.km ?? ride.distanceKm} km${realRoute?.minutes ? ` · ${realRoute.minutes} min` : ''}`
                    : 'Static meet'}
                </span>
              </div>
              <div className="mt-4">
                <Suspense fallback={<div className="grid h-[300px] place-items-center bg-asphalt-2/50"><span className="label-caps text-[10px] text-bone/40">Loading map…</span></div>}>
                  <RouteMap
                    ride={exactPin
                      ? { ...ride, id: `${ride.id}-exact`,
                          meetupPin: { ...ride.meetupPin, lat: exactPin.lat, lng: exactPin.lng } }
                      : ride}
                    interactive height={300} onRoute={setRealRoute} />
                </Suspense>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-volt/10 text-volt glow-volt">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  </span>
                  <div>
                    <p className="label-caps text-[9px] text-bone/40">Meetup</p>
                    <p className="text-sm font-semibold text-bone">{ride.meetupPin.label}</p>
                    {live && (
                      exactPin ? (
                        <p className="mt-0.5 text-[11px] tabular-nums text-volt">
                          {exactPin.lat.toFixed(5)}, {exactPin.lng.toFixed(5)} · exact pin
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-bone/35">
                          Approximate — join to get the exact pin
                        </p>
                      )
                    )}
                  </div>
                </div>
                {ride.destination && (
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </span>
                    <div>
                      <p className="label-caps text-[9px] text-bone/40">Destination</p>
                      <p className="text-sm font-semibold text-bone">{ride.destination.label}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-bone/8 px-6 py-5">
                <p className="leading-relaxed text-bone/75">{ride.route}</p>
              </div>
            </section>
          </Reveal>

          {/* safety notes — warning amber in both modes */}
          <Reveal delay={200}>
            <section className="rounded-2xl border border-ember/25 bg-ember/5 p-6">
              <div className="flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-ember" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
                <Eyebrow className="!text-ember">{copy.safetyEyebrow}</Eyebrow>
              </div>
              <p className="mt-3 leading-relaxed text-bone/75">{ride.safetyNotes}</p>
            </section>
          </Reveal>

          {/* verified attendee list */}
          <Reveal delay={240}>
            <section className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <Eyebrow className="!text-volt">Verified attendee list</Eyebrow>
                <span className="label-caps text-[10px] text-bone/45">{attendees.length}/{ride.capacity}</span>
              </div>
              <ul className="mt-4 divide-y divide-bone/6">
                {attendees.map((r) => {
                  const bike = r.id === currentUser.id ? null : getVehicleFor(r.id)
                  const isCaptain = r.id === ride.captainId
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-3">
                      <Avatar rider={r} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-bone">
                          {r.name} {r.id === currentUser.id && <span className="text-bone/40">(you)</span>}{' '}
                          {r.verified && <VerifiedBadge />}
                        </p>
                        <p className="truncate text-xs text-bone/45">
                          {bike ? `${bike.make} ${bike.model}` : `${r.ridesCount} ${copy.logged}`}
                        </p>
                      </div>
                      {isCaptain && (
                        <span className="label-caps rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[9px] text-accent">{copy.captain}</span>
                      )}
                      {!r.verified && (
                        <span className="label-caps rounded-full border border-bone/15 px-2.5 py-1 text-[9px] text-bone/40">Pending</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          </Reveal>

          {/* ride-scoped group chat — gated behind RSVP */}
          {!isDone && (
            <Reveal delay={280}>
              <RideChat ride={ride} canChat={joined || isLead} />
            </Reveal>
          )}
        </div>

        {/* right column — captain + RSVP */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <Reveal delay={140}>
            <section className="glass rounded-2xl p-6">
              <Eyebrow>{copy.captainTitle}</Eyebrow>
              <div className="mt-4 flex items-center gap-4">
                <Avatar rider={captain} size="lg" />
                <div>
                  <p className="font-display text-lg font-bold text-bone">
                    {captain.name} {captain.verified && <VerifiedBadge size="lg" />}
                  </p>
                  <p className="text-xs text-bone/50">{captain.ridesCount} {copy.logged.split(' ')[0]} · since {new Date(captain.joinedDate).getFullYear()}</p>
                </div>
              </div>
              {captainBike && (
                <p className="mt-4 rounded-xl bg-asphalt/60 px-4 py-3 text-sm text-bone/65">
                  {copy.ridesA} <span className="font-semibold text-bone">{captainBike.make} {captainBike.model}</span>
                  <span className="text-bone/40"> · {captainBike.rideStyle}</span>
                </p>
              )}
            </section>
          </Reveal>

          <Reveal delay={180}>
            <section className="glass rounded-2xl p-6 text-center">
              {actionError && <p className="mb-3 text-xs text-accent">{actionError}</p>}
              {isDone ? (
                <>
                  <p className="text-sm text-bone/55">This one's in the books.</p>
                  <PrimaryButton onClick={() => onOpenRecap(ride.id)} className="mt-4 w-full">
                    View the recap
                  </PrimaryButton>
                </>
              ) : isLead ? (
                <>
                  <span className="mb-1 inline-block rounded-full bg-accent/12 px-3 py-1"><span className="label-caps text-[9px] text-accent">You're the {copy.captain.toLowerCase()}</span></span>
                  <p className="mt-2 font-display text-lg font-medium text-bone">You're leading this {mode === 'bike' ? 'ride' : 'drive'}.</p>
                  <p className="mt-1 text-xs text-bone/50">{attendees.length - 1 > 0 ? `${attendees.length - 1} rider${attendees.length - 1 === 1 ? '' : 's'} riding with you.` : 'Share it to fill the roster.'}</p>
                  <PrimaryButton onClick={() => setRosterOpen(true)} className="mt-4 w-full" cursor="Manage">
                    Manage roster
                  </PrimaryButton>
                </>
              ) : joined ? (
                <>
                  <p className="font-display text-lg font-bold text-volt text-glow-volt">{copy.rsvpJoined}</p>
                  <p className="mt-1 text-xs text-bone/50">
                    Meetup pin and updates land in your group chat.
                  </p>
                  <GhostButton onClick={() => Promise.resolve(leaveRide(ride.id)).catch((e) => setActionError(e.message))} className="mt-4 w-full !border-bone/15 !text-bone/55 hover:!border-red-400/40 hover:!text-red-300">
                    {copy.rsvpBackOut}
                  </GhostButton>
                </>
              ) : isFull ? (
                <>
                  <p className="font-display text-lg font-bold text-bone/70">Roster's full.</p>
                  <p className="mt-1 text-xs text-bone/50">Bookmark it — cancellations open spots.</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-bone/55">
                    {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left · one tap, no forms
                  </p>
                  <PrimaryButton onClick={() => requireAuth(() => { Promise.resolve(joinRide(ride.id)).catch((e) => setActionError(e.message)) })} className="mt-4 w-full">
                    {copy.rsvpCta}
                  </PrimaryButton>
                  <p className="mt-3 text-[11px] leading-relaxed text-bone/35">
                    RSVP puts your verified profile on the roster. No-shows are tracked — that's the point.
                  </p>
                </>
              )}
            </section>
          </Reveal>
        </div>
      </div>

      {rosterOpen && (
        <RosterManager ride={ride} attendees={attendees} onClose={() => setRosterOpen(false)} />
      )}
    </div>
  )
}
