import { createContext, useContext } from 'react'

// Session user store — auth (mock phone verification) + the saved Garage.
// Provided by App (in-memory; swaps to real auth + DB later). Everything that
// needs identity reads from here:
//
//   signedIn      boolean
//   profile       null when signed out, else { id:'me', name, handle, city,
//                 dob, phone, verified, ridesCount, joinedDate, bio? }
//   requireAuth   (cb) => runs cb now if signed in, else opens the login kit
//                 and runs it after verification
//   signOut       clears the session and the garage
//   updateProfile (patch) => merges into profile
//   garage        { bike, car } — the saved machine per world
//
// profile.id stays 'me' so ride rosters, which reference that id, keep
// working unchanged — only the identity shown on screen becomes real.
export const UserContext = createContext(null)

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within <UserContext.Provider>')
  return ctx
}
