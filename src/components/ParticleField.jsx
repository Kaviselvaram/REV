import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../lib/hooks'

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Canvas particle background — drifting points joined by faint threads,
// reading as a night route-map / headlight field. Subtly repelled by the cursor.
export default function ParticleField({ density = 11000, className = '', accent = '#FF6B35' }) {
  const canvasRef = useRef(null)
  const reduced = usePrefersReducedMotion()
  const [ar, ag, ab] = hexToRgb(accent)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let particles = []
    let raf = null
    let w = 0
    let h = 0
    const mouse = { x: -9999, y: -9999 }
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(140, Math.floor((w * h) / density))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 0.8 + Math.random() * 1.6,
        amber: Math.random() < 0.24,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const linkDist = Math.min(150, w / 8)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        // gentle cursor repulsion
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const d = Math.hypot(dx, dy)
        if (d < 120 && d > 0.01) {
          p.x += (dx / d) * 0.6
          p.y += (dy / d) * 0.6
        }
        if (p.x < -20) p.x = w + 20
        if (p.x > w + 20) p.x = -20
        if (p.y < -20) p.y = h + 20
        if (p.y > h + 20) p.y = -20
      }

      // threads
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < linkDist * linkDist) {
            const alpha = (1 - Math.sqrt(d2) / linkDist) * 0.16
            ctx.strokeStyle = a.amber || b.amber
              ? `rgba(${ar}, ${ag}, ${ab}, ${alpha})`
              : `rgba(25, 23, 19, ${alpha * 0.55})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // points
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.amber ? `rgba(${ar}, ${ag}, ${ab}, 0.65)` : 'rgba(25, 23, 19, 0.3)'
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const onMouseLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }

    resize()
    window.addEventListener('resize', resize)

    if (reduced) {
      // static frame only — no animation loop
      const linkDistStatic = Math.min(150, w / 8)
      void linkDistStatic
      draw()
      cancelAnimationFrame(raf)
    } else {
      raf = requestAnimationFrame(draw)
      window.addEventListener('mousemove', onMouseMove, { passive: true })
      window.addEventListener('mouseleave', onMouseLeave)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [density, reduced, ar, ag, ab])

  return <canvas ref={canvasRef} className={`absolute inset-0 ${className}`} aria-hidden="true" />
}
