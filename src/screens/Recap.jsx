import { Suspense, lazy, useEffect, useState } from 'react'
import {
  Avatar, Eyebrow, GhostButton, PrimaryButton, Reveal, SplitWords, VerifiedBadge, formatRideDate,
} from '../components/ui'
import { NotFound } from '../components/States'
import { useMode } from '../lib/mode'
import { useUser } from '../lib/user'
import * as api from '../lib/api'
import { shareOrCopy, SHARE_MESSAGE } from '../lib/share'

const RouteMap = lazy(() => import('../components/RouteMap'))

export default function Recap({ ride, onBack, onBrowse }) {
  const { copy, getRecap, getRider, fetchRecap, live } = useMode()
  const { session } = useUser()
  const [shareNote, setShareNote] = useState('')
  // Prototype data resolves synchronously; the database does not. Both end up
  // in the same piece of state so the rest of this screen is unchanged.
  const [recap, setRecap] = useState(() => (live ? null : getRecap?.(ride.id) ?? null))
  const [loading, setLoading] = useState(live)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const captain = getRider(ride.captainId)

  // The gallery belongs to the people who were on the ride — the server
  // enforces that too, this just avoids showing a control that would fail.
  const canAddPhotos = live && session && ride.attendees?.includes('me')

  const onPickPhotos = async (e) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    setPhotoError('')
    try {
      for (const f of files) await api.addRidePhoto(ride.id, f, null, session)
      const fresh = await fetchRecap(ride.id)
      setRecap(fresh)
    } catch (err) {
      setPhotoError(err.message)
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (!live) { setRecap(getRecap?.(ride.id) ?? null); setLoading(false); return }
    let alive = true
    setLoading(true)
    fetchRecap(ride.id)
      .then((r) => { if (alive) setRecap(r) })
      .catch(() => { if (alive) setRecap(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, ride.id])

  const share = async () => {
    const res = await shareOrCopy({
      title: `${ride.title} — recap`,
      text: `${ride.title}: ${recap?.statsSummary?.distanceKm ?? ride.distanceKm} km logged with REV.`,
    })
    if (SHARE_MESSAGE[res]) {
      setShareNote(SHARE_MESSAGE[res])
      setTimeout(() => setShareNote(''), 2400)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-24" role="status" aria-label="Loading recap">
        <span className="skeleton block h-4 w-24 rounded" />
        <span className="skeleton mt-8 block h-12 w-3/4 rounded" />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <span key={i} className="skeleton block h-20 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  // a completed ride without a recap used to render nothing at all
  if (!recap) {
    return (
      <NotFound
        title="No recap yet."
        body="The captain hasn't posted this one. It usually lands within a day of the ride."
        actionLabel="Back to the ride"
        onAction={onBack}
      />
    )
  }
  const { statsSummary: s } = recap
  const attendees = recap.attendeeIds.map((id) => getRider(id)).filter(Boolean)

  const stats = [
    { label: 'Distance', value: s.distanceKm > 0 ? `${s.distanceKm} km` : '—' },
    { label: 'Moving time', value: s.movingTime },
    { label: 'Avg speed', value: s.avgSpeedKmh > 0 ? `${s.avgSpeedKmh} km/h` : '—' },
    { label: copy.peopleWord, value: s.riders },
    { label: 'Show-up rate', value: `${s.showUpRate}%`, hot: true },
    { label: 'Fuel stops', value: s.fuelStops },
  ]

  return (
    <div className="screen-enter mx-auto max-w-5xl px-6 pb-32 pt-10 lg:px-10">
      <Reveal>
        <button onClick={onBack} className="label-caps mb-8 flex cursor-pointer items-center gap-2 text-[11px] text-bone/50 transition-colors hover:text-bone">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back
        </button>
      </Reveal>

      {/* header */}
      <Reveal delay={60}>
        <Eyebrow>{copy.recapEyebrow} · {formatRideDate(ride.dateTime)}</Eyebrow>
        <SplitWords as="h1" text={ride.title} className="mt-2 block font-display text-4xl font-medium leading-[1.02] tracking-tight text-bone sm:text-6xl" />
        <p className="mt-4 flex items-center gap-2 text-sm text-bone/55">
          {copy.ledBy} <Avatar rider={captain} size="xs" />
          <span className="font-semibold text-bone/85">{captain.name}</span>
          {captain.verified && <VerifiedBadge />}
        </p>
      </Reveal>

      {/* stats band */}
      <Reveal delay={120}>
        <div className="glass mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((st) => (
            <div key={st.label} className="bg-asphalt-2/40 p-5 text-center">
              <p className={`font-display text-2xl font-black ${st.hot ? 'text-accent' : 'text-bone'}`}>{st.value}</p>
              <p className="label-caps mt-1.5 text-[9px] text-bone/40">{st.label}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* route replay — real map */}
      <Reveal delay={160}>
        <div className="glass relative mt-6 overflow-hidden rounded-2xl">
          <Suspense fallback={<div className="grid h-[300px] place-items-center bg-asphalt-2/50"><span className="label-caps text-[10px] text-bone/40">Loading map…</span></div>}>
            <RouteMap ride={ride} interactive={false} height={320} />
          </Suspense>
          <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-full glass-blur px-3 py-1.5">
            <span className="label-caps text-[9px] text-bone/70">Route replay · {ride.distanceKm} km</span>
          </div>
        </div>
      </Reveal>

      {/* photo wall */}
      <section className="mt-14">
        <Reveal>
          <Eyebrow>The photo wall</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-bone">Shot on the <em className="serif-italic text-accent">run.</em></h2>
        </Reveal>
        {recap.photos.length === 0 && (
          <Reveal delay={60}>
            <div className="mt-6 rounded-3xl border border-dashed border-bone/15 p-10 text-center">
              <p className="text-sm text-bone/55">
                {canAddPhotos
                  ? 'No shots yet. You were on this one — add the first.'
                  : 'No shots from this one yet.'}
              </p>
              {canAddPhotos && (
                <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-white transition-transform hover:scale-[1.03] active:scale-95">
                  <span className="label-caps text-[10px]">{uploading ? 'Uploading…' : 'Add photos'}</span>
                  <input type="file" accept="image/*" multiple className="hidden"
                         disabled={uploading} onChange={onPickPhotos} />
                </label>
              )}
              {photoError && <p className="mt-3 text-xs text-accent">{photoError}</p>}
            </div>
          </Reveal>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          {recap.photos.map((p, i) => (
            <Reveal key={p.id} delay={i * 70}>
              <figure data-cursor="View" className={`group relative overflow-hidden rounded-2xl shadow-lux ${i % 5 === 0 ? 'row-span-2' : ''}`}>
                <img
                  src={p.src}
                  alt={p.caption}
                  loading="lazy"
                  className={`w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.08] ${i % 5 === 0 ? 'aspect-[3/4.1]' : 'aspect-[4/3]'}`}
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
                  <p className="text-xs font-medium text-white/90">{p.caption}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        {recap.photos.length > 0 && canAddPhotos && (
          <div className="mt-5 flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full glass-lite px-4 py-2 text-bone/70 transition-colors hover:text-bone">
              <span className="label-caps text-[10px]">{uploading ? 'Uploading…' : 'Add your shots'}</span>
              <input type="file" accept="image/*" multiple className="hidden"
                     disabled={uploading} onChange={onPickPhotos} />
            </label>
            {photoError && <span className="text-xs text-accent">{photoError}</span>}
          </div>
        )}
      </section>

      {/* who rode / drove */}
      <section className="mt-14">
        <Reveal>
          <Eyebrow className="!text-volt">{copy.whoHeading}</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-bone">
            {attendees.length} {attendees.length === 1 ? copy.personSingular : copy.personPlural}.{' '}
            <em className="serif-italic text-accent">{s.showUpRate}% showed up.</em>
          </h2>
          <p className="mt-2 max-w-lg text-sm text-bone/50">{copy.whoSub}</p>
        </Reveal>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attendees.map((r, i) => (
            <Reveal key={r.id} delay={(i % 3) * 80}>
              <div className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:border-volt/25">
                <Avatar rider={r} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-bone">
                    {r.name} {r.verified && <VerifiedBadge />}
                  </p>
                  <p className="text-xs text-bone/45">{r.ridesCount} {r.ridesCount === 1 ? copy.loggedSingular : copy.logged}</p>
                </div>
                {r.id === ride.captainId && (
                  <span className="label-caps rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[9px] text-accent">{copy.captain}</span>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* next */}
      <Reveal delay={100}>
        <div className="mt-16 flex flex-col items-center gap-4 rounded-3xl border border-bone/8 bg-asphalt-2/40 p-10 text-center">
          <h3 className="font-display text-3xl font-medium tracking-tight text-bone">Good one. <em className="serif-italic text-accent">Next?</em></h3>
          <p className="max-w-sm text-sm text-bone/50">{copy.nextHint}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <PrimaryButton onClick={onBrowse}>{copy.nextCta}</PrimaryButton>
            <GhostButton onClick={share}>{shareNote || 'Share recap'}</GhostButton>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
