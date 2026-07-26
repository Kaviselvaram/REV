import { useTilt, useCountUp, useParallax } from '../lib/hooks'
import { useMode } from '../lib/mode'
import { Eyebrow, PrimaryButton, Reveal, SplitWords, VerifiedBadge } from '../components/ui'

/* ---------- benefit icons ---------- */
function BenefitIcon({ name, className = 'h-6 w-6' }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'calendar': return <svg viewBox="0 0 24 24" className={className} {...p}><rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 3v4M16 3v4M8 14h3M8 17.5h6" /></svg>
    case 'shield': return <svg viewBox="0 0 24 24" className={className} {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
    case 'shield-plus': return <svg viewBox="0 0 24 24" className={className} {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M12 8v6M9 11h6" /></svg>
    case 'map': return <svg viewBox="0 0 24 24" className={className} {...p}><path d="M9 20l-5.5-2.5v-13L9 7l6-2.5L20.5 7v13L15 17.5 9 20z" /><path d="M9 7v13M15 4.5v13" /></svg>
    case 'users': return <svg viewBox="0 0 24 24" className={className} {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0111 0M16 6.2a3 3 0 010 5.6M18.5 20a5.5 5.5 0 00-3-4.9" /></svg>
    case 'tag': return <svg viewBox="0 0 24 24" className={className} {...p}><path d="M20.5 13.3l-7.2 7.2a2 2 0 01-2.8 0l-6.5-6.5a2 2 0 01-.6-1.4V5.5a2 2 0 012-2h6.6a2 2 0 011.4.6l6.5 6.5a2 2 0 010 2.7z" /><circle cx="8.5" cy="8.5" r="1.4" /></svg>
    case 'spark': return <svg viewBox="0 0 24 24" className={className} {...p}><path d="M12 3l1.9 5.6L19.5 10l-4.8 3 1.7 5.7L12 15.4 7.6 18.7 9.3 13 4.5 10l5.6-1.4z" /></svg>
    case 'trophy': return <svg viewBox="0 0 24 24" className={className} {...p}><path d="M7 4h10v4a5 5 0 01-10 0z" /><path d="M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M9.5 15h5M12 13v2M8 20h8M10 17.5h4" /></svg>
    case 'badge': return <svg viewBox="0 0 24 24" className={className} {...p}><circle cx="12" cy="9" r="5.5" /><path d="M9 13.5L8 21l4-2 4 2-1-7.5M12 6.5l1 2 2 .2-1.4 1.5.4 2-2-1-2 1 .4-2L9 8.7l2-.2z" /></svg>
    default: return null
  }
}

/* ============ ACT — the five values ============ */
export function MembershipValues() {
  const { membership } = useMode()
  return (
    <section className="relative border-t border-bone/10 bg-asphalt py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="grid gap-4 lg:grid-cols-[0.42fr_0.58fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal><Eyebrow>The membership</Eyebrow></Reveal>
            <SplitWords as="h2" text="More than an app. A way in." className="mt-4 block font-display text-4xl font-medium leading-[1.05] tracking-tight text-bone sm:text-6xl" />
            <Reveal delay={200}>
              <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-bone/60">
                REV is a membership, not a feed. Five things it gives you — earned, verified, and worth more than the price of belonging.
              </p>
            </Reveal>
          </div>

          <div>
            {membership.values.map((v, i) => (
              <Reveal key={v.num} delay={i * 60}>
                <div className="group grid grid-cols-[auto_1fr] gap-6 border-t border-bone/10 py-8 transition-colors hover:border-accent/30 sm:gap-10">
                  <span className="font-display text-2xl font-light text-bone/25 transition-colors group-hover:text-accent">{v.num}</span>
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-bone sm:text-3xl">{v.title}</h3>
                    <p className="serif-italic mt-1 text-lg text-accent sm:text-xl">{v.line}</p>
                    <p className="mt-3 max-w-md text-[15px] leading-relaxed text-bone/60">{v.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============ ACT — what's inside (bento) ============ */
function BenefitCard({ b, i }) {
  const tilt = useTilt(4)
  const wide = b.span === 'lg'
  return (
    <div className={`tilt-wrap ${wide ? 'sm:col-span-2' : ''}`} ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave}>
      <Reveal delay={(i % 3) * 80}>
        <article
          data-cursor="Inside"
          className="tilt-inner card-face group relative flex h-full min-h-[230px] flex-col justify-between overflow-hidden rounded-[1.6rem] p-7"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 20%, transparent), transparent 70%)' }} />
          <div className="relative flex items-start justify-between">
            <span className="icon-tile h-12 w-12 rounded-2xl">
              <BenefitIcon name={b.icon} />
            </span>
            <span className="label-caps rounded-full border border-accent/25 bg-accent/8 px-2.5 py-1 text-[8px] text-accent">{b.value}</span>
          </div>
          <div className="relative mt-6">
            <h3 className={`font-display font-semibold tracking-tight text-bone ${wide ? 'text-2xl' : 'text-xl'}`}>{b.title}</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-bone/60">{b.desc}</p>
          </div>
        </article>
      </Reveal>
    </div>
  )
}

export function MembershipBenefits() {
  const { membership } = useMode()
  return (
    <section className="wash-accent relative overflow-hidden border-t border-bone/10 bg-asphalt-2/50 py-28 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal><Eyebrow>What's inside</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="mt-3 font-display text-4xl font-medium tracking-tight text-bone sm:text-5xl">
                Nine reasons it's <em className="serif-italic text-accent">worth it.</em>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={160}>
            <p className="max-w-xs text-sm leading-relaxed text-bone/55">Every benefit is built, verified and live — not a roadmap promise.</p>
          </Reveal>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {membership.benefits.map((b, i) => <BenefitCard key={b.title} b={b} i={i} />)}
        </div>
      </div>
    </section>
  )
}

/* ============ ACT — savings ledger ============ */
export function MembershipSavings() {
  const { membership, images } = useMode()
  const { ref, display } = useCountUp(membership.savings.headline)
  const photoRef = useParallax(0.12)
  return (
    <section className="border-t border-bone/10 bg-asphalt py-28 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2 lg:px-12">
        <Reveal className="reveal-mask parallax-frame order-2 h-[360px] overflow-hidden rounded-[2rem] shadow-lux lg:order-1 lg:h-[520px]">
          <img ref={photoRef} src={images.editorial} alt="" className="h-full w-full scale-[1.18] object-cover" loading="lazy" />
        </Reveal>
        <div className="order-1 lg:order-2">
          <Reveal><Eyebrow>Savings</Eyebrow></Reveal>
          <Reveal delay={80}>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight text-bone sm:text-5xl">
              A membership that <em className="serif-italic text-accent">pays for itself.</em>
            </h2>
          </Reveal>
          <div ref={ref} className="mt-8 flex items-baseline gap-3">
            <span className="tabular text-gradient font-display text-6xl font-semibold sm:text-7xl">{display}</span>
            <span className="label-caps text-[10px] text-bone/45">/ year<br />average</span>
          </div>
          <Reveal delay={120}>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-bone/60">{membership.savings.note}</p>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {membership.savings.partners.map((s, i) => (
              <Reveal key={s.cat} delay={i * 55}>
                <div className="tap group flex items-center justify-between rounded-xl border border-bone/10 bg-gradient-to-br from-white/70 to-asphalt-2/40 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_6px_16px_-10px_rgba(35,28,15,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40">
                  <span className="text-sm font-medium text-bone/80">{s.cat}</span>
                  <span className="label-caps text-[9px] text-accent">{s.deal}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============ ACT — challenges + badges (status) ============ */
export function MembershipStatus() {
  const { membership } = useMode()
  const badgeTone = (t) => (t === 'volt' ? 'text-volt border-volt/40 bg-volt/10' : t === 'ink' ? 'text-bone border-bone/25 bg-bone/[0.04]' : 'text-accent border-accent/40 bg-accent/10')
  return (
    <section className="relative overflow-hidden border-t border-bone/10 bg-asphalt-2/50 py-28 lg:py-32" data-cursor-theme="dark">
      {/* subtle radial */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 80% 20%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 70%)' }} />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-12">
        <div className="grid gap-14 lg:grid-cols-2">
          {/* challenges */}
          <div>
            <Reveal><Eyebrow>Earn your place</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="mt-3 font-display text-4xl font-medium tracking-tight text-bone sm:text-5xl">
                Status you <em className="serif-italic text-accent">ride for.</em>
              </h2>
            </Reveal>
            <div className="mt-8 flex flex-col gap-3">
              {membership.challenges.map((c, i) => (
                <Reveal key={c.name} delay={i * 90}>
                  <div className="group card-3d flex items-center gap-5 rounded-2xl p-5">
                    <span className="icon-tile h-11 w-11 shrink-0 rounded-full">
                      <BenefitIcon name="trophy" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-semibold text-bone">{c.name}</p>
                      <p className="text-xs text-bone/50">{c.goal}</p>
                    </div>
                    <span className="label-caps hidden shrink-0 text-right text-[8px] text-accent sm:block">{c.reward}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* badges */}
          <div className="lg:pl-6">
            <Reveal delay={120}>
              <p className="label-caps text-[10px] text-bone/45">Premium recognition</p>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-bone/60">
                Badges aren't bought. They're earned — for showing up, leading runs and clocking the miles. Your name carries them everywhere on REV.
              </p>
            </Reveal>
            <div className="mt-8 flex flex-wrap gap-3">
              {membership.badges.map((b, i) => (
                <Reveal key={b.name} delay={i * 70}>
                  <span className={`tap inline-flex items-center gap-2 rounded-full border px-4 py-2.5 ${badgeTone(b.tone)}`}>
                    <BenefitIcon name="badge" className="h-4 w-4" />
                    <span className="text-xs font-semibold">{b.name}</span>
                  </span>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200}>
              <div className="mt-10 glass flex items-center gap-4 rounded-2xl p-5">
                <VerifiedBadge size="lg" />
                <p className="text-sm text-bone/65">
                  Every badge sits on a <span className="font-semibold text-bone">verified</span> profile — recognition that actually means something.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============ ACT — tiers ============ */
export function MembershipTiers({ onEnter }) {
  const { membership } = useMode()
  return (
    <section className="wash-accent border-t border-bone/10 bg-asphalt py-28 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <Reveal><Eyebrow className="!block">Choose your standing</Eyebrow></Reveal>
          <Reveal delay={80}>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight text-bone sm:text-5xl">
              Belong at your <em className="serif-italic text-accent">own pace.</em>
            </h2>
          </Reveal>
        </div>
        <div className="grid items-stretch gap-5 lg:grid-cols-3">
          {membership.tiers.map((t, i) => (
            <Reveal key={t.name} delay={i * 110} className={t.featured ? 'lg:-mt-4 lg:-mb-4' : ''}>
              <div
                data-cursor={t.featured ? 'Join' : 'View'}
                className={`relative flex h-full flex-col overflow-hidden rounded-[1.8rem] p-8 ${
                  t.featured
                    ? 'text-asphalt shadow-[0_30px_70px_-24px_color-mix(in_srgb,var(--accent)_45%,rgba(20,18,14,0.5))] transition-transform duration-500 hover:-translate-y-1.5'
                    : 'card-3d text-bone'
                }`}
                style={t.featured ? { background: 'linear-gradient(165deg, #211d17, #0e0d0a)', border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)' } : undefined}
              >
                {t.featured && (
                  <>
                    <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full" style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 45%, transparent), transparent 68%)' }} />
                    <span className="label-caps absolute right-6 top-6 rounded-full bg-accent px-3 py-1 text-[8px] text-white shadow-[0_6px_16px_-6px_color-mix(in_srgb,var(--accent)_70%,transparent)]">Most popular</span>
                  </>
                )}
                <p className={`label-caps relative text-[10px] ${t.featured ? 'text-accent' : 'text-accent'}`}>{t.name}</p>
                <div className="relative mt-4 flex items-baseline gap-1.5">
                  <span className={`font-display text-5xl font-semibold tracking-tight ${t.featured ? 'text-white' : 'text-gradient'}`}>{t.price}</span>
                  <span className={`text-sm ${t.featured ? 'text-white/50' : 'text-bone/45'}`}>{t.cadence}</span>
                </div>
                <p className={`relative mt-3 text-sm leading-relaxed ${t.featured ? 'text-white/65' : 'text-bone/55'}`}>{t.tagline}</p>
                <div className={`relative my-7 h-px w-full ${t.featured ? 'bg-white/12' : 'bg-bone/10'}`} />
                <ul className="relative flex flex-1 flex-col gap-3">
                  {t.perks.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-sm">
                      <svg viewBox="0 0 24 24" className={`mt-0.5 h-4 w-4 shrink-0 ${t.featured ? 'text-accent' : 'text-volt'}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      <span className={t.featured ? 'text-white/85' : 'text-bone/70'}>{p}</span>
                    </li>
                  ))}
                </ul>
                <div className="relative mt-8">
                  {t.featured ? (
                    <PrimaryButton onClick={onEnter} className="w-full justify-center" cursor="Join">Join {t.name}</PrimaryButton>
                  ) : (
                    <button
                      onClick={onEnter}
                      data-cursor="Select"
                      className="btn-fx tap w-full rounded-full border border-bone/25 py-3.5 font-display text-[15px] font-semibold tracking-wide text-bone/85 transition-colors hover:border-bone/60 hover:bg-bone/5"
                    >
                      {t.price === 'Free' ? 'Start free' : 'Request invite'}
                    </button>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <p className="mt-10 text-center text-xs text-bone/40">Prototype pricing · Cancel anytime · Founding-member rates locked for year one</p>
        </Reveal>
      </div>
    </section>
  )
}
