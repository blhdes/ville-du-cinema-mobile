import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Appearance } from 'react-native'
import storage from '@/lib/storage'
import { getColors, type ThemeColors } from '@/theme'

const STORAGE_KEY = 'display_theme_preference'

export type ThemePreference = 'system' | 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  preference: ThemePreference
  resolved: ResolvedTheme
  colors: ThemeColors
  isReady: boolean
  setPreference: (pref: ThemePreference) => void
}

function resolveTheme(preference: ThemePreference, systemScheme: string | null | undefined): ResolvedTheme {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light'
  }
  return preference
}

const defaultResolved = resolveTheme('system', Appearance.getColorScheme())

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  resolved: defaultResolved,
  colors: getColors(defaultResolved),
  isReady: false,
  setPreference: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme())
  const [isReady, setIsReady] = useState(false)

  // Load saved preference on mount
  useEffect(() => {
    storage.getItem<ThemePreference>(STORAGE_KEY).then((saved) => {
      if (saved === 'system' || saved === 'light' || saved === 'dark') {
        setPreferenceState(saved)
      }
      setIsReady(true)
    })
  }, [])

  // Listen for OS appearance changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme)
    })
    return () => subscription.remove()
  }, [])

  const resolved = resolveTheme(preference, systemScheme)
  const colors = getColors(resolved)

  const setPreference = useCallback((pref: ThemePreference) => {
    const previous = preference
    setPreferenceState(pref)
    storage.setItem(STORAGE_KEY, pref).catch((err) => {
      console.error('Failed to save theme preference:', err)
      setPreferenceState(previous)
    })
  }, [preference])

  return (
    <ThemeContext.Provider value={{ preference, resolved, colors, isReady, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
