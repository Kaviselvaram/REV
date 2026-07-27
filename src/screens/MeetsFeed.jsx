import { useState } from 'react'
import RideCard from '../components/RideCard'
import CreateRide from './CreateRide'
import { Eyebrow, PrimaryButton, Reveal, SplitWords } from '../components/ui'
import { FeedSkeleton, ErrorState } from '../components/States'
import { useMode } from '../lib/mode'
import { useUser } from '../lib/user'
import { CITY } from '../data/mock'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'live', label: 'Live now' },
  { id: 'completed', label: 'Completed' },
]

export default function MeetsFeed({ onOpenRide }) {
  const { mode, copy, rides, corridors, loading, error, refresh } = useMode()
  const { requireAuth } = useUser()
  const [filter, setFilter] = useState('all')
  const [corridor, setCorridor] = useState('all')
  const [creating, setCreating] = useState(false)
  const shown = rides.filter((r) =>
    (filter === 'all' || r.status === filter) &&
    (corridor === 'all' || r.corridor === corridor))

  // Only offer corridors that actually have rides in this world — an empty
  // filter chip is a dead end that makes the community look thinner than it is.
  const liveCorridors = corridors.filter((c) => rides.some((r) => r.corridor === c.id))
  const startCreate = () => requireAuth(() => setCreating(true))

  return (
    <div className="screen-enter relative mx-auto max-w-7xl px-6 pb-32 pt-14 lg:px-10">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>{copy.feedEyebrow} · {CITY}</Eyebrow>
            <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-bone sm:text-5xl">
              <SplitWords text={copy.feedLines[0]} className="block" />
              <SplitWords text={copy.feedLines[1]} className="block" delay={120} />
            </h1>
          </div>
          <div className="flex flex-col items-end gap-3">
            <PrimaryButton onClick={startCreate} magnetic={false} cursor="Create">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Lead a {mode === 'bike' ? 'ride' : 'drive'}
            </PrimaryButton>
            <div className="flex flex-wrap justify-end gap-2">
              {FILTERS.map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  data-cursor="Filter"
                  className={`tap label-caps cursor-pointer rounded-full px-4 py-2 text-[10px] transition-all duration-300 ${
                    filter === f.id
                      ? 'bg-accent text-white glow-accent'
                      : 'glass-lite text-bone/60 hover:text-bone hover:-translate-y-0.5'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {liveCorridors.length > 1 && (
        <Reveal delay={60}>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="label-caps mr-1 text-[9px] text-bone/35">Corridor</span>
            <button
              onClick={() => setCorridor('all')}
              className={`label-caps tap cursor-pointer rounded-full px-3.5 py-1.5 text-[10px] transition-all ${
                corridor === 'all' ? 'bg-bone/12 text-bone' : 'text-bone/45 hover:text-bone'
              }`}
            >
              Everywhere
            </button>
            {liveCorridors.map((c) => {
              const n = rides.filter((r) => r.corridor === c.id).length
              return (
                <button
                  key={c.id}
                  onClick={() => setCorridor(c.id)}
                  title={c.description}
                  className={`label-caps tap cursor-pointer rounded-full px-3.5 py-1.5 text-[10px] transition-all ${
                    corridor === c.id ? 'bg-accent text-white glow-accent' : 'glass-lite text-bone/55 hover:text-bone'
                  }`}
                >
                  {c.name}
                  <span className={corridor === c.id ? 'ml-1.5 text-white/70' : 'ml-1.5 text-bone/30'}>{n}</span>
                </button>
              )
            })}
          </div>
        </Reveal>
      )}

      {error ? (
        <ErrorState
          title="Couldn't load the feed."
          body={error}
          onRetry={refresh}
        />
      ) : loading ? (
        <FeedSkeleton />
      ) : shown.length === 0 ? (
        <Reveal delay={100}>
          <div className="mt-16 rounded-3xl border border-dashed border-bone/15 p-16 text-center">
            <p className="font-display text-xl font-bold text-bone/60">Nothing here yet.</p>
            <p className="mt-2 text-sm text-bone/40">
              {corridor !== 'all'
                ? `Nothing on ${corridors.find((c) => c.id === corridor)?.name ?? 'this corridor'} yet — lead the first one.`
                : copy.emptyFeedHint}
            </p>
            {corridor !== 'all' && (
              <button onClick={() => setCorridor('all')}
                className="label-caps mt-4 cursor-pointer text-[10px] text-accent hover:underline">
                Show every corridor
              </button>
            )}
          </div>
        </Reveal>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((ride, i) => (
            <Reveal key={ride.id} delay={(i % 3) * 90}>
              <RideCard ride={ride} onOpen={onOpenRide} />
            </Reveal>
          ))}
        </div>
      )}

      {creating && (
        <CreateRide
          onClose={() => setCreating(false)}
          onCreated={(id) => { setCreating(false); onOpenRide(id) }}
        />
      )}

      {/* Floating Action Button — persistent Create */}
      <button
        onClick={startCreate}
        aria-label={`Create ${copy.feedEyebrow.toLowerCase().slice(0, -1)}`}
        title="Create"
        data-cursor="Create"
        className="fixed bottom-8 right-8 z-40 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full
          bg-accent text-white glow-accent transition-transform duration-300 hover:scale-110 hover:rotate-90 active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  )
}
