import { useState } from 'react'
import { Eyebrow, GhostButton, ModeGlyph, PrimaryButton, Reveal, VerifiedBadge, Avatar } from '../components/ui'
import Select from '../components/Select'
import { useMode } from '../lib/mode'
import { useUser } from '../lib/user'
import { currentUser } from '../data/mock'

const YEAR_MIN = 1980
const YEAR_MAX = 2026

export default function Garage({ onDone }) {
  const { mode, copy, makes, styles, extraField, images } = useMode()
  const { saveVehicle, getVehicle, profile } = useUser()
  const me = profile ?? currentUser // signed-out preview falls back to the demo identity
  const [saved, setSaved] = useState(() => getVehicle(mode)) // persisted vehicle for this world
  const [editing, setEditing] = useState(false)
  const [step, setStep] = useState(0)

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

  const addPhoto = () => {
    setPhotos([...photos, { id: `ph${photos.length + 1}`, src: images.wizard[photos.length % images.wizard.length] }])
  }

  // build + persist the vehicle, then show the saved card
  const finish = () => {
    const vehicle = {
      make, model, year,
      extra, extraLabel: extraField.type === 'number' ? `${extra} ${extraField.unit}` : extra,
      mods, rideStyle,
      styleLabel: styles.find((s) => s.id === rideStyle)?.label,
      photos,
    }
    saveVehicle(mode, vehicle)
    setSaved(vehicle)
    setEditing(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const startEdit = () => {
    setMake(saved.make); setModel(saved.model); setYear(String(saved.year))
    setExtra(saved.extra); setMods(saved.mods || []); setRideStyle(saved.rideStyle)
    setPhotos(saved.photos || []); setStep(0); setEditing(true)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // saved view — the persisted Garage
  if (saved && !editing) {
    return (
      <div className="screen-enter mx-auto max-w-2xl px-6 pb-28 pt-14">
        <Reveal>
          <div className="text-center">
            <span className="mb-4 inline-block rounded-full bg-volt/10 px-4 py-1.5 glow-volt">
              <span className="label-caps text-[10px] text-volt">Saved to your garage</span>
            </span>
            <h1 className="font-display text-4xl font-medium tracking-tight text-bone">Your <em className="serif-italic text-accent">machine.</em></h1>
            <p className="mt-2 text-bone/55">It rides with you to every meet — captains see it when you RSVP.</p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="card-3d mt-10 overflow-hidden rounded-3xl">
            {/* garage hero strip */}
            <div className="relative flex h-44 items-end overflow-hidden bg-gradient-to-br from-asphalt-3 to-asphalt p-6">
              <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 90% at 80% 0%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 65%)' }} />
              <ModeGlyph mode={mode} className="absolute right-6 top-8 h-28 w-28 text-bone/10" />
              {saved.photos?.length > 0 && (
                <img src={saved.photos[0].src} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
              )}
              <div className="relative">
                <p className="label-caps text-[10px] text-accent">{saved.make}</p>
                <p className="font-display text-3xl font-medium tracking-tight text-bone">{saved.model}</p>
                <p className="mt-1 text-sm text-bone/50">{saved.year} · {saved.extraLabel} · {saved.styleLabel}</p>
              </div>
            </div>
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              <div>
                <p className="label-caps mb-2 text-[10px] text-bone/40">Owner</p>
                <div className="flex items-center gap-3">
                  <Avatar rider={me} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-bone">{me.name} <VerifiedBadge /></p>
                    <p className="text-xs text-bone/45">{me.ridesCount} {copy.logged}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="label-caps mb-2 text-[10px] text-bone/40">Mods</p>
                {saved.mods?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {saved.mods.map((m) => (
                      <span key={m} className="rounded-full border border-accent/25 bg-accent/5 px-2.5 py-1 text-xs text-bone/75">{m}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-bone/40">Bone stock — respect.</p>
                )}
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={220}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton onClick={onDone}>
              {copy.findFirstCta}
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </PrimaryButton>
            <GhostButton onClick={startEdit} cursor="Edit">Edit machine</GhostButton>
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
              <div className="grid grid-cols-3 gap-3">
                {photos.map((p) => <PhotoTile key={p.id} src={p.src} />)}
                {photos.length < 6 && (
                  <button onClick={addPhoto}
                    className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-bone/20 text-bone/40 transition-colors hover:border-accent/50 hover:text-accent">
                    <div className="text-center">
                      <svg viewBox="0 0 24 24" className="mx-auto h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                      <span className="mt-1 block text-[10px]">Add photo</span>
                    </div>
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-bone/35">Add up to six shots — your machine as others will see it.</p>
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
