import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMode } from '../lib/mode'
import { useUser } from '../lib/user'
import { SPOTS, buildRoutePath, routeDistanceKm, currentUser } from '../data/mock'
import Select from '../components/Select'
import { Avatar, Eyebrow, GhostButton, PrimaryButton, VerifiedBadge } from '../components/ui'
import { LegalOverlay } from './Legal'
import * as api from '../lib/api'

const RouteMap = lazy(() => import('../components/RouteMap'))

// Sensible default: next Saturday, 06:00.
function defaultDate() {
  const d = new Date()
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7))
  return d.toISOString().slice(0, 10)
}
const spotByLabel = (l) => SPOTS.find((s) => s.label === l)

export default function CreateRide({ onClose, onCreated }) {
  const { mode, copy, addRide, corridors } = useMode()
  const { profile } = useUser()
  const noun = mode === 'bike' ? 'ride' : 'drive'
  const leadWord = copy.captain // Captain | Lead

  const [title, setTitle] = useState('')
  const [startLabel, setStartLabel] = useState('')
  const [destLabel, setDestLabel] = useState('')
  const [date, setDate] = useState(defaultDate())
  const [time, setTime] = useState('06:00')
  const [capacity, setCapacity] = useState('12')
  const [notes, setNotes] = useState('')
  const [corridor, setCorridor] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // The charter gate. REV is not the organiser of these rides, and that
  // position only holds if every captain accepted a written standard before
  // leading. The server refuses create_ride without it — this is the surface.
  const [charter, setCharter] = useState(null)   // { version, accepted }
  const [charterDoc, setCharterDoc] = useState(false)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    let alive = true
    api.getCharterStatus().then((c) => { if (alive) setCharter(c) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const acceptCharter = async () => {
    if (accepting) return
    setAccepting(true); setError('')
    try {
      const version = await api.acceptCharter()
      setCharter({ version, accepted: true })
    } catch (e) { setError(e.message) } finally { setAccepting(false) }
  }

  const start = spotByLabel(startLabel)
  const dest = destLabel && destLabel !== '— Static meet (no destination) —' ? spotByLabel(destLabel) : null
  const path = useMemo(() => (start ? buildRoutePath(start, dest) : null), [startLabel, destLabel])
  const distanceKm = path ? routeDistanceKm(path) : 0

  const capNum = parseInt(capacity, 10)
  const charterOk = charter?.accepted !== false
  const valid = title.trim().length >= 3 && start && !Number.isNaN(capNum) && capNum >= 2 && capNum <= 60 && date && time && charterOk

  const preview = start && {
    // id changes with the chosen route so the preview map re-inits on each pick
    id: `preview-${startLabel}-${destLabel}`, title: title || 'Your route',
    meetupPin: { lat: start.lat, lng: start.lng, label: start.label },
    destination: dest ? { lat: dest.lat, lng: dest.lng, label: dest.label } : undefined,
    routePath: path,
  }

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError('')
    const ride = {
      id: `me-${Date.now()}`,
      title: title.trim(),
      captainId: 'me',
      dateTime: `${date}T${time}:00+05:30`,
      meetupPin: { lat: start.lat, lng: start.lng, label: start.label },
      destination: dest ? { lat: dest.lat, lng: dest.lng, label: dest.label } : undefined,
      route: dest ? `${start.label} → ${dest.label}. Route shared on the map.` : `Static meet at ${start.label}.`,
      safetyNotes: notes.trim() || 'Bring full gear. Ride captain leads the pace — hold formation and no overtaking the lead.',
      attendees: ['me'],
      capacity: capNum,
      status: 'upcoming',
      distanceKm,
      routePath: path,
      city: 'Chennai',
      corridor: corridor || null,
      mine: true,
    }
    try {
      const id = await addRide(ride)
      onCreated(id ?? ride.id)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const destOptions = ['— Static meet (no destination) —', ...SPOTS.map((s) => s.label)]

  // Portal to <body> so `fixed` centering resolves against the viewport, not a
  // transformed screen ancestor (the feed's entrance animation leaves a transform).
  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/45 p-3 backdrop-blur-sm sm:p-5" onClick={onClose}>
      <div
        className="glass-blur relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.6rem] shadow-lux lg:grid lg:grid-cols-[1.05fr_0.95fr]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'screenIn 0.4s cubic-bezier(0.22,1,0.36,1) both' }}
      >
        {/* live map preview — a strip on mobile (top), full height on desktop (right, order-2) */}
        <div className="relative order-1 h-40 shrink-0 border-b border-bone/10 bg-asphalt-2/50 lg:order-2 lg:h-auto lg:border-b-0 lg:border-l">
          {preview ? (
            <Suspense fallback={<div className="grid h-full place-items-center text-bone/40"><span className="label-caps text-[10px]">Loading map…</span></div>}>
              <RouteMap ride={preview} interactive={false} height="100%" className="h-full" />
            </Suspense>
          ) : (
            <div className="grid h-full place-items-center p-6 text-center">
              <div>
                <svg viewBox="0 0 24 24" className="mx-auto h-9 w-9 text-bone/25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 20l-5.5-2.5v-13L9 7l6-2.5L20.5 7v13L15 17.5 9 20z" /><path d="M9 7v13M15 4.5v13" /></svg>
                <p className="mt-2 max-w-[16rem] text-xs text-bone/40">Pick a meetup point to preview the route.</p>
              </div>
            </div>
          )}
          {preview && (
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-full glass-blur px-3 py-1.5">
              <span className="label-caps text-[9px] text-bone/70">{dest ? `${distanceKm} km route` : 'Static meet'}</span>
            </div>
          )}
        </div>

        {/* form side */}
        <div className="order-2 flex min-h-0 flex-col p-6 lg:order-1 lg:p-7">
          <div className="flex items-center justify-between">
            <Eyebrow>Create a {noun}</Eyebrow>
            <button onClick={onClose} data-cursor="Close" aria-label="Close" className="tap grid h-8 w-8 place-items-center rounded-full glass-lite text-bone/60 hover:text-bone">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <h2 className="mt-1.5 font-display text-2xl font-medium tracking-tight text-bone">
            You're the <em className="serif-italic text-accent">{leadWord.toLowerCase()}.</em>
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-bone/55">
            Riders who join follow your lead — you own the pace, the pin and the brief.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <div className={`float-field ${title ? (title.trim().length >= 3 ? 'valid' : 'invalid') : ''}`}>
              <input id="cr-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder=" " autoComplete="off" maxLength={60} />
              <label htmlFor="cr-title">{mode === 'bike' ? 'Ride' : 'Drive'} title</label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select id="cr-start" label="Meetup point" value={startLabel} onChange={setStartLabel} options={SPOTS.map((s) => s.label)} />
              <Select id="cr-dest" label="Destination" value={destLabel} onChange={setDestLabel} options={destOptions} />
            </div>

            {corridors.length > 0 && (
              <Select
                id="cr-corridor"
                label="Corridor"
                value={corridor}
                onChange={setCorridor}
                options={corridors.map((c) => ({ value: c.id, label: c.name }))}
              />
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="float-field has-value">
                <input id="cr-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <label htmlFor="cr-date">Date</label>
              </div>
              <div className="float-field has-value">
                <input id="cr-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                <label htmlFor="cr-time">Flag-off</label>
              </div>
              <div className={`float-field ${capacity ? (capNum >= 2 && capNum <= 60 ? 'valid' : 'invalid') : ''}`}>
                <input id="cr-cap" value={capacity} inputMode="numeric" onChange={(e) => setCapacity(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder=" " />
                <label htmlFor="cr-cap">Seats</label>
              </div>
            </div>

            <div className="float-field">
              <input id="cr-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder=" " autoComplete="off" maxLength={120} />
              <label htmlFor="cr-notes">Safety brief (optional)</label>
            </div>
          </div>

          {charter && !charter.accepted && (
            <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/6 p-4">
              <p className="font-display text-[14px] font-semibold text-bone">
                Before you lead, accept the Ride Charter
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-bone/65">
                The standard every REV captain rides to — gear, formation, pace, and what you owe
                the group. Riders who join you are held to it too.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCharterDoc(true)}
                  className="label-caps cursor-pointer rounded-full glass-lite px-4 py-2 text-[10px] text-bone/70 hover:text-bone"
                >
                  Read it
                </button>
                <button
                  onClick={acceptCharter}
                  data-cursor="Accept"
                  className={`label-caps tap cursor-pointer rounded-full bg-accent px-4 py-2 text-[10px] text-white ${accepting ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {accepting ? 'Recording…' : 'I accept the charter'}
                </button>
              </div>
            </div>
          )}

          {error && <p className="mt-3 text-xs text-accent">{error}</p>}

          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="hidden items-center gap-2 whitespace-nowrap text-xs text-bone/55 sm:flex">
              <Avatar rider={profile ?? currentUser} size="sm" /> Led by you <VerifiedBadge />
            </span>
            <div className="flex flex-1 justify-end gap-2 sm:flex-none">
              <GhostButton onClick={onClose} className="!px-4 !py-2.5 !text-[13px]">Cancel</GhostButton>
              <PrimaryButton onClick={submit} magnetic={false} cursor="Publish"
                className={`whitespace-nowrap ${!valid || busy ? '!opacity-30 !shadow-none pointer-events-none' : ''}`}>
                {busy ? 'Publishing…' : `Publish ${noun}`}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
      {charterDoc && <LegalOverlay doc="charter" onClose={() => setCharterDoc(false)} />}
    </div>,
    document.body,
  )
}
