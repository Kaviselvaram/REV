import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

// Scroll-triggered reveal: adds .is-visible when the element enters the viewport.
export function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

// 3D hover tilt: sets --rx / --ry CSS vars from cursor position.
export function useTilt(maxDeg = 7) {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  const onMouseMove = useCallback(
    (e) => {
      const el = ref.current
      if (!el || reduced) return
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width - 0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5
      el.style.setProperty('--ry', `${px * maxDeg * 2}deg`)
      el.style.setProperty('--rx', `${-py * maxDeg * 2}deg`)
    },
    [maxDeg, reduced]
  )

  const onMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }, [])

  return { ref, onMouseMove, onMouseLeave }
}

// Scroll parallax: translates the element vertically against scroll direction.
// Attach to an oversized child inside an overflow-hidden frame. Only computes
// while the element is on/near screen (IO-gated) to avoid layout thrash from
// many off-screen instances.
export function useParallax(speed = 0.12) {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    let raf = null
    let visible = false
    const apply = () => {
      raf = null
      const r = el.getBoundingClientRect()
      const offset = r.top + r.height / 2 - window.innerHeight / 2
      el.style.transform = `translate3d(0, ${(-offset * speed).toFixed(1)}px, 0)`
    }
    const onScroll = () => {
      if (raf || !visible) return
      raf = requestAnimationFrame(apply)
    }
    const io = new IntersectionObserver(
      ([en]) => {
        visible = en.isIntersecting
        if (visible) onScroll()
      },
      { rootMargin: '20% 0px' }
    )
    io.observe(el)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [speed, reduced])

  return ref
}

// Progress (0..1) through a tall section — drives the sticky 3D showroom.
// `progress` is a mutable ref (read per-frame by R3F without re-rendering);
// `onStep` fires when the coarse step index changes (for caption swaps).
export function useSectionProgress(steps = 3, onStep) {
  const ref = useRef(null)
  const progress = useRef(0)
  const stepRef = useRef(-1)

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const total = Math.max(1, r.height - window.innerHeight)
      const p = Math.min(1, Math.max(0, -r.top / total))
      progress.current = p
      const s = Math.min(steps - 1, Math.floor(p * steps))
      if (s !== stepRef.current) {
        stepRef.current = s
        if (onStep) onStep(s)
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [steps, onStep])

  return { ref, progress }
}

// Count-up: animates a number from 0 → target when the element scrolls in.
// Returns { ref, display } — a formatted string preserving prefix/suffix like
// "1,500+" or "92%". Honours reduced motion (snaps to final).
export function useCountUp(raw, { duration = 1400 } = {}) {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()
  // Parse ONCE per `raw` — a fresh regex-match array in the render body would
  // otherwise change identity every render and restart the animation forever.
  const { prefix, target, suffix, grouped, ok } = useMemo(() => {
    const m = String(raw).match(/^(\D*)([\d,]+)(.*)$/)
    return m
      ? { prefix: m[1], target: parseInt(m[2].replace(/,/g, ''), 10), suffix: m[3], grouped: m[2].includes(','), ok: true }
      : { prefix: '', target: 0, suffix: '', grouped: false, ok: false }
  }, [raw])
  const [n, setN] = useState(reduced ? target : 0)

  useEffect(() => {
    const el = ref.current
    if (!el || !ok) return
    if (reduced) { setN(target); return }
    let raf, start, done = false
    const run = (t) => {
      if (start === undefined) start = t
      const p = Math.min(1, (t - start) / duration)
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(run)
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !done) {
          done = true
          raf = requestAnimationFrame(run)
          io.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
    // deps are all primitives/stable → effect runs once, count completes cleanly
  }, [target, duration, reduced, ok])

  const display = ok ? `${prefix}${grouped ? n.toLocaleString('en-US') : n}${suffix}` : String(raw)
  return { ref, display }
}

// Scroll progress (0..1) of the whole document, applied to a ref's scaleX.
export function useScrollProgress() {
  const ref = useRef(null)
  useEffect(() => {
    let raf = null
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = null
        const el = ref.current
        if (!el) return
        const max = document.documentElement.scrollHeight - window.innerHeight
        const p = max > 0 ? window.scrollY / max : 0
        el.style.transform = `scaleX(${p.toFixed(4)})`
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return ref
}

// Attaches a material-style ripple on pointer-down. Returns an onPointerDown
// handler to spread onto any .btn-fx element.
export function useRipple() {
  return (e) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2.2
    const span = document.createElement('span')
    span.className = 'ripple'
    span.style.width = span.style.height = `${size}px`
    span.style.left = `${e.clientX - rect.left}px`
    span.style.top = `${e.clientY - rect.top}px`
    el.appendChild(span)
    span.addEventListener('animationend', () => span.remove())
  }
}

// Magnetic button: element drifts toward the cursor as it approaches.
export function useMagnetic(strength = 0.3, radius = 90) {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    let raf = null

    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.hypot(dx, dy)
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (dist < radius + Math.max(rect.width, rect.height) / 2) {
          el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`
        } else {
          el.style.transform = 'translate(0, 0)'
        }
      })
    }
    const onLeave = () => {
      el.style.transform = 'translate(0, 0)'
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseout', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseout', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [strength, radius, reduced])

  return ref
}

// ---------- Modal chrome: Escape to close, focus trap, scroll lock ----------
// Every overlay in REV shares this so keyboard users can always get out and
// can never tab into the page behind the dialog.
export function useModalChrome(onClose) {
  const ref = useRef(null)

  useEffect(() => {
    const panel = ref.current
    const prevFocus = document.activeElement

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const focusables = panel.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      if (prevFocus instanceof HTMLElement) prevFocus.focus()
    }
  }, [onClose])

  return ref
}
