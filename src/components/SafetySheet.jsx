import { useState } from 'react'
import { createPortal } from 'react-dom'
import { GhostButton, PrimaryButton } from './ui'
import { useModalChrome } from '../lib/hooks'
import { useUser } from '../lib/user'
import * as api from '../lib/api'

/* ---------------------------------------------------------------------------
   Report / block sheet.

   Two deliberate choices:

   Reporting is anonymous to the person reported. Nowhere does REV tell someone
   who reported them, and the moderation queue does not carry the reporter's
   identity either. If reporting can be traced back, people stop doing it, and
   then the platform learns nothing.

   Blocking is offered alongside reporting rather than buried, because they
   solve different problems: a report asks REV to act later, a block acts now.
   Most people who need one need the other.
   --------------------------------------------------------------------------- */

const REASONS = [
  ['unsafe_riding', 'Unsafe riding', 'Racing, stunting, dangerous overtaking, riding impaired.'],
  ['harassment', 'Harassment', 'Abuse, threats, unwanted contact, sexual harassment.'],
  ['no_show', 'Repeated no-shows', 'RSVPs and does not turn up.'],
  ['fake_profile', 'Fake or impersonating', 'Not who they claim to be.'],
  ['spam', 'Spam or soliciting', 'Advertising, scams, off-topic selling.'],
  ['other', 'Something else', 'Anything not covered above.'],
]

export default function SafetySheet({ member, rideId, onClose, onBlocked }) {
  const { session } = useUser()
  const panelRef = useModalChrome(onClose)

  const [view, setView] = useState('menu')   // menu | report | block | done
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [doneMsg, setDoneMsg] = useState('')

  const name = member?.name ?? member?.display_name ?? 'this member'
  const memberId = member?.uid ?? member?.id

  const submitReport = async () => {
    if (!reason || busy) return
    if (!memberId) { setError("Couldn't identify that member. Try from the ride roster."); return }
    setBusy(true); setError('')
    try {
      await api.reportMember({ subjectId: memberId, reason: REASONS.find((r) => r[0] === reason)[1], detail, rideId })
      setDoneMsg('Report filed. Our team reviews every one — you will not be identified to them.')
      setView('done')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const submitBlock = async () => {
    if (busy) return
    if (!memberId) { setError("Couldn't identify that member. Try from the ride roster."); return }
    setBusy(true); setError('')
    try {
      await api.blockMember(memberId, session)
      onBlocked?.(memberId)
      setDoneMsg(`${name} is blocked. Neither of you can join a ride the other leads.`)
      setView('done')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-[85] grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Safety options for ${name}`}
        onClick={(e) => e.stopPropagation()}
        className="glass-blur max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.6rem] shadow-lux outline-none"
        style={{ animation: 'screenIn 0.35s cubic-bezier(0.22,1,0.36,1) both' }}
      >
        <div className="flex items-start justify-between border-b border-bone/10 px-6 py-5">
          <div className="min-w-0">
            <span className="label-caps text-[10px] text-accent">Safety</span>
            <h2 className="mt-1 truncate font-display text-xl font-medium tracking-tight text-bone">{name}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" data-cursor="Close"
            className="tap grid h-9 w-9 shrink-0 place-items-center rounded-full glass-lite text-bone/60 hover:text-bone">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {view === 'menu' && (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setView('report')}
                className="rounded-2xl border border-bone/12 p-4 text-left transition-colors hover:border-accent/40"
              >
                <p className="font-display text-[15px] font-semibold text-bone">Report to REV</p>
                <p className="mt-1 text-[12.5px] leading-snug text-bone/55">
                  Tell us what happened. Reviewed within 48 hours. They are never told who reported them.
                </p>
              </button>
              <button
                onClick={() => setView('block')}
                className="rounded-2xl border border-bone/12 p-4 text-left transition-colors hover:border-accent/40"
              >
                <p className="font-display text-[15px] font-semibold text-bone">Block {name.split(' ')[0]}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-bone/55">
                  Takes effect immediately. Neither of you can join a ride the other leads.
                </p>
              </button>
              <p className="mt-1 text-[11.5px] leading-relaxed text-bone/35">
                If someone is in immediate danger, call 112 first. REV is not an emergency service.
              </p>
            </div>
          )}

          {view === 'report' && (
            <>
              <p className="text-[13px] text-bone/60">What happened?</p>
              <div className="mt-3 flex flex-col gap-2">
                {REASONS.map(([code, label, hint]) => (
                  <label
                    key={code}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
                      reason === code ? 'border-accent/50 bg-accent/6' : 'border-bone/12 hover:border-bone/25'
                    }`}
                  >
                    <input
                      type="radio" name="reason" value={code}
                      checked={reason === code}
                      onChange={() => setReason(code)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-bone">{label}</span>
                      <span className="block text-[11.5px] leading-snug text-bone/45">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="float-field mt-3">
                <input id="rep-detail" value={detail} onChange={(e) => setDetail(e.target.value)}
                       placeholder=" " maxLength={1000} />
                <label htmlFor="rep-detail">Anything that helps (optional)</label>
              </div>

              {error && <p className="mt-3 text-xs text-accent">{error}</p>}

              <div className="mt-5 flex justify-end gap-2">
                <GhostButton onClick={() => setView('menu')} className="!px-4 !py-2.5 !text-[13px]">Back</GhostButton>
                <PrimaryButton
                  onClick={submitReport}
                  magnetic={false}
                  className={`!px-5 !py-2.5 !text-[13px] ${!reason || busy ? '!opacity-30 !shadow-none pointer-events-none' : ''}`}
                >
                  {busy ? 'Filing…' : 'File report'}
                </PrimaryButton>
              </div>
            </>
          )}

          {view === 'block' && (
            <>
              <p className="text-[13.5px] leading-relaxed text-bone/70">
                Block {name}? Neither of you will be able to join a ride the other leads. You can
                undo this any time from your account.
              </p>
              {error && <p className="mt-3 text-xs text-accent">{error}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <GhostButton onClick={() => setView('menu')} className="!px-4 !py-2.5 !text-[13px]">Back</GhostButton>
                <button
                  onClick={submitBlock}
                  className={`label-caps tap cursor-pointer rounded-full bg-red-500/85 px-5 py-2.5 text-[11px] text-white ${busy ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {busy ? 'Blocking…' : 'Block them'}
                </button>
              </div>
            </>
          )}

          {view === 'done' && (
            <>
              <p className="text-[13.5px] leading-relaxed text-bone/75">{doneMsg}</p>
              <div className="mt-5 flex justify-end">
                <PrimaryButton onClick={onClose} magnetic={false} className="!px-5 !py-2.5 !text-[13px]">Done</PrimaryButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
