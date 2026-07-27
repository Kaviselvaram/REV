import { useEffect, useState } from 'react'
import Select from '../components/Select'
import {
  Avatar, Eyebrow, GhostButton, PrimaryButton, Reveal, VerifiedBadge,
} from '../components/ui'
import { useUser } from '../lib/user'
import * as api from '../lib/api'
import { isConfigured } from '../lib/supabase'
import { useMode } from '../lib/mode'
import { CITIES } from '../data/mock'
import { LEGAL_DOCS } from './Legal'

/* Account & profile — view, edit, sign out, and the DPDP rights that have
   to be reachable from inside the product: export your data, delete your
   account. */

function Row({ label, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bone/8 py-3.5 last:border-b-0">
      <span className="label-caps text-[10px] text-bone/45">{label}</span>
      <span className="text-right text-[13.5px] text-bone/80">{children}</span>
    </div>
  )
}

export default function Account({ onBack, onOpenLegal }) {
  const { profile, session, signOut, deleteAccount, updateProfile, garage } = useUser()
  const { copy } = useMode()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // emergency contacts — the people an SOS actually reaches
  const [contacts, setContacts] = useState([])
  const [contactsBusy, setContactsBusy] = useState(false)
  const [contactsNote, setContactsNote] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  // who can see the rider page
  const [isPublic, setIsPublic] = useState(true)
  const [blocked, setBlocked] = useState([])

  useEffect(() => {
    if (!isConfigured || !session) return
    let alive = true
    api.getEmergencyContacts().then((c) => { if (alive) setContacts(c ?? []) }).catch(() => {})
    api.listBlocked(session).then((b) => { if (alive) setBlocked(b ?? []) }).catch(() => {})
    return () => { alive = false }
  }, [session])

  const saveContacts = async (next) => {
    setContactsBusy(true); setContactsNote('')
    try {
      await api.setEmergencyContacts(next)
      setContacts(next)
      setContactsNote('Saved')
      setTimeout(() => setContactsNote(''), 2200)
    } catch (e) { setContactsNote(e.message) } finally { setContactsBusy(false) }
  }

  const addContact = () => {
    const digits = newPhone.replace(/\D/g, '')
    if (newName.trim().length < 2 || digits.length !== 10) {
      setContactsNote('Enter a name and a 10-digit number.')
      return
    }
    saveContacts([...contacts, { name: newName.trim(), phone: `+91${digits}` }])
    setNewName(''); setNewPhone('')
  }

  const removeContact = (i) => saveContacts(contacts.filter((_, k) => k !== i))

  const toggleVisibility = async (next) => {
    setIsPublic(next)
    try { await api.setProfileVisibility(next, session) }
    catch { setIsPublic(!next) }
  }

  const unblock = async (id) => {
    try {
      await api.unblockMember(id, session)
      setBlocked((b) => b.filter((x) => x.id !== id))
    } catch { /* the row simply stays */ }
  }

  const [name, setName] = useState(profile?.name ?? '')
  const [handle, setHandle] = useState(profile?.handle ?? '')
  const [city, setCity] = useState(profile?.city ?? 'Chennai')
  const [bio, setBio] = useState(profile?.bio ?? '')

  if (!profile) {
    return (
      <div className="screen-enter mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-medium text-bone">You're signed out.</h1>
        <p className="mt-3 text-sm text-bone/55">Sign in to see your account.</p>
        <PrimaryButton onClick={onBack} magnetic={false} className="mt-7">Back to {copy.feedEyebrow.toLowerCase()}</PrimaryButton>
      </div>
    )
  }

  const handleValid = /^[a-z0-9_]{3,16}$/.test(handle)
  const canSave = name.trim().length >= 2 && handleValid

  const save = () => {
    if (!canSave) return
    updateProfile({ name: name.trim(), handle, city, bio: bio.trim() })
    setEditing(false)
  }

  const cancel = () => {
    setName(profile.name); setHandle(profile.handle)
    setCity(profile.city); setBio(profile.bio ?? '')
    setEditing(false)
  }

  // garage holds a list per world now — counting the arrays themselves would
  // always give 2
  const vehicleCount = (garage.bike?.length ?? 0) + (garage.car?.length ?? 0)

  return (
    <div className="screen-enter mx-auto max-w-3xl px-6 pb-32 pt-10 lg:px-10">
      <Reveal>
        <button
          onClick={onBack}
          className="label-caps flex cursor-pointer items-center gap-2 text-[11px] text-bone/50 transition-colors hover:text-bone"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          {copy.backToFeed}
        </button>
      </Reveal>

      {/* identity header */}
      <Reveal delay={60}>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <Avatar rider={profile} size="xl" />
          <div className="min-w-0">
            <Eyebrow>Your account</Eyebrow>
            <h1 className="mt-1 flex flex-wrap items-center gap-2.5 font-display text-3xl font-medium tracking-tight text-bone sm:text-4xl">
              {profile.name} <VerifiedBadge size="lg" />
            </h1>
            <p className="mt-1.5 text-sm text-bone/50">@{profile.handle} · {profile.city}</p>
          </div>
        </div>
      </Reveal>

      {/* editable profile */}
      <Reveal delay={110}>
        <section className="card-3d mt-10 rounded-3xl">
          <div className="card-face p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-medium tracking-tight text-bone">Profile</h2>
              {!editing && (
                <button onClick={() => setEditing(true)} className="label-caps cursor-pointer text-[10px] text-accent hover:underline">
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <div className="mt-5 flex flex-col gap-3">
                <div className={`float-field ${name ? (name.trim().length >= 2 ? 'valid' : 'invalid') : ''}`}>
                  <input id="ac-name" value={name} onChange={(e) => setName(e.target.value)} placeholder=" " maxLength={40} />
                  <label htmlFor="ac-name">Full name</label>
                </div>
                <div className={`float-field ${handle ? (handleValid ? 'valid' : 'invalid') : ''}`}>
                  <input
                    id="ac-handle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16))}
                    placeholder=" "
                  />
                  <label htmlFor="ac-handle">Handle (@)</label>
                </div>
                <Select id="ac-city" label="City" value={city} onChange={setCity} options={CITIES} />
                <div className="float-field">
                  <input id="ac-bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder=" " maxLength={90} />
                  <label htmlFor="ac-bio">One line about you (optional)</label>
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <GhostButton onClick={cancel} className="!px-5 !py-2.5 !text-[13px]">Cancel</GhostButton>
                  <PrimaryButton
                    onClick={save}
                    magnetic={false}
                    className={`!px-5 !py-2.5 !text-[13px] ${!canSave ? '!opacity-30 !shadow-none pointer-events-none' : ''}`}
                  >
                    Save changes
                  </PrimaryButton>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <Row label="Name">{profile.name}</Row>
                <Row label="Handle">@{profile.handle}</Row>
                <Row label="City">{profile.city}</Row>
                {profile.bio && <Row label="About">{profile.bio}</Row>}
                <Row label="Member since">
                  {new Date(profile.joinedDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </Row>
                <Row label="Rides logged">{profile.ridesCount}</Row>
                <Row label="In your garage">
                  {vehicleCount === 0 ? 'Nothing parked yet' : `${vehicleCount} machine${vehicleCount > 1 ? 's' : ''}`}
                </Row>
              </div>
            )}
          </div>
        </section>
      </Reveal>

      {/* verification */}
      <Reveal delay={150}>
        <section className="card-3d mt-6 rounded-3xl">
          <div className="card-face p-6 sm:p-7">
            <h2 className="font-display text-lg font-medium tracking-tight text-bone">Verification</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-bone/55">
              What REV has confirmed about you. This is what other members see — never the number itself.
            </p>
            <div className="mt-4">
              <Row label="Mobile number">
                <span className="inline-flex items-center gap-2">
                  <span className="tabular-nums text-bone/50">{profile.phone}</span>
                  <VerifiedBadge />
                </span>
              </Row>
              <Row label="Driving licence">
                <span className="text-bone/40">Not submitted</span>
              </Row>
              <Row label="Vehicle registration">
                <span className="text-bone/40">Not submitted</span>
              </Row>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-bone/35">
              Licence and registration checks arrive with the verification service. REV stores only the
              result — never an image of your documents.
            </p>
          </div>
        </section>
      </Reveal>

      {/* safety */}
      <Reveal delay={165}>
        <section className="card-3d mt-6 rounded-3xl">
          <div className="card-face p-6 sm:p-7">
            <h2 className="font-display text-lg font-medium tracking-tight text-bone">Safety</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-bone/55">
              If you raise an SOS during a ride, REV shares your live location with these people —
              and only them, only for the length of the alert.
            </p>

            <div className="mt-4">
              {contacts.length === 0 ? (
                <p className="text-[13px] text-bone/40">No emergency contacts yet.</p>
              ) : (
                <ul className="divide-y divide-bone/8">
                  {contacts.map((c, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] text-bone">{c.name}</span>
                        <span className="block text-[11.5px] tabular-nums text-bone/40">{c.phone}</span>
                      </span>
                      <button onClick={() => removeContact(i)}
                        className="label-caps shrink-0 cursor-pointer text-[9px] text-bone/40 hover:text-accent">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
              <div className="float-field">
                <input id="ec-name" value={newName} onChange={(e) => setNewName(e.target.value)}
                       placeholder=" " maxLength={40} />
                <label htmlFor="ec-name">Their name</label>
              </div>
              <div className="float-field">
                <input id="ec-phone" value={newPhone} inputMode="numeric"
                       onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                       placeholder=" " />
                <label htmlFor="ec-phone">Their number</label>
              </div>
              <GhostButton onClick={addContact}
                className={`!px-5 !py-2.5 !text-[13px] ${contactsBusy ? '!opacity-50 pointer-events-none' : ''}`}>
                Add
              </GhostButton>
            </div>
            {contactsNote && <p className="mt-2 text-[12px] text-volt">{contactsNote}</p>}
          </div>
        </section>
      </Reveal>

      {/* blocked members */}
      {blocked.length > 0 && (
        <Reveal delay={175}>
          <section className="card-3d mt-6 rounded-3xl">
            <div className="card-face p-6 sm:p-7">
              <h2 className="font-display text-lg font-medium tracking-tight text-bone">Blocked</h2>
              <p className="mt-1.5 text-[13px] text-bone/55">
                Neither of you can join a ride the other leads.
              </p>
              <ul className="mt-4 divide-y divide-bone/8">
                {blocked.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] text-bone">{b.display_name}</span>
                      <span className="block text-[11.5px] text-bone/40">@{b.handle}</span>
                    </span>
                    <button onClick={() => unblock(b.id)}
                      className="label-caps shrink-0 cursor-pointer text-[9px] text-bone/40 hover:text-bone">
                      Unblock
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Reveal>
      )}

      {/* privacy & data */}
      <Reveal delay={190}>
        <section className="card-3d mt-6 rounded-3xl">
          <div className="card-face p-6 sm:p-7">
            <h2 className="font-display text-lg font-medium tracking-tight text-bone">Your data</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-bone/55">
              Rights guaranteed by the Digital Personal Data Protection Act, 2023.
            </p>

            <label className="mt-5 flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-bone/10 p-4">
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-bone">Public rider page</span>
                <span className="block text-[12px] leading-snug text-bone/50">
                  When on, anyone with your link can see your rider page — machines, marks and ride
                  record. Your number, date of birth and home location are never on it.
                </span>
              </span>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => toggleVisibility(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent)]"
              />
            </label>

            <div className="mt-5 flex flex-wrap gap-2">
              {LEGAL_DOCS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onOpenLegal(d.id)}
                  className="label-caps tap cursor-pointer rounded-full glass-lite px-4 py-2 text-[10px] text-bone/60 transition-colors hover:text-bone"
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <GhostButton onClick={() => {
                const blob = new Blob([JSON.stringify({ profile, garage }, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `rev-my-data-${profile.handle}.json`
                a.click()
                URL.revokeObjectURL(url)
              }} className="!px-5 !py-2.5 !text-[13px]">
                Export my data
              </GhostButton>
              <GhostButton onClick={signOut} className="!px-5 !py-2.5 !text-[13px]">Sign out</GhostButton>
            </div>

            <div className="mt-7 border-t border-bone/8 pt-5">
              {confirmDelete ? (
                <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
                  <p className="text-[13px] font-semibold text-bone">Delete your account?</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-bone/60">
                    Your profile, garage and ride history are erased after a 30-day grace period. Payment
                    records are kept only as long as tax law requires. This cannot be undone.
                  </p>
                  {deleteError && <p className="mt-2 text-[12px] text-accent">{deleteError}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        if (deleting) return
                        setDeleting(true)
                        setDeleteError('')
                        try {
                          await deleteAccount()
                        } catch (e) {
                          setDeleteError(e.message)
                          setDeleting(false)
                        }
                      }}
                      className={`label-caps tap cursor-pointer rounded-full bg-accent px-4 py-2 text-[10px] text-white ${deleting ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete it'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="label-caps tap cursor-pointer rounded-full glass-lite px-4 py-2 text-[10px] text-bone/60 hover:text-bone"
                    >
                      Keep my account
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="cursor-pointer text-[12.5px] text-bone/40 underline underline-offset-2 transition-colors hover:text-accent"
                >
                  Delete my account
                </button>
              )}
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  )
}
