import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMode } from '../lib/mode'
import { useUser } from '../lib/user'
import { isConfigured } from '../lib/supabase'
import * as api from '../lib/api'
import { currentUser } from '../data/mock'
import { Avatar, VerifiedBadge, formatRideTime } from './ui'

// Ride-scoped group chat (Phase-0 MVP per strategy). In-memory only — the job
// WhatsApp does badly: verified roster, no ghosts. Gated behind RSVP so the
// chat is a reason to join, not a lobby to lurk in.
function seedMessages(ride, getRider, mode) {
  if (ride.captainId === 'me') return [] // your own ride starts with a clean chat
  const others = ride.attendees.filter((id) => id !== ride.captainId && id !== 'me').map(getRider).filter(Boolean)
  const verb = mode === 'bike' ? 'ride' : 'drive'
  const msgs = [
    { id: 's1', riderId: ride.captainId, text: `Roster's set. Flag-off sharp at ${formatRideTime(ride.dateTime)} from ${ride.meetupPin.label} — fuel up before you get there.`, min: 48 },
  ]
  if (others[0]) msgs.push({ id: 's2', riderId: others[0].id, text: `In. Bringing a spare tube and a pump, ping me if anyone needs.`, min: 41 })
  if (ride.destination) msgs.push({ id: 's3', riderId: ride.captainId, text: `We regroup before ${ride.destination.label} — nobody rides ahead of the lead.`, min: 33 })
  if (others[1]) msgs.push({ id: 's4', riderId: others[1].id, text: `First ${verb} with the club — how strict is the pace? 😄`, min: 20 })
  return msgs
}

export default function RideChat({ ride, canChat }) {
  const { mode, copy, getRider, live } = useMode()
  const { profile, session } = useUser()
  const seed = useMemo(() => seedMessages(ride, getRider, mode), [ride.id])
  const [messages, setMessages] = useState(live ? [] : seed)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)
  // React state updates are async, so two events fired in the same tick both
  // pass a state-based guard. A ref flips synchronously and cannot be raced.
  const sendLock = useRef(false)

  const toBubble = useCallback((row) => ({
    id: String(row.id),
    riderId: row.sender_id === session?.user?.id ? 'me' : row.sender_id,
    text: row.body,
    at: row.created_at,
  }), [session])

  const toBottom = () => requestAnimationFrame(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  })

  // Load history, then follow the room. The subscription is scoped to this
  // ride, and RLS still decides delivery — a member off the roster gets
  // nothing pushed to them, not merely a hidden UI.
  useEffect(() => {
    if (!live || !canChat || !isConfigured) return
    let alive = true
    ;(async () => {
      try {
        const rows = await api.listMessages(ride.id)
        if (!alive) return
        setMessages(rows.map(toBubble))
        toBottom()
      } catch (e) {
        if (alive) setError(e.message)
      }
    })()
    const off = api.subscribeMessages(ride.id, (row) => {
      setMessages((m) => (m.some((x) => x.id === String(row.id)) ? m : [...m, toBubble(row)]))
      toBottom()
    })
    return () => { alive = false; off() }
  }, [live, canChat, ride.id, toBubble])

  const send = async () => {
    const t = draft.trim()
    if (!t || sendLock.current) return
    sendLock.current = true

    if (!live) {
      setMessages((m) => [...m, { id: `me-${Date.now()}`, riderId: 'me', text: t, min: 0 }])
      setDraft('')
      toBottom()
      sendLock.current = false
      return
    }

    setSending(true)
    setError('')
    const optimistic = { id: `pending-${Date.now()}`, riderId: 'me', text: t, at: new Date().toISOString() }
    setMessages((m) => [...m, optimistic])
    setDraft('')
    toBottom()
    try {
      const row = await api.sendMessage(ride.id, t, session)
      // swap the optimistic bubble for the stored row (realtime may also
      // deliver it; toBubble ids keep that from duplicating)
      setMessages((m) => m.map((x) => (x.id === optimistic.id ? toBubble(row) : x))
                          .filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i))
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id))
      setDraft(t)
      setError(e.message)
    } finally {
      setSending(false)
      sendLock.current = false
    }
  }

  const stamp = (m) => {
    if (m.at) {
      const mins = Math.max(0, Math.round((Date.now() - new Date(m.at)) / 60000))
      return mins <= 0 ? 'now' : mins < 60 ? `${mins}m ago` : formatRideTime(m.at)
    }
    return m.min <= 0 ? 'now' : `${m.min}m ago`
  }

  return (
    <section className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-bone/8 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/10 text-accent">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H8l-4 4V5a2 2 0 012-2h13a2 2 0 012 2z" /></svg>
          </span>
          <div>
            <p className="label-caps text-[10px] text-accent">Ride chat</p>
            <p className="text-xs text-bone/45">{ride.attendees.length} on the roster · verified only</p>
          </div>
        </div>
        <span className="hidden items-center gap-1 sm:flex"><VerifiedBadge /></span>
      </div>

      {!canChat ? (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-bone/5 text-bone/40">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>
          </span>
          <p className="text-sm text-bone/60">The ride chat opens when you're on the roster.</p>
          <p className="max-w-xs text-xs text-bone/40">RSVP to {mode === 'bike' ? 'ride' : 'drive'} and you'll get the captain's briefs, meetup pin updates and the group.</p>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex max-h-80 flex-col gap-4 overflow-y-auto px-6 py-5">
            {messages.length === 0 && (
              <p className="py-6 text-center text-sm text-bone/40">You're the {copy.captain.toLowerCase()} — drop the first brief for your roster.</p>
            )}
            {messages.map((m) => {
              const r = getRider(m.riderId)
              const mine = m.riderId === 'me'
              const isCap = m.riderId === ride.captainId
              if (!r) return null
              return (
                <div key={m.id} className={`flex items-start gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
                  <Avatar rider={r} size="sm" />
                  <div className={`max-w-[78%] ${mine ? 'items-end text-right' : ''} flex flex-col`}>
                    <div className={`mb-1 flex items-center gap-1.5 ${mine ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-semibold text-bone/80">{mine ? 'You' : r.name.split(' ')[0]}</span>
                      {isCap && <span className="label-caps rounded-full bg-accent/10 px-1.5 py-0.5 text-[7px] text-accent">{copy.captain}</span>}
                      <span className="text-[10px] text-bone/35">{stamp(m)}</span>
                    </div>
                    <p className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${mine ? 'bg-accent text-white' : 'bg-asphalt-2/70 text-bone/85'}`}>
                      {m.text}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-2 border-t border-bone/8 p-3">
            <Avatar rider={profile ?? currentUser} size="sm" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Message the roster…"
              className="min-w-0 flex-1 rounded-full border border-bone/12 bg-white/60 px-4 py-2.5 text-sm text-bone outline-none transition-colors focus:border-accent/50"
            />
            <button
              onClick={send}
              disabled={!draft.trim()}
              data-cursor="Send"
              aria-label="Send"
              className="tap grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white transition-opacity disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>
            </button>
          </div>
        </>
      )}
    </section>
  )
}
