import { useEffect, useMemo, useState } from 'react'
import { Avatar, Eyebrow, GhostButton, PrimaryButton, Reveal, VerifiedBadge } from '../components/ui'
import { ErrorState, NotFound } from '../components/States'
import { shareOrCopy, SHARE_MESSAGE } from '../lib/share'
import { riderCard, shareCardImage } from '../lib/shareCard'
import * as api from '../lib/api'
import SafetySheet from './../components/SafetySheet'

/* ---------------------------------------------------------------------------
   The Rider Identity Page — REV's growth loop.

   A rider shares this; someone who is not a member opens it. So it must render
   for a logged-out visitor, load fast, and be worth screenshotting. Everything
   on it is earned: the founding number, the captain rank, the badges and the
   ride record all come from the server, and none of them can be bought.

   The server decides what appears here. This component renders whatever
   rider_identity() returns and asks for nothing else, so there is no path by
   which a private field could reach the page.
   --------------------------------------------------------------------------- */

const RANK_LABEL = {
  captain: 'Captain',
  founding_captain: 'Founding captain',
  corridor_legend: 'Corridor legend',
}

const KIND_TONE = {
  verification: 'text-volt border-volt/30 bg-volt/8',
  founding: 'text-accent border-accent/35 bg-accent/8',
  captain: 'text-accent border-accent/35 bg-accent/8',
  riding: 'text-bone/70 border-bone/15 bg-bone/5',
}

function Stat({ value, label }) {
  return (
    <div className="min-w-0">
      <p className="font-display text-3xl font-medium leading-none tracking-tight text-bone tabular-nums sm:text-4xl">
        {value}
      </p>
      <p className="label-caps mt-1.5 text-[9px] text-bone/40">{label}</p>
    </div>
  )
}

