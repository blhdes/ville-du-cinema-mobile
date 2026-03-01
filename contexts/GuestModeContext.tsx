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
    await storage.setItem(GUEST_MODE_KEY, true)
    setIsGuest(true)
  }

  const exitGuestMode = async () => {
    await storage.removeItem(GUEST_MODE_KEY)
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
