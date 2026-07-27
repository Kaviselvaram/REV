import { useCallback, useEffect, useState } from 'react'
import { Eyebrow, GhostButton, PrimaryButton, Reveal } from '../components/ui'
import { ErrorState } from '../components/States'
import * as api from '../lib/api'

/* ---------------------------------------------------------------------------
   Moderation queue.

   Reports were being filed with nowhere to review them, which is worse than
   having no reporting at all: it tells members REV is listening when nothing
   is. This is the other half.

   The reporter's identity is not here, and not available to this screen. The
   server strips it before the queue is built, so a moderator decides on what
   happened rather than on who said it — and nobody can be told who reported
   them even by someone with access.
   --------------------------------------------------------------------------- */

const TABS = [
  ['open', 'Open'],
  ['reviewing', 'Reviewing'],
  ['actioned', 'Actioned'],
  ['dismissed', 'Dismissed'],
]

const SUSPENSIONS = [
  [null, 'No suspension'],
  [7, '7 days'],
  [30, '30 days'],
  [365, 'A year'],
]

function ReportCard({ report, onResolved }) {
  const [open, setOpen] = useState(false)
  const [resolution, setResolution] = useState('')
  const [days, setDays] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const s = report.subject ?? {}
  const suspended = s.suspended_until && new Date(s.suspended_until) > new Date()

  const act = async (status) => {
    if (busy) return
    setBusy(true); setError('')
    try {
      await api.resolveReport({
        reportId: report.id, status, resolution,
        suspendDays: status === 'actioned' ? days : null,
      })
      onResolved()
    } catch (e) { setError(e.message); setBusy(false) }
  }

  return (
    <div className="card-3d rounded-2xl">
      <div className="card-face p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-caps rounded-full border border-accent/35 bg-accent/8 px-2.5 py-1 text-[9px] text-accent">
                {report.reason}
              </span>
              {s.prior_reports > 0 && (
                <span className="label-caps rounded-full border border-bone/15 px-2.5 py-1 text-[9px] text-bone/55">
                  {s.prior_reports} prior
                </span>
              )}
              {suspended && (
                <span className="label-caps rounded-full border border-red-400/40 bg-red-400/10 px-2.5 py-1 text-[9px] text-red-300">
                  Suspended
                </span>
              )}
            </div>
            <p className="mt-2 font-display text-lg font-medium tracking-tight text-bone">
              {s.display_name ?? 'Deleted member'}
              {s.handle && <span className="ml-2 text-[13px] font-normal text-bone/40">@{s.handle}</span>}
            </p>
            <p className="mt-0.5 text-[11.5px] text-bone/40">
              {s.rides_count ?? 0} rides logged
              {report.ride_title && <> · on “{report.ride_title}”</>}
            </p>
          </div>
          <p className="shrink-0 text-[11px] text-bone/35">
            {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </p>
        </div>

        {report.detail && (
          <p className="mt-3 rounded-xl border border-bone/10 bg-bone/4 p-3 text-[13px] leading-relaxed text-bone/75">
            {report.detail}
          </p>
        )}

        {report.resolution && (
          <p className="mt-3 text-[12px] text-bone/45">Resolved: {report.resolution}</p>
        )}

        {report.status === 'open' || report.status === 'reviewing' ? (
          !open ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryButton onClick={() => setOpen(true)} magnetic={false} className="!px-4 !py-2 !text-[12px]">
                Action this
              </PrimaryButton>
              <GhostButton onClick={() => act('dismissed')} className="!px-4 !py-2 !text-[12px]">
                {busy ? 'Working…' : 'Dismiss'}
              </GhostButton>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-bone/12 p-4">
              <div className="float-field">
                <input id={`res-${report.id}`} value={resolution}
                       onChange={(e) => setResolution(e.target.value)} placeholder=" " maxLength={300} />
                <label htmlFor={`res-${report.id}`}>What did you decide, and why</label>
              </div>

              <p className="label-caps mt-4 text-[9px] text-bone/40">Suspension</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SUSPENSIONS.map(([v, label]) => (
                  <button
                    key={label}
                    onClick={() => setDays(v)}
                    className={`label-caps tap cursor-pointer rounded-full px-3 py-1.5 text-[9px] transition-colors ${
                      days === v ? 'bg-accent text-white' : 'glass-lite text-bone/55 hover:text-bone'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {error && <p className="mt-3 text-xs text-accent">{error}</p>}

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <GhostButton onClick={() => setOpen(false)} className="!px-4 !py-2 !text-[12px]">Cancel</GhostButton>
                <PrimaryButton
                  onClick={() => act('actioned')}
                  magnetic={false}
                  className={`!px-4 !py-2 !text-[12px] ${busy ? '!opacity-50 pointer-events-none' : ''}`}
                >
                  {busy ? 'Applying…' : days ? `Action + suspend ${days}d` : 'Action, no suspension'}
                </PrimaryButton>
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}

export default function Admin({ onBack }) {
  const [tab, setTab] = useState('open')
  const [rows, setRows] = useState([])
  const [state, setState] = useState('loading') // loading | ready | denied | error
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const isMod = await api.amIModerator()
      if (!isMod) { setState('denied'); return }
      const q = await api.moderationQueue(tab)
      setRows(q)
      setState('ready')
    } catch (e) { setErr(e.message); setState('error') }
  }, [tab])

  useEffect(() => { setState('loading'); load() }, [load])

  if (state === 'denied') {
    return (
      <div className="screen-enter mx-auto max-w-lg px-6 py-24 text-center">
        <Eyebrow>Not permitted</Eyebrow>
        <h1 className="mt-2 font-display text-2xl font-medium text-bone">This is a moderator screen.</h1>
        <p className="mt-3 text-sm text-bone/55">Your account does not have moderation access.</p>
        <PrimaryButton onClick={onBack} magnetic={false} className="mt-7">Back</PrimaryButton>
      </div>
    )
  }

  if (state === 'error') return <ErrorState title="Couldn't load the queue." body={err} onRetry={load} onBack={onBack} />

  return (
    <div className="screen-enter mx-auto max-w-3xl px-6 pb-32 pt-10 lg:px-10">
      <Reveal>
        <button onClick={onBack}
          className="label-caps flex cursor-pointer items-center gap-2 text-[11px] text-bone/50 transition-colors hover:text-bone">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back
        </button>
        <Eyebrow className="mt-8 block">Moderation</Eyebrow>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-bone">
          The <em className="serif-italic text-accent">queue.</em>
        </h1>
        <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-bone/55">
          Reports are shown without the reporter's identity. Decide on what happened.
        </p>
      </Reveal>

      <div className="mt-7 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`label-caps tap cursor-pointer rounded-full px-4 py-2 text-[10px] transition-all ${
              tab === id ? 'bg-accent text-white glow-accent' : 'glass-lite text-bone/60 hover:text-bone'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {state === 'loading' ? (
        <div className="mt-8 flex flex-col gap-4" role="status" aria-label="Loading queue">
          {Array.from({ length: 3 }, (_, i) => <span key={i} className="skeleton block h-36 rounded-2xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-bone/15 p-14 text-center">
          <p className="font-display text-lg text-bone/60">Nothing {tab}.</p>
          <p className="mt-2 text-sm text-bone/40">
            {tab === 'open' ? 'No reports waiting. That is the good outcome.' : 'Nothing here yet.'}
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {rows.map((r) => <ReportCard key={r.id} report={r} onResolved={load} />)}
        </div>
      )}
    </div>
  )
}
