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
 * Initialises Supabase auth once and subscribes to changes.
 */
export function useUserProvider(): UserState {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    auth.getUser().then((u) => {
      setUser(u)
      setIsLoading(false)
    })

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
