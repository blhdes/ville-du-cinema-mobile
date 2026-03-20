import { createContext, useContext, useEffect, useState } from 'react'
import auth from '@/lib/auth'
import type { User } from '@/lib/auth'

interface UserState {
  user: User | null
  isLoading: boolean
  signOut: () => Promise<void>
}

export const UserContext = createContext<UserState>({
  user: null,
  isLoading: true,
  signOut: async () => {},
})

/**
 * Internal hook — only used by UserProvider.
 * Subscribes to Supabase auth state changes. The INITIAL_SESSION event fires
 * immediately from the cached SecureStore token, so no separate getUser()
 * network call is needed for initialisation.
 */
export function useUserProvider(): UserState {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChange((u) => {
      setUser(u)
      setIsLoading(false)
    })

    return unsubscribe
  }, [])

  const signOut = async () => {
    await auth.signOut()
    setUser(null)
  }

  return { user, isLoading, signOut }
}

/**
 * Consume the shared auth state. Must be inside <UserProvider>.
 */
export function useUser(): UserState {
  return useContext(UserContext)
}
