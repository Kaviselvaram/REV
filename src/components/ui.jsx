import { useMagnetic, useReveal, useRipple } from '../lib/hooks'
import { useMode } from '../lib/mode'

// ---------- Scroll-reveal wrapper ----------
export function Reveal({ children, delay = 0, className = '' }) {
  const ref = useReveal()
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ '--reveal-delay': `${delay}ms` }}>
      {children}
    </div>
  )
}

// Word-by-word masked stagger reveal for display headlines.
export function SplitWords({ text, className = '', delay = 0, step = 45, as: Tag = 'span' }) {
  const ref = useReveal()
  return (
    <Tag ref={ref} className={`reveal-words ${className}`}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="rw-mask">
          <span className="rw-word" style={{ transitionDelay: `${delay + i * step}ms` }}>
            {w}{' '}
          </span>
        </span>
      ))}
    </Tag>
  )
}

// ---------- Buttons ----------
export function PrimaryButton({ children, onClick, magnetic = true, cursor = 'Tap', className = '', ...rest }) {
  const ref = useMagnetic(magnetic ? 0.28 : 0)
  const ripple = useRipple()
  return (
    <button
      ref={ref}
      onClick={onClick}
      onPointerDown={ripple}
      data-cursor={cursor}
      className={`btn-fx btn-3d inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5
        font-display font-bold text-white text-[15px] tracking-wide cursor-pointer
        transition-[box-shadow,filter,transform] duration-300 hover:brightness-[1.06] active:scale-95 ${className}`}
      style={{ transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s, filter 0.3s' }}
      {...rest}
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, onClick, cursor = 'Tap', className = '', ...rest }) {
  const ripple = useRipple()
  return (
    <button
      onClick={onClick}
      onPointerDown={ripple}
      data-cursor={cursor}
      className={`btn-fx inline-flex items-center justify-center gap-2 rounded-full border border-bone/25 px-7 py-3.5
        font-display font-semibold text-bone/85 text-[15px] tracking-wide cursor-pointer
        transition-all duration-300 hover:border-bone/60 hover:bg-bone/5 active:scale-95 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function IconButton({ children, label, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      data-cursor={label}
      className={`tap grid h-10 w-10 place-items-center rounded-full glass-lite text-bone/70 cursor-pointer
        transition-all duration-200 hover:text-bone hover:border-bone/30 active:scale-90 ${className}`}
    >
      {children}
    </button>
  )
}

// ---------- Labels / badges ----------
export function Eyebrow({ children, className = '' }) {
  return (
    <span className={`label-caps text-[11px] text-accent ${className}`}>{children}</span>
  )
}

export function VerifiedBadge({ size = 'sm', showText = false }) {
  const dim = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <span className="inline-flex items-center gap-1.5 align-middle" title="Verified — RC & DL checked">
      <span className={`relative inline-grid place-items-center ${dim} rounded-full bg-volt/15 glow-volt`}>
        <svg viewBox="0 0 24 24" className={`${size === 'lg' ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'} text-volt`} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
      {showText && <span className="label-caps text-[10px] text-volt text-glow-volt">Verified</span>}
    </span>
  )
}

export function StatusTag({ status }) {
  const { copy } = useMode()
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 border border-accent/40 px-3 py-1">
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="label-caps text-[10px] text-accent">{copy.liveLabel}</span>
      </span>
    )
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center rounded-full border border-bone/15 px-3 py-1">
        <span className="label-caps text-[10px] text-bone/50">Completed</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-bone/15 bg-bone/5 px-3 py-1">
      <span className="label-caps text-[10px] text-bone/70">Upcoming</span>
    </span>
  )
}

// ---------- Mode glyphs + persistent switcher pill ----------
export function ModeGlyph({ mode, className = '', ...rest }) {
  if (mode === 'car') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
        <path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11" />
        <rect x="3" y="11" width="18" height="6" rx="2" />
        <circle cx="7.5" cy="17" r="1.6" /><circle cx="16.5" cy="17" r="1.6" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <circle cx="5.5" cy="17" r="3" /><circle cx="18.5" cy="17" r="3" />
      <path d="M5.5 17l3.5-7h5l-2.5-4h2M18.5 17l-3-6.5h-6" />
    </svg>
  )
}

export function ModeSwitch({ onToggle }) {
  const { mode, copy } = useMode()
  return (
    <button
      onClick={onToggle}
      title={`Switch to ${copy.otherModeLabel} mode`}
      className="group flex cursor-pointer items-center gap-2 rounded-full glass-lite glass-blur py-1.5 pl-3 pr-2 transition-colors hover:border-accent/40"
    >
      <ModeGlyph mode={mode} className="h-4 w-4 text-accent" />
      <span className="label-caps text-[9px] text-bone/70 group-hover:text-bone">{copy.modeLabel}</span>
      <span className="grid h-5 w-5 place-items-center rounded-full bg-bone/8 text-bone/45 transition-colors group-hover:text-accent">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" />
        </svg>
      </span>
    </button>
  )
}

// ---------- Avatar (deterministic gradient from name) ----------
const AVATAR_HUES = [18, 32, 195, 210, 270, 340, 150, 45]
function hashCode(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i)
  return Math.abs(h)
}

