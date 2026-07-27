import { useRef, useState } from 'react'
import { Eyebrow, GhostButton, ModeGlyph, PrimaryButton, Reveal, VerifiedBadge, Avatar } from '../components/ui'
import Select from '../components/Select'
import { useMode } from '../lib/mode'
import { useUser } from '../lib/user'
import { isConfigured } from '../lib/supabase'
import * as api from '../lib/api'
import { currentUser } from '../data/mock'

const YEAR_MIN = 1980
const YEAR_MAX = 2026

export default function Garage({ onDone }) {
  const { mode, copy, makes, styles, extraField, images } = useMode()
  const {
    saveVehicle, removeVehicle, makePrimaryVehicle, getVehicles, profile, session,
  } = useUser()
  const me = profile ?? currentUser // signed-out preview falls back to the demo identity

  // A rider can keep several machines in a world. `editingId` is null when
  // adding a new one and carries the id when changing an existing one.
  const machines = getVehicles(mode)
  const [editing, setEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // real photo upload
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  // form state (in-memory only) — mirrors the `vehicle` schema
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [extra, setExtra] = useState('') // engine cc (bike) | transmission (car)
  const [mods, setMods] = useState([])
  const [modInput, setModInput] = useState('')
  const [photos, setPhotos] = useState([])
  const [rideStyle, setRideStyle] = useState('')

  const yearNum = parseInt(year, 10)
  const yearValid = year !== '' && !Number.isNaN(yearNum) && yearNum >= YEAR_MIN && yearNum <= YEAR_MAX
  const modelValid = model.trim().length >= 2

  const extraNum = parseInt(extra, 10)
  const extraValid = extraField.type === 'number'
    ? extra !== '' && !Number.isNaN(extraNum) && extraNum >= extraField.min && extraNum <= extraField.max
    : extra !== ''

  const step0Valid = make !== '' && modelValid && yearValid && extraValid
  const step2Valid = rideStyle !== ''

  const addMod = () => {
    const v = modInput.trim()
    if (v && !mods.includes(v)) setMods([...mods, v])
    setModInput('')
  }

  /* Real upload when a backend is present; the generated tile stays only as
     the prototype fallback so the wizard still demonstrates without one. */
  const pickPhoto = () => fileRef.current?.click()

  const onPhotoChosen = async (e) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''                      // let the same file be picked again
    if (!files.length) return

    if (!isConfigured) {
      setPhotos((p) => [...p, ...files.map((_, i) => ({
        id: `ph${p.length + i + 1}`,
        src: images.wizard[(p.length + i) % images.wizard.length],
      }))].slice(0, 6))
      return
    }

    setUploading(true); setError('')
    try {
      const room = 6 - photos.length
      for (const file of files.slice(0, Math.max(0, room))) {
        if (!file.type.startsWith('image/')) throw new Error('Only image files, please.')
        if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is over 5 MB.`)
        const url = await api.uploadMachinePhoto(file, session)
        setPhotos((p) => [...p, { id: url, src: url }])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (id) => setPhotos((p) => p.filter((x) => x.id !== id))

  const resetForm = () => {
    setMake(''); setModel(''); setYear(''); setExtra('')
    setMods([]); setModInput(''); setPhotos([]); setRideStyle('')
    setStep(0); setError('')
  }

  const finish = async () => {
    if (busy) return
    setBusy(true); setError('')
    const vehicle = {
      id: editingId ?? undefined,
      make, model, year,
      extra, extraLabel: extraField.type === 'number' ? `${extra} ${extraField.unit}` : extra,
      mods, rideStyle,
      styleLabel: styles.find((s) => s.id === rideStyle)?.label,
      photos,
    }
    try {
      await saveVehicle(mode, vehicle)
      setEditing(false)
      setEditingId(null)
      resetForm()
      window.scrollTo({ top: 0, behavior: 'instant' })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const startAdd = () => {
    resetForm()
    setEditingId(null)
    setEditing(true)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const startEdit = (v) => {
    setMake(v.make); setModel(v.model); setYear(String(v.year ?? ''))
    setExtra(v.extra ?? ''); setMods(v.mods || []); setRideStyle(v.rideStyle ?? '')
    setPhotos((v.photos || []).map((ph) => (typeof ph === 'string' ? { id: ph, src: ph } : ph)))
    setStep(0); setEditingId(v.id); setEditing(true); setError('')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const drop = async (v) => {
    setError('')
    try { await removeVehicle(mode, v.id) } catch (e) { setError(e.message) }
  }

  const promote = async (v) => {
    setError('')
    try { await makePrimaryVehicle(mode, v.id) } catch (e) { setError(e.message) }
  }

  // ---------------------------------------------------------------- the garage
  // A list, not a single card: a rider with a Himalayan and a Continental GT
  // keeps both, each with its own photos, mods and standing.
  if (machines.length > 0 && !editing) {
    return (
      <div className="screen-enter mx-auto max-w-2xl px-6 pb-28 pt-14">
        <Reveal>
          <div className="text-center">
            <span className="mb-4 inline-block rounded-full bg-volt/10 px-4 py-1.5 glow-volt">
              <span className="label-caps text-[10px] text-volt">
                {machines.length} {machines.length === 1 ? 'machine' : 'machines'} in your garage
              </span>
            </span>
            <h1 className="font-display text-4xl font-medium tracking-tight text-bone">
              Your <em className="serif-italic text-accent">{machines.length === 1 ? 'machine.' : 'machines.'}</em>
            </h1>
            <p className="mt-2 text-bone/55">
              They ride with you to every meet — captains see them when you RSVP.
            </p>
          </div>
        </Reveal>

        {error && (
          <Reveal><p className="mt-6 text-center text-sm text-accent">{error}</p></Reveal>
        )}

        <div className="mt-10 flex flex-col gap-6">
          {machines.map((v, i) => (
            <Reveal key={v.id} delay={i * 90}>
              <article className="card-3d overflow-hidden rounded-3xl">
                <div className="card-face">
                  <div className="relative h-44 overflow-hidden bg-asphalt-2">
                    {v.photos?.length > 0 ? (
                      <img
                        src={typeof v.photos[0] === 'string' ? v.photos[0] : v.photos[0].src}
                        alt={`${v.make} ${v.model}`}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center">
                        <ModeGlyph mode={mode} className="h-10 w-10 text-bone/12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-asphalt via-asphalt/40 to-transparent" />

                    {v.isPrimary && (
                      <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1">
                        <span className="label-caps text-[9px] text-white">Main {mode === 'bike' ? 'ride' : 'drive'}</span>
                      </span>
                    )}

                    <div className="absolute bottom-4 left-5 right-5">
                      <p className="label-caps text-[10px] text-accent">{v.make}</p>
                      <p className="font-display text-2xl font-medium tracking-tight text-bone">{v.model}</p>
                      <p className="mt-0.5 text-[13px] text-bone/55">
                        {[v.year, v.extraLabel || v.extra, v.styleLabel || v.rideStyle]
                          .filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <div>
                      <p className="label-caps mb-2 text-[10px] text-bone/40">Owner</p>
                      <div className="flex items-center gap-3">
                        <Avatar rider={me} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-bone">
                            {me.name} <VerifiedBadge />
                          </p>
                          <p className="text-xs text-bone/45">{me.ridesCount} {copy.logged}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="label-caps mb-2 text-[10px] text-bone/40">Mods</p>
                      {v.mods?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {v.mods.map((m) => (
                            <span key={m} className="rounded-full border border-bone/12 px-2.5 py-1 text-[11px] text-bone/70">{m}</span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[13px] text-bone/40">Bone stock — respect.</p>
                      )}
                    </div>
                  </div>

                  {v.photos?.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto px-5 pb-5">
                      {v.photos.slice(1).map((ph, k) => (
                        <img
                          key={k}
                          src={typeof ph === 'string' ? ph : ph.src}
                          alt=""
                          loading="lazy"
                          className="h-16 w-24 shrink-0 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 border-t border-bone/8 px-5 py-4">
                    <button
                      onClick={() => startEdit(v)}
                      data-cursor="Edit"
                      className="label-caps tap cursor-pointer rounded-full glass-lite px-4 py-2 text-[10px] text-bone/70 hover:text-bone"
                    >
                      Edit
                    </button>
                    {!v.isPrimary && (
                      <button
                        onClick={() => promote(v)}
                        className="label-caps tap cursor-pointer rounded-full glass-lite px-4 py-2 text-[10px] text-bone/70 hover:text-bone"
                      >
                        Make main
                      </button>
                    )}
                    <button
                      onClick={() => drop(v)}
                      className="label-caps tap ml-auto cursor-pointer rounded-full px-4 py-2 text-[10px] text-bone/35 transition-colors hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={220}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton onClick={onDone}>
              {copy.findFirstCta}
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </PrimaryButton>
            <GhostButton onClick={startAdd} cursor="Add">
              Add another {mode === 'bike' ? 'bike' : 'car'}
            </GhostButton>
          </div>
        </Reveal>
      </div>
    )
  }

  return (
    <div className="screen-enter mx-auto max-w-2xl px-6 pb-28 pt-14">
      <Reveal>
        <div className="flex items-center justify-between">
          <Eyebrow>The Garage · {copy.modeLabel}</Eyebrow>
          {editing && (
            <button onClick={() => { setEditing(false); window.scrollTo({ top: 0, behavior: 'instant' }) }} className="label-caps text-[10px] text-bone/45 transition-colors hover:text-bone">
              ← Cancel
            </button>
          )}
        </div>
        <h1 className="mt-2 font-display text-4xl font-medium leading-[1.05] tracking-tight text-bone sm:text-5xl">
          {editing ? <>Edit your <em className="serif-italic text-accent">machine.</em></> : <>Every {mode === 'bike' ? 'rider' : 'driver'} starts<br />with <em className="serif-italic text-accent">a machine.</em></>}
        </h1>
        <p className="mt-3 max-w-md text-bone/55">{copy.garageSub}</p>
      </Reveal>

      {/* progress indicator */}
      <Reveal delay={100}>
        <div className="mt-10 mb-8">
          <div className="flex items-center gap-2">
            {copy.wizardSteps.map((label, i) => (
              <div key={label} className="flex flex-1 flex-col gap-2">
                <div className={`h-1 rounded-full transition-all duration-500 ${i < step ? 'bg-accent' : i === step ? 'bg-accent glow-accent' : 'bg-bone/10'}`} />
                <span className={`label-caps text-[9px] transition-colors ${i <= step ? 'text-accent' : 'text-bone/35'}`}>
                  {`0${i + 1} · ${label}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="glass rounded-3xl p-6 sm:p-8">
        {/* ---------- STEP 1: machine details ---------- */}
        {step === 0 && (
          <div className="screen-enter flex flex-col gap-5">
            <Select id="make" label="Make" value={make} onChange={setMake} options={makes} />

            <div className={`float-field ${model ? (modelValid ? 'valid' : 'invalid') : ''}`}>
              <input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder=" " autoComplete="off" />
              <label htmlFor="model">Model</label>
              {model && (
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm ${modelValid ? 'text-volt' : 'text-red-400'}`}>
                  {modelValid ? '✓' : '✕'}
                </span>
              )}
            </div>
            {model && !modelValid && <p className="-mt-3 text-xs text-red-400/80">Model needs at least 2 characters.</p>}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className={`float-field ${year ? (yearValid ? 'valid' : 'invalid') : ''}`}>
                <input id="year" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder=" " inputMode="numeric" autoComplete="off" />
                <label htmlFor="year">Year</label>
                {year && (
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm ${yearValid ? 'text-volt' : 'text-red-400'}`}>
                    {yearValid ? '✓' : '✕'}
                  </span>
                )}
              </div>

              {extraField.type === 'number' ? (
                <div className={`float-field ${extra ? (extraValid ? 'valid' : 'invalid') : ''}`}>
                  <input id="extra" value={extra} onChange={(e) => setExtra(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder=" " inputMode="numeric" autoComplete="off" />
                  <label htmlFor="extra">{extraField.label}</label>
                  {extra && (
                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm ${extraValid ? 'text-volt' : 'text-red-400'}`}>
                      {extraValid ? '✓' : '✕'}
                    </span>
                  )}
                </div>
              ) : (
                <Select id="extra" label={extraField.label} value={extra} onChange={setExtra} options={extraField.options} />
              )}
            </div>
            {year && !yearValid && <p className="-mt-3 text-xs text-red-400/80">Enter a year between {YEAR_MIN} and {YEAR_MAX}.</p>}
            {extraField.type === 'number' && extra && !extraValid && <p className="-mt-3 text-xs text-red-400/80">{extraField.error}</p>}

            <div className="mt-2 flex justify-end">
              <PrimaryButton onClick={() => setStep(1)} disabled={!step0Valid} magnetic={false}
                className={!step0Valid ? '!opacity-30 !shadow-none pointer-events-none' : ''}>
                Continue
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* ---------- STEP 2: photos & mods ---------- */}
        {step === 1 && (
          <div className="screen-enter flex flex-col gap-6">
            <div>
              <p className="label-caps mb-3 text-[10px] text-bone/45">Photos</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={onPhotoChosen}
                className="sr-only"
                aria-label="Choose photos of your machine"
              />
              <div className="grid grid-cols-3 gap-3">
                {photos.map((p) => (
                  <div key={p.id} className="group relative">
                    <PhotoTile src={p.src} />
                    <button
                      onClick={() => removePhoto(p.id)}
                      aria-label="Remove photo"
                      className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-asphalt/80 text-bone/70 opacity-0 backdrop-blur transition-opacity hover:text-bone focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  </div>
                ))}
                {photos.length < 6 && (
                  <button
                    onClick={pickPhoto}
                    disabled={uploading}
                    data-cursor="Upload"
                    className={`grid aspect-square place-items-center rounded-xl border border-dashed border-bone/20 text-bone/40 transition-colors hover:border-accent/50 hover:text-accent ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                  >
                    <div className="text-center">
                      {uploading ? (
                        <span className="label-caps text-[9px]">Uploading…</span>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" className="mx-auto h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
                          <span className="mt-1 block text-[10px]">Add photo</span>
                        </>
                      )}
                    </div>
                  </button>
                )}
              </div>
              {error && <p className="mt-2 text-xs text-accent">{error}</p>}
              <p className="mt-2 text-xs text-bone/35">
                Up to six shots, 5 MB each — your machine as others will see it.
              </p>
            </div>

            <div>
              <p className="label-caps mb-3 text-[10px] text-bone/45">Mods</p>
              <div className="flex items-stretch gap-2">
                <div className="float-field flex-1">
                  <input id="mod" value={modInput} onChange={(e) => setModInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addMod()} placeholder=" " autoComplete="off" />
                  <label htmlFor="mod">Add a mod</label>
                </div>
                <button onClick={addMod} disabled={!modInput.trim()} aria-label="Add mod"
                  className="grid w-14 cursor-pointer place-items-center rounded-xl border border-bone/15 text-bone/60 transition-colors hover:border-accent/50 hover:text-accent disabled:pointer-events-none disabled:opacity-30">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </button>
              </div>
              {mods.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {mods.map((m) => (
                    <button key={m} onClick={() => setMods(mods.filter((x) => x !== m))}
                      className="group cursor-pointer rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs text-bone/85 transition-colors hover:border-red-400/60">
                      {m} <span className="ml-1 text-bone/40 group-hover:text-red-400">✕</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2 flex justify-between">
              <GhostButton onClick={() => setStep(0)} className="!px-5 !py-2.5 !text-[13px]">Back</GhostButton>
              <PrimaryButton onClick={() => setStep(2)} magnetic={false}>Continue</PrimaryButton>
            </div>
          </div>
        )}

        {/* ---------- STEP 3: ride / drive style ---------- */}
        {step === 2 && (
          <div className="screen-enter flex flex-col gap-6">
            <p className="label-caps text-[10px] text-bone/45">{copy.styleQuestion}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {styles.map((s) => (
                <button key={s.id} onClick={() => setRideStyle(s.id)}
                  className={`cursor-pointer rounded-2xl border p-4 text-left transition-all duration-200 ${
                    rideStyle === s.id
                      ? 'border-accent/70 bg-accent/10 glow-accent'
                      : 'border-bone/12 hover:border-bone/30'
                  }`}>
                  <p className="font-display text-[15px] font-bold text-bone">{s.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-bone/50">{s.desc}</p>
                </button>
              ))}
            </div>
            <div className="mt-2 flex justify-between">
              <GhostButton onClick={() => setStep(1)} className="!px-5 !py-2.5 !text-[13px]">Back</GhostButton>
              <PrimaryButton onClick={finish} disabled={!step2Valid} magnetic={false}
                className={!step2Valid ? '!opacity-30 !shadow-none pointer-events-none' : ''}>
                {copy.finishCta}
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function PhotoTile({ src }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl shadow-lux">
      <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
    </div>
  )
}
