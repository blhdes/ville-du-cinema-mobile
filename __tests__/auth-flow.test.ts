/**
 * E2E auth flow: signup → login → logout
 *
 * Hits the real Supabase project using the anon key from .env.
 * Uses email/password auth (Google OAuth needs a browser).
 *
 * IMPORTANT: In your Supabase dashboard go to
 *   Auth → Providers → Email → and DISABLE "Confirm email"
 *   for this test to pass. Otherwise signUp won't return a session
 *   and signInWithPassword will reject unconfirmed accounts.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Standalone client — no expo-secure-store, no session persistence.
// This keeps the test isolated from the app's auth state.
let supabase: SupabaseClient<Database>

// Random email so parallel runs never collide
const TEST_EMAIL = `e2e+${Date.now()}@village-test.local`
const TEST_PASSWORD = 'Test1234!secure'

let userId: string

beforeAll(() => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
    )
  }

  supabase = createClient<Database>(url, key, {
    auth: { persistSession: false },
  })
})

describe('Auth flow: signup → login → logout', () => {
  // ── Step 1: Sign up ───────────────────────────────────────
  it('creates a new account with email/password', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    expect(error).toBeNull()
    expect(data.user).not.toBeNull()
    expect(data.user!.email).toBe(TEST_EMAIL)

    // If this is null, email confirmation is probably enabled (see note above)
    expect(data.session).not.toBeNull()

    userId = data.user!.id
  })

  // ── Step 2: Sign out after signup ─────────────────────────
  it('signs out after signup so we can test a fresh login', async () => {
    const { error } = await supabase.auth.signOut()
    expect(error).toBeNull()
  })

  // ── Step 3: Log back in ───────────────────────────────────
  it('logs in with the same credentials', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    expect(error).toBeNull()
    expect(data.user).not.toBeNull()
    expect(data.user!.id).toBe(userId)
    expect(data.session).not.toBeNull()
    expect(data.session!.access_token).toBeTruthy()
  })

  // ── Step 4: Verify current user ───────────────────────────
  it('getUser returns the authenticated user', async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    expect(error).toBeNull()
    expect(user).not.toBeNull()
    expect(user!.id).toBe(userId)
    expect(user!.email).toBe(TEST_EMAIL)
  })

  // ── Step 5: Log out ───────────────────────────────────────
  it('logs out successfully', async () => {
    const { error } = await supabase.auth.signOut()
    expect(error).toBeNull()
  })

  // ── Step 6: Confirm no session remains ────────────────────
  it('getSession returns null after logout', async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    expect(session).toBeNull()
  })
})
