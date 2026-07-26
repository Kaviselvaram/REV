import { useMode } from '../lib/mode'
import RouteThumb from './RouteThumb'
import { Avatar, StatusTag, VerifiedBadge, formatRideDate, formatRideTime } from './ui'
import { CITY } from '../data/mock'

// 3D-tilted floating phone showing the mode's feed. Parent supplies the tilt vars.
export default function PhoneMockup({ compact = false }) {
  const { copy, rides, getRider } = useMode()
  const feed = rides.filter((r) => r.status !== 'completed').slice(0, compact ? 2 : 3)
  return (
    <div
      className={`tilt-inner phone-float relative select-none pointer-events-none ${compact ? 'w-[230px]' : 'w-[290px] sm:w-[320px]'}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* glow behind the phone */}
      <div className="absolute -inset-10 rounded-full bg-accent/12 blur-3xl" aria-hidden="true" />
      <div className="absolute -inset-2 translate-y-10 rounded-[44px] bg-black/60 blur-2xl" aria-hidden="true" />

      <div className="relative overflow-hidden rounded-[40px] border border-bone/15 bg-asphalt shadow-2xl">
        {/* notch */}
        <div className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
        <div className={`overflow-hidden bg-asphalt px-3 pt-11 pb-3 ${compact ? 'h-[430px]' : 'h-[600px]'}`}>
          {/* in-app header */}
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <p className="label-caps text-[8px] text-bone/40">{CITY} · 12 km radius</p>
              <p className="font-display text-lg font-black tracking-tight text-bone">
                {copy.feedEyebrow.toUpperCase()}<span className="text-accent">.</span>
              </p>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-asphalt glow-accent">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {feed.map((ride) => {
              const captain = getRider(ride.captainId)
              return (
                <div key={ride.id} className="glass overflow-hidden rounded-2xl">
                  <div className="relative h-16">
                    <RouteThumb ride={ride} className="h-full" />
                    <div className="absolute left-2 top-2 scale-[0.8] origin-top-left"><StatusTag status={ride.status} /></div>
                  </div>
                  <div className="p-2.5">
                    <p className="label-caps text-[7px] text-bone/40">
                      {formatRideDate(ride.dateTime)} · {formatRideTime(ride.dateTime)}
                    </p>
                    <p className="truncate font-display text-[12px] font-bold text-bone">{ride.title}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Avatar rider={captain} size="xs" />
                        <span className="text-[9px] font-semibold text-bone/70">{captain.name.split(' ')[0]}</span>
                        {captain.verified && <VerifiedBadge />}
                      </span>
                      <span className="text-[9px] text-bone/45">{ride.attendees.length}/{ride.capacity}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
