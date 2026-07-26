import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Avatar, GhostButton, VerifiedBadge } from './ui'
import { useMode } from '../lib/mode'
import { useModalChrome } from '../lib/hooks'
import { shareOrCopy, SHARE_MESSAGE } from '../lib/share'

/* Captain's roster controls: see who's coming, remove someone, invite to fill
   empty seats. Removing is deliberately two-step — it's a real consequence for
   the person on the other end. */
export default function RosterManager({ ride, attendees, onClose }) {
  const { copy, leaveRide, getVehicleFor } = useMode()
  const [confirmId, setConfirmId] = useState(null)
  const [note, setNote] = useState('')
  const panelRef = useModalChrome(onClose)

  const riders = attendees.filter((r) => r.id !== ride.captainId)
  const seatsLeft = ride.capacity - attendees.length

  const remove = (id) => {
    leaveRide(ride.id, id)
    setConfirmId(null)
    setNote('Removed from the roster.')
    setTimeout(() => setNote(''), 2600)
  }

  const invite = async () => {
    const res = await shareOrCopy({
      title: ride.title,
      text: `Riding with me — ${ride.title}`,
    })
    if (SHARE_MESSAGE[res]) {
      setNote(SHARE_MESSAGE[res])
      setTimeout(() => setNote(''), 2600)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Manage roster"
        onClick={(e) => e.stopPropagation()}
        className="glass-blur flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-[1.6rem] shadow-lux outline-none"
        style={{ animation: 'screenIn 0.35s cubic-bezier(0.22,1,0.36,1) both' }}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-bone/10 px-6 py-5">
          <div>
            <span className="label-caps text-[10px] text-accent">Your roster</span>
            <h2 className="mt-1 font-display text-xl font-medium tracking-tight text-bone">
              {riders.length} riding with you
            </h2>
            <p className="mt-1 text-[12px] text-bone/50">
              {seatsLeft > 0 ? `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} still open` : 'Roster is full'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" data-cursor="Close" className="tap grid h-9 w-9 shrink-0 place-items-center rounded-full glass-lite text-bone/60 hover:text-bone">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {riders.length === 0 ? (
            <p className="py-8 text-center text-sm text-bone/45">
              Nobody's joined yet. Share the link and fill those seats.
            </p>
          ) : (
            <ul className="divide-y divide-bone/8">
              {riders.map((r) => {
                const v = getVehicleFor(r.id)
                return (
                  <li key={r.id} className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar rider={r} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-bone">
                          {r.name} {r.verified && <VerifiedBadge />}
                        </p>
                        <p className="truncate text-xs text-bone/45">
                          {v ? `${v.make} ${v.model}` : `${r.ridesCount} ${copy.logged}`}
                        </p>
                      </div>
                      {confirmId !== r.id && (
                        <button
                          onClick={() => setConfirmId(r.id)}
                          className="label-caps shrink-0 cursor-pointer rounded-full border border-bone/15 px-3 py-1.5 text-[9px] text-bone/50 transition-colors hover:border-red-400/40 hover:text-red-300"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {confirmId === r.id && (
                      <div className="mt-3 rounded-xl border border-red-400/25 bg-red-400/5 p-3">
                        <p className="text-[12.5px] leading-snug text-bone/70">
                          Remove {r.name.split(' ')[0]} from this {copy.captain === 'Captain' ? 'ride' : 'drive'}?
                          They lose the meetup pin and the group chat.
                        </p>
                        <div className="mt-2.5 flex gap-2">
                          <button
                            onClick={() => remove(r.id)}
                            className="label-caps tap cursor-pointer rounded-full bg-red-500/85 px-3 py-1.5 text-[9px] text-white"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="label-caps tap cursor-pointer rounded-full glass-lite px-3 py-1.5 text-[9px] text-bone/60 hover:text-bone"
                          >
                            Keep them
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-bone/10 px-6 py-4">
          {note && <p className="mb-2 text-center text-[11.5px] text-volt">{note}</p>}
          <GhostButton onClick={invite} className="w-full !py-2.5 !text-[13px]">
            Invite riders
          </GhostButton>
        </div>
      </div>
    </div>,
    document.body,
  )
}
