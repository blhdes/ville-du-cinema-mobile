import { createContext, useContext, type ReactNode } from 'react'
import { useProfileInternal, type UseProfileReturn } from '@/hooks/useProfile'

const ProfileContext = createContext<UseProfileReturn | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const value = useProfileInternal()
  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): UseProfileReturn {
  const ctx = useContext(ProfileContext)
  if (!ctx) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return ctx
}
