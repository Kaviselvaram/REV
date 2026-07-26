import { useEffect, useRef, useState } from 'react'
import { useCountUp, useParallax, usePrefersReducedMotion, useTilt } from '../lib/hooks'
import { useMode } from '../lib/mode'
import PhoneMockup from '../components/PhoneMockup'
import { Eyebrow, GhostButton, ModeSwitch, PrimaryButton, Reveal, SplitWords, VerifiedBadge } from '../components/ui'
import { MembershipValues, MembershipBenefits, MembershipSavings, MembershipStatus, MembershipTiers } from './Membership'
import { CITY } from '../data/mock'

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

// Cinematic hero background: autoplay muted video loop over a poster + still
// fallback, fading in once the first frame decodes. Falls back to the Ken Burns
// still under reduced motion.
function HeroVideo() {
  const { images } = useMode()
  const reduced = usePrefersReducedMotion()
  const vidRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(false)
    const v = vidRef.current
    if (!v || reduced) return
    v.play?.().catch(() => {})
  }, [images.heroVideo, reduced])

  return (
    <>
      <img
        src={images.hero}
        alt={images.heroAlt}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${reduced ? '' : 'kenburns'} ${ready ? 'opacity-0' : 'opacity-100'}`}
        style={{ animationPlayState: ready ? 'paused' : 'running' }}
      />
      {!reduced && images.heroVideo && (
        <video
          ref={vidRef}
          className={`hero-video ${ready ? 'is-ready' : ''}`}
          src={images.heroVideo}
          poster={images.heroPoster}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          onLoadedData={() => setReady(true)}
          aria-hidden="true"
        />
      )}
    </>
  )
}

// Count-up stat pair used in the hero corner + reused elsewhere.
function CountStat({ value, label, className = '' }) {
  const { ref, display } = useCountUp(value)
  return (
    <span ref={ref} className={`tabular ${className}`}>
      {display} {label}
    </span>
  )
}

// Wraps a photo in an overflow-hidden frame with scroll parallax + curtain reveal.
function ParallaxPhoto({ src, alt, speed = 0.1, className = '', imgClass = '', delay = 0 }) {
  const ref = useParallax(speed)
  return (
    <Reveal delay={delay} className={`reveal-mask parallax-frame ${className}`}>
      <img ref={ref} src={src} alt={alt} className={`h-full w-full scale-[1.18] object-cover ${imgClass}`} loading="lazy" />
    </Reveal>
  )
}

/* ============ ACT 1 — full-bleed cinematic hero ============ */
function Hero({ onEnter, onGo, onToggleMode }) {
  const { mode, accent, copy } = useMode()
  return (
    <section className="relative h-screen overflow-hidden" data-cursor-theme="dark">
      <HeroVideo />
      {/* legibility shades — flat cinematic scrim + top/bottom gradient + a soft
          centre vignette so the cream wordmark reads over bright footage too */}
      <div className="absolute inset-0" style={{ background: 'rgba(12,10,6,0.34)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(12,10,6,0.55), transparent 24%, transparent 54%, rgba(12,10,6,0.66))' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 52% 46% at 50% 44%, rgba(12,10,6,0.42), transparent 72%)' }} />
      <div className="fog-layer left-[-15%] top-[52%] h-[45%] w-[70%] opacity-60" aria-hidden="true" />

      {/* nav */}
      <nav className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-6 lg:px-12">
        <span className="font-display text-2xl font-black tracking-tight text-[#F6F3EC]">
          REV<span style={{ color: accent }}>.</span>
        </span>
        <div className="flex items-center gap-3 md:gap-7">
          <div className="hidden items-center gap-8 md:flex">
            {[['Garage', 'garage'], [copy.feedEyebrow, 'meets']].map(([l, dest]) => (
              <button key={l} onClick={() => onGo(dest)} data-cursor="Open" className="link-underline label-caps cursor-pointer text-[10px] text-[#F6F3EC]/70 transition-colors hover:text-[#F6F3EC]">{l}</button>
            ))}
            {/* scrolls down the page rather than navigating — membership lives here */}
            <button
              onClick={() => document.getElementById('membership')?.scrollIntoView({ behavior: 'smooth' })}
              data-cursor="Open"
              className="link-underline label-caps cursor-pointer text-[10px] text-[#F6F3EC]/70 transition-colors hover:text-[#F6F3EC]"
            >
              Membership
            </button>
          </div>
          <ModeSwitch onToggle={onToggleMode} />
        </div>
      </nav>

      {/* corner meta */}
      <p className="label-caps absolute left-6 top-24 z-10 hidden text-[9px] leading-relaxed text-[#F6F3EC]/60 lg:left-12 lg:block">
        {CITY} · Est. 2026
        <br />Verified motoring society
      </p>
      <p className="label-caps absolute right-6 top-24 z-10 hidden text-right text-[9px] leading-relaxed text-[#F6F3EC]/60 lg:right-12 lg:block">
        <CountStat value={copy.stats[0][0]} label={copy.stats[0][1]} />
        <br /><CountStat value={copy.stats[1][0]} label={copy.stats[1][1]} />
      </p>

      {/* the wordmark spanning the frame */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center">
        <Reveal>
          <h1 className="font-display font-black leading-[0.78] text-[#F6F3EC]" style={{ fontSize: 'clamp(9rem, 26vw, 24rem)', letterSpacing: '-0.02em', textShadow: '0 4px 80px rgba(0,0,0,0.35)' }}>
            REV<span style={{ color: accent }}>.</span>
          </h1>
        </Reveal>
        <Reveal delay={200}>
          <p className="label-caps mt-8 text-[11px] tracking-[0.34em] text-[#F6F3EC]/85">{copy.heroTag}</p>
        </Reveal>
        <Reveal delay={300}>
          <p className="serif-italic mt-4 text-2xl text-[#F6F3EC]/90 sm:text-3xl">
            {mode === 'bike' ? 'ride' : 'drive'} with people who show up.
          </p>
        </Reveal>
        <Reveal delay={420}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <PrimaryButton onClick={onEnter}>Build your garage</PrimaryButton>
            <GhostButton onClick={() => onGo('meets')} className="!border-[#F6F3EC]/40 !text-[#F6F3EC]/90 hover:!border-[#F6F3EC]/80 hover:!bg-[#F6F3EC]/10">
              {copy.browseCta}
            </GhostButton>
          </div>
        </Reveal>
      </div>

      {/* bottom chrome */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-6 pb-6 lg:px-12">
        <span className="inline-flex items-center gap-2 rounded-full bg-black/25 px-4 py-2 backdrop-blur-md">
          <VerifiedBadge />
          <span className="label-caps text-[9px] text-[#F6F3EC]/85">{copy.cityBadge}</span>
        </span>
        <p className="label-caps loader-pulse hidden text-[9px] text-[#F6F3EC]/60 sm:block">Scroll to begin the ride</p>
        <svg viewBox="0 0 24 24" className="h-5 w-5 animate-bounce text-[#F6F3EC]/70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
      </div>
    </section>
  )
}

/* ============ ACT 2 — pinned scroll-scrubbed journey ============ */
// Frames are preloaded and painted to a <canvas> — no video decode or seek, so
// the scrub is full-clarity and physically cannot stall. If an exact frame
// isn't loaded yet it paints the nearest loaded one, so there's never a gap.
// Desktop → scrub. Touch → the light autoplay clip. Reduced motion → a still.
function Captions({ journey, step, pinned }) {
  return (
    <div className={`pointer-events-none z-20 mx-auto max-w-lg px-6 text-center ${pinned ? 'absolute inset-x-0 bottom-14' : 'absolute inset-x-0 bottom-10'}`}>
      {journey.map(([t, d], i) => (
        <div key={t} className="absolute inset-x-6 bottom-0 transition-all duration-500" style={{ opacity: step === i ? 1 : 0, transform: `translateY(${step === i ? 0 : 14}px)` }}>
          <h3 className="font-display text-3xl font-medium text-[#F6F3EC] sm:text-4xl" style={{ textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}>{t}</h3>
          <p className="mt-2 text-sm text-[#F6F3EC]/85" style={{ textShadow: '0 1px 20px rgba(0,0,0,0.6)' }}>{d}</p>
        </div>
      ))}
    </div>
  )
}

function ZoomJourney() {
  const { copy, images } = useMode()
  const reduced = usePrefersReducedMotion()
  const [scrub, setScrub] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    // Only run the (memory-heavy) canvas image-sequence on capable machines.
    // Everything else — small screens, touch, low-core / low-RAM, data-saver —
    // gets the light autoplay loop, which is smooth on any system.
    const fine = window.matchMedia('(min-width: 768px) and (pointer: fine)').matches
    const cores = navigator.hardwareConcurrency || 8
    const mem = navigator.deviceMemory || 8 // Chrome-only; assume fine elsewhere
    const saveData = !!(navigator.connection && navigator.connection.saveData)
    setScrub(fine && cores >= 4 && mem >= 4 && !saveData)
  }, [])

  if (reduced) {
    return (
      <section className="relative">
        <img src={images.journey} alt={images.journeyAlt} className="h-screen w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-10 text-center">
          {copy.journey.map(([t, d]) => (
            <p key={t} className="mx-auto mt-3 max-w-md text-[#F6F3EC]"><strong className="font-display">{t}</strong> <span className="text-[#F6F3EC]/75">{d}</span></p>
          ))}
        </div>
      </section>
    )
  }
  if (!scrub) return <TouchJourney images={images} journey={copy.journey} step={step} setStep={setStep} />
  return <JourneyScrub images={images} journey={copy.journey} step={step} setStep={setStep} />
}

// Desktop: canvas image-sequence scrubber.
function JourneyScrub({ images, journey, step, setStep }) {
  const secRef = useRef(null)
  const frameRef = useRef(null)
  const canvasRef = useRef(null)
  const seq = images.sequence
  const poster = images.journey

  useEffect(() => {
    const sec = secRef.current
    const frame = frameRef.current
    const canvas = canvasRef.current
    if (!sec || !canvas) return
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'low' // frames are ~display size; 'low' is the fast bilinear path
    const count = seq.count

    // Device tier — keep the premium crossfade on capable machines, but on
    // low-end hardware draw a single frame at DPR 1 so it stays smooth everywhere.
    const cores = navigator.hardwareConcurrency || 8
    const mem = navigator.deviceMemory || 8
    const lowEnd = cores <= 4 || mem <= 4
    const maxDpr = lowEnd ? 1 : 1.5

    const st = { p: 0, ps: 0, active: false, raf: 0, step: -1, a: -1, b: -1, frac: -1, painted: false }

    // preload every frame; track which have loaded
    const frames = new Array(count)
    const loaded = new Array(count).fill(false)
    for (let i = 0; i < count; i++) {
      const im = new Image()
      im.decoding = 'async'
      im.src = `${seq.dir}f${String(i + 1).padStart(3, '0')}.jpg`
      im.onload = () => { loaded[i] = true; if (!st.painted) paint() }
      frames[i] = im
    }

    let cw = 0, ch = 0
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      cw = rect.width; ch = rect.height
      // frames are 1280px and the scene is in motion — a modest DPR keeps the
      // canvas sharp while cutting per-frame fill cost. Low-end devices → DPR 1.
      const dpr = Math.min(maxDpr, window.devicePixelRatio || 1)
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
      // assigning canvas.width resets context state — re-apply transform + smoothing
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'low'
      st.a = st.b = -1; st.frac = -1 // force repaint
      paint()
    }

    const nearestLoaded = (i) => {
      if (i >= 0 && i < count && loaded[i]) return i
      for (let d = 1; d < count; d++) {
        if (i - d >= 0 && loaded[i - d]) return i - d
        if (i + d < count && loaded[i + d]) return i + d
      }
      return -1
    }
    const drawCover = (img) => {
      const iw = img.naturalWidth, ih = img.naturalHeight
      if (!iw || !ih || !cw) return
      const s = Math.max(cw / iw, ch / ih)
      const w = iw * s, h = ih * s
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h)
    }

    // Cross-fade between the two frames straddling the smoothed scroll position,
    // so 44 sparse frames read as continuous motion. Nearest-loaded fallback
    // means a not-yet-decoded frame never leaves a gap.
    const paint = () => {
      const exact = st.ps * (count - 1)
      const i0 = Math.floor(exact)
      const i1 = Math.min(count - 1, i0 + 1)
      const frac = exact - i0
      const a = nearestLoaded(i0)
      const b = nearestLoaded(i1)
      if (a < 0 && b < 0) return
      // redraw only when the blend moved enough to see — ~40 steps per frame-gap
      if (a === st.a && b === st.b && Math.abs(frac - st.frac) < 0.025) return
      st.a = a; st.b = b; st.frac = frac; st.painted = true
      ctx.globalAlpha = 1
      if (a >= 0) drawCover(frames[a]); else drawCover(frames[b])
      // cross-fade the next frame in only on capable devices (single draw on low-end)
      if (!lowEnd && a >= 0 && b >= 0 && b !== a && frac > 0.001) {
        ctx.globalAlpha = frac
        drawCover(frames[b])
        ctx.globalAlpha = 1
      }
    }
    const loop = () => {
      const r = sec.getBoundingClientRect()
      const total = Math.max(1, r.height - window.innerHeight)
      st.p = Math.min(1, Math.max(0, -r.top / total))
      // tight tracking — Lenis already smooths the input, so stay close to it
      st.ps += (st.p - st.ps) * 0.75
      // ONLY compositor-safe work per frame: a subtle transform push-in + the
      // canvas paint. No border-radius / blur-opacity mutation (those repaint).
      if (frame) frame.style.transform = `scale(${(1.06 - st.ps * 0.06).toFixed(4)})`
      paint()
      const s = Math.min(2, Math.floor(st.ps * 3))
      if (s !== st.step) { st.step = s; setStep(s) }
      if (st.active) st.raf = requestAnimationFrame(loop)
    }

    resize()
    window.addEventListener('resize', resize)
    const io = new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting && !st.active) { st.active = true; st.raf = requestAnimationFrame(loop) }
        else if (!en.isIntersecting && st.active) { st.active = false; cancelAnimationFrame(st.raf) }
      },
      { rootMargin: '15% 0px' }
    )
    io.observe(sec)
    return () => {
      io.disconnect()
      cancelAnimationFrame(st.raf)
      window.removeEventListener('resize', resize)
      frames.forEach((im) => { im.onload = null })
    }
  }, [seq.dir, seq.count, setStep])

  return (
    <section ref={secRef} className="relative h-[400vh]" data-cursor-theme="dark">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden bg-asphalt-2/60">
        <p className="label-caps absolute left-6 top-8 z-20 text-[9px] text-bone/45 lg:left-12">The ritual · scroll to play</p>
        <p className="label-caps absolute right-6 top-8 z-20 text-[9px] text-bone/45 lg:right-12">{`0${step + 1} / 03`}</p>

        <div ref={frameRef} className="absolute inset-0 origin-center overflow-hidden will-change-transform" style={{ transform: 'scale(1.06)' }}>
          <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <canvas ref={canvasRef} className="relative h-full w-full" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(12,10,6,0.55), transparent 46%)' }} />
        </div>

        <Captions journey={journey} step={step} pinned />
      </div>
    </section>
  )
}

// Touch fallback: full-bleed autoplay loop (the light hero clip), captions cycle.
function TouchJourney({ images, journey, step, setStep }) {
  const secRef = useRef(null)
  useEffect(() => {
    const sec = secRef.current
    if (!sec) return
    let raf = 0, active = false, last = -1
    const loop = () => {
      const r = sec.getBoundingClientRect()
      const total = Math.max(1, r.height - window.innerHeight)
      const p = Math.min(1, Math.max(0, -r.top / total))
      const s = Math.min(2, Math.floor(p * 3))
      if (s !== last) { last = s; setStep(s) }
      if (active) raf = requestAnimationFrame(loop)
    }
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !active) { active = true; raf = requestAnimationFrame(loop) }
      else if (!en.isIntersecting) { active = false; cancelAnimationFrame(raf) }
    }, { rootMargin: '10% 0px' })
    io.observe(sec)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [setStep])
  return (
    <section ref={secRef} className="relative h-[220vh]" data-cursor-theme="dark">
      <div className="sticky top-0 h-screen overflow-hidden bg-asphalt-2/60">
        <video
          src={images.heroVideo}
          poster={images.heroPoster}
          muted loop playsInline autoPlay preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(12,10,6,0.55), transparent 44%)' }} />
        <Captions journey={journey} step={step} />
      </div>
    </section>
  )
}

/* ============ ACT 5 — pinned horizontal gallery ============ */
function HorizontalGallery() {
  const { images } = useMode()
  const reduced = usePrefersReducedMotion()
  const secRef = useRef(null)
  const trackRef = useRef(null)
  const idxRef = useRef(0)
  const [idx, setIdx] = useState(0)
  const n = images.gallery.length

  useEffect(() => {
    if (reduced) return
    const sec = secRef.current
    if (!sec) return
    let raf = null, visible = false, maxCache = 0
    const measure = () => { const track = trackRef.current; maxCache = track ? track.scrollWidth - window.innerWidth : 0 }
    const apply = () => {
      raf = null
      const track = trackRef.current
      if (!track) return
      const r = sec.getBoundingClientRect()
      const total = Math.max(1, r.height - window.innerHeight)
      const p = Math.min(1, Math.max(0, -r.top / total))
      track.style.transform = `translate3d(${(-p * maxCache).toFixed(1)}px, 0, 0)`
      const i = Math.min(n - 1, Math.round(p * (n - 1)))
      if (i !== idxRef.current) { idxRef.current = i; setIdx(i) }
    }
    const onScroll = () => { if (!raf && visible) raf = requestAnimationFrame(apply) }
    const onResize = () => { measure(); onScroll() }
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting
      if (visible) { measure(); onScroll() }
    }, { rootMargin: '10% 0px' })
    io.observe(sec)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduced, n])

  const figures = images.gallery.map((g, i) => (
    <figure key={g.src + i} className="w-[80vw] shrink-0 sm:w-[54vw] lg:w-[42vw]">
      <div className="h-[58vh] overflow-hidden rounded-[1.75rem] shadow-lux">
        <img src={g.src} alt={g.caption} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
      </div>
      <figcaption className="mt-4 flex items-baseline justify-between">
        <span className="label-caps text-[9px] text-bone/50">{g.caption}</span>
        <span className="serif-italic text-lg text-bone/35">{`0${i + 1}`}</span>
      </figcaption>
    </figure>
  ))

  if (reduced) {
    return (
      <section className="py-24">
        <div className="flex gap-8 overflow-x-auto px-6 lg:px-12">{figures}</div>
      </section>
    )
  }

  return (
    <section ref={secRef} className="relative h-[300vh]">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mb-10 flex items-end justify-between px-6 lg:px-12">
          <h2 className="font-display text-4xl font-medium tracking-tight text-bone sm:text-5xl">
            Sundays, <em className="serif-italic text-accent">archived.</em>
          </h2>
          <p className="label-caps text-[10px] text-bone/45">{`0${idx + 1} — 0${n}`}</p>
        </div>
        <div ref={trackRef} data-cursor="Scroll" className="flex w-max gap-8 px-6 will-change-transform lg:px-12">
          {figures}
          <div className="flex w-[40vw] shrink-0 items-center lg:w-[24vw]">
            <p className="serif-italic max-w-[16ch] text-3xl leading-snug text-bone/60">
              every recap becomes part of the archive.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============ the page ============ */
export default function Landing({ onEnter, onGo, onToggleMode }) {
  const heroTilt = useTilt(4)
  const { mode, accent, copy, images } = useMode()

  return (
    <div className="blur-enter">
      <Hero onEnter={onEnter} onGo={onGo} onToggleMode={onToggleMode} />

      {/* ticker */}
      <div className="marquee-hoverable overflow-hidden border-y border-bone/10 bg-asphalt-2/70 py-5" aria-hidden="true">
        <div className="marquee-track flex items-baseline gap-12">
          {[...copy.ticker, ...copy.ticker].map((t, i) => (
            <span key={i} className="flex items-baseline gap-12 whitespace-nowrap">
              <span className={i % 2 === 0 ? 'label-caps text-[11px] text-bone/45' : 'serif-italic text-lg text-bone/55'}>
                {i % 2 === 0 ? t : t.toLowerCase()}
              </span>
              <span className="text-accent/60 text-xs">●</span>
            </span>
          ))}
        </div>
      </div>

      <ZoomJourney />

      {/* ============ ACT 3 — statement typography ============ */}
      <section className="relative mx-auto max-w-7xl px-6 py-32 lg:px-12 lg:py-44">
        <p className="label-caps absolute left-6 top-10 text-[9px] text-bone/40 lg:left-12">REV — Manifesto</p>
        <p className="label-caps absolute right-6 top-10 text-[9px] text-bone/40 lg:right-12">{CITY}, IN</p>
        <SplitWords
          as="h2"
          text="Trust is the feature the group chat can't ship."
          className="block max-w-5xl font-display text-5xl font-medium leading-[1.06] tracking-tight text-bone sm:text-7xl"
        />
        <div className="mt-10 flex justify-end">
          <Reveal delay={200}>
            <p className="max-w-sm text-[15px] leading-relaxed text-bone/60">
              {copy.heroSub}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============ ACT 4 — editorial split ============ */}
      <section className="mx-auto max-w-7xl px-6 pb-28 lg:px-12 lg:pb-36">
        <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <ParallaxPhoto src={images.editorial} alt={images.editorialAlt} speed={0.12} className="h-[420px] rounded-[2rem] shadow-lux lg:h-[560px]" />
          <div>
            <Reveal>
              <Eyebrow>Why REV, not the group chat</Eyebrow>
              <h2 className="mt-4 font-display text-4xl font-medium leading-tight tracking-tight text-bone sm:text-5xl">
                {copy.manifestoTitle[0]}
                <br />
                <em className="serif-italic text-accent">{copy.manifestoTitle[1]}</em>
              </h2>
            </Reveal>
            <div className="mt-10 flex flex-col gap-8">
              {copy.pillars.map((p, i) => (
                <Reveal key={p.title} delay={i * 110}>
                  <div className="flex gap-6 border-t border-bone/10 pt-6">
                    <span className="font-display text-2xl font-light text-bone/30">0{i + 1}</span>
                    <div>
                      <h3 className={`font-display text-xl font-semibold ${p.volt ? 'text-volt' : 'text-bone'}`}>{p.title}</h3>
                      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-bone/60">{p.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <HorizontalGallery />

      {/* ============ MEMBERSHIP ARC — the value layer ============ */}
      <div id="membership" style={{ scrollMarginTop: '2rem' }} />
      <MembershipValues />
      <MembershipBenefits />
      <MembershipSavings />
      <MembershipStatus />
      <MembershipTiers onEnter={onEnter} />

      {/* ============ ACT 6 — the instrument ============ */}
      <section className="border-t border-bone/10 bg-asphalt-2/60">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-28 lg:grid-cols-2 lg:px-12">
          <div>
            <Reveal>
              <Eyebrow>The instrument</Eyebrow>
              <h2 className="mt-4 font-display text-4xl font-medium tracking-tight text-bone sm:text-5xl">
                One tap.
                <br />
                <em className="serif-italic text-accent">On the roster.</em>
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-bone/60">
                {mode === 'bike'
                  ? 'Every meet carries a verified attendee list, a captain, a route and a safety brief. RSVP once — the rest of the logistics ride with it.'
                  : 'Every drive carries a verified roster, a lead, a route and convoy rules. RSVP once — the rest of the logistics ride with it.'}
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div className="mt-9">
                <PrimaryButton onClick={onEnter}>{copy.ctaButton}</PrimaryButton>
              </div>
            </Reveal>
          </div>
          <div className="tilt-wrap flex justify-center" ref={heroTilt.ref} onMouseMove={heroTilt.onMouseMove} onMouseLeave={heroTilt.onMouseLeave}>
            <Reveal delay={150}>
              <PhoneMockup />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ ACT 7 — the loop ============ */}
      <section className="relative overflow-hidden border-t border-bone/10">
        <div className="mx-auto max-w-7xl px-6 py-28 lg:px-12">
          <Reveal>
            <Eyebrow>The loop</Eyebrow>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight text-bone sm:text-5xl">
              Garage → Meet → {mode === 'bike' ? 'Ride' : 'Drive'} → <em className="serif-italic text-accent">Recap.</em>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {copy.loop.map(([num, title, body], i) => (
              <Reveal key={num} delay={i * 100}>
                <div className="card-3d group h-full rounded-3xl p-7">
                  <span className="serif-italic text-gradient text-6xl">{num}</span>
                  <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-bone">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-bone/55">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ACT 8 — full-bleed close ============ */}
      <section className="relative overflow-hidden" data-cursor-theme="dark">
        <ParallaxPhoto src={images.cta} alt={images.ctaAlt} speed={0.15} className="h-[86vh] min-h-[560px]" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, var(--color-asphalt), transparent 34%, rgba(12,10,6,0.35))' }} />
        <div className="fog-layer bottom-[8%] left-[-12%] h-[40%] w-[65%] opacity-70" aria-hidden="true" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <Reveal>
              <p className="label-caps mb-6 text-[10px] tracking-[0.3em] text-[#F6F3EC]/80">{copy.cityBadge}</p>
              <h2 className="font-display text-5xl font-medium tracking-tight text-[#F6F3EC] sm:text-7xl" style={{ textShadow: '0 2px 50px rgba(0,0,0,0.45)' }}>
                The road is
                <br />
                <em className="serif-italic">better shared.</em>
              </h2>
              <p className="mx-auto mt-6 max-w-md text-lg text-[#F6F3EC]/85" style={{ textShadow: '0 1px 24px rgba(0,0,0,0.5)' }}>{copy.ctaSub}</p>
              <div className="mt-9 flex justify-center">
                <PrimaryButton onClick={onEnter} className="!px-10 !py-4 !text-base">
                  {copy.ctaButton}
                </PrimaryButton>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <footer className="border-t border-bone/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 lg:px-12">
          <span className="font-display text-lg font-black tracking-tight text-bone/60">REV<span style={{ color: accent }}>.</span></span>
          <p className="label-caps text-[9px] text-bone/35">UI prototype · Mock data · {copy.modeLabel} mode · {CITY}, India</p>
        </div>
      </footer>
    </div>
  )
}