export function Avatar({ rider, size = 'md', ring = false }) {
  const px = { xs: 'h-6 w-6 text-[9px]', sm: 'h-8 w-8 text-[11px]', md: 'h-10 w-10 text-[13px]', lg: 'h-14 w-14 text-lg', xl: 'h-20 w-20 text-2xl' }[size]
  const hue = AVATAR_HUES[hashCode(rider.name) % AVATAR_HUES.length]
  const initials = rider.name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center rounded-full font-display font-bold text-bone ${px} ${ring ? 'ring-2 ring-asphalt' : ''}`}
      style={{ background: `linear-gradient(140deg, hsl(${hue} 55% 32%), hsl(${(hue + 40) % 360} 60% 18%))` }}
      title={rider.name}
    >
      {initials}
      {rider.verified && size !== 'xs' && (
        <span className="absolute -bottom-0.5 -right-0.5 grid h-[38%] w-[38%] min-h-3 min-w-3 place-items-center rounded-full bg-asphalt">
          <span className="grid h-[85%] w-[85%] place-items-center rounded-full bg-volt/20 glow-volt">
            <svg viewBox="0 0 24 24" className="h-[60%] w-[60%] text-volt" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
        </span>
      )}
    </span>
  )
}

export function AvatarStack({ ridersList, max = 5 }) {
  const shown = ridersList.slice(0, max)
  const extra = ridersList.length - shown.length
  return (
    <span className="flex items-center">
      <span className="flex -space-x-2.5">
        {shown.map((r) => (
          <Avatar key={r.id} rider={r} size="sm" ring />
        ))}
      </span>
      {extra > 0 && (
        <span className="ml-1.5 text-xs font-semibold text-bone/50">+{extra}</span>
      )}
    </span>
  )
}

// ---------- misc ----------
export function formatRideDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
export function formatRideTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
}

// ---------- Founding window counter ----------
// Scarcity only works if it is visible and true. This reads the live count from
// the server; it is never a hardcoded number, and it disappears once the window
// closes rather than lingering as decoration.
export function FoundingCounter({ status, className = '' }) {
  if (!status) return null
  const { cap, issued, remaining, is_open: isOpen } = status
  const pct = Math.min(100, Math.round((issued / cap) * 100))

  return (
    <div className={`rounded-2xl border border-accent/25 bg-accent/5 p-5 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="label-caps text-[10px] text-accent">
          {isOpen ? 'Founding members' : 'Founding window closed'}
        </span>
        <span className="font-display text-sm text-bone/70 tabular-nums">
          {issued} / {cap}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bone/10">
        <div className="h-full rounded-full bg-accent transition-[width] duration-700"
             style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-bone/60">
        {isOpen
          ? `${remaining} founding numbers left. Yours is permanent, sequential, and never reissued — the window closes when it fills.`
          : 'Every founding number has been claimed. They are not reissued.'}
      </p>
    </div>
  )
}
