import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import storage from '@/lib/storage'
import { useProfile } from '@/hooks/useProfile'

const STORAGE_KEY_DROP_CAP = 'display_use_drop_cap'
const STORAGE_KEY_HIDE_RATINGS = 'display_hide_ratings'
const STORAGE_KEY_FONT_SIZE_LEVEL = 'display_font_size_level'

interface DisplayPrefs {
  hideWatchNotifications: boolean
  useDropCap: boolean
  hideRatings: boolean
  fontSizeLevel: number
}

interface DisplayPreferencesContextValue {
  preferences: DisplayPrefs
  isLoading: boolean
  isAuthenticated: boolean
  setHideWatchNotifications: (value: boolean) => void
  setUseDropCap: (value: boolean) => void
  setHideRatings: (value: boolean) => void
  setFontSizeLevel: (value: number) => void
}

const DEFAULTS: DisplayPrefs = {
  hideWatchNotifications: false,
  useDropCap: false,
  hideRatings: false,
  fontSizeLevel: 4,
}

const DisplayPreferencesContext = createContext<DisplayPreferencesContextValue>({
  preferences: DEFAULTS,
  isLoading: true,
  isAuthenticated: false,
  setHideWatchNotifications: () => {},
  setUseDropCap: () => {},
  setHideRatings: () => {},
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
      storage.getItem<boolean>(STORAGE_KEY_HIDE_RATINGS),
      storage.getItem<number>(STORAGE_KEY_FONT_SIZE_LEVEL),
    ]).then(([dropCap, hideRatings, fontSizeLevel]) => {
      setPrefs((prev) => ({
        ...prev,
        useDropCap: dropCap === true,
        hideRatings: hideRatings === true,
        fontSizeLevel: typeof fontSizeLevel === 'number' ? fontSizeLevel : 4,
      }))
      setLocalLoaded(true)
    })
  }, [])

  // Sync hideWatchNotifications from profile
  useEffect(() => {
    if (profile) {
      setPrefs((prev) => ({
        ...prev,
        hideWatchNotifications: profile.hide_watch_notifications,
      }))
    } else {
      setPrefs((prev) => ({
        ...prev,
        hideWatchNotifications: false,
      }))
    }
  }, [profile])

  const setHideWatchNotifications = useCallback(
    (value: boolean) => {
      if (!isAuthenticated) return
      setPrefs((prev) => ({ ...prev, hideWatchNotifications: value }))
      updateDisplayPreferences({ hide_watch_notifications: value }).catch(() => {
        // Revert on failure
        if (profile) {
          setPrefs((prev) => ({
            ...prev,
            hideWatchNotifications: profile.hide_watch_notifications,
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

  const setHideRatings = useCallback((value: boolean) => {
    setPrefs((prev) => ({ ...prev, hideRatings: value }))
    storage.setItem(STORAGE_KEY_HIDE_RATINGS, value)
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
        setHideWatchNotifications,
        setUseDropCap,
        setHideRatings,
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
