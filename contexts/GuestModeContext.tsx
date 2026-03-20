import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import storage from '@/lib/storage'

const GUEST_MODE_KEY = 'guest_mode'

interface GuestModeContextValue {
  isGuest: boolean
  isLoading: boolean
  enterGuestMode: () => Promise<void>
  exitGuestMode: () => Promise<void>
}

const GuestModeContext = createContext<GuestModeContextValue>({
  isGuest: false,
  isLoading: true,
  enterGuestMode: async () => {},
  exitGuestMode: async () => {},
})

export function GuestModeProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    storage.getItem<boolean>(GUEST_MODE_KEY).then((value) => {
      setIsGuest(value === true)
      setIsLoading(false)
    })
  }, [])

  const enterGuestMode = async () => {
    try {
      await storage.setItem(GUEST_MODE_KEY, true)
    } catch (err) {
      console.error('[GuestModeContext] Failed to persist guest mode:', err)
    }
    // Update in-memory state regardless of storage result — the user should
    // still get into the app even if AsyncStorage has a transient failure.
    setIsGuest(true)
  }

  const exitGuestMode = async () => {
    try {
      await storage.removeItem(GUEST_MODE_KEY)
    } catch (err) {
      console.error('[GuestModeContext] Failed to clear guest mode:', err)
    }
    setIsGuest(false)
  }

  return (
    <GuestModeContext.Provider value={{ isGuest, isLoading, enterGuestMode, exitGuestMode }}>
      {children}
    </GuestModeContext.Provider>
  )
}

export function useGuestMode() {
  return useContext(GuestModeContext)
}
