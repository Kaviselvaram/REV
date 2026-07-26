import { useTilt } from '../lib/hooks'
import { useMode } from '../lib/mode'
import RouteThumb from './RouteThumb'
import { Avatar, AvatarStack, StatusTag, VerifiedBadge, formatRideDate, formatRideTime } from './ui'

export default function RideCard({ ride, onOpen, compact = false }) {
  const tilt = useTilt(5)
  const { copy, getRider } = useMode()
  const captain = getRider(ride.captainId)
  const attendeeRiders = ride.attendees.map((id) => getRider(id)).filter(Boolean)
  const spotsLeft = ride.capacity - ride.attendees.length

  return (
    <div className="tilt-wrap" ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave}>
      <article
        onClick={() => onOpen(ride.id)}
        data-cursor="Open ride"
        className="tilt-inner glass group cursor-pointer overflow-hidden rounded-2xl
          transition-shadow duration-500 hover:shadow-[0_26px_60px_-18px_color-mix(in_srgb,var(--accent)_28%,transparent)]"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpen(ride.id)}
      >
        <div className="relative overflow-hidden">
          <div className="transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]">
            <RouteThumb ride={ride} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-asphalt-2/90 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <StatusTag status={ride.status} />
            {ride.captainId === 'me' && (
              <span className="label-caps rounded-full bg-accent px-2.5 py-1 text-[8px] text-white shadow-[0_6px_16px_-6px_color-mix(in_srgb,var(--accent)_70%,transparent)]">You lead</span>
            )}
          </div>
          <div className="absolute right-3 top-3 rounded-full glass-lite px-3 py-1 text-xs font-semibold text-bone/80">
            {ride.distanceKm > 0 ? `${ride.distanceKm} km` : 'Static meet'}
          </div>
          {/* reveal arrow on hover */}
          <div className="absolute bottom-3 right-3 grid h-9 w-9 translate-y-2 place-items-center rounded-full bg-accent text-asphalt opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M9 7h8v8" /></svg>
          </div>
        </div>

        <div className={`flex flex-col gap-3 ${compact ? 'p-4' : 'p-5'}`}>
          <div>
            <p className="label-caps text-[10px] text-bone/40">
              {formatRideDate(ride.dateTime)} · {formatRideTime(ride.dateTime)}
            </p>
            <h3 className={`font-display font-bold leading-snug text-bone transition-colors group-hover:text-accent ${compact ? 'text-base' : 'text-lg'}`}>
              {ride.title}
            </h3>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar rider={captain} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-bone/85">
                  {captain.name} {captain.verified && <VerifiedBadge />}
                </p>
                <p className="label-caps text-[9px] text-accent/80">{copy.captain}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <AvatarStack ridersList={attendeeRiders} max={4} />
              <p className="text-[11px] text-bone/45">
                {ride.attendees.length}/{ride.capacity} {copy.ridingWord}
                {ride.status === 'upcoming' && spotsLeft > 0 && spotsLeft <= 3 && (
                  <span className="ml-1 text-accent">· {spotsLeft} left</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
