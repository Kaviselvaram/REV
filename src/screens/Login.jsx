import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Select from '../components/Select'
import { Eyebrow, PrimaryButton, VerifiedBadge } from '../components/ui'
import { useModalChrome } from '../lib/hooks'
import { isConfigured, isDevAuth } from '../lib/supabase'
import * as api from '../lib/api'
import { KNOWN_MEMBERS, CITIES, currentUser } from '../data/mock'
import { LegalOverlay } from './Legal'

/* ------------------------------------------------------------------
   Sign in / create account — one fitted screen, three beats.

     phone → code → (new numbers only) create account

   With one-time passwords there is no separate signup form: both paths
   start identically and split after verification, depending on whether
   the number already has a profile.

   Runs against Supabase when it is configured, and falls back to the
   in-memory prototype when it is not, so the app still demonstrates end
   to end on a machine with no .env.local. Both paths hand onDone() the
   same profile shape, so nothing downstream knows which one ran.
   ------------------------------------------------------------------ */

const CODE_LENGTH = 6

// 18+ — REV is tied to licensed road use, and DPDP requires verifiable
// parental consent below 18, a door we deliberately keep shut.
const MIN_AGE = 18
function ageFrom(dob) {
  if (!dob) return null
  const b = new Date(dob)
  if (Number.isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

const handleFrom = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16)

// Prototype identity, shaped exactly like the one api.js builds from a row.
const mockProfile = (base, digits, isNew) => ({
  id: 'me',
  uid: null,
  name: base.name,
  handle: base.handle,
  city: base.city,
  bio: '',
  avatarUrl: null,
  verified: true,
  ridesCount: isNew ? 0 : currentUser.ridesCount,
  joinedDate: isNew ? new Date().toISOString().slice(0, 10) : currentUser.joinedDate,
  phone: `+91 ${digits}`,
})

export default function Login({ onDone, onClose }) {
  const [step, setStep] = useState('phone') // phone | code | profile
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [legalDoc, setLegalDoc] = useState(null)
  const sessionRef = useRef(null)

  // account-creation fields
  const [name, setName] = useState('')
  const [city, setCity] = useState('Chennai')
  const [dob, setDob] = useState('')
  const [consent, setConsent] = useState(false)

  const codeRefs = useRef([])
  const phoneRef = useRef(null)
  const nameRef = useRef(null)
  const panelRef = useModalChrome(onClose)

  // preventScroll matters: without it, focusing a field during the open
  // animation scrolls the card and pushes the REV mark out of view.
  useEffect(() => { phoneRef.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0
    const t = setTimeout(() => {
      if (step === 'code') codeRefs.current[0]?.focus({ preventScroll: true })
      if (step === 'profile') nameRef.current?.focus({ preventScroll: true })
      if (panelRef.current) panelRef.current.scrollTop = 0
    }, 60)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const digits = phone.replace(/\D/g, '')
  const phoneValid = digits.length === 10 && /^[6-9]/.test(digits)
  const codeValid = code.every((d) => d !== '')

  const age = useMemo(() => ageFrom(dob), [dob])
  const handle = useMemo(() => handleFrom(name), [name])
  const handleValid = /^[a-z0-9_]{3,16}$/.test(handle)
  const profileValid =
    name.trim().length >= 2 && handleValid && city && age !== null && age >= MIN_AGE && consent

  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, '')
    setError('')
    if (d.length > 1) {
      // paste / SMS autofill of the whole code
      const next = d.slice(0, CODE_LENGTH).split('')
      setCode(Array.from({ length: CODE_LENGTH }, (_, k) => next[k] ?? ''))
      codeRefs.current[Math.min(next.length, CODE_LENGTH - 1)]?.focus()
      return
    }
    setCode((c) => { const n = [...c]; n[i] = d; return n })
    if (d && i < CODE_LENGTH - 1) codeRefs.current[i + 1]?.focus()
  }

  const onCodeKey = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) codeRefs.current[i - 1]?.focus()
    if (e.key === 'Enter' && codeValid) verify()
  }

  const sendCode = async () => {
    if (!phoneValid) { setError('Enter a valid 10-digit Indian mobile number.'); return }
    setError('')
    setBusy(true)
    try {
      if (isConfigured) await api.sendOtp(digits)
      setStep('code')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    if (!codeValid || busy) return
    setError('')
    setBusy(true)
    try {
      if (isConfigured) {
        const session = await api.verifyOtp(digits, code.join(''))
        sessionRef.current = session
        // A number that already has a profile is a returning member; one
        // without it has verified but not yet joined.
        const existing = await api.getMyProfile(session)
        if (existing) { onDone(existing); return }
        setStep('profile')
      } else {
        const known = KNOWN_MEMBERS[digits]
        if (known) { onDone(mockProfile(known, digits, false)); return }
        setStep('profile')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const createAccount = async () => {
    if (!profileValid || busy) return
    setError('')
    setBusy(true)
    try {
      if (isConfigured) {
        const profile = await api.completeSignup(
          { handle, name: name.trim(), city, dob }, sessionRef.current)
        onDone(profile)
      } else {
        onDone(mockProfile({ name: name.trim(), handle, city }, digits, true))
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const heading =
    step === 'phone' ? <>One number. <em className="serif-italic text-accent">No ghosts.</em></>
      : step === 'code' ? <>Sent to <em className="serif-italic text-accent">+91 {digits}</em></>
        : <>Almost in. <em className="serif-italic text-accent">Who are you?</em></>

  const sub =
    step === 'phone' ? 'REV is verified-only — a real number is how we keep flakes and creeps off the roster.'
      : step === 'code' ? (isDevAuth
          ? `Dev mode — any ${CODE_LENGTH} digits sign you in. No SMS is sent.`
          : isConfigured
            ? `Enter the ${CODE_LENGTH}-digit code we sent you.`
            : `Enter the ${CODE_LENGTH}-digit code. Any six digits work in prototype mode.`)
        : 'This is what members see when you roll up. Your number stays private.'

  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={step === 'profile' ? 'Create your REV account' : 'Sign in to REV'}
        onClick={(e) => e.stopPropagation()}
        className="glass-blur max-h-[94vh] w-full max-w-md overflow-y-auto overflow-x-hidden rounded-[1.8rem] shadow-lux outline-none"
        style={{ animation: 'screenIn 0.4s cubic-bezier(0.22,1,0.36,1) both' }}
      >
        {/* brand strip */}
        <div className="flex items-center justify-between px-8 pt-7">
          <span className="font-display text-2xl font-black tracking-tight text-bone">REV<span className="text-accent">.</span></span>
          <button onClick={onClose} data-cursor="Close" aria-label="Close" className="tap grid h-9 w-9 place-items-center rounded-full glass-lite text-bone/55 hover:text-bone">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="px-8 pb-7 pt-5">
          <Eyebrow>
            {step === 'phone' ? 'Sign in or join' : step === 'code' ? 'Enter the code' : 'Create your account'}
          </Eyebrow>
          <h2 className="mt-2 font-display text-[1.75rem] font-medium leading-tight tracking-tight text-bone">
            {heading}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-bone/55">{sub}</p>

          {/* ---------------- step 1 · phone ---------------- */}
          {step === 'phone' && (
            <>
              <div className="mt-5 flex items-stretch overflow-hidden rounded-2xl border border-bone/12 bg-white/60 focus-within:border-accent/50">
                <span className="grid place-items-center border-r border-bone/10 px-4 text-sm font-semibold text-bone/60">+91</span>
                <input
                  ref={phoneRef}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  aria-label="Mobile number"
                  placeholder="98765 43210"
                  className="min-w-0 flex-1 bg-transparent px-4 py-4 text-[17px] tracking-wide text-bone outline-none"
                />
              </div>
              {error && <p className="mt-2 text-xs text-accent">{error}</p>}
              <PrimaryButton
                onClick={sendCode}
                magnetic={false}
                cursor="Send"
                className={`mt-4 w-full justify-center ${!phoneValid || busy ? '!opacity-30 !shadow-none pointer-events-none' : ''}`}
              >
                {busy ? 'Sending…' : 'Send verification code'}
              </PrimaryButton>
            </>
          )}

          {/* ---------------- step 2 · code ---------------- */}
          {step === 'code' && (
            <>
              <div className="mt-5 flex gap-2">
                {code.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (codeRefs.current[i] = el)}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onCodeKey(i, e)}
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    aria-label={`Digit ${i + 1}`}
                    className="h-14 min-w-0 flex-1 rounded-xl border border-bone/12 bg-white/60 text-center font-display text-2xl font-medium text-bone outline-none transition-colors focus:border-accent/60"
                  />
                ))}
              </div>
              {error && <p className="mt-2 text-xs text-accent">{error}</p>}
              <PrimaryButton
                onClick={verify}
                magnetic={false}
                cursor="Verify"
                className={`mt-4 w-full justify-center ${!codeValid || busy ? '!opacity-30 !shadow-none pointer-events-none' : ''}`}
              >
                {busy ? 'Verifying…' : 'Verify & continue'}
              </PrimaryButton>
              <button
                onClick={() => { setStep('phone'); setCode(Array(CODE_LENGTH).fill('')) }}
                className="mt-3 w-full cursor-pointer text-center text-xs text-bone/45 hover:text-bone/70"
              >
                ← Change number
              </button>
            </>
          )}

          {/* ---------------- step 3 · create account ---------------- */}
          {step === 'profile' && (
            <>
              <div className="mt-4 flex flex-col gap-2.5">
                <div className={`float-field ${name ? (name.trim().length >= 2 ? 'valid' : 'invalid') : ''}`}>
                  <input ref={nameRef} id="su-name" value={name} onChange={(e) => setName(e.target.value)} placeholder=" " autoComplete="name" maxLength={40} />
                  <label htmlFor="su-name">Full name</label>
                </div>

                {/* Handle is derived here and editable later in Account — one
                    less field to fill at the door. */}
                {handleValid && (
                  <p className="-mt-1 pl-1 text-[11.5px] text-bone/40">
                    You'll be <span className="text-accent">@{handle}</span> — change it any time in your account.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <Select id="su-city" label="City" value={city} onChange={setCity} options={CITIES} />
                  <div className={`float-field has-value ${dob ? (age !== null && age >= MIN_AGE ? 'valid' : 'invalid') : ''}`}>
                    <input id="su-dob" type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDob(e.target.value)} />
                    <label htmlFor="su-dob">Date of birth</label>
                  </div>
                </div>
              </div>

              {dob && age !== null && age < MIN_AGE && (
                <p className="mt-2 text-xs text-accent">You must be {MIN_AGE} or older to join REV.</p>
              )}

              <label className="mt-3 flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
                />
                <span className="text-[12px] leading-snug text-bone/60">
                  I'm 18 or older and I agree to REV's{' '}
                  <button type="button" onClick={(e) => { e.preventDefault(); setLegalDoc('terms') }} className="cursor-pointer text-accent underline underline-offset-2">Terms of Use</button>
                  {' '}and{' '}
                  <button type="button" onClick={(e) => { e.preventDefault(); setLegalDoc('privacy') }} className="cursor-pointer text-accent underline underline-offset-2">Privacy Policy</button>.
                </span>
              </label>

              {error && <p className="mt-2 text-xs text-accent">{error}</p>}
              <PrimaryButton
                onClick={createAccount}
                magnetic={false}
                cursor="Join"
                className={`mt-4 w-full justify-center ${!profileValid || busy ? '!opacity-30 !shadow-none pointer-events-none' : ''}`}
              >
                {busy ? 'Creating…' : 'Create my account'}
              </PrimaryButton>
            </>
          )}

          <div className="mt-5 flex items-center justify-center gap-2 border-t border-bone/8 pt-4">
            <VerifiedBadge />
            <span className="text-[11px] text-bone/50">Your number is never shown to other members.</span>
          </div>
        </div>
      </div>

      {legalDoc && <LegalOverlay doc={legalDoc} onClose={() => setLegalDoc(null)} />}
    </div>,
    document.body,
  )
}
