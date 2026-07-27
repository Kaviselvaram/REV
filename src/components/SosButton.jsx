import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GhostButton } from './ui'
import { useUser } from '../lib/user'
import * as api from '../lib/api'

/* ---------------------------------------------------------------------------
   SOS.

   Live location goes to the member's own nominated contacts — not to REV, and
   not to other riders. REV is not an emergency service and says so here: the
   first thing the sheet offers is the phone dialler for 112, because a
   platform notification is not what helps in the first sixty seconds.

   Held rather than tapped. A single tap in a jacket pocket at 80 km/h is a
   false alarm, and false alarms are how an alert system gets ignored.
   --------------------------------------------------------------------------- */

const HOLD_MS = 1500

export default function SosButton({ rideId }) {
  const { session } = useUser()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(null)
  const [contacts, setContacts] = useState([])
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const holdRef = useRef(null)
  const watchRef = useRef(null)

  useEffect(() => {
    let alive = true
    api.getActiveSos(session).then((a) => { if (alive) setActive(a) }).catch(() => {})
    api.getEmergencyContacts().then((c) => { if (alive) setContacts(c ?? []) }).catch(() => {})
    return () => { alive = false }
  }, [session])

  // While an alert is live, keep the location fresh for the people watching it.
  useEffect(() => {
    if (!active || !navigator.geolocation) return
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => api.updateSosLocation(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    )
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [active])

  const currentPosition = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 },
      )
    })

  const fire = async () => {
    setBusy(true); setError('')
    try {
      const pos = await currentPosition()
      const alert = await api.raiseSos({ rideId, lat: pos?.lat, lng: pos?.lng })
      setActive(alert ?? { status: 'active' })
    } catch (e) { setError(e.message) } finally { setBusy(false); setProgress(0) }
  }

  const startHold = () => {
    if (busy || active) return
    const t0 = Date.now()
    holdRef.current = setInterval(() => {
      const p = Math.min((Date.now() - t0) / HOLD_MS, 1)
      setProgress(p)
      if (p >= 1) { clearInterval(holdRef.current); holdRef.current = null; fire() }
    }, 16)
  }
  const cancelHold = () => {
    if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null }
    setProgress(0)
  }

  const stand_down = async (cancelled) => {
    setBusy(true); setError('')
    try { await api.resolveSos(cancelled); setActive(null) }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={active ? 'Emergency alert is active' : 'Emergency'}
        data-cursor="SOS"
        className={`tap flex items-center gap-2 rounded-full border px-4 py-2 transition-colors ${
          active
            ? 'border-red-400/60 bg-red-500/15 text-red-300'
            : 'border-bone/15 text-bone/45 hover:border-red-400/40 hover:text-red-300'
        }`}
      >
        {active && <span className="live-dot h-1.5 w-1.5 rounded-full bg-red-400" />}
        <span className="label-caps text-[10px]">{active ? 'SOS active' : 'SOS'}</span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[95] grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
             onClick={() => setOpen(false)}>
          <div
            role="dialog" aria-modal="true" aria-label="Emergency"
            onClick={(e) => e.stopPropagation()}
            className="glass-blur w-full max-w-md rounded-t-[1.6rem] shadow-lux sm:rounded-[1.6rem]"
            style={{ animation: 'screenIn 0.3s cubic-bezier(0.22,1,0.36,1) both' }}
          >
            <div className="px-6 pb-7 pt-6">
              <span className="label-caps text-[10px] text-red-300">Emergency</span>
              <h2 className="mt-1.5 font-display text-2xl font-medium tracking-tight text-bone">
                {active ? 'Your alert is live.' : 'Need help?'}
              </h2>

              {/* the honest first instruction */}
              <a
                href="tel:112"
                className="mt-5 flex items-center justify-between rounded-2xl bg-red-500/90 px-5 py-4 text-white transition-transform active:scale-[0.98]"
              >
                <span>
                  <span className="block font-display text-lg font-bold">Call 112</span>
                  <span className="block text-[12px] text-white/80">Police, fire, ambulance</span>
                </span>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z" /></svg>
              </a>
              <p className="mt-2 text-[11.5px] leading-relaxed text-bone/40">
                REV is not an emergency service. Call first, then tell your contacts.
              </p>

              <div className="mt-6 border-t border-bone/10 pt-5">
                {active ? (
                  <>
                    <p className="text-[13px] leading-relaxed text-bone/75">
                      Your live location is being shared with your emergency contacts. It stops the
                      moment you close this alert.
                    </p>
                    {error && <p className="mt-3 text-xs text-accent">{error}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <GhostButton onClick={() => stand_down(false)} className="!px-5 !py-2.5 !text-[13px]">
                        {busy ? 'Closing…' : "I'm safe — close alert"}
                      </GhostButton>
                      <GhostButton onClick={() => stand_down(true)} className="!px-5 !py-2.5 !text-[13px] !text-bone/50">
                        False alarm
                      </GhostButton>
                    </div>
                  </>
                ) : contacts.length === 0 ? (
                  <p className="text-[13px] leading-relaxed text-bone/60">
                    You have not nominated any emergency contacts yet. Add them in your account and
                    REV can share your live location with them when you raise an alert.
                  </p>
                ) : (
                  <>
                    <p className="text-[13px] leading-relaxed text-bone/70">
                      Hold to alert {contacts.map((c) => c.name).join(', ')} with your live location.
                    </p>
                    {error && <p className="mt-3 text-xs text-accent">{error}</p>}
                    <button
                      onPointerDown={startHold}
                      onPointerUp={cancelHold}
                      onPointerLeave={cancelHold}
                      disabled={busy}
                      className="relative mt-4 w-full overflow-hidden rounded-2xl border-2 border-red-400/50 py-4 text-center transition-colors"
                    >
                      <span
                        className="absolute inset-y-0 left-0 bg-red-500/30 transition-none"
                        style={{ width: `${progress * 100}%` }}
                        aria-hidden="true"
                      />
                      <span className="relative label-caps text-[11px] text-red-300">
                        {busy ? 'Raising…' : progress > 0 ? 'Keep holding…' : 'Hold to raise alert'}
                      </span>
                    </button>
                    <p className="mt-2 text-center text-[11px] text-bone/35">
                      Held, not tapped — so a pocket cannot raise it.
                    </p>
                  </>
                )}
              </div>

              <button onClick={() => setOpen(false)}
                className="mt-5 w-full cursor-pointer text-center text-[12px] text-bone/40 hover:text-bone/70">
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
