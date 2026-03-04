import { createContext, useContext } from 'react'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'

interface TabBarContextValue {
  translateY: SharedValue<number>
}

const TabBarContext = createContext<TabBarContextValue | null>(null)

export function TabBarProvider({ children }: { children: React.ReactNode }) {
  const translateY = useSharedValue(0)

  return (
    <TabBarContext.Provider value={{ translateY }}>
      {children}
    </TabBarContext.Provider>
  )
}

export function useTabBar() {
  const ctx = useContext(TabBarContext)
  if (!ctx) throw new Error('useTabBar must be used within TabBarProvider')
  return ctx
}
