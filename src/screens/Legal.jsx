import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/* ------------------------------------------------------------------
   Legal documents — Terms, Privacy, Refunds, Contact.

   These are working drafts written against India's DPDP Act 2023, the
   IT Rules 2021 and Razorpay's merchant requirements. THEY MUST BE
   REVIEWED BY A LAWYER BEFORE LAUNCH, and every [BRACKETED] field must
   be filled with the registered entity's real details.
   ------------------------------------------------------------------ */

export const LEGAL_EFFECTIVE = '26 July 2026'
export const LEGAL_VERSION = '1.0'

// Fill these in once the entity is registered.
const ENTITY = {
  name: '[REGISTERED ENTITY NAME]',
  cin: '[CIN / LLPIN]',
  address: '[REGISTERED ADDRESS], Chennai, Tamil Nadu, India',
  email: '[hello@rev.example]',
  grievance: '[grievance@rev.example]',
  officer: '[GRIEVANCE OFFICER NAME]',
}

const DOCS = {
  terms: {
    label: 'Terms of Use',
    intro:
      'These terms govern your use of REV. By verifying your number and creating an account you agree to them. If you do not agree, do not use REV.',
    sections: [
      {
        h: 'Who we are',
        p: [
          `REV is operated by ${ENTITY.name} (${ENTITY.cin}), registered at ${ENTITY.address}. You can reach us at ${ENTITY.email}.`,
          'REV is a community platform for verified two-wheeler and four-wheeler owners in India. Members find each other here and organise their own group rides and drives; REV lists what they create and does not organise, lead or run any ride. We are not a transport service, a taxi aggregator, or a tour operator.',
        ],
      },
      {
        h: 'Who can join',
        p: [
          'You must be at least 18 years old to create an account. REV is a motoring community tied to licensed road use, and we do not knowingly collect data from minors.',
          'You must hold a valid driving licence for any vehicle you ride or drive on a REV meet, and the vehicle must have current registration, insurance and a valid PUC certificate where required by law.',
          'One account per person, tied to one verified mobile number. Accounts may not be shared, sold or transferred.',
        ],
      },
      {
        h: 'Verification',
        p: [
          'Verification on REV means we have confirmed control of a mobile number, and where you have submitted them, checked a driving licence and vehicle registration against the issuing records.',
          'Verification is an identity signal, not a character reference, a safety guarantee, or an endorsement by us. We do not vet riding skill, temperament or intent. Use your own judgement about who you ride with.',
        ],
      },
      {
        h: 'Rides are between members',
        p: [
          'Every ride on REV is organised by a member, not by us. The ride captain sets the route, pace, meeting point and rules. We do not plan, lead, supervise, marshal or insure any ride.',
          'You take part entirely at your own risk. You are responsible for your own safety gear, your vehicle\'s roadworthiness, your compliance with all traffic law, and your own insurance cover.',
          'Nothing on REV — including a route drawn on a map — is advice that a road is safe, legal or suitable for your vehicle or skill level.',
        ],
      },
      {
        h: 'How you must behave',
        p: [
          'Ride legally and within your limits. Obey speed limits and traffic law. Do not use REV to organise or promote racing, time trials, stunting, or any illegal road activity.',
          'Never ride or drive under the influence of alcohol or drugs. A captain may remove anyone they believe is impaired.',
          'Treat other members with respect. Harassment, threats, stalking, hate speech, sexual harassment, doxxing, impersonation and spam are prohibited and will result in removal.',
          'Do not share another member\'s personal information, location or contact details outside REV without their explicit permission.',
        ],
      },
      {
        h: 'Content you post',
        p: [
          'You keep ownership of the photos, ride descriptions and messages you post. You grant us a non-exclusive, royalty-free licence to host, display and distribute that content within REV for the purpose of operating the service.',
          'Only post content you have the right to post. We may remove content that breaks these terms, and we may retain copies where the law requires it.',
        ],
      },
      {
        h: 'Membership and payment',
        p: [
          'Paid membership tiers renew automatically until cancelled. Prices are shown in Indian Rupees and include applicable taxes unless stated otherwise.',
          'Payments are processed by Razorpay. We do not store your card details. Refunds are governed by our Refund Policy.',
        ],
      },
      {
        h: 'Suspension and removal',
        p: [
          'We may suspend or permanently remove an account that breaks these terms, that puts other members at risk, or that is the subject of credible safety reports. Where it is safe and lawful to do so, we will tell you why.',
          'You may delete your account at any time from your account settings.',
        ],
      },
      {
        h: 'Our liability',
        p: [
          'REV is provided on an "as is" basis. To the maximum extent permitted by Indian law, we are not liable for injury, death, property damage, loss or expense arising from a ride, from another member\'s conduct, or from your reliance on any route, map or listing on REV.',
          'Where liability cannot lawfully be excluded, our total liability to you is limited to the membership fees you paid us in the twelve months before the claim.',
        ],
      },
      {
        h: 'Governing law and grievances',
        p: [
          'These terms are governed by the laws of India, and the courts at Chennai, Tamil Nadu have exclusive jurisdiction.',
          `Under the Information Technology Rules 2021, our Grievance Officer is ${ENTITY.officer}, reachable at ${ENTITY.grievance}. We acknowledge complaints within 24 hours and resolve them within 15 days.`,
        ],
      },
    ],
  },

  charter: {
    label: 'Ride Charter',
    intro:
      'Every captain accepts this before they can create a ride, and every rider is held to it. ' +
      'It is the standard REV expects on the road. REV does not organise or supervise rides — ' +
      'the captain leads, and each rider is responsible for themselves.',
    sections: [
      {
        h: 'Before you roll',
        p: [
          'Ride only what you are licensed to ride, on a vehicle that is registered, insured and holds a valid PUC certificate where the law requires one.',
          'Full gear. A helmet always; gloves, shoes and a jacket are expected on any ride leaving the city.',
          'Fuel up before the meeting point. A group waiting at a pump is a group riding in a hurry afterwards.',
          'If you are unwell, exhausted, or have had anything to drink, do not ride. Tell the captain and go home. Nobody will think less of you.',
        ],
      },
      {
        h: 'On the road',
        p: [
          'Obey every traffic law. Speed limits, signals and lane discipline are not suspended because you are in a group.',
          'No racing, no time trials, no stunting. REV is not the place to organise or promote any of it, and a captain who allows it will lose their standing.',
          'Ride in staggered formation. Do not overtake the captain. Do not ride in anyone else\'s blind spot.',
          'Ride your own ride. Never ride faster than you are comfortable with to keep up with the group — a good group waits.',
          'The sweep rider is the last rider. Nobody is left behind them.',
        ],
      },
      {
        h: 'What a captain owes the group',
        p: [
          'Set the pace, the route and the stops, and brief them before flag-off.',
          'Name a sweep rider and make sure everyone knows who it is.',
          'Turn away anyone who is impaired, unlicensed, or on an unroadworthy vehicle. This is not optional.',
          'Carry a first-aid kit, and know the nearest hospital on the route.',
          'Account for everyone at every stop before moving on.',
        ],
      },
      {
        h: 'What every rider owes the group',
        p: [
          'Turn up if you said you would. A no-show is a seat someone else wanted.',
          'Arrive on time and fuelled. The group leaves at the stated time.',
          'Look after the rider behind you at every turn, so nobody is lost.',
          'Treat every member with respect, on the road and in the chat.',
        ],
      },
      {
        h: 'If something goes wrong',
        p: [
          'Stop. Call 112 first — police, fire and ambulance. REV is not an emergency service and cannot dispatch help.',
          'Raise an SOS in the app so your nominated emergency contacts get your live location.',
          'Do not move an injured rider unless they are in immediate danger.',
          'Tell REV afterwards. We record it, and it informs how the community is kept safe.',
        ],
      },
      {
        h: 'Breaking this charter',
        p: [
          'Riding dangerously, riding impaired, or putting other members at risk will cost you your place in the community — captains and riders alike.',
          'REV reviews every report and may suspend or permanently remove an account. Where it is safe and lawful, we will tell you why.',
        ],
      },
    ],
  },

  privacy: {
    label: 'Privacy Policy',
    intro:
      'This policy explains what personal data REV collects, why, and what rights you have over it under the Digital Personal Data Protection Act, 2023.',
    sections: [
      {
        h: 'What we collect',
        p: [
          'Account data — your mobile number, name, chosen handle, city, date of birth, and profile photo if you add one.',
          'Vehicle data — the make, model, year, modifications and photos you add to your Garage.',
          'Ride data — rides you create or join, roster status, check-ins, and messages in ride chats.',
          'Verification data — the status and reference number of a licence or registration check. We do not store images of your licence or registration certificate.',
          'Technical data — device type, app version, IP address and coarse location, used for security, fraud prevention and debugging.',
        ],
      },
      {
        h: 'Why we collect it',
        p: [
          'To run your account and verify that you are a real, contactable person — this is the core of what REV offers.',
          'To show you relevant rides near you, and to let ride captains see who has joined.',
          'To keep the community safe: investigating reports, preventing fraud and abuse, and responding to emergencies.',
          'To process membership payments, and to meet our legal and tax obligations.',
        ],
      },
      {
        h: 'Your mobile number is never shown',
        p: [
          'Your mobile number is used for verification, security and service notices. It is never displayed to other members, never included in any public profile, and never sold or rented to anyone.',
          'The only exception is an active SOS: if you trigger an emergency alert during a ride, we share your number and live location with the emergency contacts you nominated, for the duration of that alert.',
        ],
      },
      {
        h: 'Location and meeting points',
        p: [
          'Precise meeting-point coordinates for a ride are shown only to members the captain has approved, and only close to the start time. Everyone else sees an approximate area, so that a public listing never reveals exactly where a named person will be.',
          'Live location is shared only when you start an SOS, and stops when the alert ends or the ride finishes.',
        ],
      },
      {
        h: 'Who we share it with',
        p: [
          'Service providers who help us operate: our cloud and database host, our SMS provider for one-time passwords, our payment processor, and our error-monitoring tools. Each is bound by contract to protect your data.',
          'Law enforcement or regulators, where we are legally required to disclose, or where there is a credible risk to someone\'s life or safety.',
          'We do not sell your personal data. We do not share it with advertisers.',
        ],
      },
      {
        h: 'Where it is stored',
        p: [
          'Your data is stored on servers located in India. Mobile numbers are encrypted at rest. Access by our team is restricted, logged and reviewed.',
        ],
      },
      {
        h: 'How long we keep it',
        p: [
          'Account and profile data: while your account is active. When you delete your account we begin a 30-day grace period, then permanently erase your personal data.',
          'Payment and tax records: retained for 8 years, as Indian tax law requires.',
          'Safety reports and moderation records: retained for 3 years so that patterns of behaviour can be recognised.',
        ],
      },
      {
        h: 'Your rights',
        p: [
          'You have the right to access the personal data we hold about you, correct anything inaccurate, request erasure, withdraw consent, and nominate someone to exercise these rights if you are unable to.',
          'You can export or delete your data yourself from your account settings, or write to us and we will action it within 30 days.',
          `If you are not satisfied with our response, you may complain to our Grievance Officer at ${ENTITY.grievance}, and after that to the Data Protection Board of India.`,
        ],
      },
      {
        h: 'Security',
        p: [
          'We protect your data with encrypted connections, encryption at rest for sensitive fields, row-level database access controls, rate limiting, and audit logging. No system is perfectly secure, but we will notify you and the Data Protection Board without undue delay if a breach affects your data.',
        ],
      },
    ],
  },

  refunds: {
    label: 'Refund Policy',
    intro:
      'This policy covers paid REV memberships. It is written to meet Razorpay\'s merchant requirements and Indian consumer law.',
    sections: [
      {
        h: 'Cooling-off period',
        p: [
          'If you are unhappy with a new membership, tell us within 7 days of the first payment and we will refund it in full, no questions asked.',
        ],
      },
      {
        h: 'Renewals',
        p: [
          'Memberships renew automatically. We email or message you before each renewal. You can cancel any time from your account settings, and cancellation takes effect at the end of the paid period — you keep your benefits until then.',
          'Renewal payments are not refunded once the new period has begun, except where required by law or where we have made a billing error.',
        ],
      },
      {
        h: 'Billing errors and failed payments',
        p: [
          'If you were charged incorrectly, charged twice, or charged after cancelling, contact us and we will refund the incorrect amount in full.',
        ],
      },
      {
        h: 'How refunds are paid',
        p: [
          'Approved refunds are returned to the original payment method through Razorpay. Banks typically take 5 to 7 working days to post the credit.',
          `To request a refund, write to ${ENTITY.email} from your registered email, or use the Help option in your account settings.`,
        ],
      },
      {
        h: 'What is not refundable',
        p: [
          'Memberships on accounts removed for breaking our Terms of Use are not refunded.',
          'REV does not charge for individual rides, so there is nothing to refund if a ride is cancelled by its captain.',
        ],
      },
    ],
  },

  contact: {
    label: 'Contact',
    intro: 'How to reach a real person at REV.',
    sections: [
      {
        h: 'General and support',
        p: [`${ENTITY.email} — we reply within two working days.`],
      },
      {
        h: 'Grievance Officer',
        p: [
          `${ENTITY.officer}`,
          `${ENTITY.grievance}`,
          'Appointed under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the Digital Personal Data Protection Act, 2023. Complaints acknowledged within 24 hours, resolved within 15 days.',
        ],
      },
      {
        h: 'Registered office',
        p: [ENTITY.name, ENTITY.address, ENTITY.cin],
      },
      {
        h: 'Safety emergencies',
        p: [
          'REV is not an emergency service. If you or someone else is in immediate danger, call 112 (national emergency), 108 (ambulance) or 100 (police) first, then tell us.',
        ],
      },
    ],
  },
}

