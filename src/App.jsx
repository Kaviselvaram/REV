import { useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import Selector from './screens/Selector'
import Landing from './screens/Landing'
import Garage from './screens/Garage'
import MeetsFeed from './screens/MeetsFeed'
import RideDetail from './screens/RideDetail'
import Recap from './screens/Recap'
import Login from './screens/Login'
import Account from './screens/Account'
import Legal from './screens/Legal'
import Cursor from './components/Cursor'
import ErrorBoundary from './components/ErrorBoundary'
import { NotFound } from './components/States'
import { Avatar, ModeSwitch } from './components/ui'
import { useScrollProgress } from './lib/hooks'
import { ModeProvider, useMode } from './lib/mode'
import { UserContext, useUser } from './lib/user'
import { isConfigured } from './lib/supabase'
import * as api from './lib/api'
import { currentUser, ACCENTS, IMG } from './data/mock'

function ScrollProgress() {
  const ref = useScrollProgress()
  return <div ref={ref} className="scroll-progress" aria-hidden="true" />
}

// Cinematic page-transition curtain: covers, swaps the screen at the seam,
// then reveals. Guaranteed timers drive the two phases (animationend only
// accelerates), so it never stalls — even on a throttled/backgrounded tab.
function Curtain({ onCovered, onDone, accent }) {
  const [phase, setPhase] = useState('cover')
  const covered = useRef(false)
  const done = useRef(false)

  const toReveal = () => {
    if (covered.current) return
    covered.current = true
    onCovered()
    setPhase('reveal')
  }
  const finish = () => {
    if (done.current) return
    done.current = true
    onDone()
  }

  useEffect(() => {
    const t = setTimeout(toReveal, 580)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (phase !== 'reveal') return
    const t = setTimeout(finish, 660)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  return (
    <div
      className={`curtain curtain-${phase}`}
      style={{ background: accent }}
      aria-hidden="true"
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return
        if (phase === 'cover') toReveal()
        else finish()
      }}
    >
      <span className="curtain-mark">REV<span style={{ opacity: 0.5 }}>.</span></span>
    </div>
  )
}

// Lenis smooth scroll — the cinematic glide. Skipped under reduced motion.
function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // lerp-based feel: responsive to input, still glides. (duration-based was
    // floaty — ~1.15s to settle read as lag layered on top of scroll effects.)
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.6 })
    let raf
    const loop = (time) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])
}

// Counter preloader — plays once while the photography decodes.
function Preloader({ onDone }) {
  const [count, setCount] = useState(0)
  const [exiting, setExiting] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    // Warm only real images; videos stream on demand behind their posters.
    Object.values(IMG)
      .filter((src) => /\.(jpe?g|png|webp|avif)$/i.test(src))
      .forEach((src) => {
        const im = new Image()
        im.src = src
      })
    const tick = setInterval(() => {
      setCount((c) => Math.min(100, c + 2 + Math.round(Math.random() * 4)))
    }, 28)
    // hard finish even if timers are throttled
    const hard = setTimeout(() => setCount(100), 1900)
    return () => {
      clearInterval(tick)
      clearTimeout(hard)
    }
  }, [])

  useEffect(() => {
    if (count < 100 || doneRef.current) return
    doneRef.current = true
    const t1 = setTimeout(() => setExiting(true), 250)
    const t2 = setTimeout(onDone, 1200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [count, onDone])

  return (
    <div className={`preloader ${exiting ? 'is-done' : ''}`} aria-hidden="true">
      <div className="flex h-full flex-col justify-between p-8 lg:p-12">
        <div className="flex items-center justify-between">
          <span className="font-display text-2xl font-black tracking-tight text-bone">
            REV<span className="text-ember">.</span>
          </span>
          <span className="label-caps text-[9px] text-bone/45">Verified motoring society</span>
        </div>
        <div className="flex items-end justify-between">
          <p className="label-caps text-[9px] text-bone/45">Chennai, India</p>
          <p className="font-display text-7xl font-light tabular-nums text-bone sm:text-8xl">{count}</p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 h-0.5 bg-ember transition-[width] duration-200" style={{ width: `${count}%` }} />
    </div>
  )
}

// Deep-link for demos/dev: /?mode=bike|car skips the selector.
function initialMode() {
  const m = new URLSearchParams(window.location.search).get('mode')
  return m === 'bike' || m === 'car' ? m : null
}

function InAppHeader({ nav, go, onToggleMode, onSignIn }) {
  const { copy } = useMode()
  const { signedIn, profile } = useUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-50 border-b border-bone/8 bg-asphalt/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <button onClick={() => go('landing')} className="cursor-pointer font-display text-xl font-black tracking-tight text-bone">
          REV<span className="text-accent">.</span>
        </button>
        <nav className="flex items-center gap-1 sm:gap-2">
          {[
            ['garage', 'Garage'],
            ['meets', copy.feedEyebrow],
          ].map(([id, label]) => {
            const active = nav.screen === id || (id === 'meets' && ['ride', 'recap'].includes(nav.screen))
            return (
              <button key={id} onClick={() => go(id)}
                className={`label-caps cursor-pointer rounded-full px-4 py-2 text-[10px] transition-all ${
                  active ? 'bg-bone/10 text-bone' : 'text-bone/50 hover:text-bone'
                }`}>
                {label}
              </button>
            )
          })}
          <span className="mx-1 hidden sm:block"><ModeSwitch onToggle={onToggleMode} /></span>

          {signedIn ? (
            <span ref={menuRef} className="relative ml-1">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Account menu"
                aria-expanded={menuOpen}
                data-cursor="Account"
                className="block cursor-pointer rounded-full transition-transform hover:scale-105 active:scale-95"
              >
                <Avatar rider={profile} size="sm" />
              </button>
              {menuOpen && (
                <div
                  className="glass-blur absolute right-0 top-11 w-52 overflow-hidden rounded-2xl shadow-lux"
                  style={{ animation: 'screenIn 0.22s cubic-bezier(0.22,1,0.36,1) both' }}
                >
                  <div className="border-b border-bone/10 px-4 py-3">
                    <p className="truncate font-display text-sm font-semibold text-bone">{profile.name}</p>
                    <p className="truncate text-[11px] text-bone/45">@{profile.handle} · {profile.city}</p>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); go('account') }}
                    className="block w-full cursor-pointer px-4 py-2.5 text-left text-[13px] text-bone/75 transition-colors hover:bg-bone/8 hover:text-bone"
                  >
                    Account &amp; profile
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); go('garage') }}
                    className="block w-full cursor-pointer px-4 py-2.5 text-left text-[13px] text-bone/75 transition-colors hover:bg-bone/8 hover:text-bone"
                  >
                    My garage
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); go('legal') }}
                    className="block w-full cursor-pointer px-4 py-2.5 text-left text-[13px] text-bone/75 transition-colors hover:bg-bone/8 hover:text-bone"
                  >
                    Legal &amp; privacy
                  </button>
                </div>
              )}
            </span>
          ) : (
            <button
              onClick={onSignIn}
              data-cursor="Sign in"
              className="label-caps ml-1 cursor-pointer rounded-full bg-accent px-4 py-2 text-[10px] text-white transition-transform hover:scale-[1.03] active:scale-95"
            >
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}

