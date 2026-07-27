import { useCallback, useEffect, useRef, useState } from 'react'
import { useUser } from '../lib/user'
import { isConfigured } from '../lib/supabase'
import * as api from '../lib/api'

/* ---------------------------------------------------------------------------
   Notification bell.

   Every notification leads back to a ride, because the number that matters is
   rides per active member per month. Anything that does not is noise, and
   noise is how an inbox gets muted — after which the useful ones never arrive
   either.

   Opening the panel marks everything read. Per-item read tracking sounds
   tidier but means a badge that lingers after you have plainly seen it, which
   trains people to ignore the badge.
   --------------------------------------------------------------------------- */

const ICON = {
  ride_joined:     'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0M22 21v-2a4 4 0 00-3-3.87',
  ride_left:       'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0M17 11l4 4m0-4l-4 4',
  roster_removed:  'M18 6L6 18M6 6l12 12',
  ride_message:    'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  ride_cancelled:  'M10.3 3.6a2 2 0 013.4 0l7.4 12.8a2 2 0 01-1.7 3H4.6a2 2 0 01-1.7-3zM12 9v4M12 17h.01',
  meetup_released: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z',
  ride_reminder:   'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  recap_ready:     'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  verification:    'M20 6L9 17l-5-5',
  moderation:      'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
}

function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function NotificationBell({ onOpenRide }) {
  const { signedIn, session } = useUser()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef(null)
  const uid = session?.user?.id ?? null

  const load = useCallback(async () => {
    if (!isConfigured || !signedIn) return
    setLoading(true)
    try { setItems(await api.listNotifications()) }
    catch { /* the bell simply stays quiet */ }
    finally { setLoading(false) }
  }, [signedIn])

  useEffect(() => { load() }, [load])

  // live delivery, so a roster change lands without a refresh
  useEffect(() => {
    if (!signedIn || !uid) return
    return api.subscribeNotifications(uid, (row) => {
      setItems((cur) => [row, ...cur].slice(0, 30))
    })
  }, [signedIn, uid])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (!signedIn || !isConfigured) return null

  const unread = items.filter((n) => !n.read_at).length

  const openPanel = async () => {
    setOpen((o) => !o)
    if (!open && unread > 0) {
      // optimistic: the badge should clear the instant it is seen
      setItems((cur) => cur.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
      try { await api.markNotificationsRead() } catch { load() }
    }
  }

  return (
    <span ref={panelRef} className="relative">
      <button
        onClick={openPanel}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        data-cursor="Alerts"
        className="tap relative grid h-9 w-9 cursor-pointer place-items-center rounded-full text-bone/55 transition-colors hover:text-bone"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1">
            <span className="text-[9px] font-bold leading-none text-white">{unread > 9 ? '9+' : unread}</span>
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="glass-blur absolute right-0 top-11 z-50 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl shadow-lux"
          style={{ animation: 'screenIn 0.22s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <div className="flex items-center justify-between border-b border-bone/10 px-4 py-3">
            <span className="label-caps text-[10px] text-accent">Notifications</span>
            {items.length > 0 && (
              <span className="text-[11px] text-bone/40">{items.length}</span>
            )}
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <span key={i} className="skeleton mb-2 block h-12 rounded-xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-bone/40">
                Nothing yet. Join a ride and this fills up.
              </p>
            ) : (
              <ul className="divide-y divide-bone/8">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => { if (n.ride_id) { setOpen(false); onOpenRide?.(n.ride_id) } }}
                      disabled={!n.ride_id}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition-colors ${
                        n.ride_id ? 'cursor-pointer hover:bg-bone/6' : 'cursor-default'
                      }`}
                    >
                      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                        n.read_at ? 'bg-bone/8 text-bone/40' : 'bg-accent/15 text-accent'
                      }`}>
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={ICON[n.kind] ?? ICON.ride_reminder} />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13px] leading-snug ${n.read_at ? 'text-bone/60' : 'font-semibold text-bone'}`}>
                          {n.title}
                        </span>
                        {n.body && (
                          <span className="mt-0.5 block truncate text-[12px] text-bone/45">{n.body}</span>
                        )}
                        <span className="mt-1 block text-[10.5px] text-bone/30">{timeAgo(n.created_at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </span>
  )
}
