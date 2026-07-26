import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '../lib/hooks'
import { ACCENTS, CITY, IMG } from '../data/mock'

const PANELS = [
  {
    id: 'bike',
    src: IMG.bike,
    alt: 'Classic maroon motorcycle in evening grass',
    label: 'Two-Wheeler',
    line: 'Sunday runs, ghat hairpins, dawn patrols.',
  },
  {
    id: 'car',
    src: IMG.redCar,
    alt: 'Red classic coupé in golden grass',
    label: 'Four-Wheeler',
    line: 'Convoys, hill runs, golden-hour drives.',
  },
]

// Full-viewport photographic choice. Hover widens a world; choosing it
// expands the photograph to fill the frame before entering.
export default function Selector({ onSelect }) {
  const reduced = usePrefersReducedMotion()
  const [hovered, setHovered] = useState(null)
  const [chosen, setChosen] = useState(null)

  const pick = (id) => setChosen((c) => c ?? id)

  useEffect(() => {
    if (!chosen) return
    const t = setTimeout(() => onSelect(chosen), reduced ? 250 : 1150)
    return () => clearTimeout(t)
  }, [chosen, reduced, onSelect])

  const grow = (id) => {
    if (chosen) return chosen === id ? 100 : 0.0001
    if (hovered) return hovered === id ? 1.45 : 0.75
    return 1
  }

  return (
    <div className="fixed inset-0 z-40 flex bg-asphalt" role="group" aria-label="Choose your world">
      {PANELS.map((p) => {
        const active = hovered === p.id && !chosen
        const isChosen = chosen === p.id
        const dimmed = (hovered && hovered !== p.id && !chosen) || (chosen && !isChosen)
        return (
          <button
            key={p.id}
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered((h) => (h === p.id ? null : h))}
            onClick={() => pick(p.id)}
            aria-label={`Enter the ${p.label} world`}
            className="diptych-panel h-full min-w-0 cursor-pointer text-left"
            style={{ flexGrow: grow(p.id), flexBasis: 0, opacity: chosen && !isChosen ? 0 : 1 }}
          >
            <img
              src={p.src}
              alt={p.alt}
              className={`absolute inset-0 h-full w-full object-cover ${reduced ? '' : 'kenburns'}`}
              style={{
                filter: dimmed ? 'saturate(0.35) brightness(0.72)' : active || isChosen ? 'saturate(1.05)' : 'saturate(0.9) brightness(0.94)',
              }}
            />
            {/* legibility shade */}
            <div
              className="diptych-shade absolute inset-0"
              style={{
                background: 'linear-gradient(to top, rgba(12,10,6,0.55), transparent 45%), linear-gradient(to bottom, rgba(12,10,6,0.3), transparent 30%)',
                opacity: isChosen ? 0.4 : 1,
              }}
            />

            {/* panel label */}
            <div className={`absolute inset-x-0 bottom-0 p-8 transition-all duration-500 lg:p-12 ${chosen && !isChosen ? 'opacity-0' : 'opacity-100'}`}>
              <p
                className="label-caps text-[10px] transition-colors duration-300"
                style={{ color: active || isChosen ? ACCENTS[p.id] : 'rgba(246,243,236,0.75)' }}
              >
                {`0${p.id === 'bike' ? 1 : 2}`} · {p.label}
              </p>
              <p className={`mt-3 max-w-xs font-display text-3xl font-medium leading-tight text-[#F6F3EC] transition-all duration-500 lg:text-4xl ${active ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-70'}`}>
                {p.line}
              </p>
              <p className={`label-caps mt-5 inline-flex items-center gap-2 text-[9px] text-[#F6F3EC]/80 transition-all duration-500 ${active ? 'opacity-100' : 'opacity-0'}`}>
                Enter this world
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </p>
            </div>
          </button>
        )
      })}

      {/* center seam */}
      <div className={`pointer-events-none absolute inset-y-0 left-1/2 w-px bg-[#F6F3EC]/25 transition-opacity duration-500 ${chosen || hovered ? 'opacity-0' : 'opacity-100'}`} />

      {/* overlaid chrome */}
      <div className={`pointer-events-none absolute inset-0 flex flex-col transition-opacity duration-700 ${chosen ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex items-start justify-between p-8 lg:p-12">
          <span className="font-display text-2xl font-black tracking-tight text-[#F6F3EC]">
            REV<span style={{ color: ACCENTS.bike }}>.</span>
          </span>
          <span className="label-caps hidden text-[9px] text-[#F6F3EC]/60 sm:block">Verified motoring society · {CITY}</span>
        </div>

        <div className="mt-[4vh] text-center">
          <p className="label-caps mb-4 text-[10px] text-[#F6F3EC]/70">Two parallel worlds · one garage</p>
          <h1 className="font-display text-5xl font-medium tracking-tight text-[#F6F3EC] sm:text-6xl lg:text-7xl" style={{ textShadow: '0 2px 40px rgba(0,0,0,0.35)' }}>
            Choose your <em className="serif-italic">ride.</em>
          </h1>
        </div>

        <div className="mt-auto pb-7 text-center">
          <p className="label-caps loader-pulse text-[9px] text-[#F6F3EC]/60">
            {reduced ? 'Tap a world to enter' : 'Hover to look closer · click to enter'}
          </p>
        </div>
      </div>
    </div>
  )
}