// In-memory navigation — no router lib, no persistence, matches the prototype brief.
export default function App() {
  const [booted, setBooted] = useState(false)
  const [mode, setMode] = useState(initialMode) // null → photographic selector
  const [nav, setNav] = useState({ screen: 'landing', rideId: null })
  const [pending, setPending] = useState(null) // target nav while curtain covers
  // — session user: mock auth + saved garage (per mode) —
  // profile is null when signed out. Its id stays 'me' so ride rosters, which
  // reference that id, keep working exactly as before — only the identity
  // shown on screen becomes real.
  const [profile, setProfile] = useState(null)
  const [garage, setGarage] = useState({ bike: null, car: null })
  const authCbRef = useRef(null)
  const sessionRef = useRef(null)
  const [authOpen, setAuthOpen] = useState(false)
  useSmoothScroll()

  const signedIn = !!profile

  // Restore an existing Supabase session on load, so a refresh does not sign
  // the member out. No-ops entirely when the backend is not configured.
  useEffect(() => {
    if (!isConfigured) return
    let alive = true
    ;(async () => {
      try {
        const session = await api.getSession()
        if (!alive || !session) return
        sessionRef.current = session
        const [me, cars] = await Promise.all([
          api.getMyProfile(session),
          api.getMyVehicles(session),
        ])
        if (!alive) return
        if (me) setProfile(me)
        if (cars) setGarage(cars)
      } catch {
        // a bad or expired session should just leave the member signed out
      }
    })()
    return () => { alive = false }
  }, [])

  // Gate an action behind sign-in: runs immediately if verified, else opens the
  // login kit and runs it on success.
  const requireAuth = (cb) => {
    if (signedIn) { cb?.(); return }
    authCbRef.current = cb || null
    setAuthOpen(true)
  }
  // Login builds the finished profile on both the real and prototype paths,
  // so there is nothing left to assemble here.
  const resolveAuth = async (finishedProfile) => {
    setProfile(finishedProfile)
    setAuthOpen(false)
    if (isConfigured) {
      try {
        sessionRef.current = await api.getSession()
        const cars = await api.getMyVehicles(sessionRef.current)
        setGarage(cars)
      } catch { /* an empty garage is a fine starting state */ }
    }
    const cb = authCbRef.current
    authCbRef.current = null
    if (cb) setTimeout(cb, 0)
  }
  const signOut = () => {
    if (isConfigured) api.signOut().catch(() => {})
    sessionRef.current = null
    setProfile(null)
    setGarage({ bike: null, car: null })
  }

  const updateProfile = (patch) => {
    setProfile((p) => (p ? { ...p, ...patch } : p)) // optimistic
    if (isConfigured && sessionRef.current) {
      api.updateProfile(patch, sessionRef.current)
        .then((saved) => saved && setProfile(saved))
        .catch(() => {})
    }
  }

  const saveVehicle = (m, vehicle) => {
    setGarage((g) => ({ ...g, [m]: vehicle })) // optimistic
    if (isConfigured && sessionRef.current) {
      api.saveVehicle(m, vehicle, sessionRef.current)
        .then((saved) => saved && setGarage((g) => ({ ...g, [m]: saved })))
        .catch(() => {})
    }
  }
  const getVehicle = (m) => garage[m]
  const userValue = {
    signedIn, profile, phone: profile?.phone ?? '',
    requireAuth, signOut, updateProfile,
    garage, saveVehicle, getVehicle,
  }

  // Keep the global accent in sync with the mode so fixed elements rendered
  // OUTSIDE the themed AppShell (custom cursor, scroll-progress bar, curtain)
  // pick up the right accent — not the :root copper default.
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', ACCENTS[mode] || ACCENTS.bike)
  }, [mode])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [nav, mode])

  // Navigate through the curtain (instant under reduced motion).
  const go = (screen, rideId = null) => {
    if (screen === nav.screen && rideId === nav.rideId) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setNav({ screen, rideId })
      return
    }
    setPending({ screen, rideId })
  }

  const selectMode = (m) => {
    setMode(m)
    setNav({ screen: 'landing', rideId: null })
  }

  // Persistent switcher: flips worlds in place. Ride ids are per-mode, so
  // detail/recap views fall back to the feed of the new mode.
  const toggleMode = () => {
    setMode((m) => (m === 'bike' ? 'car' : 'bike'))
    setNav((n) => (['ride', 'recap'].includes(n.screen) ? { screen: 'meets', rideId: null } : n))
  }

  return (
    <UserContext.Provider value={userValue}>
      <Cursor />
      <ScrollProgress />
      {!booted && <Preloader onDone={() => setBooted(true)} />}
      {pending && (
        <Curtain
          accent={ACCENTS[mode] || ACCENTS.bike}
          onCovered={() => {
            setNav(pending)
            window.scrollTo({ top: 0, behavior: 'instant' })
          }}
          onDone={() => setPending(null)}
        />
      )}
      <ErrorBoundary>
        {!mode ? (
          <div className="grain min-h-screen bg-asphalt" style={{ '--accent': ACCENTS.bike }}>
            <Selector onSelect={selectMode} />
          </div>
        ) : (
          <ModeProvider key={mode} mode={mode}>
            <AppShell
              mode={mode}
              nav={nav}
              go={go}
              onToggleMode={toggleMode}
              onSignIn={() => requireAuth(null)}
            />
          </ModeProvider>
        )}
      </ErrorBoundary>
      {authOpen && <Login onDone={resolveAuth} onClose={() => { authCbRef.current = null; setAuthOpen(false) }} />}
    </UserContext.Provider>
  )
}