export const LEGAL_DOCS = Object.entries(DOCS).map(([id, d]) => ({ id, label: d.label }))

function DocBody({ id }) {
  const doc = DOCS[id]
  if (!doc) return null
  return (
    <>
      <p className="text-[13px] leading-relaxed text-bone/60">{doc.intro}</p>
      {doc.sections.map((s) => (
        <section key={s.h} className="mt-6">
          <h3 className="font-display text-lg font-medium tracking-tight text-bone">{s.h}</h3>
          {s.p.map((para, i) => (
            <p key={i} className="mt-2 text-[13.5px] leading-relaxed text-bone/70">{para}</p>
          ))}
        </section>
      ))}
      <p className="mt-8 border-t border-bone/10 pt-4 text-[11px] leading-relaxed text-bone/40">
        Version {LEGAL_VERSION} · Effective {LEGAL_EFFECTIVE}. This is a working draft and must be
        reviewed by a qualified lawyer before REV accepts real members or payments.
      </p>
    </>
  )
}

/* Overlay — sits above everything, including the login kit. Documents are
   meant to scroll; only the login/create flows are held to one fitted screen. */
export function LegalOverlay({ doc, onClose }) {
  const panelRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    document.addEventListener('keydown', onKey, true)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const current = DOCS[doc]
  if (!current) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={current.label}
        onClick={(e) => e.stopPropagation()}
        className="glass-blur flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.6rem] shadow-lux outline-none"
        style={{ animation: 'screenIn 0.35s cubic-bezier(0.22,1,0.36,1) both' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-bone/10 px-7 py-5">
          <div>
            <span className="label-caps text-[10px] text-accent">REV · Legal</span>
            <h2 className="mt-1 font-display text-xl font-medium tracking-tight text-bone">{current.label}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            data-cursor="Close"
            className="tap grid h-9 w-9 shrink-0 place-items-center rounded-full glass-lite text-bone/60 hover:text-bone"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
          <DocBody id={doc} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* Full-screen route version — reachable from the footer. */
export default function Legal({ doc = 'terms', onSelect, onBack }) {
  return (
    <div className="screen-enter mx-auto max-w-3xl px-6 pb-32 pt-12 lg:px-10">
      <button
        onClick={onBack}
        className="label-caps flex cursor-pointer items-center gap-2 text-[11px] text-bone/50 transition-colors hover:text-bone"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Back
      </button>

      <span className="label-caps mt-8 block text-[11px] text-accent">REV · Legal</span>
      <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-bone">
        {DOCS[doc]?.label}
      </h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {LEGAL_DOCS.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            className={`label-caps tap cursor-pointer rounded-full px-4 py-2 text-[10px] transition-all ${
              d.id === doc ? 'bg-accent text-white' : 'glass-lite text-bone/60 hover:text-bone'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <DocBody id={doc} />
      </div>
    </div>
  )
}
