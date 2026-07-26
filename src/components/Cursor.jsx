import { useEffect, useRef } from 'react'

// Signature custom cursor: a precise dot that tracks 1:1, a ring that follows
// with spring lag, growing + labelling over interactive targets. Elements can
// opt in with data-cursor="label text" and sections can flip it light with
// data-cursor-theme="dark". No-ops on touch / reduced-motion (CSS hides them).
export default function Cursor() {
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const labelRef = useRef(null)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return

    document.documentElement.classList.add('has-custom-cursor')
    const dot = dotRef.current
    const ring = ringRef.current
    const label = labelRef.current

    const target = { x: innerWidth / 2, y: innerHeight / 2 }
    const ringPos = { x: target.x, y: target.y }
    let raf

    const onMove = (e) => {
      target.x = e.clientX
      target.y = e.clientY
      dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`
      label.style.transform = `translate3d(${e.clientX}px, ${e.clientY - 34}px, 0) translate(-50%, -50%)`

      const el = e.target.closest?.('a, button, [role="button"], input, select, textarea, label, [data-cursor]')
      const hot = !!el
      ring.classList.toggle('is-hot', hot)
      const dark = !!e.target.closest?.('[data-cursor-theme="dark"]')
      ring.classList.toggle('is-dark', dark)
      const text = el?.getAttribute?.('data-cursor')
      if (text) {
        label.textContent = text
        label.classList.add('is-shown')
      } else {
        label.classList.remove('is-shown')
      }
    }
    const onDown = () => ring.classList.add('is-down')
    const onUp = () => ring.classList.remove('is-down')
    const onLeave = () => {
      dot.style.opacity = '0'
      ring.style.opacity = '0'
    }
    const onEnter = () => {
      dot.style.opacity = '1'
      ring.style.opacity = '1'
    }

    const loop = () => {
      ringPos.x += (target.x - ringPos.x) * 0.18
      ringPos.y += (target.y - ringPos.y) * 0.18
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      document.documentElement.classList.remove('has-custom-cursor')
    }
  }, [])

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      <div ref={labelRef} className="cursor-label" aria-hidden="true" />
    </>
  )
}
