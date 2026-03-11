import { createContext, useCallback, useContext, useState } from 'react'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'

interface TabBarContextValue {
  translateY: SharedValue<number>
  feedRefreshRequested: number
  isFeedRefreshing: boolean
  setIsFeedRefreshing: (value: boolean) => void
  requestFeedRefresh: () => void
}

const TabBarContext = createContext<TabBarContextValue | null>(null)

export function TabBarProvider({ children }: { children: React.ReactNode }) {
  const translateY = useSharedValue(0)
  const [feedRefreshRequested, setFeedRefreshRequested] = useState(0)
  const [isFeedRefreshing, setIsFeedRefreshing] = useState(false)

  const requestFeedRefresh = useCallback(() => {
    setFeedRefreshRequested((prev) => prev + 1)
  }, [])

  return (
    <TabBarContext.Provider value={{ translateY, feedRefreshRequested, isFeedRefreshing, setIsFeedRefreshing, requestFeedRefresh }}>
      {children}
    </TabBarContext.Provider>
  )
}

export function useTabBar() {
  const ctx = useContext(TabBarContext)
  if (!ctx) throw new Error('useTabBar must be used within TabBarProvider')
  return ctx
}
