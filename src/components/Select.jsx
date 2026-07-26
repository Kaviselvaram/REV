import { useEffect, useId, useRef, useState } from 'react'

// Custom on-brand dropdown replacing the native <select>. Spring-open panel,
// staggered options, full keyboard support (↑ ↓ Enter Esc, type-ahead),
// click-outside to close. Mirrors the floating-label look of the text inputs.
export default function Select({ value, onChange, options, label, id }) {
  const auto = useId()
  const selectId = id || auto
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const typeahead = useRef({ str: '', t: 0 })

  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const selected = opts.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (open) setActive(Math.max(0, opts.findIndex((o) => o.value === value)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // keep active option scrolled into view
  useEffect(() => {
    if (!open || active < 0) return
    const el = panelRef.current?.children[active]
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const commit = (i) => {
    const o = opts[i]
    if (!o) return
    onChange(o.value)
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!open) setOpen(true)
      else commit(active)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      else setActive((a) => Math.min(opts.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Tab') {
      setOpen(false)
    } else if (e.key.length === 1) {
      // type-ahead
      const now = Date.now()
      typeahead.current.str = now - typeahead.current.t > 800 ? e.key : typeahead.current.str + e.key
      typeahead.current.t = now
      const q = typeahead.current.str.toLowerCase()
      const i = opts.findIndex((o) => o.label.toLowerCase().startsWith(q))
      if (i >= 0) setActive(i)
    }
  }

  return (
    <div ref={rootRef} className={`rev-select ${open ? 'open' : ''} ${selected ? 'filled' : ''}`}>
      <button
        type="button"
        id={selectId}
        className="rev-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        data-cursor={open ? 'Close' : 'Select'}
      >
        <span className={`rev-select-label ${selected ? '' : 'placeholder'}`}>{selected ? label : label}</span>
        <span className="block truncate pt-1">{selected ? selected.label : ' '}</span>
        <svg viewBox="0 0 24 24" className="rev-select-caret h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div ref={panelRef} className="rev-select-panel" role="listbox" aria-labelledby={selectId}>
        {opts.map((o, i) => (
          <div
            key={o.value}
            role="option"
            aria-selected={o.value === value}
            className={`rev-option tap ${i === active ? 'active' : ''} ${o.value === value ? 'selected' : ''}`}
            style={{ '--d': `${i * 26}ms` }}
            onMouseEnter={() => setActive(i)}
            onClick={() => commit(i)}
          >
            <span>{o.label}</span>
            {o.value === value && (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
