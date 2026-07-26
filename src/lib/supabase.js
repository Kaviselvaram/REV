/* ---------------------------------------------------------------------------
   Supabase client — loaded on demand, not at startup.

   The SDK is roughly 220 kB of the bundle. Imported statically it sits on the
   critical path, so nothing renders until it has been downloaded and parsed —
   on a mid-range Android over mobile data that is a visible delay before the
   first frame. Nothing on the opening screen needs it: the session restore
   runs in an effect, which fires after paint. So it is imported dynamically
   and the first frame ships without it.

   The key here is the publishable key, which is meant to ship in a browser
   bundle — it grants nothing on its own. Every read and write is decided by
   row-level security against the caller's JWT. The service-role key bypasses
   RLS and must never reach this file.
   --------------------------------------------------------------------------- */

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isConfigured = Boolean(url && key)

/* Development SMS stub. Phone OTP needs an SMS provider under contract, which
   is a launch concern, not a build-time one. With this flag the login kit signs
   in against a seeded email/password instead — the member still gets a real
   Supabase session and a real JWT, so RLS, policies and every server-side rule
   are exercised exactly as in production. Only the delivery of the six digits
   is faked. Guarded so it can never switch on in a production build. */
export const isDevAuth =
  isConfigured && import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH === 'true'

if (isDevAuth) {
  console.warn('[REV] DEV AUTH ACTIVE — any 6 digits sign in a seeded member. Never ship this.')
}

if (!isConfigured && import.meta.env.DEV) {
  console.warn(
    '[REV] No Supabase env vars found — running on in-memory prototype data. ' +
    'Copy .env.example to .env.local to connect the backend.',
  )
}

let clientPromise = null

// Returns the singleton client, creating it (and fetching the SDK) on the
// first call. Concurrent callers share one in-flight import.
export function getClient() {
  if (!isConfigured) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false, // phone OTP, no magic-link redirects
          storageKey: 'rev.auth',
        },
        global: { headers: { 'x-application-name': 'rev-web' } },
      }),
    )
  }
  return clientPromise
}

/* Postgres error codes our functions raise deliberately, mapped to language a
   member should actually see. Anything unrecognised gets a neutral message —
   raw database errors must never reach the UI. */
const FRIENDLY = {
  '23505': 'That handle is already taken.',
  '23514': null, // check violation — our functions supply their own message
  '42501': null, // insufficient privilege — ditto
  '54000': 'You are doing that too quickly. Give it a moment.',
  'P0002': 'That no longer exists.',
}

export function describeError(error, fallback = 'Something went wrong. Try again.') {
  if (!error) return null
  const mapped = FRIENDLY[error.code]
  if (mapped) return mapped
  // Our own RAISE messages are already written for members.
  if (error.message && !/^(duplicate key|permission denied|relation |column )/i.test(error.message)) {
    return error.message.replace(/^ERROR:\s*/, '')
  }
  return fallback
}