function AppShell({ mode, nav, go, onToggleMode, onSignIn }) {
  const { rides, copy } = useMode()
  const [legalDoc, setLegalDoc] = useState('terms')
  const ride = nav.rideId ? rides.find((r) => r.id === nav.rideId) : null
  const inApp = nav.screen !== 'landing'
  // A ride id that no longer resolves used to render an empty page under the
  // header. Once ids come from a server and can 404, that path is reachable.
  const missingRide = ['ride', 'recap'].includes(nav.screen) && !ride

  return (
    <div className={`grain min-h-screen mode-${mode}`} style={{ '--accent': ACCENTS[mode] }}>
      {inApp && <InAppHeader nav={nav} go={go} onToggleMode={onToggleMode} onSignIn={onSignIn} />}

      {nav.screen === 'landing' && (
        <Landing key={`landing-${mode}`} onEnter={() => go('garage')} onGo={go} onToggleMode={onToggleMode} />
      )}
      {nav.screen === 'garage' && <Garage key={`garage-${mode}`} onDone={() => go('meets')} />}
      {nav.screen === 'meets' && <MeetsFeed key={`meets-${mode}`} onOpenRide={(id) => go('ride', id)} />}
      {nav.screen === 'account' && <Account onBack={() => go('meets')} onOpenLegal={(d) => { setLegalDoc(d); go('legal') }} />}
      {nav.screen === 'legal' && <Legal doc={legalDoc} onSelect={setLegalDoc} onBack={() => go('meets')} />}

      {missingRide ? (
        <NotFound
          title={`That ${copy.rideWord ?? 'ride'} is gone.`}
          body="It may have been cancelled by its captain, or the link is out of date."
          actionLabel={`Back to ${copy.feedEyebrow.toLowerCase()}`}
          onAction={() => go('meets')}
        />
      ) : (
        <>
          {nav.screen === 'ride' && ride && (
            <RideDetail key={`ride-${mode}-${ride.id}`} ride={ride} onBack={() => go('meets')} onOpenRecap={(id) => go('recap', id)} />
          )}
          {nav.screen === 'recap' && ride && (
            <Recap key={`recap-${mode}-${ride.id}`} ride={ride} onBack={() => go('ride', ride.id)} onBrowse={() => go('meets')} />
          )}
        </>
      )}
    </div>
  )
}
