import type { ReactNode } from 'react'
import { UserContext, useUserProvider } from '@/hooks/useUser'

export function UserProvider({ children }: { children: ReactNode }) {
  const value = useUserProvider()
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