function Badge({ badge }) {
  const tone = KIND_TONE[badge.kind] ?? KIND_TONE.riding
  const num = badge.detail?.number
  return (
    <span
      title={badge.description}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${tone}`}
    >
      <span className="label-caps text-[9px]">{badge.label}</span>
      {num != null && <span className="text-[10px] font-bold tabular-nums">#{num}</span>}
    </span>
  )
}

function MachineCard({ machine }) {
  const [open, setOpen] = useState(false)
  const rides = machine.milestones?.filter((m) => m.kind === 'ride') ?? []
  const km = rides.reduce((s, m) => s + (Number(m.detail?.distance_km) || 0), 0)

  return (
    <div className="card-3d overflow-hidden rounded-3xl">
      <div className="card-face">
        <div className="relative h-40 bg-asphalt-2/60">
          {machine.photos?.[0] ? (
            <img src={machine.photos[0]} alt="" className="h-full w-full object-cover opacity-70" />
          ) : (
            <div className="grid h-full place-items-center">
              <span className="label-caps text-[10px] text-bone/25">
                {machine.mode === 'car' ? 'Four-wheeler' : 'Two-wheeler'}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-asphalt via-asphalt/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="label-caps text-[9px] text-accent">{machine.make}</p>
            <p className="font-display text-xl font-medium tracking-tight text-bone">{machine.model}</p>
            <p className="mt-0.5 text-[11px] text-bone/50">
              {[machine.year, machine.extra, machine.ride_style].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-b border-bone/8 px-5 py-4">
          <div>
            <p className="label-caps text-[9px] text-bone/40">Rides on this machine</p>
            <p className="font-display text-lg text-bone tabular-nums">{rides.length}</p>
          </div>
          <div>
            <p className="label-caps text-[9px] text-bone/40">Distance logged</p>
            <p className="font-display text-lg text-bone tabular-nums">{Math.round(km)} km</p>
          </div>
        </div>

        {machine.mods?.length > 0 && (
          <div className="border-b border-bone/8 px-5 py-4">
            <p className="label-caps mb-2 text-[9px] text-bone/40">Mods</p>
            <div className="flex flex-wrap gap-1.5">
              {machine.mods.map((m) => (
                <span key={m} className="rounded-full border border-bone/12 px-2.5 py-1 text-[11px] text-bone/65">{m}</span>
              ))}
            </div>
          </div>
        )}

        {rides.length > 0 && (
          <div className="px-5 py-4">
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="label-caps flex w-full cursor-pointer items-center justify-between text-[9px] text-bone/45 hover:text-bone"
            >
              Its story
              <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
              </span>
            </button>
            {open && (
              <ul className="mt-3 space-y-2.5 border-l border-bone/12 pl-4">
                {rides.slice(0, 12).map((m, i) => (
                  <li key={i}>
                    <p className="text-[12.5px] text-bone/80">{m.label}</p>
                    <p className="text-[10.5px] text-bone/35">
                      {new Date(m.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {m.detail?.distance_km ? ` · ${m.detail.distance_km} km` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Identity({ handle, onBack, onJoin, signedIn, myHandle }) {
  const [rider, setRider] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | missing | error
  const [err, setErr] = useState('')
  const [shareNote, setShareNote] = useState('')
  const [cardBusy, setCardBusy] = useState(false)
  const [safetyOpen, setSafetyOpen] = useState(false)
  const [subjectId, setSubjectId] = useState(null)

  useEffect(() => {
    let alive = true
    setState('loading')
    api.getRiderIdentity(handle)
      .then((r) => {
        if (!alive) return
        if (!r) { setState('missing'); return }
        setRider(r)
        setState('ready')
      })
      .catch((e) => { if (alive) { setErr(e.message); setState('error') } })
    return () => { alive = false }
  }, [handle])

  // A drawn card beats a screenshot: right ratio, wordmark, only what matters.
  const shareCard = async () => {
    if (cardBusy) return
    setCardBusy(true)
    try {
      const accent = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent').trim() || '#A64B2A'
      const blob = await riderCard(rider, accent)
      const res = await shareCardImage(blob, `rev-${rider.handle}.png`, `${rider.display_name} on REV`)
      if (res !== 'cancelled') {
        setShareNote(res === 'shared' ? 'Shared' : 'Card saved')
        setTimeout(() => setShareNote(''), 2600)
      }
    } catch {
      setShareNote("Couldn't make the card")
      setTimeout(() => setShareNote(''), 2600)
    } finally {
      setCardBusy(false)
    }
  }

  const share = async () => {
    const res = await shareOrCopy({
      title: `${rider.display_name} on REV`,
      text: `${rider.display_name} — ${rider.rides_count} rides logged on REV.`,
      url: `${window.location.origin}/r/${rider.handle}`,
    })
    if (SHARE_MESSAGE[res]) {
      setShareNote(SHARE_MESSAGE[res])
      setTimeout(() => setShareNote(''), 2400)
    }
  }

  const since = useMemo(() => {
    if (!rider?.member_since) return ''
    return new Date(rider.member_since).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  }, [rider])

  if (state === 'loading') {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24" role="status" aria-label="Loading rider">
        <div className="flex items-center gap-5">
          <span className="skeleton block h-24 w-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <span className="skeleton block h-4 w-28 rounded" />
            <span className="skeleton block h-8 w-64 rounded" />
            <span className="skeleton block h-3 w-40 rounded" />
          </div>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <span className="skeleton block h-64 rounded-3xl" />
          <span className="skeleton block h-64 rounded-3xl" />
        </div>
      </div>
    )
  }

  if (state === 'missing') {
    return (
      <NotFound
        title="No rider here."
        body={`Nobody is riding under @${handle}, or they have made their page private.`}
        actionLabel="Back"
        onAction={onBack}
      />
    )
  }

  if (state === 'error') {
    return <ErrorState title="Couldn't load that rider." body={err} onBack={onBack} />
  }

  const isMe = myHandle && rider.handle === myHandle
  const rank = RANK_LABEL[rider.captain_rank]
  const asRider = { name: rider.display_name, verified: rider.is_verified }

  return (
    <div className="screen-enter mx-auto max-w-4xl px-6 pb-32 pt-10 lg:px-10">
      <Reveal>
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="label-caps flex cursor-pointer items-center gap-2 text-[11px] text-bone/50 transition-colors hover:text-bone"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Back
          </button>
          <div className="flex items-center gap-2">
            {shareNote && <span className="label-caps text-[10px] text-volt">{shareNote}</span>}
            {signedIn && !isMe && (
              <button
                onClick={async () => {
                  try { setSubjectId(await api.getMemberIdByHandle(rider.handle)) } catch { /* sheet shows the failure */ }
                  setSafetyOpen(true)
                }}
                aria-label="Report or block this rider"
                title="Report or block"
                data-cursor="Safety"
                className="tap grid h-9 w-9 place-items-center rounded-full text-bone/35 transition-colors hover:bg-bone/8 hover:text-bone/70"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
              </button>
            )}
            <GhostButton onClick={share} className="!px-4 !py-2 !text-[12px]">Copy link</GhostButton>
            <PrimaryButton
              onClick={shareCard}
              magnetic={false}
              cursor="Share"
              className={`!px-4 !py-2 !text-[12px] ${cardBusy ? '!opacity-50 pointer-events-none' : ''}`}
            >
              {cardBusy ? 'Drawing…' : 'Share card'}
            </PrimaryButton>
          </div>
        </div>
      </Reveal>

      {/* identity header */}
      <Reveal delay={60}>
        <header className="mt-9 flex flex-wrap items-start gap-6">
          <Avatar rider={asRider} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <Eyebrow>{rank ?? 'Rider'}</Eyebrow>
              {rider.founding_number != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent/8 px-2.5 py-1">
                  <span className="label-caps text-[9px] text-accent">Founding</span>
                  <span className="text-[11px] font-bold tabular-nums text-accent">#{rider.founding_number}</span>
                </span>
              )}
            </div>
            <h1 className="mt-1.5 flex flex-wrap items-center gap-2.5 font-display text-4xl font-medium leading-tight tracking-tight text-bone sm:text-5xl">
              {rider.display_name}
              {rider.is_verified && <VerifiedBadge size="lg" />}
            </h1>
            <p className="mt-2 text-sm text-bone/50">
              @{rider.handle} · {rider.corridor || rider.city} · member since {since}
            </p>
            {rider.bio && <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-bone/70">{rider.bio}</p>}
          </div>
        </header>
      </Reveal>

      {/* the ride record — the durable status object */}
      <Reveal delay={110}>
        <section className="mt-10 grid grid-cols-2 gap-6 border-y border-bone/10 py-7 sm:grid-cols-4">
          <Stat value={rider.rides_count} label="Rides ridden" />
          <Stat value={rider.rides_led} label="Rides led" />
          <Stat value={rider.machines?.length ?? 0} label="Machines" />
          <Stat value={rider.badges?.length ?? 0} label="Marks earned" />
        </section>
      </Reveal>

      {/* earned marks */}
      {rider.badges?.length > 0 && (
        <Reveal delay={150}>
          <section className="mt-9">
            <p className="label-caps mb-3 text-[10px] text-bone/40">Earned</p>
            <div className="flex flex-wrap gap-2">
              {rider.badges.map((b) => <Badge key={b.code} badge={b} />)}
            </div>
            <p className="mt-3 text-[11px] text-bone/30">
              Every mark here was earned by riding or verification. None can be purchased.
            </p>
          </section>
        </Reveal>
      )}

      {/* the garage */}
      <Reveal delay={190}>
        <section className="mt-12">
          <h2 className="font-display text-2xl font-medium tracking-tight text-bone">
            The <em className="serif-italic text-accent">garage.</em>
          </h2>
          {rider.machines?.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {rider.machines.map((m) => <MachineCard key={m.id} machine={m} />)}
            </div>
          ) : (
            <p className="mt-4 text-sm text-bone/45">No machine parked yet.</p>
          )}
        </section>
      </Reveal>

      {safetyOpen && (
        <SafetySheet
          member={{ uid: subjectId, display_name: rider.display_name }}
          onClose={() => { setSafetyOpen(false); setSubjectId(null) }}
        />
      )}

      {/* the loop: a visitor who is not a member */}
      {!signedIn && (
        <Reveal delay={230}>
          <section className="mt-14 rounded-3xl border border-bone/10 bg-asphalt-2/40 p-8 text-center">
            <Eyebrow>Verified riders only</Eyebrow>
            <h3 className="mt-2 font-display text-2xl font-medium tracking-tight text-bone">
              This is what a rider looks like <em className="serif-italic text-accent">on REV.</em>
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-bone/55">
              One verified number, one garage, one record that follows you. Build yours.
            </p>
            <PrimaryButton onClick={onJoin} magnetic={false} className="mt-6">
              Claim your page
            </PrimaryButton>
          </section>
        </Reveal>
      )}
    </div>
  )
}
