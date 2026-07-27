import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/* ---------------------------------------------------------------------------
   Release guard.

   Two mistakes are easy to make once and impossible to notice afterwards:
   shipping a build that still points at the staging database, and shipping one
   with the development sign-in stub switched on. Both look completely normal in
   the browser. The first quietly writes real members into a database we run
   destructive tests against; the second is an authentication bypass.

   So the build refuses rather than warns. A warning in a build log is a warning
   nobody reads.
   --------------------------------------------------------------------------- */
const STAGING_REF = 'safwykqfsczxvtvxzzzr'

function releaseGuard() {
  return {
    name: 'rev-release-guard',
    apply: 'build',
    configResolved(config) {
      // `vite build` defaults to production; a development build is opt-in and
      // is allowed to point anywhere.
      if (config.mode !== 'production') return

      const env = config.env ?? {}
      const url = env.VITE_SUPABASE_URL ?? ''
      const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
      const devAuth = env.VITE_DEV_AUTH ?? ''
      const problems = []

      if (!url || !key) {
        problems.push(
          'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must both be set. ' +
          'Without them the app silently falls back to in-memory prototype data.',
        )
      }
      if (url.includes(STAGING_REF)) {
        problems.push(
          `VITE_SUPABASE_URL points at STAGING (${STAGING_REF}). Real members would ` +
          'be written into the database used for destructive testing.',
        )
      }
      if (String(devAuth).toLowerCase() === 'true') {
        problems.push(
          'VITE_DEV_AUTH is true. That is the development sign-in stub — it must ' +
          'never be set in a release build.',
        )
      }
      if (/service_role|sb_secret/i.test(key)) {
        problems.push(
          'VITE_SUPABASE_PUBLISHABLE_KEY looks like a service-role/secret key. ' +
          'That key bypasses row-level security and must never reach the browser.',
        )
      }

      if (problems.length) {
        throw new Error(
          '\n\n  REV release guard — refusing to build:\n\n' +
          problems.map((p) => `    · ${p}`).join('\n\n') +
          '\n\n  Fix the environment, or run `vite build --mode development` for a ' +
          'non-release build.\n',
        )
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), releaseGuard()],
  build: {
    // Source maps would hand an attacker the unminified logic for free; the
    // error monitor can consume them separately without shipping them.
    sourcemap: false,
  },
})
