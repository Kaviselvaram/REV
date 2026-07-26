import { GhostButton, PrimaryButton } from './ui'

/* ------------------------------------------------------------------
   Loading, empty, error and not-found states.

   Today the app renders instant mock data, so none of these are hot
   paths — but the moment a network sits in the middle, every screen
   needs something to show for latency and failure. Building them now
   means the backend swap is a data change, not a UI rewrite.
   ------------------------------------------------------------------ */

// ---------- Skeletons ----------

export function Shimmer({ className = '' }) {
  return <span className={`skeleton block rounded-lg ${className}`} aria-hidden="true" />
}

export function RideCardSkeleton() {
  return (
    <div className="card-3d overflow-hidden rounded-3xl" aria-hidden="true">
      <div className="card-face">
        <Shimmer className="h-40 w-full !rounded-none" />
        <div className="flex flex-col gap-3 p-5">
          <Shimmer className="h-3 w-32" />
          <Shimmer className="h-5 w-4/5" />
          <div className="flex items-center gap-3 pt-2">
            <Shimmer className="h-8 w-8 !rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Shimmer className="h-3 w-28" />
              <Shimmer className="h-2.5 w-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function FeedSkeleton({ count = 6 }) {
  return (
    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading rides">
      {Array.from({ length: count }, (_, i) => <RideCardSkeleton key={i} />)}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-6 pb-32 pt-10 lg:px-10" role="status" aria-label="Loading">
      <Shimmer className="h-4 w-24" />
      <Shimmer className="mt-8 h-72 w-full !rounded-3xl" />
      <Shimmer className="mt-8 h-4 w-32" />
      <Shimmer className="mt-3 h-10 w-3/4" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Shimmer className="h-28 w-full !rounded-2xl" />
        <Shimmer className="h-28 w-full !rounded-2xl" />
      </div>
    </div>
  )
}

// ---------- Shared shell for the message states ----------

function StateShell({ glyph, title, body, children }) {
  return (
    <div className="screen-enter mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
      <span className="icon-tile mb-6 grid h-16 w-16 place-items-center rounded-2xl text-accent">
        {glyph}
      </span>
      <h2 className="font-display text-2xl font-medium tracking-tight text-bone sm:text-3xl">{title}</h2>
      {body && <p className="mt-3 text-sm leading-relaxed text-bone/55">{body}</p>}
      {children && <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </div>
  )
}

const GLYPH = {
  lost: (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 20l-5.5-2.5v-13L9 7l6-2.5L20.5 7v13L15 17.5 9 20z" /><path d="M9 7v13M15 4.5v13" />
    </svg>
  ),
  broken: (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.6a2 2 0 013.4 0l7.4 12.8a2 2 0 01-1.7 3H4.6a2 2 0 01-1.7-3z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  offline: (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2l20 20M8.5 16.5a5 5 0 017 0M5 13a10 10 0 013.5-2.3M19 13a10 10 0 00-8-2.9M1.5 9.5a15 15 0 014-2.6M22.5 9.5A15 15 0 0012 5.5M12 20h.01" />
    </svg>
  ),
}

// ---------- Public states ----------

export function NotFound({ title = 'Nothing here.', body, actionLabel, onAction }) {
  return (
    <StateShell glyph={GLYPH.lost} title={title} body={body}>
      {onAction && <PrimaryButton onClick={onAction} magnetic={false}>{actionLabel}</PrimaryButton>}
    </StateShell>
  )
}

export function ErrorState({
  title = "That didn't load.",
  body = 'Something went wrong on our side. Your data is safe — try again in a moment.',
  onRetry,
  onBack,
}) {
  return (
    <StateShell glyph={GLYPH.broken} title={title} body={body}>
      {onRetry && <PrimaryButton onClick={onRetry} magnetic={false} cursor="Retry">Try again</PrimaryButton>}
      {onBack && <GhostButton onClick={onBack}>Go back</GhostButton>}
    </StateShell>
  )
}

export function OfflineState({ onRetry }) {
  return (
    <StateShell
      glyph={GLYPH.offline}
      title="You're offline."
      body="REV needs a connection to load rides. Check your network and try again."
    >
      {onRetry && <PrimaryButton onClick={onRetry} magnetic={false} cursor="Retry">Try again</PrimaryButton>}
    </StateShell>
  )
}

// Inline error for a section that failed inside an otherwise-working screen.
export function InlineError({ message = "Couldn't load this.", onRetry }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-accent/5 px-4 py-3">
      <span className="text-[13px] text-bone/70">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="label-caps cursor-pointer text-[10px] text-accent hover:underline">
          Retry
        </button>
      )}
    </div>
  )
}
