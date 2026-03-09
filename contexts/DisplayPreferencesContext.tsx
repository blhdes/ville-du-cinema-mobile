import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import storage from '@/lib/storage'
import { useProfile } from '@/hooks/useProfile'

const STORAGE_KEY_DROP_CAP = 'display_use_drop_cap'
const STORAGE_KEY_SHOW_RATINGS = 'display_show_ratings'
const STORAGE_KEY_FONT_SIZE_LEVEL = 'display_font_size_level'

interface DisplayPrefs {
  showWatchNotifications: boolean
  useDropCap: boolean
  showRatings: boolean
  fontSizeLevel: number
}

interface DisplayPreferencesContextValue {
  preferences: DisplayPrefs
  isLoading: boolean
  isAuthenticated: boolean
  setShowWatchNotifications: (value: boolean) => void
  setUseDropCap: (value: boolean) => void
  setShowRatings: (value: boolean) => void
  setFontSizeLevel: (value: number) => void
}

const DEFAULTS: DisplayPrefs = {
  showWatchNotifications: true,
  useDropCap: false,
  showRatings: false,
  fontSizeLevel: 4,
}

const DisplayPreferencesContext = createContext<DisplayPreferencesContextValue>({
  preferences: DEFAULTS,
  isLoading: true,
  isAuthenticated: false,
  setShowWatchNotifications: () => {},
  setUseDropCap: () => {},
  setShowRatings: () => {},
  setFontSizeLevel: () => {},
})

export function DisplayPreferencesProvider({ children }: { children: ReactNode }) {
  const { profile, isLoading: isProfileLoading, updateDisplayPreferences } = useProfile()
  const isAuthenticated = !!profile

  const [prefs, setPrefs] = useState<DisplayPrefs>(DEFAULTS)
  const [localLoaded, setLocalLoaded] = useState(false)

  // Load local-only prefs from AsyncStorage on mount
  useEffect(() => {
    Promise.all([
      storage.getItem<boolean>(STORAGE_KEY_DROP_CAP),
      storage.getItem<boolean>(STORAGE_KEY_SHOW_RATINGS),
      storage.getItem<number>(STORAGE_KEY_FONT_SIZE_LEVEL),
    ]).then(([dropCap, showRatings, fontSizeLevel]) => {
      setPrefs((prev) => ({
        ...prev,
        useDropCap: dropCap === true,
        showRatings: showRatings === true,
        fontSizeLevel: typeof fontSizeLevel === 'number' ? fontSizeLevel : 4,
      }))
      setLocalLoaded(true)
    })
  }, [])

  // Sync showWatchNotifications from profile (invert Supabase's hide_watch_notifications)
  useEffect(() => {
    if (profile) {
      setPrefs((prev) => ({
        ...prev,
        showWatchNotifications: !profile.hide_watch_notifications,
      }))
    } else {
      setPrefs((prev) => ({
        ...prev,
        showWatchNotifications: true,
      }))
    }
  }, [profile])

  const setShowWatchNotifications = useCallback(
    (value: boolean) => {
      if (!isAuthenticated) return
      setPrefs((prev) => ({ ...prev, showWatchNotifications: value }))
      // Invert when writing to Supabase: show=true means hide=false
      updateDisplayPreferences({ hide_watch_notifications: !value }).catch(() => {
        // Revert on failure
        if (profile) {
          setPrefs((prev) => ({
            ...prev,
            showWatchNotifications: !profile.hide_watch_notifications,
          }))
        }
      })
    },
    [isAuthenticated, updateDisplayPreferences, profile],
  )

  const setUseDropCap = useCallback((value: boolean) => {
    setPrefs((prev) => ({ ...prev, useDropCap: value }))
    storage.setItem(STORAGE_KEY_DROP_CAP, value)
  }, [])

  const setShowRatings = useCallback((value: boolean) => {
    setPrefs((prev) => ({ ...prev, showRatings: value }))
    storage.setItem(STORAGE_KEY_SHOW_RATINGS, value)
  }, [])

  const setFontSizeLevel = useCallback((value: number) => {
    const clamped = Math.min(10, Math.max(1, Math.round(value)))
    setPrefs((prev) => ({ ...prev, fontSizeLevel: clamped }))
    storage.setItem(STORAGE_KEY_FONT_SIZE_LEVEL, clamped)
  }, [])

  return (
    <DisplayPreferencesContext.Provider
      value={{
        preferences: prefs,
        isLoading: isProfileLoading || !localLoaded,
        isAuthenticated,
        setShowWatchNotifications,
        setUseDropCap,
        setShowRatings,
        setFontSizeLevel,
      }}
    >
      {children}
    </DisplayPreferencesContext.Provider>
  )
}

export function useDisplayPreferences() {
  return useContext(DisplayPreferencesContext)
}
